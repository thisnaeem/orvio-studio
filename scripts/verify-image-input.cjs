const {app,ipcMain}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'orvio-image-input-')));
let win;app.on('browser-window-created',(_,w)=>{if(!win)win=w});
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),js=s=>win.webContents.executeJavaScript(s);
async function until(fn,label){for(let i=0;i<100;i++){if(await fn())return;await sleep(100)}throw Error(label)}
const click=text=>js(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);
async function choose(name){await js(`document.querySelector('button[aria-label^="Generation model:"]').click()`);await until(()=>js(`!!document.querySelector('[aria-label="Search generation model"]')`),'model picker');await js(`Array.from(document.querySelectorAll('[role="dialog"] button')).find(b=>b.querySelector('span')?.textContent===${JSON.stringify(name)}).click()`);await sleep(200)}
(async()=>{
 require('../electron/main.cjs');await app.whenReady();await until(()=>win&&!win.webContents.isLoading(),'window');
 await js(`localStorage.setItem('orvio.v2.preferences',JSON.stringify({onboarded:true,name:'Test',workspace:'Image check'}));sessionStorage.setItem('orvio.v2.ready','true');location.reload()`);await sleep(1400);
 const hub=await js('window.studio.modelHub()');hub.models.forEach(m=>m.installed=true);
 ipcMain.removeHandler('models:state');ipcMain.handle('models:state',()=>hub);
 let gpuChecks=0;ipcMain.removeHandler('local:acceleration');ipcMain.handle('local:acceleration',()=>{gpuChecks++;return {ready:true,device:'cuda',deviceName:'Fixture GPU',canRepair:false,message:'GPU ready · Fixture GPU'}});
 let generated;const ref={id:'reference',kind:'image',title:'Reference photo',preview:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="200" height="120" fill="#7456ba"/></svg>')};
 ipcMain.removeHandler('local:state');ipcMain.handle('local:state',()=>({assets:[]}));
 ipcMain.removeHandler('local:import');ipcMain.handle('local:import',(_,kind)=>{assert.equal(kind,'image');return ref});
 ipcMain.removeHandler('models:generate');ipcMain.handle('models:generate',(_,input)=>{generated=input;return {...ref,id:'output',modelId:input.model}});
 win.webContents.send('workspace:navigate','Images');await until(()=>js(`!!document.querySelector('button[aria-label^="Generation model:"]')`),'studio');
 await choose('Z-Image Turbo');await until(()=>js(`document.body.innerText.includes('GPU ready')`),'automatic GPU check');assert.ok(gpuChecks>0);assert.equal(await js(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Download GPU runtime')`),false);await click('CPU');await click('Upload image');
 await until(()=>js(`!!document.querySelector('input[aria-label="Image change strength"]')`),'strength slider');
 await js(`document.querySelector('[aria-label="Creation prompt"]').focus()`);await win.webContents.insertText('Change the background to a garden');
 await click('Generate');await until(()=>generated,'Z request');assert.equal(generated.sourceId,'reference');assert.equal(generated.model,'z-image-turbo');assert.equal(generated.strength,.7);
 await choose('Qwen Image 2.1');assert.equal(await js(`!!document.querySelector('input[aria-label="Image change strength"]')`),false);
 await js(`document.querySelector('[aria-label="Upload reference image"]').click()`);await until(()=>js(`document.body.innerText.includes('Remove')`),'reference attached');
 generated=null;await click('Generate');await until(()=>generated,'Qwen request');assert.equal(generated.sourceId,'reference');assert.equal(generated.model,'qwen-image-21');
 await click('Remove');generated=null;await click('Generate');await until(()=>generated,'text only request');assert.equal(generated.sourceId,undefined);
 await choose('Stable Diffusion Turbo');await click('Upload image');await until(()=>js(`!!document.querySelector('input[aria-label="Image change strength"]')`),'SD reference');
 assert.equal(await js(`document.body.innerText.includes('This page needs to restart')`),false);
 console.log('PASS: new models selectable; upload, preview, remove, model switch, strength and text-only generation payloads. Inference is mocked.');app.exit(0);
})().catch(e=>{console.error(e);app.exit(1)});
setTimeout(()=>{console.error('Timed out');app.exit(1)},40000);
