import unittest,sys,pathlib,types
from unittest.mock import patch,MagicMock
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'runtime'))
import spatial,lipsync
class SpatialTests(unittest.TestCase):
    def test_spatial_download_uses_fixed_revision_safetensors_without_loading(self):
        cls=MagicMock();modules={'torch':MagicMock(),'diffusers':types.SimpleNamespace(ShapEPipeline=cls,ShapEImg2ImgPipeline=cls),'diffusers.utils':types.SimpleNamespace(export_to_ply=MagicMock())}
        with patch.dict(sys.modules,modules):
            self.assertTrue(spatial.generate({'model':'shap-e-text','action':'install_spatial'},lambda *a:None)['ready'])
        cls.from_pretrained.assert_not_called();args=cls.download.call_args
        self.assertEqual(args.args[0],'openai/shap-e');self.assertEqual(len(args.kwargs['revision']),40);self.assertTrue(args.kwargs['use_safetensors']);self.assertEqual(args.kwargs['variant'],'fp16')
    def test_lipsync_downloads_only_named_weights_at_pinned_revisions(self):
        download=MagicMock(return_value='folder')
        with patch.dict(sys.modules,{'huggingface_hub':types.SimpleNamespace(snapshot_download=download)}):
            self.assertTrue(lipsync.run({'action':'install_lipsync'},lambda *a:None)['ready'])
            lipsync.assets(True)
        self.assertEqual(download.call_count,6)
        for call in download.call_args_list:
            self.assertEqual(len(call.kwargs['revision']),40)
            self.assertTrue(call.kwargs['allow_patterns'])
        self.assertFalse(download.call_args_list[0].kwargs['local_files_only']);self.assertTrue(download.call_args_list[-1].kwargs['local_files_only'])
    def test_frame_timing_and_normalized_crop_match_output_pixels(self):
        self.assertEqual(lipsync.frame_count(16000),25)
        self.assertEqual(lipsync.frame_count(16000*30),750)
        self.assertEqual(lipsync.crop_box([.2,.1,.6,.8],720,480),(144,48,576,432))
if __name__=='__main__':unittest.main()
