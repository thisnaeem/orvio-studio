import {useState} from 'react';
import {Icon,type IconName} from './icons';
import {bridge,friendlyError} from './Connected';
import type {CaptureAsset} from './RecorderEditor';
const elements:IconName[]=['arrow','external','check','success','sparkles','flash','crown','pin','camera','mic','globe'];
export function EditorElements({onUse}:{onUse:(asset:CaptureAsset)=>void}){
 const [color,setColor]=useState('#ffffff'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function add(name:IconName){setBusy(true);setError('');try{const {renderToStaticMarkup}=await import('react-dom/server');const svg=renderToStaticMarkup(<Icon name={name} size={512}/>).replace(/xmlns="[^"]*"/g,'').replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ').replaceAll('currentColor',color);const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await image.decode();const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;canvas.getContext('2d')!.drawImage(image,0,0);const asset=await bridge().renderScreenshot({data:canvas.toDataURL('image/png'),copy:false,save:true});onUse({...asset,title:name+' element'})}catch(e){setError(friendlyError(e))}finally{setBusy(false)}}
 return <><label>Element color<input type="color" value={color} onChange={e=>setColor(e.target.value)}/></label><div className="ed-elements">{elements.map(name=><button disabled={busy} key={name} title={`Add ${name}`} aria-label={`Add ${name} element`} onClick={()=>void add(name)} style={{color}}><Icon name={name} size={32}/></button>)}</div><p className="ed-hint">Hugeicons free library · MIT. Elements become movable layers in your timeline.</p><button className="ed-outline" disabled={busy} onClick={async()=>{try{const asset=await bridge().localImport('image');if(asset)onUse(asset)}catch(e){setError(friendlyError(e))}}}><Icon name="plus" size={15}/>Import image or logo</button>{error&&<p role="alert">{error}</p>}</>;
}
