import hashlib, pathlib, sys, tempfile, threading, unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'runtime'))
from runtime_download import download,download_native
DATA=b'runtime payload'*100000
DIGEST=hashlib.sha256(DATA).hexdigest()
class RuntimeDownloadTests(unittest.TestCase):
 def test_resume_restart_fallback_and_verified_cache(self):
  ranges=[];agents=[]
  class Handler(BaseHTTPRequestHandler):
   def log_message(self,*args):pass
   def do_GET(self):
    value=self.headers.get('Range');ranges.append(value);agents.append(self.headers.get('User-Agent'))
    offset=int(value[6:-1]) if value and self.path!='/ignore' else 0
    self.send_response(206 if offset else 200)
    if offset:self.send_header('Content-Range',f'bytes {offset}-{len(DATA)-1}/{len(DATA)}')
    self.send_header('Content-Length',str(len(DATA)-offset));self.end_headers();self.wfile.write(DATA[offset:])
  server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
  thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  try:
   with tempfile.TemporaryDirectory() as directory:
    for endpoint in ['/resume','/ignore']:
     target=pathlib.Path(directory)/(endpoint[1:]+'.whl');target.with_suffix('.whl.part').write_bytes(DATA[:100000])
     progress=[];url=f'http://127.0.0.1:{server.server_port}{endpoint}'
     self.assertEqual(download(url,target,DIGEST,lambda kind,event:progress.append(event)).read_bytes(),DATA)
     self.assertEqual(ranges[-1],'bytes=100000-');self.assertTrue(agents[-1].startswith('Orvio-Studio/'))
     self.assertTrue(any(p.get('total')==len(DATA) for p in progress))
     count=len(ranges);download(url,target,DIGEST,lambda *args:None);self.assertEqual(len(ranges),count)
  finally:server.shutdown();server.server_close();thread.join()
class NativeRuntimeTests(unittest.TestCase):
 def test_native_resume_is_verified_and_reports_bytes(self):
  with tempfile.TemporaryDirectory() as directory:
   target=pathlib.Path(directory)/'runtime.whl';partial=target.with_suffix('.whl.part');partial.write_bytes(DATA[:100000]);events=[]
   class Process:
    def __init__(self,command,**kwargs):
     self.command=command
     self_test.assertIn('--continue-at',command)
     self_test.assertIn('=https',command)
     self_test.assertNotIn('--insecure',command)
     pathlib.Path(command[command.index('--dump-header')+1]).write_text(f'HTTP/1.1 206 Partial Content\nContent-Range: bytes 100000-{len(DATA)-1}/{len(DATA)}\n')
     partial.write_bytes(DATA)
    def poll(self):return 0
   self_test=self
   with patch('runtime_download.subprocess.Popen',Process):
    download_native('https://example.test/runtime',target,DIGEST,lambda _,event:events.append(event),'curl.exe')
   self.assertEqual(target.read_bytes(),DATA);self.assertFalse(partial.exists());self.assertTrue(any(event.get('total')==len(DATA) for event in events))
 def test_native_certificate_failure_keeps_saved_progress(self):
  with tempfile.TemporaryDirectory() as directory:
   target=pathlib.Path(directory)/'runtime.whl';partial=target.with_suffix('.whl.part');partial.write_bytes(DATA[:100])
   class Process:
    def __init__(self,*args,**kwargs):pass
    def poll(self):return 60
   with patch('runtime_download.subprocess.Popen',Process):
    with self.assertRaisesRegex(RuntimeError,'certificate'):download_native('https://example.test/runtime',target,DIGEST,lambda *args:None,'curl.exe')
   self.assertEqual(partial.read_bytes(),DATA[:100]);self.assertFalse(target.exists())

if __name__=='__main__':unittest.main()
