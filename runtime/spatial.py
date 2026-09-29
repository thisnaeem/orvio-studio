"""Local Shap-E text/image to colored mesh. Fixed, supported pipelines only."""
import pathlib,json,os

def generate(p,emit):
    from diffusers import ShapEPipeline,ShapEImg2ImgPipeline
    from diffusers.utils import export_to_ply
    import torch
    model=next(m for m in json.loads(pathlib.Path(__file__).with_name('models.json').read_text()) if m['id']==p['model'] and m['engine']=='spatial')
    cls=ShapEImg2ImgPipeline if model['input']=='image' else ShapEPipeline
    options={'revision':model['revision'],'variant':'fp16','use_safetensors':True}
    if p['action']=='install_spatial':
        cls.download(model['repo'],**options)
        return {'ready':True}
    torch.set_num_threads(2)
    # Shap-E's mesh renderer uses operations not consistently supported by Metal.
    device='cuda' if torch.cuda.is_available() else 'cpu'
    dtype=torch.float16 if device=='cuda' else torch.float32
    emit('PROGRESS','Loading the 3D model…')
    pipe=cls.from_pretrained(model['repo'],**options,torch_dtype=dtype,local_files_only=True).to(device)
    args={'num_inference_steps':p['steps'],'guidance_scale':p['guidance'],'generator':torch.Generator(device=device).manual_seed(p['seed']),'output_type':'mesh'}
    if model['input']=='image':
        from PIL import Image
        with Image.open(p['source']) as image:args['image']=image.convert('RGB').copy()
    else:args['prompt']=p['prompt']
    emit('PROGRESS','Generating a colored 3D mesh. CPU generation can take several minutes…')
    with torch.inference_mode():mesh=pipe(**args).images[0]
    ply=p['output']+'.ply'
    try:
        export_to_ply(mesh,ply)
        import trimesh
        result=trimesh.load(ply,force='mesh',process=False)
        result.export(p['output'],file_type='glb')
    finally:
        pathlib.Path(ply).unlink(missing_ok=True)
    return {'model':model['name'],'seed':p['seed'],'device':device,'vertices':len(result.vertices),'faces':len(result.faces)}
