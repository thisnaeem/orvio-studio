"""Pinned official LTX checkpoints through the Diffusers conditioning pipeline."""
import time
from inference_device import select_device

DISTILLED_TIMESTEPS = [1000, 993, 987, 981, 975, 909, 725, 0.03]

def inference_args(p, model):
    width, height = int(p.get('width',512)), int(p.get('height',320))
    frames, fps = int(p.get('frames',25)), int(p.get('fps',24))
    if width % 32 or height % 32 or (frames-1) % 8:
        raise ValueError('LTX needs dimensions divisible by 32 and a frame count of 8n + 1.')
    args = dict(prompt=p['prompt'], width=width, height=height, num_frames=frames,
                frame_rate=fps, num_inference_steps=int(p.get('steps',model['steps'])),
                guidance_scale=float(p.get('guidance',model['guidance'])),
                decode_timestep=0.05, decode_noise_scale=0.025, output_type='pil')
    if model['parameterProfile']=='ltx-distilled':
        args.update(timesteps=DISTILLED_TIMESTEPS, num_inference_steps=8,
                    guidance_scale=1.0, image_cond_noise_scale=0.0)
    elif p.get('negativePrompt') and args['guidance_scale']>1:
        args['negative_prompt']=p['negativePrompt']
    return args

def generate(p, emit, model):
    import torch
    from diffusers import LTXConditionPipeline
    options=dict(revision=model['revision'],use_safetensors=True)
    if p['action']=='install_model':
        emit('PROGRESS','Downloading LTX transformer, video decoder and T5 text encoder…')
        LTXConditionPipeline.download(model['repo'],**options)
        return {'ready':True}
    started=time.monotonic()
    device=select_device(torch,p.get('device','auto'),allow_mps=False)
    dtype=torch.bfloat16 if device=='cuda' and torch.cuda.is_bf16_supported() else torch.float32
    torch.set_num_threads(2)
    emit('PROGRESS','Loading LTX · '+device.upper())
    pipe=LTXConditionPipeline.from_pretrained(model['repo'],**options,torch_dtype=dtype,local_files_only=True)
    pipe.vae.enable_tiling()
    if device=='cuda':
        # T5 and the 13B transformer can exceed 8 GB individually. Stage submodules,
        # rather than moving a whole model to the GPU as model CPU offload would.
        pipe.enable_sequential_cpu_offload()
        device_name=torch.cuda.get_device_name(0)
    else:
        pipe.to('cpu');device_name='CPU'
    args=inference_args(p,model)
    if p.get('image'):
        from PIL import Image,ImageOps
        with Image.open(p['image']) as image:
            args['image']=ImageOps.fit(image.convert('RGB'),(args['width'],args['height']))
    seed=int(p['seed'])
    args['generator']=torch.Generator(device='cpu').manual_seed(seed)
    def progress(_pipe,step,_timestep,values):
        emit('PROGRESS',f'{device_name} · LTX step {step+1}/{args["num_inference_steps"]}')
        return values
    args['callback_on_step_end']=progress
    try:
        with torch.inference_mode():frames=pipe(**args).frames[0]
    except torch.OutOfMemoryError:
        raise ValueError('Not enough memory for this LTX clip. Choose the 2B model, a smaller ratio preset or a shorter duration, and close other GPU apps.') from None
    import imageio_ffmpeg,numpy as np
    emit('PROGRESS','Encoding your LTX video…')
    writer=imageio_ffmpeg.write_frames(p['output'],(args['width'],args['height']),fps=args['frame_rate'],codec='libx264',pix_fmt_in='rgb24',pix_fmt_out='yuv420p',output_params=['-threads','2'],macro_block_size=1)
    writer.send(None)
    try:
        for frame in frames:writer.send(np.asarray(frame.convert('RGB')))
    finally:writer.close()
    return dict(model=model['name'],seed=seed,device=device,deviceName=device_name,
                memoryMode='sequential-offload' if device=='cuda' else 'cpu',
                width=args['width'],height=args['height'],frames=len(frames),fps=args['frame_rate'],
                duration=len(frames)/args['frame_rate'],seconds=round(time.monotonic()-started,2))
