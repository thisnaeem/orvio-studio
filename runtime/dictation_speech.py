"""Warm, offline dictation engines. A single model stays resident per worker."""
import pathlib, wave
_engines={}
PARAKEET_REPO='csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8'
FILES=['encoder.int8.onnx','decoder.int8.onnx','joiner.int8.onnx','tokens.txt']
def install(root):
    from huggingface_hub import snapshot_download
    snapshot_download(PARAKEET_REPO,revision='2bda32ec70b097a55adaa07d9a7173915b43cc78',allow_patterns=FILES,local_dir=str(pathlib.Path(root)/'parakeet'))
    return {'ready':True}
def transcribe(p):
    model=p.get('model','whisper');root=pathlib.Path(p['models']);engine=_engines.get(model)
    if engine is None:
        _engines.clear()
        if model=='parakeet':
            import sherpa_onnx
            folder=root/'parakeet'
            engine=sherpa_onnx.OfflineRecognizer.from_transducer(encoder=str(folder/FILES[0]),decoder=str(folder/FILES[1]),joiner=str(folder/FILES[2]),tokens=str(folder/FILES[3]),num_threads=2,model_type='nemo_transducer',decoding_method='greedy_search',provider='cpu')
        else:
            from faster_whisper import WhisperModel
            engine=WhisperModel({'whisper-base':'base','whisper-small':'small','whisper-turbo':'turbo'}.get(model,'tiny'),device='cpu',compute_type='int8',cpu_threads=2,download_root=str(root/'whisper'),local_files_only=True)
        _engines[model]=engine
    if model=='parakeet':
        import numpy as np
        with wave.open(p['source'],'rb') as audio:
            if audio.getsampwidth()!=2 or audio.getnchannels()!=1: raise ValueError('Use mono PCM16 audio.')
            rate=audio.getframerate();samples=np.frombuffer(audio.readframes(audio.getnframes()),dtype=np.int16).astype(np.float32)/32768
        stream=engine.create_stream();stream.accept_waveform(rate,samples);engine.decode_stream(stream)
        text=stream.result.text.strip();return {'segments':[{'start':0,'end':len(samples)/rate,'text':text}] if text else []}
    segments,info=engine.transcribe(p['source'],language=None if p.get('language','auto')=='auto' else p['language'],beam_size=1,vad_filter=True,initial_prompt=p.get('customWords') or None,condition_on_previous_text=False)
    return {'segments':[{'start':s.start,'end':s.end,'text':s.text} for s in segments],'language':info.language}
