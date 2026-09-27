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

def install_hub_progress(emit):
    # Hugging Face funnels file downloads through this tqdm class. Keep its
    # locking/counting while publishing numeric progress instead of terminal UI.
    import importlib
    module = importlib.import_module('huggingface_hub.utils.tqdm')
    original = module.tqdm
    class Progress(original):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **{**kwargs, 'disable': False, 'leave': False})
            self.reporter = Reporter(emit, str(kwargs.get('desc') or 'Model file'), kwargs.get('total'), kwargs.get('initial', 0)) if kwargs.get('unit') == 'B' else None
        def display(self, *args, **kwargs):
            pass
        def update(self, n=1):
            result = super().update(n)
            if getattr(self, 'reporter', None): self.reporter.update(n)
            return result
        def close(self):
            if getattr(self, 'reporter', None): self.reporter.update(0, True)
            super().close()
    module.tqdm = Progress
    import huggingface_hub.file_download as download
    download.tqdm = Progress

def download_voice(model, destination, emit):
    from urllib.request import urlopen
    from piper.download_voices import VOICE_PATTERN, URL_FORMAT
    match = VOICE_PATTERN.match(model)
    if not match: raise ValueError('Invalid voice model')
    parts = match.groupdict()
    parts['lang_code'] = parts['lang_family'] + '_' + parts['lang_region']
    for extension in ('.onnx', '.onnx.json'):
        with urlopen(URL_FORMAT.format(**parts, extension=extension), timeout=60) as response:
            total = int(response.headers.get('Content-Length') or 0) or None
            progress = Reporter(emit, model + extension, total)
            with open(destination / (model + extension), 'wb') as target:
                while chunk := response.read(256 * 1024):
                    target.write(chunk)
                    progress.update(len(chunk))
            progress.update(0, True)
