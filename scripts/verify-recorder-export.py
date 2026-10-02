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
