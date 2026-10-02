const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('selection',Object.freeze({image:()=>ipcRenderer.invoke('recorder:selection-image'),finish:value=>ipcRenderer.send('recorder:selection-result',value)}));
