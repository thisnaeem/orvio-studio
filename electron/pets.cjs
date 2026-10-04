const fs=require('node:fs'),path=require('node:path');
const animals=['cat','dog','fox','bunny','panda','seo','pc-helper','instagram','chat','integrations','automations','studio','models','live','captions','video-editor','recorder','voice','clipping','downloader'],palettes=['classic','soft','night'],sizes=['small','medium','large'],personalities=['cheerful','calm','playful','witty'],sensitivities=['low','medium','high'];
const defaults={enabled:false,live:true,animal:'cat',palette:'classic',size:'medium',name:'Orvio',wakePhrase:'Hello Orvio',model:'qwen-small',voice:'en_US-amy-medium',language:'en',speak:true,corner:'right',
 // Character & behavior
 personality:'cheerful',idleActions:true,followPointer:true,sleepAfter:5,
 // Voice: local engines (Piper/Chatterbox) or the operating system's built-in voices.
 voiceEngine:'local',systemVoice:'',voiceRate:1,voicePitch:1,voiceVolume:0.9,
 // Wake word
 wakeChime:true,wakeReply:true,wakeSensitivity:'medium'};
const personas={cheerful:'warm, upbeat and encouraging',calm:'gentle, soothing and patient',playful:'playful and curious, with light humor',witty:'clever and witty, but always kind'};
const normalize=text=>String(text).normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const greetings=new Set(['hello','hey','hi','hiya','hallo','ok','okay','yo']);
// Whisper often mishears one letter of a name ("orvia", "orbio"); allow one edit on longer words only.
function distance(a,b){if(Math.abs(a.length-b.length)>1)return 2;const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const temp=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=temp}}return row[b.length]}
const same=(want,heard,first)=>want===heard||(first&&greetings.has(want)&&greetings.has(heard))||(want.length>=5&&distance(want,heard)<=1);
function wakeCommand(text,phrase){const wake=normalize(phrase).split(' ');const heard=normalize(text);const words=(wake.includes('orvio')?heard.replace(/\bor (?:vio|vo|view|v o)\b/g,'orvio'):heard).split(' ');if(!wake[0])return null;for(let i=0;i<=words.length-wake.length;i++)if(wake.every((w,j)=>same(w,words[i+j],j===0)))return words.slice(i+wake.length).join(' ');return null}
function createPets({directory,modelHub,localStudio,notify=()=>{}}){
 const settingsFile=path.join(directory,'pet-settings.json'),historyFile=path.join(directory,'pet-history.json');let settings={...defaults},history=[],busy=false;
 try{settings={...defaults,...JSON.parse(fs.readFileSync(settingsFile,'utf8'))}}catch{}try{history=JSON.parse(fs.readFileSync(historyFile,'utf8')).filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-24)}catch{}
 const state=()=>({settings:{...settings},messages:history.map(m=>({...m})),busy,models:modelHub.state().models.filter(m=>m.kind==='chat').map(({id,name,installed})=>({id,name,installed})),voices:localStudio.state().models.filter(m=>['piper','chatterbox'].includes(m.engine)).map(({id,name,installed,unsupported})=>({id,name,installed,unsupported})),transcriptionReady:!!localStudio.state().models.find(m=>m.id==='whisper')?.installed});
 const emit=()=>notify(state());const persist=()=>fs.writeFileSync(historyFile,JSON.stringify(history),{mode:0o600});
 const choice=(next,input,key,list,message)=>{if(input?.[key]===undefined)return;if(!list.includes(input[key]))throw Error(message);next[key]=input[key]};
 const number=(next,input,key,min,max)=>{if(input?.[key]===undefined)return;const value=Number(input[key]);if(!Number.isFinite(value)||value<min||value>max)throw Error('Choose a value between '+min+' and '+max+'.');next[key]=value};
 function save(input){if(busy)throw Error('Wait for your pet to finish before changing its setup.');const next={...settings};
  for(const key of ['enabled','speak','live','idleActions','followPointer','wakeChime','wakeReply'])if(typeof input?.[key]==='boolean')next[key]=input[key];
  choice(next,input,'animal',animals,'Choose a pet.');choice(next,input,'palette',palettes,'Choose a pet color.');choice(next,input,'size',sizes,'Choose a pet size.');choice(next,input,'corner',['left','right'],'Choose a screen corner.');choice(next,input,'personality',personalities,'Choose a personality.');choice(next,input,'wakeSensitivity',sensitivities,'Choose a wake sensitivity.');choice(next,input,'voiceEngine',['local','system'],'Choose a voice engine.');
  number(next,input,'sleepAfter',0,60);number(next,input,'voiceRate',0.5,2);number(next,input,'voicePitch',0,2);number(next,input,'voiceVolume',0,1);
  if(input?.systemVoice!==undefined)next.systemVoice=String(input.systemVoice).slice(0,200);
  for(const key of ['name','wakePhrase'])if(input?.[key]!==undefined){const value=String(input[key]).trim();if(!value||value.length>40||!normalize(value))throw Error('Use a name and wake phrase between 1 and 40 characters.');next[key]=value}
  if(input?.language!==undefined){if(!/^[a-z]{2}$/.test(input.language))throw Error('Use a two-letter speech language.');next.language=input.language}
  if(input?.model!==undefined){if(!state().models.some(m=>m.id===input.model))throw Error('Choose a chat model from Models.');next.model=input.model}
  if(input?.voice!==undefined){if(!state().voices.some(m=>m.id===input.voice&&!m.unsupported))throw Error('Choose a supported voice.');next.voice=input.voice}
  settings=next;fs.writeFileSync(settingsFile,JSON.stringify(settings),{mode:0o600});emit();return state()}
 async function chat(text){if(busy)throw Error('Your pet is still thinking.');if(typeof text!=='string'||!text.trim()||text.length>2000)throw Error('Enter a message of up to 2,000 characters.');if(!state().models.find(m=>m.id===settings.model)?.installed)throw Error('Download your pet’s chat model in Pets or Models first.');busy=true;emit();try{const recent=history.slice(-12);while(recent.reduce((n,m)=>n+m.content.length,0)>14000)recent.shift();const messages=[...recent,{role:'user',content:text.trim()}];const response=await modelHub.complete(settings.model,{messages:[{role:'system',content:`You are ${settings.name}, a friendly ${settings.animal} desktop companion inside Orvio Studio. Your personality is ${personas[settings.personality]||personas.cheerful}. Reply naturally in the user's language, in up to 3 short sentences. You are an AI, not a human. You can chat and help think through ideas. You cannot perform app actions in this pet conversation; offer to use Orvio Assistant for tools. Never claim to have changed files or published anything.`},...messages],max_tokens:256,temperature:0.7});if(!response.ok)throw Error('The local model could not answer. Try a smaller model.');const result=await response.json();const answer=result.choices?.[0]?.message?.content;if(typeof answer!=='string'||!answer.trim())throw Error('The model returned an empty reply. Try again.');history=[...messages,{role:'assistant',content:answer.slice(0,4000)}].slice(-24);persist();return {text:answer.slice(0,4000)}}finally{busy=false;emit()}}
 const voice=(text,model=settings.voice,language=settings.language)=>{if(typeof text!=='string'||!text.trim()||text.length>4000)throw Error('Invalid speech text');return localStudio.petVoice({model,text,language})};
 return {state,save,chat,clear(){if(busy)throw Error('Wait for the reply before clearing this chat.');history=[];persist();emit();return state()},
  // System voices are spoken by the renderer, so only local engines produce audio here.
  async speech(text){if(!settings.speak||settings.voiceEngine==='system')return null;return voice(text)},
  async preview(input){const model=input?.voice||settings.voice;if(!state().voices.some(m=>m.id===model&&m.installed))throw Error('Download this voice first.');return voice(String(input?.text||`Hi, I’m ${settings.name}. Nice to meet you!`).slice(0,300),model,/^[a-z]{2}$/.test(input?.language)?input.language:settings.language)},
  transcribe:bytes=>localStudio.petTranscribe(bytes)};
}
module.exports={createPets,wakeCommand,defaults,animals,palettes};
