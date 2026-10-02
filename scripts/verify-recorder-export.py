"""Synthetic, offline regression check for recorder composition and audio export."""
import json, pathlib, subprocess, sys
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'runtime'))
import imageio_ffmpeg
from PIL import Image
from recorder_export import render, Composer, zoom_at
root=pathlib.Path(__file__).resolve().parents[1]
folder=root/'.runtime-cache/recorder-smoke';folder.mkdir(parents=True,exist_ok=True)
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
def run(args):
    result=subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y',*args],capture_output=True)
    if result.returncode: raise AssertionError(result.stderr.decode())
source=folder/'source.mp4';camera=folder/'camera.mp4';output=folder/'styled.mp4'
run(['-f','lavfi','-i','testsrc2=size=640x360:rate=12','-f','lavfi','-i','sine=frequency=440:sample_rate=44100','-t','4','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',str(source)])
run(['-f','lavfi','-i','color=c=red:size=160x120:rate=12','-t','4','-c:v','libx264','-pix_fmt','yuv420p',str(camera)])
options=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./electron/recorder-project.cjs').defaults))"],cwd=root))
options.update({'zoomMode':'moments','resolution':720,'aspect':'1:1','start':.5,'end':2.5,'padding':12,'cameraSize':25,'cameraPosition':'top-left','cameraMirror':False,'zooms':[{'start':.7,'end':2.3,'x':.8,'y':.4,'scale':2}]})
assert zoom_at(.5,options)==(1,.5,.5)
assert zoom_at(1.5,options)[0]==2
frame=Composer((640,360),options).draw(Image.new('RGB',(640,360),'green'),1.5,Image.new('RGB',(160,120),'red'))
assert frame.size==(720,720)
assert frame.getpixel((100,100))==(255,0,0), 'Camera position was not rendered'
assert frame.getpixel((360,360))==(0,128,0), 'Main footage was not rendered'
frame.save(folder/'source.png')
result=render({'source':str(source),'camera':str(camera),'output':str(output),'options':options},ffmpeg,imageio_ffmpeg,lambda value:None)
assert abs(result['duration']-2)<.1, result
probe=subprocess.run([ffmpeg,'-i',str(output)],capture_output=True).stderr.decode()
assert 'Audio: aac' in probe, 'Source audio was lost'
assert '720x720' in probe, probe
reader=imageio_ffmpeg.read_frames(str(output));metadata=next(reader);decoded=Image.frombytes('RGB',metadata['size'],next(reader));reader.close()
red=decoded.getpixel((100,100));assert red[0]>220 and red[1]<35, red
print('PASS: trim, zoom easing, framing, separate webcam placement, MP4 encoding and source audio preservation.')

follow={**options,'zoomMode':'cursor','cursorDuration':4,'zoomStrength':2,'cursor':[{'time':0,'x':.1,'y':.4},{'time':1,'x':.2,'y':.4},{'time':2,'x':.8,'y':.6},{'time':4,'x':.9,'y':.6}]}
a=zoom_at(1.2,follow); b=zoom_at(1.8,follow)
assert a[0]==2 and b[0]==2 and a[1]<b[1],(a,b)
assert zoom_at(.5,follow)==(1,.5,.5)
assert zoom_at(1.5,{**follow,'autoZoom':False})==(1,.5,.5)
follow_output=folder/'cursor-follow.mp4'
result=render({'source':str(source),'output':str(follow_output),'options':follow},ffmpeg,imageio_ffmpeg,lambda value:None)
assert abs(result['duration']-2)<.1
assert 'Audio: aac' in subprocess.run([ffmpeg,'-i',str(follow_output)],capture_output=True).stderr.decode()
print('PASS: continuous cursor follow, trim-aware easing, disabling zoom and MP4 export with audio.')
cut_options={**follow,'clips':[{'id':'a','start':0,'end':.75},{'id':'b','start':2,'end':3.25}],'start':0,'end':0,'volume':.5,'texts':[{'id':'title','text':'A clearer story','start':0,'end':1,'x':.5,'y':.5,'size':90,'color':'#ffffff','box':True}]}
cut_output=folder/'timeline-edit.mp4'
cut_result=render({'source':str(source),'background':str(root/'public/recorder-backgrounds/silk.png'),'output':str(cut_output),'options':{**cut_options,'background':'image'}},ffmpeg,imageio_ffmpeg,lambda value:None)
assert abs(cut_result['duration']-2)<.1,cut_result
assert 'Audio: aac' in subprocess.run([ffmpeg,'-i',str(cut_output)],capture_output=True).stderr.decode()
comp=Composer((640,360),cut_options);plain=Image.new('RGB',(640,360),'green')
assert comp.draw(plain,0,timeline_time=.5).tobytes()!=comp.draw(plain,0,timeline_time=1.5).tobytes(),'Timed text was not applied'
muted_output=folder/'muted.mp4'
render({'source':str(source),'output':str(muted_output),'options':{**cut_options,'volume':0}},ffmpeg,imageio_ffmpeg,lambda value:None)
assert 'Audio:' not in subprocess.run([ffmpeg,'-i',str(muted_output)],capture_output=True).stderr.decode()
print('PASS: timeline cuts concatenate correctly, timed text renders, image backgrounds export, audio volume and mute work.')
caption_options={**cut_options,'texts':[],'captions':[{'id':'caption-1','text':'Every moment matters','start':0,'end':1}],'showCaptions':True,'captionSize':60,'captionColor':'#ffe65c','captionBox':True,'captionY':.8}
caption_comp=Composer((640,360),caption_options)
assert caption_comp.draw(plain,0,timeline_time=.5).tobytes()!=caption_comp.draw(plain,0,timeline_time=1.5).tobytes(),'Caption timing was lost'
render({'source':str(source),'output':str(folder/'captioned-edit.mp4'),'options':caption_options},ffmpeg,imageio_ffmpeg,lambda value:None)
from captions import render as render_subtitles
render_subtitles({'source':str(source),'output':str(folder/'edited.srt'),'format':'srt','timelineDuration':8,'segments':[{'start':5,'end':7,'text':'Edited timeline'}]},ffmpeg,imageio_ffmpeg)
assert '00:00:05,000 --> 00:00:07,000' in (folder/'edited.srt').read_text()
print('PASS: captions are timed and burned into the MP4; SRT uses the edited timeline duration.')
# Export fidelity for the editor's new effects, transitions, caption highlights and graphic layers.
base={**caption_options,'captions':[],'texts':[],'autoZoom':False,'transition':'none','effect':'mono'}
mono=Composer((640,360),base).draw(plain,0,timeline_time=.5).getpixel((360,360))
assert max(mono)-min(mono)<2,mono
for style in ['hormozi','tiktok']:
    styled={**caption_options,'captionStyle':style,'captionHighlight':'#ffcc00','captionUppercase':True,'transition':'none'}
    compositor=Composer((640,360),styled)
    assert compositor.draw(plain,0,timeline_time=.1).tobytes()!=compositor.draw(plain,0,timeline_time=.8).tobytes(),'Highlight did not advance'
transition=Composer((640,360),{**base,'transition':'black','transitionDuration':.2})
assert transition.draw(plain,0,timeline_time=0).getpixel((360,360))==(0,0,0)
assert transition.draw(plain,0,timeline_time=.3).getpixel((360,360))!=(0,0,0)
logo=folder/'logo.png';Image.new('RGBA',(40,40),(255,0,255,255)).save(logo)
layer={**cut_options['texts'][0],'imageId':'logo','size':25,'x':.5,'y':.5}
compositor=Composer((640,360),{**base,'texts':[layer]},elements={'logo':str(logo)})
assert compositor.draw(plain,0,timeline_time=.5).getpixel((360,360))==(255,0,255)
assert compositor.draw(plain,0,timeline_time=1.5).getpixel((360,360))!=(255,0,255)
render({'source':str(source),'output':str(folder/'effects-and-layers.mp4'),'elements':{'logo':str(logo)},'options':{**caption_options,'texts':[layer],'effect':'vivid','transition':'black','transitionDuration':.2,'captionStyle':'tiktok','captionHighlight':'#a855ff'}},ffmpeg,imageio_ffmpeg,lambda value:None)
print('PASS: color effects, boundary fades, advancing caption highlights and timed image layers render into MP4.')
