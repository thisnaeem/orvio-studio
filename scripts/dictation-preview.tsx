// Isolated UI fixture: no microphone, clipboard or desktop access.
import React from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource-variable/unbounded';
import '../src/theme.css';
import {Island} from '../src/Island';
import {Dictation} from '../src/Dictation';
import {DesktopSettings} from '../src/DesktopSettings';
let settings:any={islandPosition:'top',dictationMode:'hold',liveInsert:true,silenceStop:false,dictationModel:'parakeet',dictationLanguage:'auto',rewrite:false,rewriteModel:'qwen3-small',writingStyle:'Natural',writingContext:'',voiceCommands:true,customWords:'',snippets:[],errors:[],shortcuts:{dictation:'CommandOrControl+Shift+Space'}};
const noop=()=>()=>{};
(window as any).island={state:async()=>({downloads:0}),onState:noop,expand:async()=>{},action:async()=>{},cursor:async()=>({x:.5,y:0})};
(window as any).dictation={idle:async()=>{},arm:async()=>{throw Error("Error invoking remote method 'dictation:arm': Error: Enable Electron in Accessibility to allow live typing and automatic paste.")},onFinish:noop,onNotice:noop,close:async()=>{},access:async()=>({appName:'Electron'})};
(window as any).studio={platform:'darwin',desktopSettings:async()=>settings,saveDesktopSettings:async(s:any)=>settings=s,modelHub:async()=>({models:[]}),onModels:noop,localState:async()=>({models:[{id:'parakeet',installed:true}]}),onLocal:noop,dictationAccess:async()=>false};
createRoot(document.getElementById('root')!).render(<main style={{padding:32,maxWidth:1100,margin:'auto'}}><style>{`html,body{background:#101010!important;overflow:auto!important}.bot-dock-shell{height:78px}.h-dvh{height:150px}`}</style><h1 style={{fontSize:24}}>Your creative crew</h1><p style={{fontSize:11,margin:'12px 0'}}>Bot dock · hover to explore</p><div style={{width:405,height:78}}><Island/></div><div style={{width:520,height:150,margin:'20px 0'}}><Dictation/></div><div className="settings-content"><header className="settings-content-head"><h2>Transcription</h2><p>Speak. It’s written.</p></header><DesktopSettings section="transcription"/></div></main>);
