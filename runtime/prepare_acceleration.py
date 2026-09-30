"""Repair CPU-only Windows Torch installations on NVIDIA systems before inference."""
import json, subprocess, sys

def emit(message):
    print('\nORVIO_PROGRESS '+json.dumps(message),flush=True)

def needs_cuda(platform, torch_cuda, gpu_detected):
    return platform=='win32' and not torch_cuda and gpu_detected

def main():
    if sys.platform!='win32': return
    probe=subprocess.run([sys.executable,'-c','import torch,json; print(json.dumps(torch.version.cuda))'],capture_output=True,text=True,timeout=60)
    if probe.returncode: raise RuntimeError('Could not inspect the local Torch runtime.')
    torch_cuda=json.loads(probe.stdout.strip())
    if torch_cuda: return
    try:
        result=subprocess.run(['nvidia-smi','--query-gpu=name','--format=csv,noheader'],capture_output=True,text=True,timeout=8,creationflags=subprocess.CREATE_NO_WINDOW)
        detected=result.returncode==0 and bool(result.stdout.strip())
    except (OSError,subprocess.TimeoutExpired):
        detected=False
    if not needs_cuda(sys.platform,torch_cuda,detected): return
    emit('Preparing NVIDIA acceleration · downloading CUDA runtime (first use only)…')
    subprocess.run([sys.executable,'-m','pip','--isolated','install','--disable-pip-version-check','--index-url','https://download.pytorch.org/whl/cu126','torch==2.6.0'],check=True,stdout=sys.stderr,stderr=sys.stderr)
    # No Torch DLLs remain loaded during installation, so Windows can replace them.
    check=subprocess.run([sys.executable,'-c','import torch; print(torch.cuda.is_available())'],capture_output=True,text=True,timeout=60)
    if check.returncode or check.stdout.strip()!='True':
        raise RuntimeError('NVIDIA runtime installed but CUDA is unavailable. Update your NVIDIA driver, then try again. This GPU may require a newer runtime.')

if __name__=='__main__':
    try:
        main();print('\nORVIO_RESULT '+json.dumps({'ready':True}),flush=True)
    except Exception as error:
        print('\nORVIO_ERROR '+json.dumps(str(error)),flush=True);sys.exit(1)
