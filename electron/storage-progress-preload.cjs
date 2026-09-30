const {ipcRenderer}=require('electron');
window.addEventListener('DOMContentLoaded',()=>{document.getElementById('minimize')?.addEventListener('click',()=>ipcRenderer.send('storage:window-minimize'))});
