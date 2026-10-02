const path=require('node:path');
function createRecorderWindows({BrowserWindow,workspaceWindows,localStudio,packaged,directory}){
 const windows=new Map();
 return {
  open(id){
   localStudio.file(id);
   const asset=localStudio.state().assets.find(a=>a.id===id);
   if(!asset||!['image','video'].includes(asset.kind))throw Error('Choose a screenshot or recording.');
   const existing=windows.get(id);
   if(existing&&!existing.isDestroyed()){existing.restore();existing.show();existing.focus();return true}
   const win=new BrowserWindow({width:1320,height:900,minWidth:900,minHeight:650,title:`${asset.title} · Orvio Editor`,backgroundColor:'#111318',show:false,...(process.platform==='darwin'?{titleBarStyle:'hiddenInset',trafficLightPosition:{x:16,y:19}}:{frame:false}),webPreferences:{preload:path.join(directory,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
   windows.set(id,win);workspaceWindows.add(win);
   win.on('closed',()=>{windows.delete(id);workspaceWindows.delete(win)});
   win.on('close',event=>{event.preventDefault();win.webContents.send('recorder:editor-close')});
   win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
   win.webContents.on('will-navigate',event=>event.preventDefault());
   win.on('page-title-updated',event=>event.preventDefault());
   win.once('ready-to-show',()=>{win.show();win.focus()});
   if(packaged)void win.loadFile(path.join(directory,'../dist/index.html'),{hash:`recorder-editor=${id}`});
   else void win.loadURL(`http://127.0.0.1:5188/#recorder-editor=${id}`);
   return true;
  },
  close(win){if(![...windows.values()].includes(win))throw Error('This is not a capture editor.');win.destroy();return true},
  shutdown(){for(const win of windows.values())if(!win.isDestroyed())win.destroy();windows.clear()}
 };
}
module.exports={createRecorderWindows};
