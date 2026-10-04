import {useEffect,useRef,useState} from 'react';
import {BotAvatar} from './BotAvatar';
import {Icon} from './icons';
import {readPreferences} from './store';
import './island.css';
export function Island(){
 const [expanded,setExpanded]=useState(false),[state,setState]=useState<any>({downloads:0,paused:false}),[error,setError]=useState('');const api=(window as any).island,dock=useRef<HTMLDivElement>(null),leaveTimer=useRef<ReturnType<typeof setTimeout>|null>(null),hoverVersion=useRef(0);
 useEffect(()=>()=>{hoverVersion.current++;if(leaveTimer.current)clearTimeout(leaveTimer.current)},[]);
 useEffect(()=>{document.documentElement.style.background='transparent';document.body.style.background='transparent';const prefs=readPreferences();document.documentElement.dataset.theme=prefs.theme==='light'?'light':'dark';document.documentElement.dataset.accent=prefs.accent;void api.state().then(setState);return api.onState(setState)},[]);
 useEffect(()=>{if(!expanded||!api.cursor)return;let alive=true,pending=false;const motion=matchMedia('(prefers-reduced-motion: reduce)');const timer=setInterval(async()=>{if(pending||motion.matches||document.hidden)return;pending=true;try{const point=await api.cursor();if(alive&&dock.current){dock.current.style.setProperty('--look-x',`${point.x*4}px`);dock.current.style.setProperty('--look-y',`${point.y*3}px`);dock.current.style.setProperty('--look-turn',`${point.x*6}deg`)}}catch{}finally{pending=false}},100);return()=>{alive=false;clearInterval(timer);dock.current?.style.setProperty('--look-x','0px');dock.current?.style.setProperty('--look-y','0px');dock.current?.style.setProperty('--look-turn','0deg')}},[expanded]);
 function expand(value:boolean){
  const version=++hoverVersion.current;if(leaveTimer.current)clearTimeout(leaveTimer.current);
  if(value){setExpanded(true);void api.expand(true);return}
  const collapse=async()=>{try{const stillInside=await api.expand(false);if(version!==hoverVersion.current)return;if(stillInside===true){leaveTimer.current=setTimeout(collapse,220)}else setExpanded(false)}catch{if(version===hoverVersion.current)setExpanded(false)}};
  leaveTimer.current=setTimeout(collapse,220);
 }function action(value:string){setError('');void api.action(value).catch((e:Error)=>setError(e.message.replace(/^Error invoking remote method '[^']+': Error: /,'')))}
 const status=state.recording?'Recording':state.live?'Live on YouTube':state.downloads?`${state.downloads} downloading`:'Your creative crew';
 const bots=[{id:'chat',action:'Chat',name:'Orbi',label:'Assistant'},{id:'voice',action:'dictation',name:'Echo',label:'Dictate'},{id:'recorder',action:state.recording?'stop-recording':'Recorder',name:'Frame',label:state.recording?'Finish':'Record'},{id:'automations',action:'Automations',name:'Tempo',label:'Publish'},{id:'downloader',action:'downloads',name:'Fetch',label:'Downloads'}];
 return <div ref={dock} className={`bot-dock-shell ${expanded?'expanded':''}`} onMouseEnter={()=>expand(true)} onMouseLeave={()=>expand(false)} onFocus={()=>expand(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))expand(false)}}><section className="bot-dock" aria-label="Orvio bot dock"><button className="bot-dock-home" title={error||'Open Orvio'} aria-label="Open Orvio Studio" onClick={()=>action('Home')}><img src="./orvio-logo.png" alt=""/>{!expanded&&<span>Orvio<small><i className={state.recording?'recording':''}/>{error||status}</small></span>}</button>{expanded?<nav aria-label="Your bots">{bots.map(bot=><button key={bot.id} title={`${bot.name} · ${bot.label}`} aria-label={bot.label} onClick={()=>action(bot.action)}><span className="dock-mascot"><BotAvatar id={bot.id} size={35}/></span><span>{bot.label}</span>{bot.id==='downloader'&&state.downloads>0&&<b>{state.downloads}</b>}{bot.id==='recorder'&&state.recording&&<i className="dock-recording"/>}</button>)}</nav>:<Icon name="down" size={13}/>}</section></div>;
}
