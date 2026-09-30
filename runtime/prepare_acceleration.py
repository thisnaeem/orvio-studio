"""Inspect and explicitly repair Orvio's private inference runtime."""
import json, subprocess, sys, traceback, errno
from urllib.error import HTTPError, URLError
import pathlib
from contextlib import contextmanager, nullcontext
CUDA_PACKAGE='torch==2.6.0+cu126'
CUDA_INDEX='https://download.pytorch.org/whl/cu126'

def download_cuda():
    from html.parser import HTMLParser
    from urllib.request import Request,urlopen
    from urllib.parse import urljoin,urlparse,unquote,parse_qs
    from runtime_download import download
    filename=f'torch-2.6.0+cu126-cp{sys.version_info.major}{sys.version_info.minor}-cp{sys.version_info.major}{sys.version_info.minor}-win_amd64.whl'
    class Links(HTMLParser):
        links=[]
        def handle_starttag(self,tag,attrs):
            if tag=='a':self.links.extend(v for k,v in attrs if k=='href')
    parser=Links()
    with urlopen(Request(CUDA_INDEX+'/torch/',headers={'User-Agent':'Orvio-Studio/0.9 (runtime downloader)'}),timeout=90) as response:parser.feed(response.read().decode())
    for href in parser.links:
        url=urljoin(CUDA_INDEX+'/torch/',href);parsed=urlparse(url)
        if unquote(parsed.path.rsplit('/',1)[-1])!=filename:continue
        digest=parse_qs(parsed.fragment).get('sha256',[''])[0]
        if parsed.scheme!='https' or parsed.hostname not in ('download.pytorch.org','download-r2.pytorch.org') or len(digest)!=64:continue
        return download(url.split('#')[0],pathlib.Path(sys.prefix).parent/'.runtime-wheels'/filename,digest,lambda _kind,value:emit(value))
    raise RuntimeError('No compatible NVIDIA runtime wheel was found for this Python version.')

@contextmanager
def setup_lock():
    # OS locks are released on exit/crash; a stale file cannot block future repairs.
    with pathlib.Path(sys.prefix).parent.joinpath('.gpu-setup.lock').open('a+b') as lock:
        lock.seek(0, 2)
        if not lock.tell(): lock.write(b'0'); lock.flush()
        lock.seek(0)
        try:
            if sys.platform == 'win32':
                import msvcrt
                msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            raise RuntimeError('GPU setup is already running for this engine. Wait for it to finish, then check GPU again.') from None
        try: yield
        finally:
            lock.seek(0)
            if sys.platform == 'win32': msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)
            else: fcntl.flock(lock, fcntl.LOCK_UN)
def emit(message):
    print('\nORVIO_PROGRESS '+json.dumps(message),flush=True)
def needs_cuda(platform, torch_cuda, gpu_detected):
    return platform=='win32' and not torch_cuda and gpu_detected

def probe():
    code='''import torch,json
result={'torch':torch.__version__,'cuda':torch.version.cuda,'ready':False,'device':'cpu'}
if torch.cuda.is_available():
 try:
  x=torch.ones(4,device='cuda'); (x+x).sum().item(); torch.cuda.synchronize()
  result.update(ready=True,device='cuda',deviceName=torch.cuda.get_device_name(0))
 except Exception:
  result['reason']='cuda_execution_failed'
elif hasattr(torch.backends,'mps') and torch.backends.mps.is_available():
 result.update(ready=True,device='mps',deviceName='Apple Metal')
print('ORVIO_PROBE '+json.dumps(result))'''
    try:
        p=subprocess.run([sys.executable,'-c',code],capture_output=True,text=True,timeout=90)
        line=next((s[12:] for s in p.stdout.splitlines() if s.startswith('ORVIO_PROBE ')),None)
        return json.loads(line) if p.returncode==0 and line else {'ready':False,'device':'cpu','reason':'runtime_broken'}
    except (OSError,subprocess.TimeoutExpired):
        return {'ready':False,'device':'cpu','reason':'probe_failed'}

def inspect():
    result=probe();gpu=''
    if sys.platform=='win32':
        try:
            p=subprocess.run(['nvidia-smi','--query-gpu=name','--format=csv,noheader'],capture_output=True,text=True,timeout=8,creationflags=subprocess.CREATE_NO_WINDOW)
            if p.returncode==0: gpu=p.stdout.strip().splitlines()[0] if p.stdout.strip() else ''
        except (OSError,subprocess.TimeoutExpired): pass
    result['gpu']=gpu
    result['canRepair']=bool(gpu and not result.get('cuda'))
    if result['ready']: result['message']='GPU ready · '+result['deviceName']
    elif result['canRepair']: result['message']='NVIDIA GPU detected. Download the CUDA runtime to enable GPU generation (about 2.5 GB).'
    elif gpu: result['message']='CUDA runtime is installed, but a GPU operation failed. Restart Orvio and check the NVIDIA driver before retrying.'
    elif result.get('reason'): result['message']='The inference runtime could not be inspected. Prepare the model engine and check again.'
    else: result.update(ready=True,message='CPU generation · no supported GPU runtime detected')
    return result

def main(repair=False):
    result=inspect()
    if repair and result['canRepair']:
        emit('Downloading NVIDIA CUDA runtime · about 2.5 GB. Your models are kept.')
        wheel=download_cuda()
        emit('Installing verified NVIDIA runtime…')
        subprocess.run([sys.executable,str(pathlib.Path(__file__).with_name('install_packages.py')),'--isolated','install','--disable-pip-version-check','--timeout','120','--index-url','https://pypi.org/simple',str(wheel)],check=True)
        emit('Verifying a real GPU operation…');result=inspect()
        if not result['ready']: result['message']='Runtime downloaded, but GPU verification failed. Restart Orvio and check the NVIDIA driver.'
    return result
if __name__=='__main__':
    try:
        with setup_lock() if '--repair' in sys.argv else nullcontext():
            print('\nORVIO_RESULT '+json.dumps(main('--repair' in sys.argv)),flush=True)
    except Exception as error:
        log=pathlib.Path(sys.prefix).parent/'gpu-setup-error.log'
        try: log.write_text(traceback.format_exc(),encoding='utf-8')
        except OSError: pass
        if isinstance(error,HTTPError):
            message=f'GPU runtime download returned HTTP {error.code}. Retry the download; your saved progress is retained.'
        elif isinstance(error,URLError):
            message=f'GPU runtime download could not connect: {error.reason}. Retry to resume saved progress.'
        elif isinstance(error,OSError) and (error.errno==errno.ENOSPC or getattr(error,'winerror',None)==112):
            message='Not enough free disk space for GPU setup. Choose another drive in Settings → Downloads & storage, then retry.'
        elif isinstance(error,PermissionError):
            message='GPU setup cannot write to its storage folder. Check folder permissions or choose another download location in Settings.'
        elif isinstance(error,subprocess.CalledProcessError):
            message=f'GPU package installation failed (exit {error.returncode}). See the preceding installer error and '+str(log)
        else:
            message='GPU runtime setup failed: '+str(error)
        print('\nORVIO_ERROR '+json.dumps(message),flush=True);sys.exit(1)
