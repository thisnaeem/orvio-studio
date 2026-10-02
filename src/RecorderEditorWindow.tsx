import {useEffect,useState} from 'react';
import {RecorderEditor,type CaptureAsset} from './RecorderEditor';
import {bridge,friendlyError,Schedule,useWorkspace} from './Connected';
import {readPreferences} from './store';
import './recorder.css';
import {Icon} from './icons';
export function RecorderEditorWindow({id}:{id:string}){
 const workspace=useWorkspace();const [publishing,setPublishing]=useState<CaptureAsset|null>(null);
 const [asset,setAsset]=useState<CaptureAsset|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  const prefs=readPreferences(),media=matchMedia('(prefers-color-scheme: dark)');
  const theme=()=>{document.documentElement.dataset.theme=prefs.theme==='system'?(media.matches?'dark':'light'):prefs.theme;document.documentElement.dataset.accent=prefs.accent};theme();media.addEventListener('change',theme);
  void bridge().localState().then((s:any)=>{const a=s.assets.find((item:CaptureAsset)=>item.id===id);if(!a)throw Error('This capture is no longer in your library.');setAsset(a)}).catch((e:unknown)=>setError(friendlyError(e)));
  return()=>media.removeEventListener('change',theme);
 },[id]);
 useEffect(()=>{if(asset)return;return bridge().onCloseRecorderEditor(()=>void bridge().closeRecorderEditor())},[asset]);
 return <div className="rec-detached">{asset?<RecorderEditor asset={asset} onBack={()=>void bridge().closeRecorderEditor()} onExport={()=>{}} onPublish={setPublishing} detached/>:<div className="rec-window-loading"><p role={error?'alert':'status'}>{error||'Opening your capture…'}</p>{error&&<button className="secondary" onClick={()=>void bridge().closeRecorderEditor()}>Close editor</button>}</div>}{publishing&&<div className="modal-backdrop"><section className="modal social-composer-modal" role="dialog" aria-modal="true" aria-label="Publish edited video"><button className="modal-close icon-button" aria-label="Close publishing" onClick={()=>setPublishing(null)}><Icon name="close"/></button><Schedule workspace={workspace} initial={{generatedId:`local:${publishing.id}`}} done={()=>setPublishing(null)}/></section></div>}</div>;
}
