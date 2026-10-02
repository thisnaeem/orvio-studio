"""Render recorder projects from original footage, then preserve the source audio."""
import math, os, pathlib, subprocess, tempfile, bisect
from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageFont

def dimensions(source_size, options):
    sw, sh = source_size
    ratio = sw / sh if options['aspect'] == 'auto' else {'16:9':16/9,'9:16':9/16,'1:1':1,'4:3':4/3}[options['aspect']]
    short = options['resolution']
    width, height = (short * ratio, short) if ratio >= 1 else (short, short / ratio)
    return (max(2, round(width / 2) * 2), max(2, round(height / 2) * 2))

def zoom_at(time, options):
    if not options['autoZoom']: return 1, .5, .5
    points=options.get('cursor',[])
    if options.get('zoomMode')=='cursor':
        if not points: return 1,.5,.5
        end=options['end'] or options.get('cursorDuration') or points[-1]['time']
        amount=max(0,min(1,(time-options['start'])/.6,(end-time)/.6)); ease=amount*amount*(3-2*amount)
        index=min(len(points)-1,bisect.bisect_left(points,time,key=lambda p:p['time']))
        a,b=points[max(0,index-1)],points[index]; t=max(0,min(1,(time-a['time'])/(b['time']-a['time'] or 1)))
        x=a['x']+(b['x']-a['x'])*t; y=a['y']+(b['y']-a['y'])*t
        return 1+(options.get('zoomStrength',1.7)-1)*ease,.5+(x-.5)*ease,.5+(y-.5)*ease
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
    def draw(self, image, time, camera=None, timeline_time=None):
        if timeline_time is None: timeline_time=time
        frame=self.base.copy(); scale,x,y=zoom_at(time,self.o); iw,ih=image.size;cw,ch=iw/scale,ih/scale;left=max(0,min(iw-cw,x*iw-cw/2));top=max(0,min(ih-ch,y*ih-ch/2))
        image=image.crop((round(left),round(top),round(left+cw),round(top+ch))).resize(self.frame,Image.Resampling.BICUBIC);frame.paste(image,self.position,self.mask)
        if camera is not None and self.o['showCamera'] and timeline_time>=self.o.get('cameraStart',0) and (not self.o.get('cameraEnd') or timeline_time<=self.o['cameraEnd']):
            if self.o['cameraMirror']: camera=ImageOps.mirror(camera)
            w,h=self.size; cw=round(min(w,h)*self.o['cameraSize']/100);ch=cw if self.o['cameraShape']=='circle' else round(cw*.75);camera=ImageOps.fit(camera,(cw,ch),Image.Resampling.BICUBIC)
            mask=Image.new('L',(cw,ch));draw=ImageDraw.Draw(mask)
            if self.o['cameraShape']=='circle': draw.ellipse((0,0,cw-1,ch-1),fill=255)
            else: draw.rounded_rectangle((0,0,cw-1,ch-1),radius=cw*.12,fill=255)
            margin=round(min(w,h)*.035);pos=(margin if 'left' in self.o['cameraPosition'] else w-cw-margin,margin if 'top' in self.o['cameraPosition'] else h-ch-margin);x=self.o.get('cameraX'); y=self.o.get('cameraY')
            if x is not None or y is not None: pos=(max(0,min(w-cw,round(x*w-cw/2))) if x is not None else pos[0],max(0,min(h-ch,round(y*h-ch/2))) if y is not None else pos[1])
            frame.paste(camera,pos,mask)
        captions=[{**c,'x':.5,'y':self.o.get('captionY',.85),'size':self.o.get('captionSize',46),'color':self.o.get('captionColor','#ffffff'),'box':self.o.get('captionBox',True)} for c in self.o.get('captions',[])] if self.o.get('showCaptions',True) else []
        for layer in self.o.get('texts',[])+captions:
            if not layer['start']<=timeline_time<=layer['end'] or not layer['text']: continue
            font_size=max(8,round(layer['size']*min(self.size)/1080)); font=None
            for filename in ['/System/Library/Fonts/Supplemental/Arial Bold.ttf','C:/Windows/Fonts/arialbd.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
                try: font=ImageFont.truetype(filename,font_size); break
                except OSError: pass
            if font is None: font=ImageFont.load_default(size=font_size)
            overlay=Image.new('RGBA',self.size);draw=ImageDraw.Draw(overlay);x,y=layer['x']*self.size[0],layer['y']*self.size[1]
            bounds=draw.multiline_textbbox((x,y),layer['text'],font=font,anchor='mm',align='center',spacing=round(font_size*.3))
            if layer['box']:
                pad=font_size*.5;draw.rounded_rectangle((bounds[0]-pad,bounds[1]-pad*.5,bounds[2]+pad,bounds[3]+pad*.5),radius=font_size*.2,fill=(17,19,24,204))
            draw.multiline_text((x,y),layer['text'],font=font,anchor='mm',align='center',spacing=round(font_size*.3),fill=layer['color'])
            frame=Image.alpha_composite(frame.convert('RGBA'),overlay).convert('RGB')
        return frame

def render(p, ffmpeg, imageio_ffmpeg, report):
    options=p['options']; start=options['start'];source=p['source']; probe=imageio_ffmpeg.read_frames(source)
    try: metadata=next(probe)
    finally: probe.close()
    duration=metadata.get('duration') or imageio_ffmpeg.count_frames_and_secs(source)[1]
    end=options['end'] or duration
    if not math.isfinite(duration) or not 0<=start<end<=duration+.15: raise ValueError('Trim must be inside the recording duration.')
    fps=min(60,metadata.get('fps') or 30); composer=Composer(metadata['size'],options,p.get('background'))
    clips=options.get('clips') or [{'start':start,'end':end}]
    for clip in clips:
        if not 0<=clip['start']<clip['end']<=duration+.15: raise ValueError('A clip is outside the source duration.')
    total=sum(c['end']-c['start'] for c in clips); count=0; rendered_lengths=[]
    with tempfile.TemporaryDirectory(prefix='orvio-recording-') as folder:
        silent=str(pathlib.Path(folder,'video.mp4'));writer=imageio_ffmpeg.write_frames(silent,composer.size,fps=fps,codec='libx264',pix_fmt_in='rgb24',pix_fmt_out='yuv420p',macro_block_size=1,output_params=['-preset','veryfast','-threads','2']);writer.send(None)
        try:
            for clip in clips:
                reader=imageio_ffmpeg.read_frames(source,input_params=['-ss',str(clip['start'])],output_params=['-vf',f'fps={fps}']);meta=next(reader);camera_reader=None;segment_count=0
                if p.get('camera') and options['showCamera']:
                    camera_reader=imageio_ffmpeg.read_frames(p['camera'],input_params=['-ss',str(clip['start'])]);cam_meta=next(camera_reader);cam_index=-1;camera=None
                try:
                    for i,raw in enumerate(reader):
                        time=clip['start']+i/fps
                        if time>=clip['end']: break
                        image=Image.frombytes('RGB',meta['size'],raw)
                        if camera_reader:
                            target=math.floor(i/fps*(cam_meta.get('fps') or fps))
                            while cam_index<target:
                                try: camera=Image.frombytes('RGB',cam_meta['size'],next(camera_reader));cam_index+=1
                                except StopIteration: cam_index=target;break
                        writer.send(composer.draw(image,time,camera if camera_reader else None,count/fps).tobytes());count+=1;segment_count+=1
                        if count%max(1,round(fps))==0: report({'message':f'Rendering {min(100,round(count/fps/total*100))}%','received':count/fps,'total':total})
                finally:
                    reader.close()
                    if camera_reader: camera_reader.close()
                rendered_lengths.append(segment_count/fps)
        finally: writer.close()
        if not count: raise ValueError('The recording contained no frames in this trim.')
        has_audio='Audio:' in subprocess.run([ffmpeg,'-hide_banner','-i',source],capture_output=True,timeout=30).stderr.decode(errors='replace')
        args=[ffmpeg,'-hide_banner','-loglevel','error','-y','-i',silent]
        if has_audio and options.get('volume',1)>0:
            filters=[]
            for index,(clip,length) in enumerate(zip(clips,rendered_lengths)):
                filters.append(f"[1:a:0]atrim=start={clip['start']}:end={clip['end']},asetpts=PTS-STARTPTS,apad,atrim=duration={length}[a{index}]")
            filters.append(''.join(f'[a{i}]' for i in range(len(clips)))+f"concat=n={len(clips)}:v=0:a=1,volume={options.get('volume',1)}[audio]")
            args+=['-i',source,'-filter_complex',';'.join(filters),'-map','0:v:0','-map','[audio]','-c:a','aac']
        else: args+=['-map','0:v:0']
        result=subprocess.run(args+['-c:v','copy','-t',str(count/fps),'-movflags','+faststart',p['output']],capture_output=True)
        if result.returncode: raise ValueError(result.stderr.decode(errors='replace')[-1200:])
    return {'duration':count/fps,'width':composer.size[0],'height':composer.size[1],'fps':fps}
