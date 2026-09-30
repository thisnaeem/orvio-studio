"""Run with the private diffusion Python: real MP4 encoding, fixture inference."""
import pathlib,sys,tempfile,unittest,json,importlib.util
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'runtime'))
from ltx import generate

class LtxRunnerTest(unittest.TestCase):
    @unittest.skipUnless(all(importlib.util.find_spec(m) for m in ['torch','PIL','imageio_ffmpeg','numpy']), 'Run in the private media Python environment')
    def test_starting_image_and_real_mp4_export(self):
        from PIL import Image
        models=json.loads((pathlib.Path(__file__).resolve().parents[1]/'runtime/models.json').read_text())
        model=next(m for m in models if m['id']=='ltx-video-2b')
        calls={}
        class Pipeline:
            vae=SimpleNamespace(enable_tiling=lambda:None)
            @classmethod
            def from_pretrained(cls,repo,**kwargs):calls['load']=(repo,kwargs);return cls()
            def to(self,device):calls['device']=device
            def __call__(self,**kwargs):
                calls['inference']=kwargs
                kwargs['callback_on_step_end'](self,0,1,{})
                return SimpleNamespace(frames=[[Image.new('RGB',(512,320),(20,30,50)) for _ in range(25)]])
        with tempfile.TemporaryDirectory() as directory, patch.dict(sys.modules,{'diffusers':SimpleNamespace(LTXConditionPipeline=Pipeline)}):
            source=pathlib.Path(directory,'source.png');Image.new('RGB',(200,300)).save(source)
            dest=pathlib.Path(directory,'output.mp4');events=[]
            result=generate(dict(action='generate_model',prompt='A lake',seed=0,device='cpu',image=str(source),output=str(dest)),lambda *e:events.append(e),model)
            self.assertGreater(dest.stat().st_size,100)
            self.assertEqual(result['frames'],25)
            self.assertEqual(result['fps'],24)
            self.assertEqual(calls['inference']['image'].size,(512,320))
            self.assertTrue(calls['load'][1]['local_files_only'])
            self.assertEqual(calls['load'][1]['revision'],model['revision'])
            self.assertTrue(events)

if __name__=='__main__':unittest.main()
