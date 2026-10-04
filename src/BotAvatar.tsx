import {useId,type CSSProperties,type ReactNode} from 'react';
import {toolBots} from './tool-bots';
import './bot-avatar.css';

/** Code-drawn crew. Each bot keeps the geometric silhouette of its original artwork, now with a living face. */
export type BotMood='idle'|'happy'|'working'|'listening'|'sleeping';
type Shape='circle'|'squircle'|'diamond'|'hexagon'|'triangle'|'star'|'octagon'|'burst'|'flower'|'clover'|'arch'|'speech'|'pebble'|'capsule'|'drop';
type Design={shape:Shape;color:string;eyes:'pill'|'dot';dark?:boolean;ox?:number;oy?:number};
const designs:Record<string,Design>={
 seo:{shape:'diamond',color:'#14c2a3',eyes:'dot',ox:-3},
 'pc-helper':{shape:'squircle',color:'#18c37e',eyes:'dot',ox:7,oy:-4},
 instagram:{shape:'flower',color:'#f2659a',eyes:'pill'},
 chat:{shape:'circle',color:'#8a3cff',eyes:'pill',ox:9,oy:-3},
 integrations:{shape:'hexagon',color:'#1fb5c9',eyes:'dot'},
 automations:{shape:'triangle',color:'#f2a93b',eyes:'dot',dark:true,oy:12},
 studio:{shape:'star',color:'#9a5cff',eyes:'pill',oy:4},
 models:{shape:'arch',color:'#5b7cff',eyes:'dot',oy:4},
 live:{shape:'burst',color:'#ff6b4a',eyes:'pill'},
 captions:{shape:'speech',color:'#c763e6',eyes:'dot',oy:-6},
 'video-editor':{shape:'pebble',color:'#7d5cff',eyes:'pill',ox:4},
 recorder:{shape:'clover',color:'#04c67f',eyes:'pill',dark:true},
 voice:{shape:'capsule',color:'#ee6fb8',eyes:'pill',oy:-6},
 clipping:{shape:'octagon',color:'#ff8a4c',eyes:'dot',dark:true},
 downloader:{shape:'drop',color:'#6cc04a',eyes:'dot',oy:10},
};
const points=(n:number,outer:number,inner:number,cx=50,cy=52,turn=-90)=>Array.from({length:n*(inner===outer?1:2)},(_,i)=>{const step=inner===outer?360/n:180/n,r=inner===outer||i%2===0?outer:inner,a=(turn+i*step)*Math.PI/180;return `${(cx+r*Math.cos(a)).toFixed(1)},${(cy+r*Math.sin(a)).toFixed(1)}`}).join(' ');
const lighten=(hex:string,amount:number)=>{const n=parseInt(hex.slice(1),16),mix=(v:number)=>Math.round(v+(255-v)*amount);return `rgb(${mix(n>>16)},${mix(n>>8&255)},${mix(n&255)})`};
const hash=(text:string)=>[...text].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
function body(shape:Shape,fill:string):ReactNode{
 // Rounded polygons: a stroke in the fill colour with round joins softens every corner.
 const soft=(pts:string,w:number)=><polygon points={pts} fill={fill} stroke={fill} strokeWidth={w} strokeLinejoin="round"/>;
 switch(shape){
  case 'circle':return <circle cx="50" cy="52" r="36" fill={fill}/>;
  case 'squircle':return <rect x="16" y="18" width="68" height="68" rx="24" fill={fill}/>;
  case 'diamond':return soft(points(4,34,34),16);
  case 'hexagon':return soft(points(6,32,32,50,52,-90),14);
  case 'triangle':return soft('50,20 84,80 16,80',18);
  case 'star':return soft(points(5,36,19,50,55),10);
  case 'octagon':return soft(points(8,34,34,50,52,-67.5),12);
  case 'burst':return soft(points(10,37,29),8);
  case 'flower':return <g fill={fill}>{[0,60,120,180,240,300].map(a=><circle key={a} cx={50+21*Math.cos(a*Math.PI/180)} cy={52+21*Math.sin(a*Math.PI/180)} r="15"/>)}<circle cx="50" cy="52" r="24"/></g>;
  case 'clover':return <g fill={fill}>{[[50,33],[31,52],[69,52],[50,71]].map(([x,y])=><circle key={x+'-'+y} cx={x} cy={y} r="19"/>)}<rect x="31" y="33" width="38" height="38"/></g>;
  case 'arch':return <path d="M24 84V48a26 26 0 0 1 52 0v36Z" fill={fill} stroke={fill} strokeWidth="10" strokeLinejoin="round"/>;
  case 'speech':return <g fill={fill}><rect x="16" y="18" width="68" height="54" rx="20"/><path d="M32 66 28 86 52 70Z" stroke={fill} strokeWidth="6" strokeLinejoin="round"/></g>;
  case 'pebble':return <path d="M50 16c24 0 38 18 36 40s-18 32-38 31-35-15-34-35 14-36 36-36Z" fill={fill}/>;
  case 'capsule':return <rect x="27" y="12" width="46" height="80" rx="23" fill={fill}/>;
  case 'drop':return <path d="M50 12c12 18 32 32 32 50a32 32 0 0 1-64 0c0-18 20-32 32-50Z" fill={fill}/>;
 }
}
export function BotAvatar({id,size=40,className='',mood='idle',animated=true,title}:{id:string;size?:number;className?:string;mood?:BotMood;animated?:boolean;title?:string}){
 const bot=toolBots[id],design=designs[id],uid=useId().replace(/:/g,'');if(!bot||!design)return null;
 const fill=`url(#bot-${uid})`,eye=design.dark?'#1f2026':'#ffffff',cx=50+(design.ox||0),cy=50+(design.oy||0),gap=design.eyes==='pill'?8.5:9.5,seed=hash(id);
 const eyeShape=(x:number,y:number,small:boolean)=>design.eyes==='pill'?<rect x={x-4.2} y={y-(small?8:9)} width="8.4" height={small?16:18} rx="4.2" transform={`rotate(-16 ${x} ${y})`} fill={eye}/>:<circle cx={x} cy={y} r={small?5.6:7} fill={eye}/>;
 return <span role={title?'img':undefined} aria-label={title} aria-hidden={title?undefined:true} className={`bot-av shrink-0 ${className}`} data-mood={mood} data-animated={animated} style={{width:size,height:size,'--bot-delay':`-${(seed%50)/10}s`,'--bot-color':design.color} as CSSProperties}>
  <svg viewBox="0 0 100 100" width={size} height={size} overflow="visible">
   <defs><linearGradient id={`bot-${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={lighten(design.color,.28)}/><stop offset="1" stopColor={design.color}/></linearGradient></defs>
   <ellipse className="bot-av-shadow" cx="50" cy="96" rx="25" ry="3.5"/>
   <g className="bot-av-float"><g className="bot-av-body">{body(design.shape,fill)}<ellipse cx="35" cy="31" rx="11" ry="6" fill="#fff" opacity=".2" transform="rotate(-32 35 31)"/></g>
    <g className="bot-av-look"><g className="bot-av-eyes">
     <g className="bot-av-eye">{eyeShape(cx-gap,cy+1,false)}</g><g className="bot-av-eye">{eyeShape(cx+gap,cy-1,true)}</g>
     <path className="bot-av-closed" d={`M${cx-gap-5} ${cy+1}q5 4 10 0M${cx+gap-5} ${cy-1}q5 4 10 0`} stroke={eye} strokeWidth="3" strokeLinecap="round" fill="none"/>
    </g><path className="bot-av-mouth" d={`M${cx-5} ${cy+13}q5 5 10 0`} stroke={eye} strokeWidth="3" strokeLinecap="round" fill="none"/></g>
    <g className="bot-av-zz" fill={design.color}><text x="76" y="22" fontSize="14" fontWeight="700">z</text><text x="86" y="10" fontSize="10" fontWeight="700">z</text></g>
   </g>
  </svg>
 </span>;
}
