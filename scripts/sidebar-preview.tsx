import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource-variable/unbounded';
import '../src/theme.css';
import {WorkspaceSidebar} from '../src/WorkspaceSidebar';
import {readPreferences} from '../src/store';
document.documentElement.dataset.theme='dark';
function Preview(){const [compact,setCompact]=useState(true);return <div className="app" data-studio-compact={compact}><WorkspaceSidebar page="Chat" prefs={readPreferences()} recent={['Recorder','Voice']} paused={false} compact={compact} onToggle={()=>setCompact(!compact)} onOpen={()=>{}} onHelp={()=>{}}/><section className="main-shell" style={{padding:32}}><h1>Assistant</h1><p>Your bot icons stay visible when navigation is collapsed.</p></section></div>}
createRoot(document.getElementById('root')!).render(<Preview/>);
