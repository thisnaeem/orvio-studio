// Local fixture: preferences stay in memory and never register global keys.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource-variable/unbounded';
import '../src/theme.css';
import {WorkspaceSidebar} from '../src/WorkspaceSidebar';
import {DesktopSettings} from '../src/DesktopSettings';
import {ToolsLibrary} from '../src/ToolsLibrary';
import {readPreferences} from '../src/store';
let settings:any={islandPosition:'top',dictationMode:'hold',liveInsert:true,silenceStop:false,dictationModel:'parakeet',dictationLanguage:'auto',rewrite:false,rewriteModel:'qwen3-small',writingStyle:'Natural',writingContext:'',voiceCommands:true,customWords:'',snippets:[],errors:[],shortcuts:{dictation:'CommandOrControl+Shift+Space',assistant:'CommandOrControl+Shift+O',pet:'CommandOrControl+Shift+P',screenshot:'CommandOrControl+Shift+S',recording:'CommandOrControl+Shift+R'}};
const noop=()=>()=>{};
(window as any).studio={platform:location.search.includes('windows')?'win32':'darwin',desktopSettings:async()=>structuredClone(settings),saveDesktopSettings:async(s:any)=>{await new Promise(r=>setTimeout(r,100));settings=structuredClone(s);return settings},modelHub:async()=>({models:[]}),onModels:noop,localState:async()=>({models:[{id:'parakeet',installed:true}]}),onLocal:noop,dictationAccess:async()=>false};
document.documentElement.dataset.theme='dark';
function Preview(){const [tab,setTab]=useState<'desktop'|'transcription'|'tools'>('desktop');return <div className="app" data-studio-compact="true" data-settings="true"><WorkspaceSidebar compact page="Settings" prefs={readPreferences()} recent={['Recorder']} paused={false} onOpen={()=>{}} onHelp={()=>{}}/><div className="main-shell"><header className="topbar">Settings · changes apply automatically</header><main><div className="settings-hub"><nav className="settings-menu" aria-label="Settings sections">{(['desktop','transcription','tools'] as const).map(t=><button className={tab===t?'active':''} key={t} onClick={()=>setTab(t)}>{t==='desktop'?'Desktop & shortcuts':t==='transcription'?'Transcription':'Tools preview'}</button>)}</nav><div className="settings-content"><div className="settings-content-head"><h2>{tab==='desktop'?'Desktop & shortcuts':tab==='transcription'?'Transcription':'Your tools'}</h2></div>{tab==='tools'?<ToolsLibrary onOpen={()=>{}}/>:<DesktopSettings key={tab} section={tab}/>}</div></div></main></div></div>}
createRoot(document.getElementById('root')!).render(<Preview/>);
