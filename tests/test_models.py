import unittest,sys,pathlib,json,types
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'runtime'))
import generate
class ModelInstallTests(unittest.TestCase):
    def test_video_install_downloads_its_own_pipeline_without_loading_weights(self):
        downloads=[]
        class Pipeline:
            @staticmethod
            def download(repo,**kwargs): downloads.append(repo)
            @staticmethod
            def from_pretrained(*args,**kwargs): raise AssertionError('Install must not load a model')
        modules={'torch':types.SimpleNamespace(set_num_threads=lambda n:None),'diffusers':types.SimpleNamespace(**{name:Pipeline for name in ['AutoPipelineForText2Image','AnimateDiffPipeline','MotionAdapter','EulerDiscreteScheduler','DiffusionPipeline','TextToVideoSDPipeline','DPMSolverMultistepScheduler']}),'huggingface_hub':types.SimpleNamespace(hf_hub_download=lambda repo,file:downloads.append((repo,file))),'safetensors.torch':types.SimpleNamespace(load_file=lambda p:None)}
        with patch.dict(sys.modules,modules):
            generate.generate({'action':'install_model','model':'zeroscope'},lambda *a:None)
            self.assertEqual(downloads,['cerspense/zeroscope_v2_576w'])
            downloads.clear()
            generate.generate({'action':'install_model','model':'animatediff-dream'},lambda *a:None)
            self.assertEqual(downloads[-1],'Lykon/dreamshaper-8')
            self.assertIn('4step',downloads[0][1])
    def test_catalog_download_files_and_output_contracts(self):
        models=json.loads(pathlib.Path('runtime/models.json').read_text())
        self.assertEqual(len({m['id'] for m in models}),len(models))
        for model in models:
            if model['kind']=='chat':
                self.assertTrue(model['filename'].endswith('.gguf'))
                if model.get('files'):self.assertIn(model['filename'],model['files'])
            else:
                width,height,frames,fps=generate.dimensions(model)
                self.assertEqual(width%8,0);self.assertEqual(height%8,0)
                self.assertGreater(frames,0);self.assertGreater(fps,0)
        zero=next(m for m in models if m['id']=='zeroscope')
        self.assertEqual(generate.dimensions(zero),(576,320,24,8))
        languages=json.loads(pathlib.Path('runtime/mms-languages.json').read_text())
        self.assertGreater(len(languages),1000);self.assertIn('eng',languages);self.assertIn('urd-script_arabic',languages)
if __name__=='__main__':unittest.main()
