import json,pathlib,sys,unittest
from types import SimpleNamespace
from unittest.mock import patch,MagicMock
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'runtime'))
from ltx import inference_args,DISTILLED_TIMESTEPS
from generate import route
ROOT=pathlib.Path(__file__).resolve().parents[1]
MODELS=[m for m in json.loads((ROOT/'runtime/models.json').read_text()) if m['engine']=='ltx']

class LtxTests(unittest.TestCase):
    def test_install_uses_pinned_pipeline_without_loading_weights(self):
        from ltx import generate
        pipe=MagicMock()
        with patch.dict(sys.modules,{'torch':SimpleNamespace(),'diffusers':SimpleNamespace(LTXConditionPipeline=pipe)}):
            result=generate({'action':'install_model'},lambda *a:None,MODELS[0])
        self.assertTrue(result['ready'])
        pipe.download.assert_called_once_with(MODELS[0]['repo'],revision=MODELS[0]['revision'],use_safetensors=True)
        pipe.from_pretrained.assert_not_called()
    def test_catalog_routes_and_valid_shapes(self):
        profiles=json.loads((ROOT/'runtime/creative-settings.json').read_text())['profiles']
        self.assertEqual(len(MODELS),2)
        for model in MODELS:
            self.assertEqual(route(model),'ltx')
            self.assertEqual(len(model['revision']),40)
            profile=profiles[model['parameterProfile']]
            for size in profile['resolutions']:
                for frames in profile['frames']:
                    args=inference_args(dict(prompt='A lake',frames=frames,**size),model)
                    self.assertEqual(args['num_frames'],frames)
                    self.assertEqual(args['frame_rate'],24)
    def test_distilled_schedule_does_not_use_cfg(self):
        model=next(m for m in MODELS if m['parameterProfile']=='ltx-distilled')
        args=inference_args(dict(prompt='A lake',steps=8,negativePrompt='blur'),model)
        self.assertEqual(args['timesteps'],DISTILLED_TIMESTEPS)
        self.assertEqual(args['guidance_scale'],1)
        self.assertNotIn('negative_prompt',args)
    def test_standard_model_preserves_controls(self):
        model=MODELS[0]
        args=inference_args(dict(prompt='A lake',steps=20,guidance=4,fps=12,negativePrompt='blur'),model)
        self.assertEqual(args['frame_rate'],12)
        self.assertEqual(args['negative_prompt'],'blur')
        self.assertEqual(args['num_inference_steps'],20)
    def test_invalid_frame_and_pixel_multiples(self):
        for params in [dict(frames=24),dict(width=500),dict(height=360)]:
            with self.assertRaises(ValueError):inference_args(dict(prompt='A lake',**params),MODELS[0])

if __name__=='__main__':unittest.main()
