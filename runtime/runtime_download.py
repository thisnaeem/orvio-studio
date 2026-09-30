"""Persistent, checksummed runtime downloads with HTTP range recovery."""
import hashlib,pathlib,re,time,os,sys,subprocess
from contextlib import contextmanager
from urllib.request import Request,urlopen
from urllib.error import HTTPError,URLError
from download_progress import Reporter
from http.client import IncompleteRead

def checksum(file):
    digest=hashlib.sha256()
    with file.open('rb') as source:
        for chunk in iter(lambda:source.read(1024*1024),b''):digest.update(chunk)
    return digest.hexdigest()

def windows_transport():
    executable=pathlib.Path(os.environ.get('SystemRoot','C:/Windows'))/'System32'/'curl.exe'
    return str(executable) if sys.platform=='win32' and executable.is_file() else None

@contextmanager
def transfer_metadata(root):
    directory=root/('.transfer-'+str(os.getpid()))
    directory.mkdir(exist_ok=True)
    try:yield directory
    finally:
        for name in ('headers.txt','error.txt'):
            try:(directory/name).unlink()
            except FileNotFoundError:pass
        directory.rmdir()

def download_native(url,target,sha256,emit,executable):
    # Windows Schannel avoids the bundled Python/OpenSSL connection failures.
    # TLS verification remains enabled; the official SHA-256 is checked before installation.
    partial=target.with_suffix(target.suffix+'.part')
    for attempt in range(6):
        offset=partial.stat().st_size if partial.exists() else 0
        progress=Reporter(emit,target.name,None,offset,stage='gpu-runtime')
        progress.update(0,True)
        with transfer_metadata(target.parent) as temporary:
            headers=pathlib.Path(temporary)/'headers.txt'
            with (pathlib.Path(temporary)/'error.txt').open('w+b') as errors:
                command=[executable,'--fail','--location','--proto','=https','--proto-redir','=https','--silent','--show-error','--connect-timeout','30','--speed-time','60','--speed-limit','1024','--user-agent','Orvio-Studio/0.9 (runtime downloader)','--header','Accept-Encoding: identity','--continue-at','-','--dump-header',str(headers),'--output',str(partial),url]
                child=subprocess.Popen(command,stdout=subprocess.DEVNULL,stderr=errors,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
                try:
                    while True:
                        code=child.poll()
                        try:
                            text=headers.read_text(encoding='iso-8859-1')
                            ranges=re.findall(r'(?im)^content-range:\s*bytes \d+-\d+/(\d+)',text)
                            sizes=re.findall(r'(?im)^content-length:\s*(\d+)',text)
                            if ranges:progress.total=int(ranges[-1])
                            elif sizes and not offset:progress.total=int(sizes[-1])
                        except OSError: pass
                        received=partial.stat().st_size if partial.exists() else offset
                        progress.update(max(0,received-progress.received),code is not None)
                        if code is not None: break
                        time.sleep(.35)
                finally:
                    if child.poll() is None:child.terminate();child.wait()
                errors.seek(0);detail=errors.read().decode(errors='replace')[-600:].strip()
        if code in (0,33,22) and partial.exists():
            emit('PROGRESS',{'message':'Verifying runtime download…','stage':'verify','total':None,'received':0})
            if checksum(partial)==sha256:partial.replace(target);return target
            if code in (0,33):partial.unlink()
        if code in (60,77):raise RuntimeError('Windows could not verify the download server certificate. Check system time and trusted certificates; TLS verification has not been disabled.')
        if code in (23,26):raise OSError('GPU runtime could not be saved. Check free space and folder permissions. '+detail)
        if attempt==5:raise RuntimeError('GPU download interrupted. Saved progress is retained; retry to resume. '+detail)
        emit('PROGRESS',{'message':'Connection interrupted · reconnecting from saved progress…','stage':'retry','total':progress.total,'received':partial.stat().st_size if partial.exists() else 0})
        time.sleep(min(10,attempt+1))

def download(url,destination,sha256,emit):
    target=pathlib.Path(destination).resolve();target.parent.mkdir(parents=True,exist_ok=True)
    partial=target.with_suffix(target.suffix+'.part')
    if target.exists() and checksum(target)==sha256:
        emit('PROGRESS',{'message':'Using verified runtime download','received':target.stat().st_size,'total':target.stat().st_size,'stage':'verify'})
        return target
    native=windows_transport()
    if native and url.startswith('https://'):return download_native(url,target,sha256,emit,native)
    for attempt in range(4):
        offset=partial.stat().st_size if partial.exists() else 0
        headers={'Accept-Encoding':'identity','User-Agent':'Orvio-Studio/0.9 (runtime downloader)'}
        if offset:headers['Range']=f'bytes={offset}-'
        try:
            with urlopen(Request(url,headers=headers),timeout=90) as response:
                if response.status==206:
                    match=re.fullmatch(r'bytes (\d+)-(\d+)/(\d+)',response.headers.get('Content-Range',''))
                    if not match or int(match[1])!=offset:raise ValueError('Invalid download resume range')
                    total=int(match[3])
                else:
                    offset=0;total=int(response.headers.get('Content-Length',0)) or None
                progress=Reporter(emit,target.name,total,offset,stage='gpu-runtime');progress.update(0,True)
                with partial.open('ab' if offset else 'wb') as output:
                    while True:
                        chunk=response.read(256*1024)
                        if not chunk:break
                        output.write(chunk);progress.update(len(chunk))
                    output.flush()
                progress.update(0,True)
                if total and partial.stat().st_size!=total:raise OSError('Download interrupted')
            emit('PROGRESS',{'message':'Verifying runtime download…','stage':'verify','total':None,'received':0})
            if checksum(partial)!=sha256:
                partial.unlink();raise OSError('Runtime checksum mismatch; retrying a fresh download')
            partial.replace(target);return target
        except HTTPError as error:
            if error.code==416 and partial.exists():
                if checksum(partial)==sha256:partial.replace(target);return target
                partial.unlink()
            elif error.code not in (408,429,500,502,503,504):raise
        except (OSError,URLError,IncompleteRead):
            if attempt==3:raise
        emit('PROGRESS',{'message':'Connection interrupted · retrying from saved progress…','stage':'retry','total':None,'received':partial.stat().st_size if partial.exists() else 0})
        time.sleep(attempt+1)
    raise OSError('Runtime download interrupted. Resume it from Downloads.')
