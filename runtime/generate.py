"""Built-in diffusion pipelines. Catalog entries select supported, explicit routes."""
import os,pathlib,json,time
from inference_device import select_device,configure

_cache=None

def clear_cache():
    global _cache
    _cache=None
    import gc
    gc.collect()
    import torch
    if torch.cuda.is_available(): torch.cuda.empty_cache()
    elif hasattr(torch.backends,'mps') and torch.backends.mps.is_available(): torch.mps.empty_cache()

BASE='stable-diffusion-v1-5/stable-diffusion-v1-5'
def route(model):
    return 'ltx' if model.get('pipeline')=='ltx' else 'text-to-video' if model.get('pipeline')=='text-to-video' else 'animatediff' if model['kind']=='video' else 'image'
def dimensions(model):
    return int(model.get('width',512)),int(model.get('height',512)),int(model.get('frames',16)),int(model.get('fps',8))

def generate(p,emit):
    global _cache
    catalog=json.loads(pathlib.Path(__file__).with_name('models.json').read_text())
    selected=next((m for m in catalog if m['id']==p['model']),None)
    if selected and selected['engine']=='modern-image':
        from modern_image import generate as generate_modern
        return generate_modern(p,emit,selected)
    if selected and selected['engine']=='ltx':
        from ltx import generate as generate_ltx
        return generate_ltx(p,emit,selected)
    import torch
    from diffusers import AutoPipelineForText2Image,AutoPipelineForImage2Image,AnimateDiffPipeline,MotionAdapter,EulerDiscreteScheduler,DiffusionPipeline,TextToVideoSDPipeline,DPMSolverMultistepScheduler
    from huggingface_hub import hf_hub_download
    from safetensors.torch import load_file
    torch.set_num_threads(2)
    catalog=json.loads(pathlib.Path(__file__).with_name('models.json').read_text())
    model=next((m for m in catalog if m['id']==p['model'] and m['engine']=='diffusion'),None)
    if not model: raise ValueError('Choose a supported built-in image or video model.')
    pipeline=route(model)
    if p['action']=='install_model':
        if p.get('source'):
            if not pathlib.Path(p['source'],'model_index.json').is_file(): raise ValueError('The existing model folder is no longer available.')
            return {'ready':True}
        if pipeline=='animatediff':
            hf_hub_download(model['repo'],model['adapter'])
            DiffusionPipeline.download(model.get('baseRepo',BASE),use_safetensors=True)
        else: DiffusionPipeline.download(model['repo'],use_safetensors=model.get('weights')!='bin')
        return {'ready':True}
    started=time.monotonic()
    device=select_device(torch,p.get('device','auto'))
    cache_key=(model['id'],p.get('source'),device,bool(p.get('image')))
    reused=_cache is not None and _cache[0]==cache_key
    if reused:
        _,pipe,execution,scheduler_type,scheduler_config=_cache
        pipe.scheduler=scheduler_type.from_config(scheduler_config)
    else:
        clear_cache()
        emit('PROGRESS','Preparing…')
        dtype=torch.float16 if device in ('cuda','mps') else torch.float32
        os.environ['HF_HUB_OFFLINE']='1'
        options={'torch_dtype':dtype,'use_safetensors':model.get('weights')!='bin','local_files_only':True}
        if pipeline=='animatediff':
            adapter=MotionAdapter()
            adapter.load_state_dict(load_file(hf_hub_download(model['repo'],model['adapter'],local_files_only=True)))
            pipe=AnimateDiffPipeline.from_pretrained(model.get('baseRepo',BASE),motion_adapter=adapter,**options)
            pipe.scheduler=EulerDiscreteScheduler.from_config(pipe.scheduler.config,timestep_spacing='trailing',beta_schedule='linear')
        elif pipeline=='text-to-video':
            pipe=TextToVideoSDPipeline.from_pretrained(model['repo'],**options)
            pipe.scheduler=DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
            pipe.unet.enable_forward_chunking(chunk_size=1,dim=1)
        else:
            factory=AutoPipelineForImage2Image if p.get('image') else AutoPipelineForText2Image
            pipe=factory.from_pretrained(p.get('source') or model['repo'],**options)
        execution=configure(pipe,torch,device,model['kind']=='video')
        _cache=(cache_key,pipe,execution,type(pipe.scheduler),dict(pipe.scheduler.config))
    if device=='cuda':
        torch.cuda.synchronize()
        torch.cuda.reset_peak_memory_stats()
    load_seconds=time.monotonic()-started
    device_label=execution['deviceName'] + (' · memory saving' if execution['memoryMode']=='offload' else '')
    emit('PROGRESS',{'message':'Creating…','device':device,'deviceName':execution['deviceName']})
    seed=int(p['seed']) if p.get('seed') is not None else int.from_bytes(os.urandom(4),'little')
    generator=torch.Generator(device='cpu').manual_seed(seed)
    def progress(_pipe,step,_time,kwargs):
        emit('PROGRESS',f'Creating · {round((step+1)/steps*100)}%')
        return kwargs
    width,height,frames,fps=dimensions(model)
    width=int(p.get('width',width));height=int(p.get('height',height));frames=int(p.get('frames',frames));fps=int(p.get('fps',fps))
    steps=int(p.get('steps',model.get('steps',4 if model['kind']=='video' else 20)));guidance=float(p.get('guidance',model.get('guidance',1.0 if model['kind']=='video' else 7.5)))
    if p.get('sampler')=='euler':pipe.scheduler=EulerDiscreteScheduler.from_config(pipe.scheduler.config)
    elif p.get('sampler')=='dpm':pipe.scheduler=DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
    args={'prompt':p['prompt'],'generator':generator,'height':height,'width':width}
    if p.get('image') and model.get('imageInput')=='img2img':
        from modern_image import source_image
        args.update(image=source_image(p['image'],width,height),strength=float(p.get('strength',.7)))
    if p.get('negativePrompt') and guidance>1:args['negative_prompt']=p['negativePrompt']
    if pipeline=='text-to-video': args.update(callback=lambda step,time,latents:emit('PROGRESS',f'Creating · {round((step+1)/steps*100)}%'),callback_steps=1)
    else: args['callback_on_step_end']=progress
    inference_started=time.monotonic()
    if model['kind']=='video':
        import imageio_ffmpeg,numpy as np
        with torch.inference_mode():
            result=pipe(**args,num_frames=frames,num_inference_steps=steps,guidance_scale=guidance,output_type='pil').frames[0]
        writer=imageio_ffmpeg.write_frames(p['output'],(width,height),fps=fps,codec='libx264',pix_fmt_in='rgb24',pix_fmt_out='yuv420p',output_params=['-threads','2'])
        writer.send(None)
        try:
            for frame in result: writer.send(np.asarray(frame.convert('RGB')))
        finally: writer.close()
    else:
        with torch.inference_mode():
            result=pipe(**args,num_inference_steps=steps,guidance_scale=guidance)
        if getattr(result,'nsfw_content_detected',None) and any(result.nsfw_content_detected): raise ValueError('The model did not return a usable image. Try a different prompt.')
        result.images[0].save(p['output'])
    if device=='cuda': torch.cuda.synchronize()
    inference_seconds=time.monotonic()-inference_started
    return {'loadSeconds':round(load_seconds,2),'generationSeconds':round(inference_seconds,2),'reusedModel':reused,'peakVRAMGB':round(torch.cuda.max_memory_allocated()/1024**3,2) if device=='cuda' else 0,'seed':seed,**execution,'seconds':round(time.monotonic()-started,2),'model':model['name'],'width':width,'height':height,**({'frames':frames,'fps':fps,'duration':frames/fps} if model['kind']=='video' else {})}
