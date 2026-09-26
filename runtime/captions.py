"""Validated subtitle rendering for Orvio Caption Studio."""
import pathlib, tempfile, subprocess, math

def stamp(value,ass=False):
    scale=100 if ass else 1000
    n=round(float(value)*scale); seconds,frac=divmod(n,scale); hours,seconds=divmod(seconds,3600); minutes,seconds=divmod(seconds,60)
    return f'{hours}:{minutes:02}:{seconds:02}.{frac:02}' if ass else f'{hours:02}:{minutes:02}:{seconds:02},{frac:03}'

def validate(segments,duration):
    if not isinstance(segments,list) or not 1<=len(segments)<=3000: raise ValueError('Add between 1 and 3,000 captions.')
    result=[]
    for item in segments:
        start=float(item['start']); end=float(item['end']); text=str(item['text']).strip()
        if not all(math.isfinite(x) for x in (start,end)) or not 0<=start<end or end>duration+0.1 or not text or len(text)>1000: raise ValueError('Check caption text and times. Each caption must fit inside the video.')
        result.append({'start':start,'end':end,'text':text})
    return sorted(result,key=lambda s:s['start'])

def srt(segments):
    return '\n\n'.join(f"{i+1}\n{stamp(s['start'])} --> {stamp(s['end'])}\n{s['text']}" for i,s in enumerate(segments))+'\n'

def render(p,ffmpeg,imageio_ffmpeg):
    probe=imageio_ffmpeg.read_frames(p['source'])
    try: meta=next(probe)
    finally: probe.close()
    if not meta.get('duration'): meta['duration']=imageio_ffmpeg.count_frames_and_secs(p['source'])[1]
    width,height=meta['size']; segments=validate(p['segments'],meta['duration'])
    if p.get('format')=='srt':
        pathlib.Path(p['output']).write_text(srt(segments),encoding='utf-8')
        return {'captions':len(segments)}
    style=p.get('style','clean'); styles={'clean':('&H00FFFFFF',1,0,2),'bold':('&H0000DFFF',1,-1,4),'boxed':('&H00FFFFFF',3,-1,10)}
    color,border,bold,outline=styles.get(style,styles['clean']); alignment=5 if p.get('position')=='center' else 2
    size=round(height*({'small':.04,'medium':.055,'large':.075}.get(p.get('size'),.055)))
    header=f'''[Script Info]\nScriptType: v4.00+\nPlayResX: {width}\nPlayResY: {height}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,{size},{color},{color},&H00151515,&H80151515,{bold},0,0,0,100,100,0,0,{border},{outline},0,{alignment},{round(width*.07)},{round(width*.07)},{round(height*.08)},1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'''
    lines=[]
    for s in segments:
        text=s['text'].replace('\\','／').replace('{','｛').replace('}','｝').replace('\n','\\N')
        lines.append(f"Dialogue: 0,{stamp(s['start'],True)},{stamp(s['end'],True)},Default,,0,0,0,,{text}")
    with tempfile.TemporaryDirectory() as directory:
        pathlib.Path(directory,'captions.ass').write_text(header+'\n'.join(lines),encoding='utf-8-sig')
        subprocess.run([ffmpeg,'-y','-i',p['source'],'-vf','subtitles=captions.ass','-map','0:v:0','-map','0:a:0?','-c:v','libx264','-preset','veryfast','-threads','2','-c:a','aac','-movflags','+faststart',p['output']],cwd=directory,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    return {'duration':meta['duration'],'captions':len(segments)}
