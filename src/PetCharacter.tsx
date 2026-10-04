import type {CSSProperties,ReactNode,Ref} from 'react';
import './pet-character.css';

/**
 * A fully code-drawn, rigged companion. Body parts are separate SVG groups so CSS can animate
 * moods (persistent states) and actions (one-shot moves) independently.
 * Parent elements drive `--mouth` (0–1 speech level) and `--look-x/--look-y` (−1…1 pointer direction).
 */
export type PetAnimal='cat'|'dog'|'fox'|'bunny'|'panda';
export type PetPalette='classic'|'soft'|'night';
export type PetMood='idle'|'sleeping'|'waking'|'listening'|'thinking'|'talking'|'happy'|'sad';
export type PetAction='wave'|'hop'|'spin'|'stretch'|'wiggle'|'yawn'|'nod'|'dance'|'look'|null;
type Colors={fur:string;dark:string;belly:string;inner:string;nose:string;eye:string};
export const petAnimals:{id:PetAnimal;name:string;detail:string}[]=[{id:'cat',name:'Mochi',detail:'A little calm for your desktop'},{id:'dog',name:'Sunny',detail:'Your cheerful creative companion'},{id:'fox',name:'Ember',detail:'Curious about your next idea'},{id:'bunny',name:'Clover',detail:'Soft-spoken and quick to listen'},{id:'panda',name:'Bao',detail:'Unbothered, and always on your side'}];
export const petPalettes:{id:PetPalette;name:string}[]=[{id:'classic',name:'Classic'},{id:'soft',name:'Soft'},{id:'night',name:'Night'}];
export const petActions:{id:Exclude<PetAction,null>;name:string}[]=[{id:'wave',name:'Wave'},{id:'hop',name:'Hop'},{id:'dance',name:'Dance'},{id:'spin',name:'Turn around'},{id:'stretch',name:'Stretch'},{id:'wiggle',name:'Wiggle'},{id:'nod',name:'Nod'},{id:'yawn',name:'Yawn'},{id:'look',name:'Look around'}];
const colors:Record<PetAnimal,Record<PetPalette,Colors>>={
 cat:{classic:{fur:'#f0a25a',dark:'#d07c36',belly:'#fff3e3',inner:'#f6a5a5',nose:'#f08a9a',eye:'#2a1d14'},soft:{fur:'#ece0d1',dark:'#c9b49c',belly:'#fffaf3',inner:'#f3b3b8',nose:'#e99aa6',eye:'#2a2420'},night:{fur:'#4b505e',dark:'#33363f',belly:'#cfd2dc',inner:'#c98f9f',nose:'#e48fa1',eye:'#121318'}},
 dog:{classic:{fur:'#e2b071',dark:'#a8743d',belly:'#fff4e2',inner:'#c98c58',nose:'#3a2a22',eye:'#2a1d14'},soft:{fur:'#f4efe8',dark:'#cdb9a3',belly:'#ffffff',inner:'#d9c4ad',nose:'#3a3330',eye:'#242120'},night:{fur:'#7a5236',dark:'#4f321f',belly:'#ecd6c0',inner:'#5b3a25',nose:'#1e1611',eye:'#160f0b'}},
 fox:{classic:{fur:'#ee7a3b',dark:'#b9521e',belly:'#fff6ec',inner:'#3e2a22',nose:'#2b1d18',eye:'#24160f'},soft:{fur:'#eef2f6',dark:'#b8c3cf',belly:'#ffffff',inner:'#c8d2dc',nose:'#3a3f47',eye:'#1d2229'},night:{fur:'#5d4b69',dark:'#3b2f45',belly:'#efe7f5',inner:'#2a2131',nose:'#1d1722',eye:'#130f17'}},
 bunny:{classic:{fur:'#f4ece5',dark:'#d8c9bc',belly:'#ffffff',inner:'#f7b6c2',nose:'#f08a9a',eye:'#2a2120'},soft:{fur:'#d8b38d',dark:'#b48c66',belly:'#fff4e6',inner:'#f2b0b6',nose:'#e78a96',eye:'#2a1d14'},night:{fur:'#8e909b',dark:'#6c6e79',belly:'#e6e7ee',inner:'#d9a0b0',nose:'#e48fa1',eye:'#16171c'}},
 panda:{classic:{fur:'#fbfbfb',dark:'#2b2d33',belly:'#ffffff',inner:'#4a4c55',nose:'#22242a',eye:'#0d0e11'},soft:{fur:'#fff3ea',dark:'#a2553a',belly:'#fffaf6',inner:'#c4775c',nose:'#3a221a',eye:'#1a0f0b'},night:{fur:'#e6e8ef',dark:'#16181e',belly:'#f6f7fb',inner:'#30333c',nose:'#0f1014',eye:'#000000'}},
};
const origin=(x:number,y:number)=>({transformOrigin:`${x}px ${y}px`});
function ears(animal:PetAnimal,c:Colors):[ReactNode,ReactNode]{
 const soft={strokeLinejoin:'round' as const};
 switch(animal){
  case 'cat':return [<g className="pc-ear pc-ear-l" style={origin(74,62)}><polygon points="54,72 60,28 94,56" fill={c.fur} stroke={c.fur} strokeWidth="8" {...soft}/><polygon points="63,63 65,42 83,56" fill={c.inner}/></g>,<g className="pc-ear pc-ear-r" style={origin(126,62)}><polygon points="146,72 140,28 106,56" fill={c.fur} stroke={c.fur} strokeWidth="8" {...soft}/><polygon points="137,63 135,42 117,56" fill={c.inner}/></g>];
  case 'fox':return [<g className="pc-ear pc-ear-l" style={origin(72,62)}><polygon points="50,76 54,20 94,54" fill={c.fur} stroke={c.fur} strokeWidth="8" {...soft}/><polygon points="60,64 60,36 82,54" fill={c.inner}/></g>,<g className="pc-ear pc-ear-r" style={origin(128,62)}><polygon points="150,76 146,20 106,54" fill={c.fur} stroke={c.fur} strokeWidth="8" {...soft}/><polygon points="140,64 140,36 118,54" fill={c.inner}/></g>];
  case 'dog':return [<g className="pc-ear pc-ear-l pc-ear-floppy" style={origin(62,58)}><ellipse cx="54" cy="86" rx="15" ry="30" transform="rotate(18 54 86)" fill={c.dark}/></g>,<g className="pc-ear pc-ear-r pc-ear-floppy" style={origin(138,58)}><ellipse cx="146" cy="86" rx="15" ry="30" transform="rotate(-18 146 86)" fill={c.dark}/></g>];
  case 'bunny':return [<g className="pc-ear pc-ear-l" style={origin(80,60)}><ellipse cx="76" cy="30" rx="12" ry="32" transform="rotate(-10 76 30)" fill={c.fur}/><ellipse cx="76" cy="32" rx="5.5" ry="23" transform="rotate(-10 76 32)" fill={c.inner}/></g>,<g className="pc-ear pc-ear-r" style={origin(120,60)}><ellipse cx="124" cy="30" rx="12" ry="32" transform="rotate(10 124 30)" fill={c.fur}/><ellipse cx="124" cy="32" rx="5.5" ry="23" transform="rotate(10 124 32)" fill={c.inner}/></g>];
  case 'panda':return [<g className="pc-ear pc-ear-l" style={origin(62,58)}><circle cx="62" cy="56" r="16" fill={c.dark}/><circle cx="62" cy="57" r="8" fill={c.inner}/></g>,<g className="pc-ear pc-ear-r" style={origin(138,58)}><circle cx="138" cy="56" r="16" fill={c.dark}/><circle cx="138" cy="57" r="8" fill={c.inner}/></g>];
 }
}
function tail(animal:PetAnimal,c:Colors){
 switch(animal){
  case 'cat':return <g className="pc-tail" style={origin(136,170)}><path d="M134 172C170 172 180 132 160 110" stroke={c.fur} strokeWidth="13" strokeLinecap="round" fill="none"/><path d="M166 124C168 118 166 113 160 110" stroke={c.dark} strokeWidth="13" strokeLinecap="round" fill="none"/></g>;
  case 'dog':return <g className="pc-tail pc-tail-wag" style={origin(136,168)}><path d="M134 168C156 164 166 150 164 132" stroke={c.fur} strokeWidth="13" strokeLinecap="round" fill="none"/></g>;
  case 'fox':return <g className="pc-tail" style={origin(134,170)}><path d="M134 170C168 172 186 142 172 110" stroke={c.fur} strokeWidth="26" strokeLinecap="round" fill="none"/><circle cx="172" cy="111" r="13" fill={c.belly}/></g>;
  case 'bunny':return <g className="pc-tail pc-tail-wag" style={origin(140,172)}><circle cx="142" cy="172" r="12" fill={c.belly}/></g>;
  case 'panda':return <g className="pc-tail pc-tail-wag" style={origin(140,174)}><circle cx="141" cy="175" r="8" fill={c.dark}/></g>;
 }
}
function face(animal:PetAnimal,c:Colors){
 switch(animal){
  case 'cat':return <g><path d="M92 54l2 10M100 51v11M108 54l-2 10" stroke={c.dark} strokeWidth="3.5" strokeLinecap="round"/><g stroke={c.eye} strokeOpacity=".28" strokeWidth="1.6" strokeLinecap="round"><path d="M68 108 46 104M68 113 47 116M132 108 154 104M132 113 153 116"/></g></g>;
  case 'fox':return <g fill={c.belly}><path d="M52 100c10 6 26 12 48 10 0 12-8 26-24 26S50 118 52 100Z"/><path d="M148 100c-10 6-26 12-48 10 0 12 8 26 24 26s26-18 24-36Z"/></g>;
  case 'dog':return <g><ellipse cx="100" cy="112" rx="25" ry="17" fill={c.belly}/><ellipse cx="121" cy="86" rx="13" ry="14" fill={c.dark} opacity=".55"/></g>;
  case 'bunny':return <g><ellipse cx="100" cy="112" rx="17" ry="12" fill={c.belly}/></g>;
  case 'panda':return <g fill={c.dark}><ellipse cx="80" cy="93" rx="13" ry="16" transform="rotate(28 80 93)"/><ellipse cx="120" cy="93" rx="13" ry="16" transform="rotate(-28 120 93)"/></g>;
 }
}
export function PetCharacter({animal='cat',palette='classic',mood='idle',action=null,size=160,className='',style,innerRef,label}:{animal?:PetAnimal;palette?:PetPalette;mood?:PetMood;action?:PetAction;size?:number|string;className?:string;style?:CSSProperties;innerRef?:Ref<HTMLDivElement>;label?:string}){
 const c=(colors[animal]||colors.cat)[palette]||colors.cat.classic,[earL,earR]=ears(animal,c),paw=animal==='panda'?c.dark:c.belly,limb=animal==='panda'?c.dark:c.fur,mouth=animal==='dog'||animal==='panda'?c.eye:'#6b3d33';
 const eye=(x:number)=><g className="pc-eye" key={x}><ellipse cx={x} cy="92" rx="8.5" ry="10" fill={c.eye}/><circle cx={x+3} cy="88" r="3" fill="#fff"/><circle cx={x-2.6} cy="96" r="1.4" fill="#fff" opacity=".8"/></g>;
 return <div ref={innerRef} role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true} className={`pc ${className}`} data-animal={animal} data-mood={mood} data-action={action||undefined} style={{width:size,height:size,...style}}>
  <svg viewBox="0 0 200 200" width="100%" height="100%" overflow="visible">
   <ellipse className="pc-shadow" cx="100" cy="191" rx="52" ry="7"/>
   <g className="pc-figure" style={origin(100,190)}>
    {tail(animal,c)}
    <g className="pc-body" style={origin(100,190)}>
     <ellipse cx="74" cy="185" rx="16" ry="8.5" fill={limb}/><ellipse cx="126" cy="185" rx="16" ry="8.5" fill={limb}/>
     <ellipse cx="100" cy="150" rx="45" ry="39" fill={c.fur}/>
     {animal==='panda'&&<path d="M58 136c12-10 26-14 42-14s30 4 42 14c-4-14-20-26-42-26s-38 12-42 26Z" fill={c.dark}/>}
     <ellipse cx="100" cy="160" rx="27" ry="26" fill={c.belly}/>
     <g className="pc-arm pc-arm-l" style={origin(86,148)}><path d="M86 148 84 176" stroke={limb} strokeWidth="16" strokeLinecap="round"/><ellipse cx="84" cy="181" rx="11" ry="8.5" fill={paw}/></g>
     <g className="pc-arm pc-arm-r" style={origin(114,148)}><path d="M114 148 116 176" stroke={limb} strokeWidth="16" strokeLinecap="round"/><ellipse cx="116" cy="181" rx="11" ry="8.5" fill={paw}/></g>
    </g>
    <g className="pc-head-look" style={origin(100,128)}><g className="pc-head" style={origin(100,128)}>
     {earL}{earR}
     <ellipse cx="100" cy="92" rx="51" ry="45" fill={c.fur}/>
     {face(animal,c)}
     <g className="pc-cheeks" fill="#ff8fa3"><circle cx="68" cy="108" r="7.5"/><circle cx="132" cy="108" r="7.5"/></g>
     <g className="pc-eyes-look"><g className="pc-eyes">
      <g className="pc-eyes-open">{eye(80)}{eye(120)}</g>
      <path className="pc-eyes-closed" d="M71 93q9 7 18 0M111 93q9 7 18 0" stroke={c.eye} strokeWidth="3.6" strokeLinecap="round" fill="none"/>
      <path className="pc-eyes-happy" d="M71 96q9-10 18 0M111 96q9-10 18 0" stroke={c.eye} strokeWidth="3.6" strokeLinecap="round" fill="none"/>
     </g></g>
     <path d={animal==='dog'?'M93 102h14q-1 8-7 9-6-1-7-9Z':'M95 103h10q-1 6-5 7-4-1-5-7Z'} fill={c.nose}/>
     <path className="pc-mouth-closed" d="M92 113q4 4 8 0 4 4 8 0" stroke={mouth} strokeWidth="2.6" strokeLinecap="round" fill="none"/>
     <g className="pc-mouth" style={origin(100,112)}><ellipse cx="100" cy="117" rx="7.5" ry="7" fill="#7a2f3a"/><ellipse cx="100" cy="121" rx="4.5" ry="3" fill="#ff8a9a"/></g>
    </g></g>
   </g>
   <g className="pc-fx pc-zz" fill="#a9bbd0" fontWeight="700"><text x="146" y="62" fontSize="16">z</text><text x="160" y="44" fontSize="13">z</text><text x="172" y="28" fontSize="10">z</text></g>
   <g className="pc-fx pc-think"><circle cx="148" cy="62" r="3.5" fill="#fff" opacity=".9"/><circle cx="158" cy="50" r="5.5" fill="#fff" opacity=".9"/><ellipse cx="176" cy="30" rx="19" ry="14" fill="#fff"/><g fill="#8a98ab"><circle className="pc-dot" cx="168" cy="30" r="2.6"/><circle className="pc-dot" cx="176" cy="30" r="2.6"/><circle className="pc-dot" cx="184" cy="30" r="2.6"/></g></g>
   <g className="pc-fx pc-listen" stroke="var(--pet-accent,#ee825f)" strokeWidth="3.5" strokeLinecap="round" fill="none"><path d="M156 74q8 10 0 20"/><path d="M165 67q13 17 0 34"/><path d="M44 74q-8 10 0 20"/><path d="M35 67q-13 17 0 34"/></g>
   <g className="pc-fx pc-heart" fill="#ff6b8b"><path d="M160 52c-6-8-18-2-12 8l12 10 12-10c6-10-6-16-12-8Z"/></g>
   <g className="pc-fx pc-alert" fill="var(--pet-accent,#ee825f)" fontWeight="800"><text x="150" y="54" fontSize="30">!</text></g>
   <g className="pc-fx pc-notes" fill="var(--pet-accent,#ee825f)"><text x="150" y="56" fontSize="20">♪</text><text x="36" y="48" fontSize="16">♫</text></g>
  </svg>
 </div>;
}
