const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, safeStorage, powerMonitor, dialog } = require('electron');
const path = require('node:path');
const { autoUpdater } = require('electron-updater');
const { externalURL } = require('./security.cjs');
const { createUpdateController, RELEASES_URL } = require('./updates.cjs');
const {createWorkspace}=require('./workspace.cjs');
let mainWindow,tray,workspace,quitting=false;
if(!app.requestSingleInstanceLock())app.quit();
app.setAppUserModelId('com.orvio.studio');
function showWindow(){if(!mainWindow||mainWindow.isDestroyed())openWindow();else{mainWindow.show();mainWindow.focus();}}
app.on('second-instance',showWindow);
app.on('before-quit',()=>{quitting=true;});
function refreshTray(){if(!tray||!workspace)return;tray.setContextMenu(Menu.buildFromTemplate([{label:'Open Orvio Studio',click:showWindow},{label:'Pause automations',type:'checkbox',checked:workspace.snapshot().paused,click:item=>workspace.preferences({paused:item.checked})},{type:'separator'},{label:'Quit Orvio Studio',click:()=>app.quit()}]));}
const updates=createUpdateController({updater:autoUpdater,packaged:app.isPackaged,platform:process.platform,macSigned:false,send:state=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('update:status',state);}});
function openWindow() {
 mainWindow = new BrowserWindow({width:1280,height:850,minWidth:800,minHeight:650,title:'Orvio Studio',icon:path.join(__dirname,'../dist/orvio-logo.png'),backgroundColor:'#f8f9fb',show:false,...(process.platform==='darwin'?{titleBarStyle:'hiddenInset'}:{frame:false}),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 mainWindow.on('close',event=>{if(!quitting){event.preventDefault();mainWindow.hide();}});
 mainWindow.once('ready-to-show',()=>mainWindow.show());
 mainWindow.webContents.setWindowOpenHandler(({url})=>{try{shell.openExternal(externalURL(url));}catch{}return {action:'deny'};});
 mainWindow.webContents.on('will-navigate',(event,url)=>{if(url!==mainWindow.webContents.getURL())event.preventDefault();});
 mainWindow.webContents.session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
 mainWindow.webContents.session.setPermissionCheckHandler(()=>false);
 mainWindow.webContents.session.webRequest.onHeadersReceived((details,callback)=>{callback({responseHeaders:{...details.responseHeaders,'Content-Security-Policy':["default-src 'self'; script-src 'self'"+(app.isPackaged?'':" 'unsafe-inline'")+"; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https:; connect-src 'self' ws://127.0.0.1:5188; object-src 'none'; base-uri 'self'; frame-src 'none'"]}})});
 if(app.isPackaged)mainWindow.loadFile(path.join(__dirname,'../dist/index.html'));else mainWindow.loadURL('http://127.0.0.1:5188');
}
function handle(channel,action){ipcMain.handle(channel,(event,...args)=>{if(!mainWindow||event.sender!==mainWindow.webContents||event.senderFrame!==mainWindow.webContents.mainFrame)throw new Error('Untrusted request');return action(...args);});}
handle('workspace:state',()=>workspace.snapshot());
handle('window:minimize',()=>mainWindow.minimize());
handle('window:maximize',()=>{if(mainWindow.isMaximized())mainWindow.unmaximize();else mainWindow.maximize();});
handle('window:close',()=>mainWindow.close());
handle('media:save',input=>workspace.saveMedia(input));
handle('media:choose',async accountId=>{const result=await dialog.showOpenDialog(mainWindow,{properties:['openFile'],filters:[{name:'Images and videos',extensions:['jpg','jpeg','png','mp4','mov']}]});if(result.canceled)return null;return workspace.prepareMedia(result.filePaths[0],accountId);});
handle('ai:models',input=>workspace.listModels(input));
handle('ai:chat',input=>workspace.chat(input));
handle('meta:connect',input=>workspace.connect(input));
handle('meta:disconnect',id=>workspace.disconnect(id));
handle('jobs:schedule',input=>{const result=workspace.schedule(input);setImmediate(()=>workspace.tick().catch(()=>{}));return result;});
handle('jobs:cancel',id=>workspace.cancel(id));
handle('workspace:preferences',input=>{if(typeof input.startAtLogin==='boolean'){if(!app.isPackaged)throw new Error('Startup settings are available in the installed app.');app.setLoginItemSettings({openAtLogin:input.startAtLogin});}return workspace.preferences(input);});
handle('ai:save',input=>workspace.saveAI(input));
handle('ai:generate',prompt=>workspace.generate(prompt));
ipcMain.handle('updates:check',()=>updates.check());
ipcMain.handle('updates:state',()=>updates.getState());
ipcMain.handle('updates:install',()=>updates.install());
ipcMain.handle('updates:releases',()=>shell.openExternal(RELEASES_URL));
ipcMain.handle('app:version',()=>app.getVersion());
app.whenReady().then(()=>{
 workspace=createWorkspace({directory:app.getPath('userData'),safeStorage,notify:state=>{refreshTray();if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('workspace:changed',state);}});
 tray=new Tray(nativeImage.createFromPath(path.join(__dirname,'../dist/orvio-logo.png')).resize({width:process.platform==='darwin'?22:32,height:process.platform==='darwin'?22:32}));
 tray.setToolTip('Orvio Studio • Free tools');tray.on('double-click',showWindow);refreshTray();
 openWindow();
 const run=()=>workspace.tick().catch(()=>{});setInterval(run,30000).unref();setTimeout(run,3000).unref();powerMonitor.on('resume',run);
 if(app.isPackaged){setTimeout(()=>updates.check(),8000).unref();setInterval(()=>updates.check(),4*60*60*1000).unref();}
 app.on('activate',showWindow);
});
app.on('window-all-closed',()=>{});
