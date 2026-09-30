import {useEffect,useState} from 'react';
import {friendlyError} from './Connected';
import {Icon} from './icons';
type StorageState={directory:string;pending:string|null};
export function StorageSettings(){
 const api=(window as any).studio;
 const [state,setState]=useState<StorageState|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;api?.storageState?.().then((value:StorageState)=>{if(live)setState(value)}).catch((e:unknown)=>{if(live)setError(friendlyError(e))});return()=>{live=false}},[api]);
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn()}catch(e){setError(friendlyError(e))}finally{setBusy(false)}}
 return <section className="panel settings-panel"><div className="setting-heading"><Icon name="folder"/><h2>Shared download location</h2></div><p>Keep models, GPU runtimes, engine packages, downloaded files, media and recordings together on the drive you choose.</p>
 {state?<><label>Current location<input readOnly value={state.directory} title={state.directory}/></label><div className="flex flex-wrap gap-3"><button className="primary" disabled={busy} onClick={()=>void run(async()=>setState(await api.chooseStorage()))}><Icon name="folder" size={16}/>Choose folder</button><button className="secondary" disabled={busy} onClick={()=>void run(async()=>{const message=await api.openStorage();if(message)throw Error(message)})}>Open folder</button></div>
 {state.pending&&<div className="rounded-xl bg-[var(--accent-soft)] p-5"><h3>Ready to move on restart</h3><p className="my-3 break-words text-xs">{state.pending}</p><p className="field-help">Existing managed downloads and partial files move together. Large libraries may take a while. Pause downloads and finish active work first.</p><div className="mt-4 flex flex-wrap gap-3"><button className="primary" disabled={busy} onClick={()=>void run(async()=>{await api.restartStorage()})}>{api.isDevelopment?'Close app to apply on next launch':'Restart & move files'}</button><button className="secondary" disabled={busy} onClick={()=>void run(async()=>setState(await api.cancelStorage()))}>Cancel change</button></div></div>}
 <p className="field-help">Linked models outside Orvio stay in their original folders. The bundled application and its update installer remain managed by the operating system.</p></>:<p className="field-help">{api?.storageState?'Loading storage settings…':'Restart the desktop app to enable storage settings.'}</p>}
 {error&&<p role="alert" className="error-message">{error}</p>}</section>
}
