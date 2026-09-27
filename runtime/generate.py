"""In-process diffusion pipelines; no ComfyUI or external inference service."""
import os,pathlib,json

def generate(p,emit):
    import torch
    from diffusers import AutoPipelineForText2Image,AnimateDiffPipeline,MotionAdapter,EulerDiscreteScheduler,DiffusionPipeline
    from huggingface_hub import hf_hub_download
    from safetensors.torch import load_file
    torch.set_num_threads(2)
    catalog=json.loads(pathlib.Path(__file__).with_name('models.json').read_text())
    model=next((m for m in catalog if m['id']==p['model'] and m['engine']=='diffusion'),None)
    if not model: raise ValueError('Choose a supported built-in image or video model.')
    if p['action']=='install_model':
        if p.get('source'):
            if not pathlib.Path(p['source'],'model_index.json').is_file(): raise ValueError('The existing model folder is no longer available.')
            return {'ready':True}
        if model['kind']=='video':
            hf_hub_download(model['repo'],model.get('adapter','animatediff_lightning_4step_diffusers.safetensors'))
            DiffusionPipeline.download('stable-diffusion-v1-5/stable-diffusion-v1-5',use_safetensors=True)
        else: DiffusionPipeline.download(model['repo'],use_safetensors=True)
        return {'ready':True}
    device='cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu'
    dtype=torch.float16 if device=='cuda' else torch.float32
    if p['action']=='generate_model': os.environ['HF_HUB_OFFLINE']='1'
    options={'torch_dtype':dtype,'use_safetensors':True}
    if model['kind']=='video':
        adapter=MotionAdapter()
        adapter.load_state_dict(load_file(hf_hub_download(model['repo'],model.get('adapter','animatediff_lightning_4step_diffusers.safetensors'))))
        pipe=AnimateDiffPipeline.from_pretrained('stable-diffusion-v1-5/stable-diffusion-v1-5',motion_adapter=adapter,**options)
        pipe.scheduler=EulerDiscreteScheduler.from_config(pipe.scheduler.config,timestep_spacing='trailing',beta_schedule='linear')
    else: pipe=AutoPipelineForText2Image.from_pretrained(p.get('source') or model['repo'],**options)
    pipe.enable_attention_slicing();pipe.enable_vae_slicing();pipe.to(device)
    seed=int(p.get('seed',0)) or int.from_bytes(os.urandom(4),'little')
    generator=torch.Generator(device='cpu').manual_seed(seed)
    def progress(_pipe,step,_time,kwargs):
        emit('PROGRESS',f'Generating frame details · step {step+1}')
        return kwargs
    args={'prompt':p['prompt'],'generator':generator,'height':512,'width':512,'callback_on_step_end':progress}
    if model['kind']=='video':
        import imageio_ffmpeg,numpy as np
        result=pipe(**args,num_frames=16,num_inference_steps=model.get('steps',4),guidance_scale=1.0).frames[0]
        writer=imageio_ffmpeg.write_frames(p['output'],(512,512),fps=8,codec='libx264',pix_fmt_in='rgb24',pix_fmt_out='yuv420p',output_params=['-threads','2'])
        writer.send(None)
        try:
            for frame in result: writer.send(np.asarray(frame.convert('RGB')))
        finally: writer.close()
    else:
        result=pipe(**args,num_inference_steps=model.get('steps',20),guidance_scale=model.get('guidance',7.5))
        if getattr(result,'nsfw_content_detected',None) and any(result.nsfw_content_detected): raise ValueError('The model did not return a usable image. Try a different prompt.')
        result.images[0].save(p['output'])
    return {'seed':seed,'device':device,'model':model['name']}
