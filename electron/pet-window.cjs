const path=require('node:path');
function createPetWindow({app,BrowserWindow,screen,ipcMain,pets,open}){
 let window=null,armedUntil=0;const petFrames=new WeakMap();const state=()=>pets.state();
 const scale=()=>({small:0.8,large:1.3}[state().settings.size]||1);
 function bounds(expanded){const area=screen.getPrimaryDisplay().workArea,s=scale(),width=expanded?380:Math.round(180*s),height=Math.min(area.height-24,expanded?Math.round(420+170*s):Math.round(210*s));return {x:state().settings.corner==='left'?area.x+16:area.x+area.width-width-16,y:area.y+area.height-height-12,width,height}}
 function show(){if(!state().settings.enabled){hide();return}if(window){window.setBounds(bounds(false));window.showInactive();return}window=new BrowserWindow({...bounds(false),transparent:true,frame:false,resizable:false,alwaysOnTop:true,skipTaskbar:true,show:false,hasShadow:false,webPreferences:{preload:path.join(__dirname,'pet-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:true}});petFrames.set(window.webContents,new Set([window.webContents.mainFrame]));window.webContents.on('did-start-navigation',(_event,_url,inPlace,mainFrame)=>{if(mainFrame&&!inPlace)armedUntil=0});window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',e=>e.preventDefault());window.once('ready-to-show',()=>{if(state().settings.enabled)window?.showInactive()});window.on('closed',()=>{window=null;armedUntil=0});if(app.isPackaged)window.loadFile(path.join(__dirname,'../dist/index.html'),{hash:'pet'});else window.loadURL('http://127.0.0.1:5188/#pet')}
 function hide(){armedUntil=0;window?.destroy();window=null}
 function handle(channel,fn){ipcMain.handle(channel,(event,...args)=>{
  const frames=petFrames.get(event.sender);
  const trusted=!!event.senderFrame&&window&&event.sender===window.webContents&&event.senderFrame===window.webContents.mainFrame;
  // React cleanup can arrive after its frame detaches or its window is destroyed.
  // A retired renderer may acknowledge disarming, but cannot affect a new pet.
  if(!trusted){
   if(channel==='pet:disarm'&&frames&&(event.senderFrame===null||frames.has(event.senderFrame)))return;
   throw Error('Untrusted pet request');
  }
  frames.add(event.senderFrame);return fn(...args);
 })}
 handle('pet:state',state);handle('pet:chat',text=>pets.chat(text));handle('pet:speech',text=>pets.speech(text));handle('pet:clear',()=>pets.clear());handle('pet:wake',(text,phrase)=>require('./pets.cjs').wakeCommand(String(text).slice(0,4000),String(phrase).slice(0,40)));
 handle('pet:transcribe',bytes=>{if(!armedUntil)throw Error('Enable the microphone first.');return pets.transcribe(bytes)});
 handle('pet:arm',()=>{armedUntil=Date.now()+60000;return true});handle('pet:disarm',()=>{armedUntil=0});handle('pet:hide',hide);handle('pet:expand',expanded=>window.setBounds(bounds(!!expanded),false));
 // Normalized pointer direction relative to the pet's head, clamped to [-1,1].
 handle('pet:cursor',()=>{const p=screen.getCursorScreenPoint(),b=window.getBounds(),s=scale(),clamp=v=>Math.max(-1,Math.min(1,v));return {x:clamp((p.x-(b.x+b.width-90*s))/500),y:clamp((p.y-(b.y+b.height-110*s))/350)}});
 handle('pet:open',page=>{if(!['Pets','Chat','Models'].includes(page))throw Error('Unknown page');open(page)});
 return {show,hide,listen:value=>window?.webContents.send('pet:listen',value),permission:(contents,permission,details)=>!!window&&window.webContents===contents&&Date.now()<armedUntil&&permission==='media'&&(!details?.mediaTypes||details.mediaTypes.every(t=>t==='audio'))&&(!details?.mediaType||details.mediaType==='audio'),refresh(){if(window&&!window.isDestroyed())window.webContents.send('pet:changed',state())}};
}
module.exports={createPetWindow};
