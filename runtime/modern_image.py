"""Pinned Z-Image and Qwen Image 2.1 pipelines in a separate runtime."""
import json, os, pathlib, time
from inference_device import select_device, configure


def source_image(filename, width=None, height=None):
    from PIL import Image, ImageOps
    with Image.open(filename) as source:
        image = ImageOps.exif_transpose(source).convert('RGBA' if 'A' in source.getbands() else 'RGB')
        image.load()
    if width and height:
        image = ImageOps.fit(image.convert('RGB'), (width, height), method=Image.Resampling.LANCZOS)
    return image


def call_options(model, p):
    options = dict(prompt=p['prompt'], width=int(p.get('width',1024)), height=int(p.get('height',1024)), num_inference_steps=int(p.get('steps',model['steps'])))
    if model['pipeline'] == 'qwen-image-21':
        options['true_cfg_scale'] = 1.0
    else:
        options['guidance_scale'] = 0.0
        if p.get('image'): options['strength'] = float(p.get('strength',.7))
    return options


def generate(p, emit, model):
    from huggingface_hub import snapshot_download
    manifest = json.loads(pathlib.Path(__file__).with_name('model-download-sizes.json').read_text(encoding='utf-8'))[model['id']]['sources'][0]
    # The size shown in the library and the downloaded file set are identical.
    folder = snapshot_download(model['repo'], revision=model['revision'], allow_patterns=[f['path'] for f in manifest['files']], local_files_only=p['action']!='install_model')
    if p['action']=='install_model': return {'ready':True}
    import torch
    from diffusers import ZImagePipeline, ZImageImg2ImgPipeline, QwenImage21Pipeline
    started=time.monotonic()
    device=select_device(torch,p.get('device','auto'))
    dtype=torch.bfloat16 if device=='cuda' and torch.cuda.is_bf16_supported() else torch.float16 if device in ('cuda','mps') else torch.float32
    factory=QwenImage21Pipeline if model['pipeline']=='qwen-image-21' else ZImageImg2ImgPipeline if p.get('image') else ZImagePipeline
    emit('PROGRESS','Loading '+model['name'])
    pipe=factory.from_pretrained(folder,torch_dtype=dtype,local_files_only=True)
    if hasattr(pipe.vae,'enable_tiling'): pipe.vae.enable_tiling()
    # Model offload alone cannot fit a whole 7B transformer onto an 8 GB card.
    largest=max((sum(x.numel()*x.element_size() for x in c.parameters()) for c in pipe.components.values() if hasattr(c,'parameters')),default=0)
    if device=='cuda' and largest+2*1024**3>torch.cuda.mem_get_info()[0]:
        pipe.enable_sequential_cpu_offload()
        execution={'device':'cuda','deviceName':torch.cuda.get_device_name(),'memoryMode':'sequential-offload'}
        emit('PROGRESS','GPU with layer offloading - saves VRAM, but may be slow')
    else: execution=configure(pipe,torch,device)
    args=call_options(model,p)
    if p.get('image'):
        args['image']=source_image(p['image']) if model['imageInput']=='edit' else source_image(p['image'],args['width'],args['height'])
    seed=int(p['seed']) if p.get('seed') is not None else int.from_bytes(os.urandom(4),'little')
    args['generator']=torch.Generator(device='cpu').manual_seed(seed)
    def progress(_pipe,step,_time,kwargs):
        emit('PROGRESS',f"Generating image - step {step+1}")
        return kwargs
    args['callback_on_step_end']=progress
    with torch.inference_mode(): image=pipe(**args).images[0]
    image.save(p['output'])
    return {'seed':seed,**execution,'seconds':round(time.monotonic()-started,2),'model':model['name'],'width':image.width,'height':image.height}
