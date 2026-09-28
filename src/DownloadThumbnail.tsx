import {useState} from 'react';
import {Icon} from './icons';
import './download-thumbnail.css';
export function DownloadThumbnail({item}:{item:{kind:string;title:string;thumbnail?:string}}){
 const [failed,setFailed]=useState('');
 let source='';try{const url=new URL(item.thumbnail||'');if(url.protocol==='https:'&&!url.username&&!url.password)source=url.href}catch{}
 const visible=!!source&&failed!==source;
 return <div className={'download-thumbnail'+(visible?' has-image':'')}>
 {visible?<img src={source} alt={'Thumbnail for '+item.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(source)}/>:<Icon name={item.kind==='video'?'workflow':item.kind==='audio'?'volume':item.kind==='image'?'image':'download'} size={19}/>}
 </div>
}
