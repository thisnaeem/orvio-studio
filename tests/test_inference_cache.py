import pathlib,sys,tempfile,unittest
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'runtime'))
import generate
class CacheTests(unittest.TestCase):
 def test_same_model_reuses_pipeline_but_image_input_rebuilds(self):
  from PIL import Image
  calls=[]
  class Scheduler:
   config={}
   @classmethod
   def from_config(cls,config):return cls()
  class Pipeline:
   scheduler=Scheduler()
   @classmethod
   def from_pretrained(cls,*args,**kwargs):calls.append(args);return cls()
   def __call__(self,**kwargs):return SimpleNamespace(images=[Image.new('RGB',(64,64))])
  fake=SimpleNamespace(**{name:Pipeline for name in ['AutoPipelineForText2Image','AutoPipelineForImage2Image','AnimateDiffPipeline','MotionAdapter','EulerDiscreteScheduler','DiffusionPipeline','TextToVideoSDPipeline','DPMSolverMultistepScheduler']})
  generate._cache=None
  with tempfile.TemporaryDirectory() as tmp,patch.dict(sys.modules,{'diffusers':fake}),patch('generate.configure',return_value={'device':'cpu','deviceName':'CPU','memoryMode':'resident'}):
   p=dict(action='generate_model',model='dreamshaper',device='cpu',prompt='Test',seed=0,output=str(pathlib.Path(tmp)/'out.png'))
   self.assertFalse(generate.generate(p,lambda *_:None)['reusedModel'])
   self.assertTrue(generate.generate(p,lambda *_:None)['reusedModel']);self.assertEqual(len(calls),1)
   p['image']=p['output'];self.assertFalse(generate.generate(p,lambda *_:None)['reusedModel']);self.assertEqual(len(calls),2)
  generate._cache=None
if __name__=='__main__':unittest.main()
