"""Device-aware placement without reserving every byte of graphics memory."""
import os

def select_device(torch):
    if torch.cuda.is_available():
        return 'cuda'
    if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
        return 'mps'
    return 'cpu'

def memory_mode(free_bytes, weight_bytes, video=False):
    # Activation headroom is an estimate, not a guarantee for arbitrary resolutions.
    reserve = max(2 * 1024**3, weight_bytes * (1.0 if video else .5))
    return 'resident' if free_bytes >= weight_bytes + reserve else 'offload'

def configure(pipe, torch, device, video=False):
    torch.set_num_threads(max(1, min(4, (os.cpu_count() or 2)//2)))
    if hasattr(pipe, 'enable_vae_slicing'): pipe.enable_vae_slicing()
    mode = 'resident'
    if device == 'cuda':
        torch.backends.cuda.matmul.allow_tf32 = True
        free, _ = torch.cuda.mem_get_info()
        seen=set();weights=0
        for component in pipe.components.values():
            if hasattr(component, 'parameters'):
                for param in component.parameters():
                    if id(param) not in seen:
                        seen.add(id(param));weights += param.numel()*param.element_size()
        mode = memory_mode(free, weights, video)
        if mode == 'offload':
            if hasattr(pipe, 'enable_vae_tiling'): pipe.enable_vae_tiling()
            pipe.enable_model_cpu_offload()
        else: pipe.to(device)
        # PyTorch SDPA handles attention efficiently; slicing would serialize it.
    elif device == 'mps':
        pipe.enable_attention_slicing()
        if hasattr(pipe, 'enable_vae_tiling'): pipe.enable_vae_tiling()
        pipe.to(device)
    else:
        if not hasattr(torch.nn.functional, 'scaled_dot_product_attention'):
            pipe.enable_attention_slicing()
        pipe.to(device)
    name=torch.cuda.get_device_name() if device=='cuda' else 'Apple Metal' if device=='mps' else 'CPU'
    return {'device':device,'deviceName':name,'memoryMode':mode}
