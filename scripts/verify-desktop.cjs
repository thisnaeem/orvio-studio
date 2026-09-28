// Start npm run dev first, then run npm run verify:desktop:dev.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'orvio-dev-check-')));
const errors=[];let window;
app.on('browser-window-created',(_event,created)=>{
 if(window)return;window=created;
 created.webContents.on('console-message',event=>{
  if(event.level==='error')errors.push(event.message);
 });
 created.webContents.on('render-process-gone',(_event,details)=>errors.push(details.reason));
});
require('../electron/main.cjs');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const watchdog=setTimeout(()=>{console.error('Dev desktop check timed out',errors);app.exit(1)},45000);
(async()=>{
 await app.whenReady();while(!window||window.webContents.isLoading())await sleep(100);
 await sleep(2000);
 await window.webContents.executeJavaScript(`localStorage.setItem('orvio.v2.preferences',JSON.stringify({name:'Test',workspace:'Verification',onboarded:true}));sessionStorage.setItem('orvio.v2.ready','true');location.reload()`);
 await sleep(1500);
 const pages=['Home','Chat','Models','Videos','Live','Captions','Recorder','Images','Voice','Clipping','Downloader','PC Helper','Integrations','Settings','All tools','Automations'];
 for(let round=0;round<2;round++)for(const page of pages){
  window.webContents.send('workspace:navigate',page);await sleep(300);
  const result=await window.webContents.executeJavaScript(`({content:document.body.innerText.length,failed:!!document.querySelector('#startup-status')||document.body.innerText.includes('This page needs to restart'),shell:!!document.querySelector('.sidebar')})`);
  if(!result.content||result.failed||!result.shell)throw Error('Dev page failed: '+page);
 }
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: Vite + Electron startup and 32 page switches; no renderer errors.');clearTimeout(watchdog);app.exit(0);
})().catch(error=>{console.error(error,errors);clearTimeout(watchdog);app.exit(1)});
