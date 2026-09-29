"""MuseTalk 1.5 local inference with explicit crop controls and streamed video.
Model architecture/audio conditioning: https://github.com/TMElyralab/MuseTalk (MIT).
This runner uses a feathered crop, not upstream's DWPose/face-parse compositor.
"""
import pathlib,json,math,subprocess,tempfile
REPOS={
 'muse':('TMElyralab/MuseTalk','2bcb936e2fddb4d86db4c62fd45b387d0c061571',['musetalkV15/musetalk.json','musetalkV15/unet.pth']),
 'vae':('stabilityai/sd-vae-ft-mse','31f26fdeee1355a5c34592e401dd41e45d25a493',['config.json','diffusion_pytorch_model.safetensors']),
 'whisper':('openai/whisper-tiny','169d4a4341b33bc18d8881c4b69c2e104e1cc0af',['config.json','model.safetensors','preprocessor_config.json'])}
def assets(offline):
    from huggingface_hub import snapshot_download
    return {key:snapshot_download(repo,revision=revision,allow_patterns=files,local_files_only=offline) for key,(repo,revision,files) in REPOS.items()}
def frame_count(samples,fps=25):return max(1,math.floor(samples/16000*fps))
def crop_box(box,width,height):
    x,y,w,h=box
    return max(0,round(x*width)),max(0,round(y*height)),min(width,round((x+w)*width)),min(height,round((y+h)*height))
def run(p,emit):
    if p['action']=='install_lipsync':assets(False);return {'ready':True}
    import numpy as np,torch,cv2,imageio_ffmpeg
    from PIL import Image,ImageOps
    from transformers import WhisperModel,WhisperFeatureExtractor
    from diffusers import AutoencoderKL,UNet2DConditionModel
    torch.set_num_threads(2);torch.manual_seed(p['seed'])
    device='cuda' if torch.cuda.is_available() else 'cpu'
    dtype=torch.float16 if device=='cuda' else torch.float32
    emit('PROGRESS','Loading MuseTalk and speech features…')
    files=assets(True)
    unet=UNet2DConditionModel.from_config(json.loads(pathlib.Path(files['muse'],'musetalkV15/musetalk.json').read_text()))
    unet.load_state_dict(torch.load(pathlib.Path(files['muse'],'musetalkV15/unet.pth'),map_location='cpu',weights_only=True));unet.to(device,dtype).eval()
    vae=AutoencoderKL.from_pretrained(files['vae'],use_safetensors=True,local_files_only=True).to(device,dtype).eval();vae.enable_slicing()
    whisper=WhisperModel.from_pretrained(files['whisper'],use_safetensors=True,local_files_only=True).to(device,dtype).eval()
    extractor=WhisperFeatureExtractor.from_pretrained(files['whisper'],local_files_only=True)
    ffmpeg=imageio_ffmpeg.get_ffmpeg_exe();fps=25
    def convert(args):
        result=subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y',*args],capture_output=True)
        if result.returncode:raise ValueError('Media conversion failed: '+result.stderr.decode(errors='replace')[-500:])
    with tempfile.TemporaryDirectory(prefix='orvio-lipsync-') as temp:
        # Limit decoded audio before it reaches model memory.
        pcm=pathlib.Path(temp,'speech.pcm')
        convert(['-i',p['audio'],'-t',str(p['duration']),'-vn','-ac','1','-ar','16000','-f','f32le',str(pcm)])
        audio=np.fromfile(pcm,dtype=np.float32)
        if len(audio)<16000:raise ValueError('Use speech lasting at least one second.')
        count=frame_count(len(audio));duration=count/fps
        features=extractor(audio,sampling_rate=16000,return_tensors='pt').input_features.to(device,dtype)
        with torch.inference_mode():hidden=torch.stack(whisper.encoder(features,output_hidden_states=True).hidden_states,dim=2)[:,:len(audio)//320]
        del whisper
        hidden=torch.cat([torch.zeros_like(hidden[:,:4]),hidden,torch.zeros_like(hidden[:,:12])],dim=1)
        positions=torch.arange(50,device=device).unsqueeze(1);frequencies=torch.exp(torch.arange(0,384,2,device=device)*(-math.log(10000)/384));pe=torch.zeros((1,50,384),device=device,dtype=dtype);pe[:,:,0::2]=torch.sin(positions*frequencies);pe[:,:,1::2]=torch.cos(positions*frequencies)
        reader=None;photo=None
        if p['sourceKind']=='image':
            with Image.open(p['source']) as image:
                image=ImageOps.exif_transpose(image).convert('RGB');image.thumbnail((720,720));photo=np.asarray(image.resize((image.width//2*2,image.height//2*2)))
            height,width=photo.shape[:2]
        else:
            normalized=pathlib.Path(temp,'input.mp4')
            convert(['-i',p['source'],'-an','-vf',"scale=720:720:force_original_aspect_ratio=decrease:force_divisible_by=2,fps=25,tpad=stop_mode=clone:stop_duration=30",'-t',str(duration),'-threads','2',str(normalized)])
            reader=imageio_ffmpeg.read_frames(str(normalized),pix_fmt='rgb24');metadata=next(reader);width,height=metadata['size']
        detector=cv2.CascadeClassifier(cv2.data.haarcascades+'haarcascade_frontalface_default.xml')
        silent=pathlib.Path(temp,'silent.mp4');writer=imageio_ffmpeg.write_frames(str(silent),(width,height),fps=fps,codec='libx264',pix_fmt_in='rgb24',pix_fmt_out='yuv420p',output_params=['-threads','2']);writer.send(None)
        previous=None
        try:
            with torch.inference_mode():
                for i in range(count):
                    frame=photo.copy() if photo is not None else np.frombuffer(next(reader),dtype=np.uint8).reshape(height,width,3).copy()
                    if p.get('box'):box=crop_box(p['box'],width,height)
                    else:
                        detected=detector.detectMultiScale(cv2.cvtColor(frame,cv2.COLOR_RGB2GRAY),1.1,5,minSize=(48,48))
                        if len(detected)!=1:raise ValueError('Use a clear single face, or choose a manual face area. No video has been saved.')
                        x,y,w,h=map(int,detected[0]);box=(x,y,min(width,x+w),min(height,y+h+int(h*.08)))
                        if previous:box=tuple(round(.65*a+.35*b) for a,b in zip(previous,box))
                        previous=box
                    x1,y1,x2,y2=box
                    if x2-x1<24 or y2-y1<24:raise ValueError('The face is too small. Choose a closer portrait.')
                    crop=cv2.resize(frame[y1:y2,x1:x2],(256,256),interpolation=cv2.INTER_LANCZOS4)
                    tensor=torch.from_numpy(crop.copy()).permute(2,0,1).unsqueeze(0).to(device,dtype)/255
                    masked=tensor.clone();masked[:,:,128:]=0
                    latent=torch.cat([vae.encode(masked*2-1).latent_dist.sample(),vae.encode(tensor*2-1).latent_dist.sample()],dim=1)*vae.config.scaling_factor
                    condition=hidden[:,i*2:i*2+10].reshape(1,50,384)+pe
                    prediction=unet(latent,torch.tensor([0],device=device),encoder_hidden_states=condition).sample
                    face=((vae.decode(prediction/vae.config.scaling_factor).sample/2+.5).clamp(0,1)[0].permute(1,2,0).float().cpu().numpy()*255).astype(np.uint8)
                    face=cv2.resize(face,(x2-x1,y2-y1));mask=np.zeros((y2-y1,x2-x1),np.float32);cv2.ellipse(mask,((x2-x1)//2,int((y2-y1)*.65)),(max(1,int((x2-x1)*.44)),max(1,int((y2-y1)*.32))),0,0,360,1,-1);mask=cv2.GaussianBlur(mask,(0,0),max(1,(x2-x1)*.035))[...,None]
                    frame[y1:y2,x1:x2]=(face*mask+frame[y1:y2,x1:x2]*(1-mask)).astype(np.uint8);writer.send(frame)
                    if i%5==0:emit('PROGRESS',f'Lip-sync frame {i+1} of {count} · {round((i+1)/count*100)}%')
        finally:
            writer.close()
            if reader:reader.close()
        convert(['-i',str(silent),'-i',p['audio'],'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-t',str(duration),'-shortest','-movflags','+faststart',p['output']])
    return {'model':'MuseTalk 1.5','seed':p['seed'],'device':device,'width':width,'height':height,'duration':duration,'fps':fps}
