import pathlib
import sys
import unittest
import tempfile
from unittest.mock import patch
from types import SimpleNamespace

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'runtime'))
import prepare_acceleration as setup


class AccelerationSetupTests(unittest.TestCase):
    def test_setup_lock_rejects_duplicates_and_releases(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(setup.sys, 'prefix', str(pathlib.Path(directory)/'engine')):
            with setup.setup_lock():
                with self.assertRaisesRegex(RuntimeError, 'already running'):
                    with setup.setup_lock(): pass
            with setup.setup_lock(): pass
    def test_inspection_never_installs_packages(self):
        with patch.object(setup, 'inspect', return_value={'ready': False, 'canRepair': True}), patch.object(setup.subprocess, 'run') as run:
            self.assertFalse(setup.main()['ready'])
            run.assert_not_called()

    def test_cpu_build_replaced_and_reprobed(self):
        statuses = [{'ready': False, 'canRepair': True}, {'ready': True, 'canRepair': False, 'device': 'cuda'}]
        with patch.object(setup, 'inspect', side_effect=statuses) as inspect, patch.object(setup.subprocess, 'run') as run, patch.object(setup, 'emit'), patch.object(setup, 'download_cuda', return_value=pathlib.Path('verified-torch.whl')):
            self.assertEqual(setup.main(True)['device'], 'cuda')
            command = run.call_args.args[0]
            self.assertIn('verified-torch.whl', command)
            self.assertTrue(any(str(arg).endswith('install_packages.py') for arg in command))
            self.assertEqual(inspect.call_count, 2)

    def test_download_is_not_treated_as_gpu_success(self):
        statuses = [{'ready': False, 'canRepair': True}, {'ready': False, 'canRepair': False}]
        with patch.object(setup, 'inspect', side_effect=statuses), patch.object(setup.subprocess, 'run'), patch.object(setup, 'emit'), patch.object(setup, 'download_cuda', return_value=pathlib.Path('verified-torch.whl')):
            self.assertFalse(setup.main(True)['ready'])

    def test_cuda_installation_without_working_gpu_is_not_ready(self):
        with patch.object(setup, 'probe', return_value={'ready': False, 'cuda': '12.6', 'device': 'cpu'}), patch.object(setup.sys, 'platform', 'win32'), patch.object(setup.subprocess, 'CREATE_NO_WINDOW', 0, create=True), patch.object(setup.subprocess, 'run', return_value=SimpleNamespace(returncode=0, stdout='RTX 4060\n')):
            result = setup.inspect()
            self.assertFalse(result['ready'])
            self.assertFalse(result['canRepair'])

    def test_cpu_build_with_nvidia_offers_download(self):
        with patch.object(setup, 'probe', return_value={'ready': False, 'cuda': None, 'device': 'cpu'}), patch.object(setup.sys, 'platform', 'win32'), patch.object(setup.subprocess, 'CREATE_NO_WINDOW', 0, create=True), patch.object(setup.subprocess, 'run', return_value=SimpleNamespace(returncode=0, stdout='RTX 4060\n')):
            result = setup.inspect()
            self.assertFalse(result['ready'])
            self.assertTrue(result['canRepair'])


if __name__ == '__main__':
    unittest.main()
