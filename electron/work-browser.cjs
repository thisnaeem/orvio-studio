const {randomUUID}=require('node:crypto');
function browserURL(value){const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Use an HTTP or HTTPS URL without credentials.');return url.href}
class WorkBrowser{
 constructor({BrowserWindow}){this.BrowserWindow=BrowserWindow;this.window=null}
 ensure(){
  if(this.window&&!this.window.isDestroyed())return this.window;
  const win=new this.BrowserWindow({width:1100,height:760,title:'Orvio project browser',backgroundColor:'#f8f9fb',webPreferences:{partition:'orvio-browser-'+randomUUID(),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true}});
  this.window=win;
  win.webContents.session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  win.webContents.session.setPermissionCheckHandler(()=>false);
  win.webContents.session.on('will-download',event=>event.preventDefault());
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  for(const event of ['will-navigate','will-redirect'])win.webContents.on(event,(e,url)=>{try{browserURL(url)}catch{e.preventDefault()}});
  win.on('closed',()=>{if(this.window===win)this.window=null});
  return win;
 }
 async open(url,signal){
  const target=browserURL(url);signal?.throwIfAborted();const win=this.ensure();
  const stop=()=>{if(!win.isDestroyed())win.webContents.stop()};let timer,rejectAbort;
  const aborted=signal?new Promise((_,reject)=>{rejectAbort=()=>reject(Error('Browser request stopped.'));signal.addEventListener('abort',rejectAbort,{once:true})}):null;
  signal?.addEventListener('abort',stop,{once:true});
  try{
   await Promise.race([win.loadURL(target),new Promise((_,reject)=>{timer=setTimeout(()=>{stop();reject(Error('Page timed out after 30 seconds.'))},30000)}),...(aborted?[aborted]:[])]);
   signal?.throwIfAborted();win.show();return await this.read();
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',stop);if(rejectAbort)signal?.removeEventListener('abort',rejectAbort)}
 }
 async read(){
  if(!this.window||this.window.isDestroyed())throw Error('Open a page first.');
  return this.window.webContents.executeJavaScript(`({url:location.href,title:document.title,text:(document.body?.innerText||'').slice(0,14000),links:Array.from(document.querySelectorAll('a[href]')).slice(0,60).map(a=>({text:a.innerText.slice(0,100),url:a.href}))})`);
 }
 close(){if(this.window&&!this.window.isDestroyed())this.window.destroy();this.window=null}
}
module.exports={createWorkBrowser:options=>new WorkBrowser(options),WorkBrowser,browserURL};
