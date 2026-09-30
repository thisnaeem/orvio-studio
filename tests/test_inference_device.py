import pathlib,sys,unittest
from types import SimpleNamespace
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'runtime'))
from inference_device import select_device,memory_mode,configure
from prepare_acceleration import needs_cuda
GB=1024**3
class DeviceTests(unittest.TestCase):
    def test_selection(self):
        torch=SimpleNamespace(cuda=SimpleNamespace(is_available=lambda:True),backends=SimpleNamespace(mps=SimpleNamespace(is_available=lambda:True)))
        self.assertEqual(select_device(torch),'cuda')
        torch.cuda.is_available=lambda:False
        self.assertEqual(select_device(torch),'mps')
        torch.backends.mps.is_available=lambda:False
        self.assertEqual(select_device(torch),'cpu')
    def test_memory_headroom(self):
        self.assertEqual(memory_mode(10*GB,4*GB),'resident')
        self.assertEqual(memory_mode(5*GB,4*GB),'offload')
        self.assertEqual(memory_mode(7*GB,4*GB,True),'offload')
    def test_cuda_avoids_attention_slicing_and_offloads_before_placement(self):
        calls=[]
        pipe=SimpleNamespace(components={'unet':SimpleNamespace(parameters=lambda:[SimpleNamespace(numel=lambda:2*GB,element_size=lambda:2)])},enable_vae_slicing=lambda:calls.append('vae'),enable_attention_slicing=lambda:calls.append('attention'),enable_vae_tiling=lambda:calls.append('tile'),enable_model_cpu_offload=lambda:calls.append('offload'),to=lambda device:calls.append(device))
        torch=SimpleNamespace(set_num_threads=lambda n:None,backends=SimpleNamespace(cuda=SimpleNamespace(matmul=SimpleNamespace())),cuda=SimpleNamespace(mem_get_info=lambda:(5*GB,8*GB),get_device_name=lambda:'Test GPU'))
        result=configure(pipe,torch,'cuda')
        self.assertEqual(result['memoryMode'],'offload');self.assertIn('offload',calls);self.assertNotIn('cuda',calls);self.assertNotIn('attention',calls)
        calls.clear();torch.cuda.mem_get_info=lambda:(12*GB,16*GB)
        self.assertEqual(configure(pipe,torch,'cuda')['memoryMode'],'resident');self.assertIn('cuda',calls);self.assertNotIn('offload',calls)
    def test_repair_only_cpu_windows_nvidia(self):
        self.assertTrue(needs_cuda('win32',None,True))
        for args in [('darwin',None,True),('win32','12.6',True),('win32',None,False)]: self.assertFalse(needs_cuda(*args))
if __name__=='__main__':unittest.main()
