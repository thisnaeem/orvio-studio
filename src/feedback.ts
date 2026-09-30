import {read,defaults} from './store';
export type Cue='listen'|'stop'|'success'|'error'|'complete'|'update';
let last=0;
export async function playCue(cue:Cue){
 const prefs=read('preferences',defaults);if(prefs.sounds===false)return;
 if(!['listen','stop'].includes(cue)&&Number(localStorage.getItem('orvio.audio.capture'))>Date.now())return;
 if(!['listen','stop'].includes(cue)&&Date.now()-last<180)return;last=Date.now();
 const sound=new Audio(new URL(`./sounds/${cue}.wav`,document.baseURI).href);sound.volume=Math.max(0,Math.min(1,prefs.soundVolume??0.35));
 try{await sound.play();await new Promise<void>(resolve=>{sound.onended=()=>resolve();setTimeout(resolve,500)})}catch{/* Visual feedback remains available if sound playback is blocked. */}
}
export function captureSound(active:boolean,duration=70000){if(active)localStorage.setItem('orvio.audio.capture',String(Date.now()+duration));else localStorage.removeItem('orvio.audio.capture')}
