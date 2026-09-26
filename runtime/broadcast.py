"""Realtime file-to-YouTube encoder; no stream keys are logged."""
import json,sys,subprocess

def args_for(p,ffmpeg):
    key=p['key']
    if not isinstance(key,str) or not 6<=len(key)<=200 or not all(c.isascii() and (c.isalnum() or c in '_-') for c in key): raise ValueError('Enter a valid YouTube stream key.')
    resolution=p.get('resolution','720'); width,height,rate=(1920,1080,8000) if resolution=='1080' else (1280,720,4000)
    args=[ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-re']
    if p.get('loop'): args+=['-stream_loop','-1']
    args+=['-i',p['source'],'-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=44100','-map','0:v:0','-map','1:a:0' if p.get('mute') or not p.get('hasAudio') else '0:a:0','-vf',f'scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,fps=30','-c:v','libx264','-preset','veryfast','-tune','zerolatency','-threads','2','-b:v',f'{rate}k','-maxrate',f'{rate}k','-bufsize',f'{rate*2}k','-g','60','-c:a','aac','-b:a','128k','-ar','44100','-shortest','-progress','pipe:1','-f','flv',f'rtmps://a.rtmps.youtube.com:443/live2/{key}']
    return args

def main(p):
    import imageio_ffmpeg
    ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
    probe=subprocess.run([ffmpeg,'-hide_banner','-i',p['source']],capture_output=True,text=True)
    p['hasAudio']='Audio:' in probe.stderr
    proc=subprocess.Popen(args_for(p,ffmpeg),stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    errors=''
    for line in proc.stdout:
        if line.startswith(('out_time=','speed=','fps=','total_size=')):
            name,value=line.strip().split('=',1);print('ORVIO_LIVE '+json.dumps({name:value}),flush=True)
        elif '=' not in line: errors=(errors+line)[-1000:]
    code=proc.wait()
    if code:
        error=errors.replace(p['key'],'[hidden]')[-1000:]
        raise ValueError('YouTube connection stopped. Check your stream key, live access and network. '+error)
    print('ORVIO_DONE',flush=True)

if __name__=='__main__':
    try: main(json.load(sys.stdin))
    except Exception as e:
        print('ORVIO_ERROR '+json.dumps(str(e)),flush=True);sys.exit(1)
