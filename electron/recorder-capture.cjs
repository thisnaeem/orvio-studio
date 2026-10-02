const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {rectangle,createRecorderProjects}=require('./recorder-project.cjs');
function createRecorderCapture({directory,desktopCapturer,screen,nativeImage,clipboard,localStudio,BrowserWindow,ipcMain,onCapture=()=>{},onError=()=>{}}){
 const projects=createRecorderProjects(directory),root=path.join(directory,'screenshots');fs.mkdirSync(root,{recursive:true});let selection=null,working=false;
 const trusted=event=>selection&&!selection.window.isDestroyed()&&event.sender===selection.window.webContents&&event.senderFrame===event.sender.mainFrame;
 ipcMain.handle('recorder:selection-image',event=>{if(!trusted(event))throw Error('Untrusted selection');return selection.image});
 ipcMain.on('recorder:selection-result',(event,value)=>{if(trusted(event)){try{selection.finish(rectangle(value))}catch{selection.finish(null)}}});
 async function snapshot(sourceId){
  const displays=screen.getAllDisplays(),display=displays.find(d=>String(d.id)===sourceId?.split(':')[1])||screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const max=Math.min(7680,Math.max(...displays.map(d=>Math.max(d.size.width,d.size.height)*d.scaleFactor)));
  const sources=await desktopCapturer.getSources({types:[sourceId?.startsWith('window:')?'window':'screen'],thumbnailSize:{width:max,height:max}});
  const source=sourceId?sources.find(s=>s.id===sourceId):sources.find(s=>s.display_id===String(display.id))||sources[0];
  if(!source||source.thumbnail.isEmpty())throw Error('Screen capture is unavailable. Allow Orvio in your system screen recording settings, then try again.');
  return {image:source.thumbnail,sourceId:source.id,display:displays.find(d=>String(d.id)===source.display_id)||display};
 }
 async function selectArea(sourceId){
  if(selection)throw Error('Finish selecting the current area first.');
  const shot=await snapshot(sourceId);
  if(!shot.sourceId.startsWith('screen:'))throw Error('Choose a screen before selecting an area.');
  return new Promise(resolve=>{
   const win=new BrowserWindow({...shot.display.bounds,show:false,frame:false,resizable:false,movable:false,alwaysOnTop:true,skipTaskbar:true,hasShadow:false,webPreferences:{preload:path.join(__dirname,'recorder-selection-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
   let done=false;const finish=crop=>{if(done)return;done=true;selection=null;if(!win.isDestroyed())win.destroy();resolve(crop?{sourceId:shot.sourceId,crop,image:shot.image}:null)};
   selection={window:win,image:shot.image.toDataURL(),finish};win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',event=>event.preventDefault());win.on('closed',()=>finish(null));win.once('ready-to-show',()=>{win.show();win.focus()});win.loadFile(path.join(__dirname,'recorder-selection.html')).catch(()=>finish(null));
  });
 }
 function cropImage(image,crop){if(!crop)return image;const {width,height}=image.getSize();return image.crop({x:Math.round(crop.x*width),y:Math.round(crop.y*height),width:Math.max(1,Math.min(width-Math.round(crop.x*width),Math.round(crop.width*width))),height:Math.max(1,Math.min(height-Math.round(crop.y*height),Math.round(crop.height*height)))})}
 function saveImage(image,title='Screenshot'){
  if(image.isEmpty())throw Error('The screenshot could not be read.');const file=path.join(root,randomUUID()+'.png');fs.writeFileSync(file,image.toPNG(),{mode:0o600});try{const asset=localStudio.import(file,'image',title);projects.save(asset.id,{});return {...asset,...image.getSize()}}finally{fs.rmSync(file,{force:true})}
 }
 async function capture(input={}){
  if(working)throw Error('A screenshot is already being captured.');working=true;
  try{let shot;if(input.area){const selected=await selectArea(input.sourceId);if(!selected)return null;shot={image:cropImage(selected.image,selected.crop)}}else{shot=await snapshot(input.sourceId);shot.image=cropImage(shot.image,rectangle(input.crop))}
   clipboard.writeImage(shot.image);
   const edit=input.edit??projects.state().settings.editScreenshot;
   const result=edit?saveImage(shot.image):{copied:true,...shot.image.getSize()};
   onCapture(result,edit);return result;
  }finally{working=false}
 }
 function rendered(input){if(typeof input.data!=='string'||input.data.length>48*1024*1024||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(input.data))throw Error('Choose a valid PNG screenshot.');const image=nativeImage.createFromDataURL(input.data);if(image.isEmpty())throw Error('The screenshot could not be read.');if(input.copy)clipboard.writeImage(image);return input.save?saveImage(image,'Styled screenshot'):{copied:true}}
 return {projects,capture,rendered,async selectArea(id){const result=await selectArea(id);return result?{sourceId:result.sourceId,crop:result.crop}:null},quick(){return capture({area:projects.state().settings.shortcutArea}).catch(error=>onError(error.message))},shutdown(){selection?.finish(null)}};
}
module.exports={createRecorderCapture};
