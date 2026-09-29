"""Original, short PCM interface cues. No external assets or runtime audio engine."""
import math,wave,struct,pathlib
root=pathlib.Path(__file__).resolve().parents[1]/'public'/'sounds'
root.mkdir(exist_ok=True)
for name,notes in {'listen':[660,880],'stop':[660,440],'success':[660,880,1100],'error':[260,220],'complete':[520,780,1040],'update':[740,990]}.items():
    samples=[]
    for note in notes:
        length=0.085
        for i in range(int(24000*length)):
            t=i/24000;envelope=min(1,t/0.009)*max(0,1-t/length)**2
            value=(math.sin(2*math.pi*note*t)+0.16*math.sin(2*math.pi*note*2*t))*envelope*0.22
            samples.append(round(value*32767))
    with wave.open(str(root/(name+'.wav')),'wb') as out:
        out.setparams((1,2,24000,0,'NONE','not compressed'));out.writeframes(struct.pack('<'+'h'*len(samples),*samples))
