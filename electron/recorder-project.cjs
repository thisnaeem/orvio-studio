const fs = require('node:fs');
const path = require('node:path');
const defaults = {effect:'none',transition:'none',transitionDuration:.35,captionStyle:'clean',captionHighlight:'#ffe65c',captionUppercase:false,background:'gradient',color:'#5865e8',color2:'#b8d9e8',padding:8,radius:18,shadow:30,aspect:'auto',resolution:1080,cameraPosition:'bottom-right',cameraSize:22,cameraShape:'circle',cameraMirror:true,showCamera:true,autoZoom:true,start:0,end:0,zooms:[],zoomMode:'cursor',cursor:[],cursorDuration:0,zoomStrength:1.7,captions:[],showCaptions:true,captionSize:46,captionColor:'#ffffff',captionBox:true,captionY:.85,captionModel:'whisper-base',captionLanguage:'auto',clips:[],texts:[],volume:1,cameraStart:0,cameraEnd:0};
function rectangle(value){
 if(!value)return null;
 const {x,y,width,height}=value;
 if(![x,y,width,height].every(Number.isFinite)||x<0||y<0||width<=0||height<=0||x+width>1.000001||y+height>1.000001)throw Error('Select a valid capture area.');
 return {x,y,width,height};
}
function normalizeProject(input={}){
 const result={...defaults};
 if(!input||typeof input!=='object')throw Error('Choose valid editing options.');
 for(const [key,min,max] of [['transitionDuration',.1,1],['padding',0,24],['radius',0,60],['shadow',0,80],['cameraSize',10,45],['start',0,86400],['end',0,86400],['cursorDuration',0,86400],['zoomStrength',1,3],['volume',0,1],['cameraStart',0,86400],['cameraEnd',0,86400],['captionSize',20,100],['captionY',.05,.95]]){
  if(input[key]!==undefined){if(!Number.isFinite(input[key])||input[key]<min||input[key]>max)throw Error(`Choose a valid ${key}.`);result[key]=input[key]}
 }
 if(result.end&&result.end<=result.start)throw Error('Trim end must be after the start.');
 for(const key of ['color','color2','captionColor','captionHighlight'])if(input[key]!==undefined){if(!/^#[0-9a-f]{6}$/i.test(input[key]))throw Error('Choose a valid background color.');result[key]=input[key]}
 for(const [key,values] of [['effect',['none','mono','warm','cool','vivid']],['transition',['none','black','white']],['captionStyle',['clean','hormozi','tiktok']],['captionModel',['whisper','whisper-base','whisper-small','whisper-turbo']],['zoomMode',['cursor','moments']],['background',['none','solid','gradient','image']],['aspect',['auto','16:9','9:16','1:1','4:3']],['resolution',[720,1080,1440]],['cameraPosition',['bottom-right','bottom-left','top-right','top-left']],['cameraShape',['circle','rounded']]])if(input[key]!==undefined){if(!values.includes(input[key]))throw Error(`Choose a valid ${key}.`);result[key]=input[key]}
 for(const key of ['captionUppercase','cameraMirror','showCamera','autoZoom','showCaptions','captionBox'])if(typeof input[key]==='boolean')result[key]=input[key];
 for(const key of ['cameraId','backgroundId'])if(input[key]){if(typeof input[key]!=='string'||!/^[-a-f0-9]{36}$/.test(input[key]))throw Error('Choose media from the library.');result[key]=input[key]}
 if(input.zoomMode===undefined&&input.zooms?.length)result.zoomMode='moments';
 const cursor=input.cursor||[];
 if(!Array.isArray(cursor)||cursor.length>150000)throw Error('Invalid cursor recording.');
 result.cursor=cursor.map((p,i)=>{if(!p||![p.time,p.x,p.y].every(Number.isFinite)||p.time<0||p.time>86400||p.x<0||p.x>1||p.y<0||p.y>1||(i&&p.time<=cursor[i-1].time))throw Error('Invalid cursor recording.');return {time:p.time,x:p.x,y:p.y}});
 for(const key of ['cameraX','cameraY'])if(input[key]!==undefined){if(!Number.isFinite(input[key])||input[key]<0||input[key]>1)throw Error('Invalid camera position.');result[key]=input[key]}
 if(input.backgroundPreset){if(!['silk','dunes','midnight'].includes(input.backgroundPreset))throw Error('Choose a background preset.');result.backgroundPreset=input.backgroundPreset}
 const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{1,64}$/.test(id);
 if(input.clips!==undefined){if(!Array.isArray(input.clips)||input.clips.length>500)throw Error('Use up to 500 clips.');const ids=new Set();result.clips=input.clips.map(c=>{if(!c||!validId(c.id)||ids.has(c.id)||![c.start,c.end].every(Number.isFinite)||c.start<0||c.end-c.start<.05||c.end>86400)throw Error('Invalid clip range.');ids.add(c.id);return {id:c.id,start:c.start,end:c.end}})}
 if(input.texts!==undefined){if(!Array.isArray(input.texts)||input.texts.length>100)throw Error('Use up to 100 text layers.');const ids=new Set();result.texts=input.texts.map(t=>{if(!t||!validId(t.id)||ids.has(t.id)||typeof t.text!=='string'||t.text.length>500||![t.start,t.end,t.x,t.y,t.size].every(Number.isFinite)||t.start<0||t.end<=t.start||t.end>86400||t.x<0||t.x>1||t.y<0||t.y>1||t.size<16||t.size>120||!/^#[0-9a-f]{6}$/i.test(t.color))throw Error('Invalid text layer.');if(t.imageId!==undefined&&(typeof t.imageId!=='string'||!/^[-a-f0-9]{36}$/.test(t.imageId)))throw Error('Choose an image from your library.');ids.add(t.id);return {...(t.imageId?{imageId:t.imageId}:{}),id:t.id,text:t.text,start:t.start,end:t.end,x:t.x,y:t.y,size:t.size,color:t.color,box:!!t.box}})}
 if(result.cameraEnd&&result.cameraEnd<=result.cameraStart)throw Error('Webcam end must be after its start.');
 if(input.captionLanguage!==undefined){if(typeof input.captionLanguage!=='string'||!/^([a-z]{2,3}|auto)$/.test(input.captionLanguage))throw Error('Choose a caption language.');result.captionLanguage=input.captionLanguage}
 if(input.captions!==undefined){if(!Array.isArray(input.captions)||input.captions.length>3000)throw Error('Use up to 3,000 captions.');const ids=new Set();result.captions=input.captions.map(c=>{if(!c||!validId(c.id)||ids.has(c.id)||![c.start,c.end].every(Number.isFinite)||c.start<0||c.end<=c.start||c.end>86400||typeof c.text!=='string'||c.text.length>1000)throw Error('Invalid caption timing or text.');ids.add(c.id);return {id:c.id,start:c.start,end:c.end,text:c.text}}).sort((a,b)=>a.start-b.start)}
 const zooms=input.zooms||[];
 if(!Array.isArray(zooms)||zooms.length>2000||zooms.some(z=>!z||typeof z!=='object'))throw Error('Use up to 2,000 zoom moments.');
 result.zooms=zooms.map(z=>{if(![z.start,z.end,z.x,z.y,z.scale].every(Number.isFinite)||z.start<0||z.end<=z.start||z.end>86400||z.x<0||z.x>1||z.y<0||z.y>1||z.scale<1||z.scale>3)throw Error('Choose valid zoom timing and focus.');return {start:z.start,end:z.end,x:z.x,y:z.y,scale:z.scale}}).sort((a,b)=>a.start-b.start);
 for(let i=1;i<result.zooms.length;i++)if(result.zooms[i].start<result.zooms[i-1].end)throw Error('Zoom moments must not overlap.');
 return result;
}
function createRecorderProjects(directory){
 const file=path.join(directory,'recorder-projects.json');let data={settings:{editScreenshot:true,shortcutArea:true},projects:{},recent:[]};
 try{data={...data,...JSON.parse(fs.readFileSync(file,'utf8'))}}catch{}
 const persist=()=>{fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(data),{mode:0o600});fs.renameSync(file+'.tmp',file)};
 const valid=id=>{if(typeof id!=='string'||!/^[-a-f0-9]{36}$/.test(id))throw Error('Choose a saved capture.')};
 return {state:()=>({settings:{...data.settings},recent:[...data.recent]}),settings(input){for(const key of ['editScreenshot','shortcutArea'])if(typeof input[key]==='boolean')data.settings[key]=input[key];persist();return this.state()},get(id){valid(id);return data.projects[id]||null},save(id,input){valid(id);const project=normalizeProject(input);data.projects[id]=project;data.recent=[id,...data.recent.filter(x=>x!==id)].slice(0,100);persist();return project}};
}
module.exports={defaults,rectangle,normalizeProject,createRecorderProjects};
