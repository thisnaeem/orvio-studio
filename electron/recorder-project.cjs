const fs = require('node:fs');
const path = require('node:path');
const defaults = {background:'gradient',color:'#5865e8',color2:'#b8d9e8',padding:8,radius:18,shadow:30,aspect:'auto',resolution:1080,cameraPosition:'bottom-right',cameraSize:22,cameraShape:'circle',cameraMirror:true,showCamera:true,autoZoom:true,start:0,end:0,zooms:[],zoomMode:'cursor',cursor:[],cursorDuration:0,zoomStrength:1.7};
function rectangle(value){
 if(!value)return null;
 const {x,y,width,height}=value;
 if(![x,y,width,height].every(Number.isFinite)||x<0||y<0||width<=0||height<=0||x+width>1.000001||y+height>1.000001)throw Error('Select a valid capture area.');
 return {x,y,width,height};
}
function normalizeProject(input={}){
 const result={...defaults};
 if(!input||typeof input!=='object')throw Error('Choose valid editing options.');
 for(const [key,min,max] of [['padding',0,24],['radius',0,60],['shadow',0,80],['cameraSize',10,45],['start',0,86400],['end',0,86400],['cursorDuration',0,86400],['zoomStrength',1,3]]){
  if(input[key]!==undefined){if(!Number.isFinite(input[key])||input[key]<min||input[key]>max)throw Error(`Choose a valid ${key}.`);result[key]=input[key]}
 }
 if(result.end&&result.end<=result.start)throw Error('Trim end must be after the start.');
 for(const key of ['color','color2'])if(input[key]!==undefined){if(!/^#[0-9a-f]{6}$/i.test(input[key]))throw Error('Choose a valid background color.');result[key]=input[key]}
 for(const [key,values] of [['zoomMode',['cursor','moments']],['background',['none','solid','gradient','image']],['aspect',['auto','16:9','9:16','1:1','4:3']],['resolution',[720,1080,1440]],['cameraPosition',['bottom-right','bottom-left','top-right','top-left']],['cameraShape',['circle','rounded']]])if(input[key]!==undefined){if(!values.includes(input[key]))throw Error(`Choose a valid ${key}.`);result[key]=input[key]}
 for(const key of ['cameraMirror','showCamera','autoZoom'])if(typeof input[key]==='boolean')result[key]=input[key];
 for(const key of ['cameraId','backgroundId'])if(input[key]){if(typeof input[key]!=='string'||!/^[-a-f0-9]{36}$/.test(input[key]))throw Error('Choose media from the library.');result[key]=input[key]}
 if(input.zoomMode===undefined&&input.zooms?.length)result.zoomMode='moments';
 const cursor=input.cursor||[];
 if(!Array.isArray(cursor)||cursor.length>150000)throw Error('Invalid cursor recording.');
 result.cursor=cursor.map((p,i)=>{if(!p||![p.time,p.x,p.y].every(Number.isFinite)||p.time<0||p.time>86400||p.x<0||p.x>1||p.y<0||p.y>1||(i&&p.time<=cursor[i-1].time))throw Error('Invalid cursor recording.');return {time:p.time,x:p.x,y:p.y}});
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
