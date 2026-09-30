import sys,pathlib,unittest,json
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'runtime'))
from download_progress import ModelProgress,install_hub_progress
class ModelProgressTests(unittest.TestCase):
 def test_parallel_files_cached_bytes_and_retries_share_one_total(self):
  events=[];sources=[{'repo':'test/model','revision':'abc','files':[{'path':'unet/model.safetensors','bytes':800},{'path':'text_encoder/model.safetensors','bytes':200},{'path':'config.json','bytes':100}]}]
  progress=ModelProgress(lambda _,x:events.append(x),sources,lambda s,f:f['path']=='config.json')
  def run(path,size):
   for n in [size*.7,size*.1,size*.9,size,size*7]:progress.update(('test/model',path),n,path,True)
  with ThreadPoolExecutor(2) as pool:list(pool.map(lambda pair:run(*pair),[('unet/model.safetensors',800),('text_encoder/model.safetensors',200)]))
  values=[e['received'] for e in events];self.assertEqual(values[0],100);self.assertEqual(values,sorted(values));self.assertEqual(values[-1],1100);self.assertTrue(all(e['total']==1100 for e in events))
  progress.update(('test/model','unknown.txt'),9000,force=True);self.assertEqual(events[-1]['received'],1100)
 def test_hub_wrapper_tracks_full_paths_and_successful_cached_files(self):
  import huggingface_hub as hub
  import huggingface_hub.file_download as download
  import huggingface_hub._snapshot_download as snapshot
  import importlib
  module=importlib.import_module('huggingface_hub.utils.tqdm')
  events=[];manifest={'test':{'sources':[{'repo':'test/model','revision':'abc','files':[{'path':'a/weights','bytes':80},{'path':'b/weights','bytes':20}]}]}}
  def fake(repo,filename,**kwargs):
   with download.tqdm(total=80,unit='B',desc='weights') as bar:bar.update(56)
   return 'cached-file'
  originals=(hub.hf_hub_download,download.hf_hub_download,snapshot.hf_hub_download,module.tqdm,download.tqdm)
  try:
   with patch.object(download,'hf_hub_download',fake),patch.object(hub,'try_to_load_from_cache',return_value=None),patch('pathlib.Path.read_text',return_value=json.dumps(manifest)):
    install_hub_progress(lambda _,x:events.append(x),'test')
    hub.hf_hub_download('test/model','weights',subfolder='a');snapshot.hf_hub_download('test/model','weights',subfolder='b')
   self.assertTrue(any(e['received']==56 and e['total']==100 for e in events));self.assertEqual(events[-1]['received'],100)
  finally:hub.hf_hub_download,download.hf_hub_download,snapshot.hf_hub_download,module.tqdm,download.tqdm=originals
if __name__=='__main__':unittest.main()
