"""Structured byte progress for managed package and model downloads."""
import time

class Reporter:
    def __init__(self, emit, filename, total=None, initial=0, stage='file'):
        self.emit, self.filename, self.total = emit, filename, total
        self.received = self.initial = initial
        self.started = time.monotonic()
        self.last = 0
        self.stage = stage

    def update(self, count, force=False):
        self.received += count
        now = time.monotonic()
        if not force and now - self.last < .35:
            return
        self.last = now
        speed = (self.received - self.initial) / max(.001, now - self.started)
        self.emit('PROGRESS', {'message': 'Downloading…', 'stage': self.stage, 'file': self.filename,
            'received': self.received, 'total': self.total, 'speed': speed,
            'eta': max(0, (self.total - self.received) / speed) if self.total and speed else None})

class ModelProgress:
    """Aggregate absolute per-file bytes across parallel HF download threads."""
    def __init__(self, emit, sources, cached=None):
        import threading
        self.emit=emit; self.lock=threading.RLock(); self.started=time.monotonic(); self.last=0
        self.sizes={(source['repo'],file['path']):file['bytes'] for source in sources for file in source['files']}
        self.received={key:0 for key in self.sizes}
        for source in sources:
            for file in source['files']:
                if cached and cached(source,file):self.received[(source['repo'],file['path'])]=file['bytes']
        self.initial=sum(self.received.values())
        self.publish(force=True)

    def update(self,key,received,filename='',force=False):
        with self.lock:
            if key not in self.sizes:return
            self.received[key]=min(self.sizes[key],max(self.received[key],received))
            self.publish(filename,force)

    def publish(self,filename='',force=False):
        now=time.monotonic()
        if not force and now-self.last<.35:return
        self.last=now;received=sum(self.received.values());total=sum(self.sizes.values())
        speed=max(0,received-self.initial)/max(.001,now-self.started)
        self.emit('PROGRESS',{'message':'Downloading model files…','stage':'model','progressScope':'model',
            'file':filename,'received':received,'total':total,'speed':speed,
            'eta':max(0,(total-received)/speed) if speed else None})


def install_hub_progress(emit,model_id=None):
    import importlib, json, pathlib, threading, functools
    import huggingface_hub as hub
    download=importlib.import_module('huggingface_hub.file_download')
    snapshot=importlib.import_module('huggingface_hub._snapshot_download')
    manifest=pathlib.Path(__file__).with_name('model-download-sizes.json')
    sources=json.loads(manifest.read_text(encoding='utf-8')).get(model_id,{}).get('sources',[]) if model_id else []
    def cached(source,file):
        try:
            value=hub.try_to_load_from_cache(source['repo'],file['path'],revision=source['revision'])
            return isinstance(value,str) and pathlib.Path(value).stat().st_size==file['bytes']
        except (OSError,ValueError):return False
    aggregate=ModelProgress(emit,sources,cached) if sources else None
    context=threading.local()
    original_download=download.hf_hub_download
    @functools.wraps(original_download)
    def tracked(repo_id,filename,*args,**kwargs):
        previous=getattr(context,'key',None)
        key=(repo_id,('/'.join([kwargs.get('subfolder',''),filename])).lstrip('/'))
        context.key=key
        try:
            result=original_download(repo_id,filename,*args,**kwargs)
            if aggregate:aggregate.update(key,aggregate.sizes.get(key,0),key[1],True)
            return result
        finally:context.key=previous
    if aggregate:
        hub.hf_hub_download=tracked;download.hf_hub_download=tracked;snapshot.hf_hub_download=tracked
    module=importlib.import_module('huggingface_hub.utils.tqdm')
    original=module.tqdm
    class Progress(original):
        def __init__(self,*args,**kwargs):
            super().__init__(*args,**{**kwargs,'disable':False,'leave':False})
            key=getattr(context,'key',None)
            def report(_kind,info):
                if aggregate:aggregate.update(key,info['received'],key[1] if key else '',True)
                else:emit(_kind,info)
            self.reporter=Reporter(report,str(kwargs.get('desc') or 'Model file'),kwargs.get('total'),kwargs.get('initial',0)) if kwargs.get('unit')=='B' else None
        def display(self,*args,**kwargs):pass
        def update(self,n=1):
            result=super().update(n)
            if getattr(self,'reporter',None):self.reporter.update(n)
            return result
        def close(self):
            if getattr(self,'reporter',None):self.reporter.update(0,True)
            super().close()
    module.tqdm=Progress;download.tqdm=Progress


def download_voice(model, destination, emit):
    from urllib.request import urlopen, Request
    from piper.download_voices import VOICE_PATTERN, URL_FORMAT
    match = VOICE_PATTERN.match(model)
    if not match: raise ValueError('Invalid voice model')
    parts = match.groupdict()
    parts['lang_code'] = parts['lang_family'] + '_' + parts['lang_region']
    for extension in ('.onnx', '.onnx.json'):
        target_path=destination/(model+extension)
        if target_path.exists(): continue
        partial=destination/(model+extension+'.part')
        initial=partial.stat().st_size if partial.exists() else 0
        request=Request(URL_FORMAT.format(**parts, extension=extension),headers={'Range':f'bytes={initial}-'} if initial else {})
        with urlopen(request, timeout=60) as response:
            if response.status!=206: initial=0
            total = int(response.headers.get('Content-Length') or 0) or None
            total=total+initial if total else None
            progress = Reporter(emit, model + extension, total, initial)
            with open(partial, 'ab' if initial else 'wb') as target:
                while chunk := response.read(256 * 1024):
                    target.write(chunk)
                    progress.update(len(chunk))
            progress.update(0, True)
        partial.replace(target_path)
