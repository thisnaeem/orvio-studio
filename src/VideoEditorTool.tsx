import {useEffect,useState} from 'react';
import {bridge,friendlyError} from './Connected';
import {Icon} from './icons';
import type {CaptureAsset} from './RecorderEditor';
export function VideoEditorTool(){
 const [assets,setAssets]=useState<CaptureAsset[]>([]),[query,setQuery]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const apply=(s:any)=>setAssets(s.assets.filter((a:CaptureAsset)=>a.kind==='video'));void bridge().localState().then(apply).catch((e:unknown)=>setError(friendlyError(e)));return bridge().onLocal(apply)},[]);
 async function open(asset?:CaptureAsset){setBusy(true);setError('');try{const selected=asset||await bridge().localImport('video');if(selected)await bridge().openRecorderEditor(selected.id)}catch(e){setError(friendlyError(e))}finally{setBusy(false)}}
 return <section className="video-library"><div className="video-library-actions"><button className="primary" disabled={busy} onClick={()=>void open()}><Icon name="plus" size={18}/>Import video</button><label><Icon name="search" size={17}/><input aria-label="Search videos" placeholder="Search your videos…" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>{error&&<p role="alert">{error}</p>}<div className="video-library-grid">{assets.filter(a=>a.title.toLowerCase().includes(query.toLowerCase())).map(a=><button className="video-library-item" key={a.id} disabled={busy} onClick={()=>void open(a)}><div><Icon name="video" size={36}/></div><strong>{a.title}</strong><span>Open in editor <Icon name="external" size={14}/></span></button>)}</div>{!assets.length&&<div className="video-library-empty"><Icon name="video" size={50}/><h2>Make your next video.</h2><p>Import footage, cut your timeline, style captions and publish to your channels.</p><button className="secondary" disabled={busy} onClick={()=>void open()}>Choose a video</button></div>}</section>;
}
