const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const { autoUpdater } = require('electron-updater');
const { serviceURL, externalURL } = require('./security.cjs');
const { createUpdateController, RELEASES_URL } = require('./updates.cjs');
let mainWindow;
const updates=createUpdateController({updater:autoUpdater,packaged:app.isPackaged,platform:process.platform,macSigned:false,send:state=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('update:status',state);}});
function openWindow() {
 mainWindow = new BrowserWindow({width:1440,height:1050,minWidth:800,minHeight:650,title:'Orvio Studio',icon:path.join(__dirname,'../dist/orvio-logo.png'),backgroundColor:'#f8f9fb',show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 mainWindow.once('ready-to-show',()=>mainWindow.show());
 mainWindow.webContents.setWindowOpenHandler(({url})=>{try{shell.openExternal(externalURL(url));}catch{}return {action:'deny'};});
 mainWindow.webContents.on('will-navigate',(event,url)=>{if(url!==mainWindow.webContents.getURL())event.preventDefault();});
 mainWindow.webContents.session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
 mainWindow.webContents.session.setPermissionCheckHandler(()=>false);
 mainWindow.webContents.session.webRequest.onHeadersReceived((details,callback)=>{callback({responseHeaders:{...details.responseHeaders,'Content-Security-Policy':["default-src 'self'; script-src 'self'"+(app.isPackaged?'':" 'unsafe-inline'")+"; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' ws://127.0.0.1:5188; object-src 'none'; base-uri 'self'; frame-src 'none'"]}})});
 if(app.isPackaged)mainWindow.loadFile(path.join(__dirname,'../dist/index.html'));else mainWindow.loadURL('http://127.0.0.1:5188');
}
ipcMain.handle('meta:connect',async()=>{await shell.openExternal(serviceURL(process.env.ORVIO_SERVICE_URL,'/connect/meta'));});
ipcMain.handle('billing:checkout',async()=>{await shell.openExternal(serviceURL(process.env.ORVIO_SERVICE_URL,'/billing/checkout'));});
ipcMain.handle('updates:check',()=>updates.check());
ipcMain.handle('updates:state',()=>updates.getState());
ipcMain.handle('updates:install',()=>updates.install());
ipcMain.handle('updates:releases',()=>shell.openExternal(RELEASES_URL));
ipcMain.handle('app:version',()=>app.getVersion());
app.whenReady().then(()=>{
 openWindow();
 if(app.isPackaged){setTimeout(()=>updates.check(),8000).unref();setInterval(()=>updates.check(),4*60*60*1000).unref();}
 app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)openWindow()});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
