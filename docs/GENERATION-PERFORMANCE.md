# Generation responsiveness and acceleration

Studio edits remain available during generation. Each batch keeps the request values captured when Generate was pressed. A second inference job remains blocked to avoid competing for limited memory; downloads and navigation stay available. Pending cards retain the original kind and batch count.

Diffusion selects CUDA, then Apple Metal, then CPU. CUDA and Metal use FP16; CPU uses FP32. CUDA estimates loaded parameter bytes against currently free VRAM, retaining headroom for activations and display use. It keeps the pipeline resident when possible and uses Diffusers model CPU offload with VAE tiling when constrained. These estimates cannot guarantee that every resolution fits. Memory errors explain how to reduce the workload. CUDA retains PyTorch SDPA rather than always enabling serialized attention slicing. Metal uses slicing and tiling to limit unified-memory pressure.

Progress displays the execution device. Completed assets record device name, placement mode and total generation time including loading. Progress broadcasts are limited to five per second; terminal state is still sent immediately. Worker BLAS pools are bounded to reduce CPU oversubscription.

On Windows, the first diffusion/spatial/lip-sync generation per engine session checks whether Torch is CPU-only and NVIDIA is detected. If so, it installs the official pinned PyTorch 2.6 CUDA 12.6 wheel into the app's isolated environment, then verifies CUDA in a fresh process. This first-use download can be large. Existing CUDA builds are not replaced. Unsupported or newer GPU architectures may require a newer tested runtime. AMD Windows acceleration is not added in this change.

Sources: https://huggingface.co/docs/diffusers/optimization/memory and https://github.com/Comfy-Org/ComfyUI/blob/master/comfy/model_management.py . This uses supported Diffusers placement APIs, not a ComfyUI backend replacement. Model workers still load per job; persistent caching and full ComfyUI backend parity are not implemented. Voice/chat runtime GPU support is unchanged.

Validation: build, JavaScript suite and Python device-policy tests. No app launch, GPU generation, runtime installation or comparative performance benchmark was performed in this session. Policy tests use fake hardware; they do not establish a speedup.
