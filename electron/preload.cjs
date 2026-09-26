const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('studio',Object.freeze({
 connectMeta:()=>ipcRenderer.invoke('meta:connect'),
 checkout:()=>ipcRenderer.invoke('billing:checkout'),
 checkUpdates:()=>ipcRenderer.invoke('updates:check'),
 getUpdateState:()=>ipcRenderer.invoke('updates:state'),
 installUpdate:()=>ipcRenderer.invoke('updates:install'),
 openReleases:()=>ipcRenderer.invoke('updates:releases'),
 getVersion:()=>ipcRenderer.invoke('app:version'),
 onUpdate:callback=>{const listener=(_event,state)=>callback(state);ipcRenderer.on('update:status',listener);return()=>ipcRenderer.removeListener('update:status',listener);}
}));
