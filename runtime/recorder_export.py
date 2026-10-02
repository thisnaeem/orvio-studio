"""Render recorder projects from original footage, then preserve the source audio."""
import math, os, pathlib, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFilter, ImageOps

def dimensions(source_size, options):
    sw, sh = source_size
    ratio = sw / sh if options['aspect'] == 'auto' else {'16:9':16/9,'9:16':9/16,'1:1':1,'4:3':4/3}[options['aspect']]
    short = options['resolution']
    width, height = (short * ratio, short) if ratio >= 1 else (short, short / ratio)
    return (max(2, round(width / 2) * 2), max(2, round(height / 2) * 2))

def zoom_at(time, options):
    if not options['autoZoom']: return 1, .5, .5
    for z in options['zooms']:
        if z['start'] <= time <= z['end']:
            edge = min(.45, (z['end']-z['start']) / 3)
            amount = min(1, (time-z['start'])/edge, (z['end']-time)/edge)
            amount = amount * amount * (3-2*amount)
            return 1+(z['scale']-1)*amount, .5+(z['x']-.5)*amount, .5+(z['y']-.5)*amount
    return 1, .5, .5

def background(size, options, image=None):
    if options['background'] == 'image' and image:
        return ImageOps.fit(Image.open(image).convert('RGB'), size, Image.Resampling.LANCZOS)
    first = tuple(bytes.fromhex(options['color'][1:]))
    if options['background'] == 'none': return Image.new('RGB',size,'#111318')
    canvas = Image.new('RGB',size,first)
    if options['background'] == 'gradient':
        second = tuple(bytes.fromhex(options['color2'][1:])); draw=ImageDraw.Draw(canvas)
        for y in range(size[1]):
            t=y/max(1,size[1]-1); color=tuple(round(a+(b-a)*t) for a,b in zip(first,second))
            draw.line((0,y,size[0],y),fill=color)
    return canvas

class Composer:
    def __init__(self, source_size, options, background_file=None):
        self.o=options; self.size=dimensions(source_size, options); self.bg=background(self.size,options,background_file)
        w,h=self.size; padding=0 if options['background']=='none' else min(w,h)*options['padding']/100
        ratio=min((w-2*padding)/source_size[0],(h-2*padding)/source_size[1]); self.frame=(max(1,round(source_size[0]*ratio)),max(1,round(source_size[1]*ratio)))
        fw,fh=self.frame; self.position=(round((w-fw)/2),round((h-fh)/2)); radius=0 if options['background']=='none' else min(options['radius']*min(w,h)/1080,fw/2,fh/2)
        self.mask=Image.new('L',self.frame);ImageDraw.Draw(self.mask).rounded_rectangle((0,0,fw-1,fh-1),radius=radius,fill=255)
        self.base=self.bg.copy()
        if options['shadow'] and options['background']!='none':
            shade=Image.new('RGBA',self.size); opacity=round(options['shadow']/80*150); shadow_mask=Image.new('L',self.size);shadow_mask.paste(self.mask,self.position);shadow_mask=shadow_mask.filter(ImageFilter.GaussianBlur(min(w,h)*.025))
            shade.paste((0,0,0,opacity),(0,0,w,h));shade.putalpha(shadow_mask.point(lambda value:round(value*opacity/255)));self.base=Image.alpha_composite(self.bg.convert('RGBA'),shade).convert('RGB')
    def draw(self, image, time, camera=None):
        frame=self.base.copy(); scale,x,y=zoom_at(time,self.o); iw,ih=image.size;cw,ch=iw/scale,ih/scale;left=max(0,min(iw-cw,x*iw-cw/2));top=max(0,min(ih-ch,y*ih-ch/2))
        image=image.crop((round(left),round(top),round(left+cw),round(top+ch))).resize(self.frame,Image.Resampling.BICUBIC);frame.paste(image,self.position,self.mask)
        if camera is not None and self.o['showCamera']:
            if self.o['cameraMirror']: camera=ImageOps.mirror(camera)
            w,h=self.size; cw=round(min(w,h)*self.o['cameraSize']/100);ch=cw if self.o['cameraShape']=='circle' else round(cw*.75);camera=ImageOps.fit(camera,(cw,ch),Image.Resampling.BICUBIC)
            mask=Image.new('L',(cw,ch));draw=ImageDraw.Draw(mask)
            if self.o['cameraShape']=='circle': draw.ellipse((0,0,cw-1,ch-1),fill=255)
            else: draw.rounded_rectangle((0,0,cw-1,ch-1),radius=cw*.12,fill=255)
            margin=round(min(w,h)*.035);pos=(margin if 'left' in self.o['cameraPosition'] else w-cw-margin,margin if 'top' in self.o['cameraPosition'] else h-ch-margin);frame.paste(camera,pos,mask)
        return frame

def render(p, ffmpeg, imageio_ffmpeg, report):
    options=p['options']; start=options['start'];source=p['source']; probe=imageio_ffmpeg.read_frames(source)
    try: metadata=next(probe)
    finally: probe.close()
    duration=metadata.get('duration') or imageio_ffmpeg.count_frames_and_secs(source)[1]
    end=options['end'] or duration
    if not math.isfinite(duration) or not 0<=start<end<=duration+.15: raise ValueError('Trim must be inside the recording duration.')
    fps=min(60,metadata.get('fps') or 30); composer=Composer(metadata['size'],options,p.get('background'));camera_reader=None
    reader=imageio_ffmpeg.read_frames(source,input_params=['-ss',str(start)]);meta=next(reader)
    if p.get('camera') and options['showCamera']:
        camera_reader=imageio_ffmpeg.read_frames(p['camera'],input_params=['-ss',str(start)]);cam_meta=next(camera_reader);cam_index=-1;camera=None
    with tempfile.TemporaryDirectory(prefix='orvio-recording-') as folder:
        silent=str(pathlib.Path(folder,'video.mp4'));writer=imageio_ffmpeg.write_frames(silent,composer.size,fps=fps,codec='libx264',pix_fmt_in='rgb24',pix_fmt_out='yuv420p',macro_block_size=1,output_params=['-preset','veryfast','-threads','2']);writer.send(None);count=0
        try:
            for i, raw in enumerate(reader):
                time=start+i/fps
                if time>=end: break
                image=Image.frombytes('RGB',meta['size'],raw)
                if camera_reader:
                    target=math.floor(i/fps*(cam_meta.get('fps') or fps))
                    while cam_index<target:
                        try: camera=Image.frombytes('RGB',cam_meta['size'],next(camera_reader));cam_index+=1
                        except StopIteration: cam_index=target;break
                writer.send(composer.draw(image,time,camera if camera_reader else None).tobytes());count+=1
                if i%max(1,round(fps))==0: report({'message':f'Rendering {min(100,round((time-start)/(end-start)*100))}%','received':time-start,'total':end-start})
        finally:
            writer.close();reader.close()
            if camera_reader: camera_reader.close()
        if not count: raise ValueError('The recording contained no frames in this trim.')
        result=subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-i',silent,'-ss',str(start),'-i',source,'-map','0:v:0','-map','1:a:0?','-c:v','copy','-c:a','aac','-t',str(count/fps),'-movflags','+faststart',p['output']],capture_output=True)
        if result.returncode: raise ValueError(result.stderr.decode(errors='replace')[-1200:])
    return {'duration':count/fps,'width':composer.size[0],'height':composer.size[1],'fps':fps}
