"""Optional multilingual CTC dictation with one downloaded language adapter."""
import json,pathlib,os

def run(p,emit):
    from huggingface_hub import snapshot_download
    languages=json.loads(pathlib.Path(__file__).with_name('mms-languages.json').read_text())
    language=p.get('language','eng')
    if language not in languages: raise ValueError('Choose a supported MMS language.')
    offline=p['action']!='install_mms'
    folder=snapshot_download('facebook/mms-1b-all',allow_patterns=['*.json','model.safetensors',f'adapter.{language}.safetensors'],local_files_only=offline)
    if not offline:return {'ready':True}
    import torch,av,numpy as np
    from transformers import AutoProcessor,Wav2Vec2ForCTC
    torch.set_num_threads(2)
    emit('PROGRESS','Loading the selected language locally…')
    processor=AutoProcessor.from_pretrained(folder,local_files_only=True)
    processor.tokenizer.set_target_lang(language)
    model=Wav2Vec2ForCTC.from_pretrained(folder,local_files_only=True,ignore_mismatched_sizes=True)
    model.load_adapter(language,local_files_only=True)
    model.eval()
    samples=[];count=0
    with av.open(p['source']) as audio:
        resampler=av.AudioResampler(format='fltp',layout='mono',rate=16000)
        for frame in audio.decode(audio=0):
            for converted in resampler.resample(frame):
                values=converted.to_ndarray().reshape(-1);count+=len(values)
                if count>16000*65:raise ValueError('MMS dictation is limited to one minute.')
                samples.append(values)
        for converted in resampler.resample(None):samples.append(converted.to_ndarray().reshape(-1))
    if not samples:return {'segments':[],'language':language,'duration':0}
    waveform=np.concatenate(samples);segments=[]
    # Bounded 15-second windows keep CPU memory predictable for short dictation.
    for start in range(0,len(waveform),16000*15):
        clip=waveform[start:start+16000*15]
        inputs=processor(clip,sampling_rate=16000,return_tensors='pt')
        with torch.inference_mode(): ids=torch.argmax(model(**inputs).logits,dim=-1)[0]
        text=processor.decode(ids)
        segments.append({'start':start/16000,'end':(start+len(clip))/16000,'text':text})
    return {'segments':segments,'language':language,'duration':len(waveform)/16000}
