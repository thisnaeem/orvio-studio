import './creative-studio.css';
import {useState} from 'react';
import type {Model,LocalCreation} from './model-data';
export function ModelArtwork({model,assets=[],className=''}:{model:Pick<Model,'id'|'name'|'kind'>;assets?:LocalCreation[];className?:string}){
 const [failed,setFailed]=useState(false);const sample=assets.find(a=>(a.modelId===model.id||a.model===model.name)&&a.kind==='image');
 return <div className={'model-artwork '+className}>{sample?<img src={sample.preview} alt={'Your generation with '+model.name} loading="lazy"/>:!failed?<img src={'./model-art/'+model.id+'.svg'} alt={model.name+' identity artwork'} loading="lazy" onError={()=>setFailed(true)}/>:<div className="model-art-fallback"><span>{model.name.slice(0,2).toUpperCase()}</span><small>{model.kind}</small></div>}<span className="model-art-caption">{sample?'Your model output':'Model identity'}</span></div>
}
