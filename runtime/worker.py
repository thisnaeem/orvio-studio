"""Orvio's isolated local media worker. One JSON request per process."""
import json, sys, os, pathlib, wave, subprocess, tempfile

def emit(kind, value):
    print('\nORVIO_' + kind + ' ' + json.dumps(value), flush=True)

def run(p):
    action=p['action']; root=pathlib.Path(p['models']); root.mkdir(parents=True,exist_ok=True)
    os.environ['HF_HOME']=str(root/'huggingface')
    os.environ['HF_HUB_DISABLE_XET']='1'
    if action in ('voice','transcribe','transcribe_mms','generate_model'): os.environ['HF_HUB_OFFLINE']='1'
    if action in ('install_model','install_whisper','install_mms') or (action=='install_voice' and p.get('model')=='chatterbox'):
        from download_progress import install_hub_progress
        install_hub_progress(emit)
    if action in ('install_model','generate_model'):
        from generate import generate
        return generate(p,emit)
    if action in ('voice','install_voice'):
        model=p['model']
        if model=='chatterbox':
            if action=='install_voice':
                from huggingface_hub import snapshot_download
                snapshot_download('ResembleAI/chatterbox',allow_patterns=['ve.pt','t3_mtl23ls_v2.safetensors','s3gen.pt','grapheme_mtl_merged_expanded_v1.json','conds.pt','Cangjie5_TC.json'])
                return {'ready':True}
            import torch
            torch.set_num_threads(2)
            from chatterbox.mtl_tts import ChatterboxMultilingualTTS
            engine=ChatterboxMultilingualTTS.from_pretrained(device='cpu')
            if action=='voice':
                import soundfile
                audio=engine.generate(p['text'],language_id=p['language'],audio_prompt_path=p.get('reference'))
                soundfile.write(p['output'],audio.squeeze().cpu().numpy(),engine.sr)
        else:
            from download_progress import download_voice
            from piper import PiperVoice
            voice_root=pathlib.Path(p.get('source') or root)
            if not (voice_root/(model+'.onnx')).exists() or not (voice_root/(model+'.onnx.json')).exists():
                staging=root/('download-'+model)
                staging.mkdir(exist_ok=True)
                download_voice(model,staging,emit)
                for suffix in ('.onnx','.onnx.json'):
                    os.replace(staging/(model+suffix),root/(model+suffix))
                staging.rmdir()
            if action=='voice':
                engine=PiperVoice.load(str(voice_root/(model+'.onnx')))
                with wave.open(p['output'],'wb') as output: engine.synthesize_wav(p['text'],output)
        return {'ready':True}
    if action in ('install_mms','transcribe_mms'):
        from mms import run
        return run(p,emit)
    if action in ('transcribe','install_whisper'):
        if action=='install_whisper':
            from faster_whisper.utils import download_model
            download_model({'whisper-base':'base','whisper-small':'small','whisper-turbo':'turbo'}.get(p.get('model'),'tiny'),cache_dir=str(root/'whisper'))
            return {'ready':True}
        from faster_whisper import WhisperModel
        engine=WhisperModel({'whisper-base':'base','whisper-small':'small','whisper-turbo':'turbo'}.get(p.get('model'),'tiny'),device='cpu',compute_type='int8',cpu_threads=2,download_root=str(root/'whisper'))
        if action=='install_whisper': return {'ready':True}
        segments,info=engine.transcribe(p['source'],language=None if p.get('language','auto')=='auto' else p['language'],beam_size=1,vad_filter=True,word_timestamps=True)
        result=[]
        for s in segments:
            result.append({'start':s.start,'end':s.end,'text':s.text,'words':[{'start':w.start,'end':w.end,'text':w.word} for w in (s.words or [])]})
            emit('PROGRESS',f'Transcribing {int(s.end)} seconds…')
        return {'segments':result,'duration':info.duration,'language':info.language}
    import imageio_ffmpeg
    ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
    if action=='captions':
        from captions import render
        return render(p,ffmpeg,imageio_ffmpeg)
    if action=='download':
        import yt_dlp
        def thumbnail(info):
            candidates=[info.get('thumbnail')]+[t.get('url') for t in reversed(info.get('thumbnails') or [])]
            return next((url for url in candidates if isinstance(url,str) and url.startswith('https://')),None)
        def progress(d):
            if d['status']=='downloading':
                total=d.get('total_bytes') or d.get('total_bytes_estimate')
                stream='audio' if d.get('info_dict',{}).get('vcodec')=='none' else 'video'
                emit('PROGRESS',{'message':f'Downloading {stream}…','stage':stream,'file':stream+' stream','title':d.get('info_dict',{}).get('title','Video download'),'thumbnail':thumbnail(d.get('info_dict',{})),'received':d.get('downloaded_bytes',0),'total':total,'speed':d.get('speed'),'eta':d.get('eta')})
        options={'outtmpl':p['output']+'.source.%(ext)s','format':'bv*[height<=1080]+ba/b[height<=1080]/bv*+ba/b/bv*','merge_output_format':'mkv','noplaylist':True,'max_filesize':2*1024**3,'quiet':True,'noprogress':True,'no_warnings':True,'progress_hooks':[progress],'ffmpeg_location':ffmpeg,'socket_timeout':30,'retries':2,'overwrites':False,'continuedl':True,'enable_file_urls':False}
        quality=int(p.get('quality',1080))
        options['format']='ba/b' if p.get('audio') else f'bv*[height<={quality}]+ba/b[height<={quality}]/b'
        if p.get('rate'): options['ratelimit']=int(p['rate'])*1024
        if p.get('jsRuntime'): options['js_runtimes']={'node':{'path':p['jsRuntime']}}
        if p.get('cookies'): options['cookiefile']=p['cookies']
        with yt_dlp.YoutubeDL(options) as ydl:
            info=ydl.extract_info(p['url'],download=True)
            source=info.get('filepath') or ydl.prepare_filename(info)
        if not pathlib.Path(source).is_file(): raise ValueError('The site did not provide a downloadable video file.')
        emit('PROGRESS',{'message':'Preparing audio…' if p.get('audio') else 'Preparing MP4 video…','thumbnail':thumbnail(info)})
        # Normalize to a playable, publishable MP4, even when the source is WebM.
        converted=p['output']
        command=[ffmpeg,'-y','-i',source]+(['-vn','-c:a','libmp3lame','-q:a','2'] if p.get('audio') else ['-map','0:v:0','-map','0:a:0?','-c:v','libx264','-preset','veryfast','-threads','2','-c:a','aac','-movflags','+faststart'])+[converted]
        subprocess.run(command,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        pathlib.Path(source).unlink(missing_ok=True)
        return {'title':info.get('title','Downloaded video'),'duration':info.get('duration'),'thumbnail':thumbnail(info)}
    if action=='clip':
        start=float(p['start']); end=float(p['end'])
        if not 0<=start<end or end-start>300: raise ValueError('Choose a clip between 1 and 300 seconds.')
        probe=imageio_ffmpeg.read_frames(p['source'])
        try: duration=next(probe).get('duration',0)
        finally: probe.close()
        if not duration: duration=imageio_ffmpeg.count_frames_and_secs(p['source'])[1]
        if duration and (start>=duration or end>duration+0.1): raise ValueError(f'Clip times must be within the video duration ({duration:.1f} seconds).')
        args=[ffmpeg,'-y','-ss',str(start),'-i',p['source'],'-t',str(end-start),'-map','0:v:0','-map','0:a:0?']
        if p.get('vertical'): args+=['-vf','scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2']
        args+=['-c:v','libx264','-preset','veryfast','-threads','2','-c:a','aac','-movflags','+faststart',p['output']]
        subprocess.run(args,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        return {'duration':end-start}
    raise ValueError('Unknown operation')

if __name__=='__main__':
    try: emit('RESULT',run(json.load(sys.stdin)))
    except Exception as e:
        emit('ERROR',str(e)[-1800:]); sys.exit(1)
