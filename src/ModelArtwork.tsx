import {useEffect,useState} from 'react';
import type {Model,LocalCreation} from './model-data';
export function ModelArtwork({model,assets=[],className=''}:{model:Pick<Model,'id'|'name'|'kind'>;assets?:LocalCreation[];className?:string}){
 const [failed,setFailed]=useState(false),sample=assets.find(a=>(a.modelId===model.id||a.model===model.name)&&a.kind==='image');
 useEffect(()=>setFailed(false),[model.id,sample?.id]);
 return <div className={'relative h-[145px] w-full overflow-hidden rounded-xl bg-[var(--bg)] '+className}>{!failed?<img className="h-full w-full object-cover" src={sample?.preview||'./model-art/'+model.id+'.svg'} alt={sample?'Your generation with '+model.name:model.name+' identity artwork'} loading="lazy" onError={()=>setFailed(true)}/>:<div className="grid h-full place-content-center bg-[var(--accent-soft)] text-center text-[var(--accent)]"><span className="text-[32px]">{model.name.slice(0,2).toUpperCase()}</span><small className="text-[11px]">{model.kind}</small></div>}<span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-[9px] text-white">{sample&&!failed?'Your model output':'Model identity'}</span></div>
}
