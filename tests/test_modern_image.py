import sys, pathlib, unittest, tempfile
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'runtime'))
from modern_image import call_options, source_image
class ModernImageTests(unittest.TestCase):
 def test_arguments_match_distinct_editing_pipelines(self):
  q=call_options({'pipeline':'qwen-image-21','steps':40},{'prompt':'Edit','image':'a.png'})
  self.assertEqual(q['true_cfg_scale'],1);self.assertNotIn('strength',q);self.assertNotIn('guidance_scale',q)
  z=call_options({'pipeline':'z-image','steps':9},{'prompt':'Edit','image':'a.png','strength':.8})
  self.assertEqual(z['strength'],.8);self.assertEqual(z['guidance_scale'],0);self.assertNotIn('true_cfg_scale',z)
 def test_source_preparation_preserves_edit_alpha_and_crops_img2img(self):
  from PIL import Image
  with tempfile.TemporaryDirectory() as tmp:
   f=pathlib.Path(tmp)/'source.png';Image.new('RGBA',(160,80),(255,0,0,80)).save(f)
   edit=source_image(f);self.assertEqual(edit.mode,'RGBA');self.assertEqual(edit.size,(160,80))
   restyle=source_image(f,64,64);self.assertEqual(restyle.mode,'RGB');self.assertEqual(restyle.size,(64,64))
 def test_runner_routes_source_and_exports_png_without_network(self):
  import json
  from unittest.mock import patch
  from types import SimpleNamespace
  from PIL import Image
  from modern_image import generate
  models=json.loads((pathlib.Path(__file__).resolve().parents[1]/'runtime/models.json').read_text(encoding='utf-8'))
  calls=[]
  class Pipeline:
   components={};vae=SimpleNamespace(enable_tiling=lambda:None)
   @classmethod
   def from_pretrained(cls,folder,**kwargs):return cls()
   def __call__(self,**args):calls.append(args);return SimpleNamespace(images=[Image.new('RGBA',(64,64))])
  modules={'diffusers':SimpleNamespace(ZImagePipeline=Pipeline,ZImageImg2ImgPipeline=Pipeline,QwenImage21Pipeline=Pipeline)}
  with tempfile.TemporaryDirectory() as tmp,patch.dict(sys.modules,modules),patch('huggingface_hub.snapshot_download',return_value=tmp) as download,patch('modern_image.configure',return_value={'device':'cpu'}):
   source=pathlib.Path(tmp)/'source.png';Image.new('RGB',(80,40)).save(source)
   for model in [m for m in models if m['engine']=='modern-image']:
    output=pathlib.Path(tmp)/(model['id']+'.png')
    result=generate({'action':'generate_model','model':model['id'],'prompt':'Edit','device':'cpu','image':str(source),'seed':0,'output':str(output)},lambda *_:None,model)
    self.assertTrue(output.is_file());self.assertEqual(result['seed'],0);self.assertTrue(download.call_args.kwargs['local_files_only']);self.assertIn('image',calls[-1])
    self.assertEqual(download.call_args.kwargs['revision'],model['revision'])
if __name__=='__main__':unittest.main()
