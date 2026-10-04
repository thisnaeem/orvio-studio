// Isolated fixture, with microphone access and external actions disabled.
import React from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource-variable/unbounded';
import '../src/theme.css';
import {Pets,PetCompanion} from '../src/Pets';
const state={settings:{animal:'chat',name:'Orbi',enabled:false,live:false,speak:false,model:'qwen-small',voice:'en_US-amy-medium',wakePhrase:'Hello Orvio',corner:'right'},messages:[],models:[],voices:[],transcriptionReady:false};
const noop=()=>()=>{};
(window as any).studio={petState:async()=>state,onPets:noop,savePet:async(settings:any)=>({...state,settings})};
(window as any).pet={state:async()=>state,onState:noop,onListen:noop,disarm:async()=>{},cursor:async()=>({x:.3,y:0}),expand:async()=>{},hide:async()=>{},open:async()=>{}};
document.documentElement.dataset.theme='dark';
createRoot(document.getElementById('root')!).render(location.search.includes('floating')?<PetCompanion/>:<div style={{padding:30}}><Pets/></div>);
