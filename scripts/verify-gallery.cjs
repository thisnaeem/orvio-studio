const {app,ipcMain}=require('electron');

const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');

app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'orvio-gallery-check-')));

let win;app.on('browser-window-created',(_,w)=>{if(!win)win=w});

const sleep=ms=>new Promise(r=>setTimeout(r,ms));const js=s=>win.webContents.executeJavaScript(s);

async function until(fn,label){for(let i=0;i<100;i++){if(await fn())return;await sleep(100)}throw Error(label)}

(async()=>{

 require('../electron/main.cjs');await app.whenReady();await until(()=>win&&!win.webContents.isLoading(),'window');

 await js(`localStorage.setItem('orvio.v2.preferences',JSON.stringify({onboarded:true,name:'Test',workspace:'Gallery check'}));sessionStorage.setItem('orvio.v2.ready','true');location.reload()`);await sleep(1500);

 const hub=await js('window.studio.modelHub()');hub.models.forEach(m=>m.installed=true);

 const assets=[200,340,160,280,240,180].map((height,i)=>({id:'gallery-'+i,title:'Fixture '+i,model:'DreamShaper 8',modelId:'dreamshaper-8',kind:'image',prompt:'Gallery preview test',seed:i,width:220,height,preview:'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="220" height="${height}"><rect width="220" height="${height}" fill="${['#645c85','#cd9f80','#6d8883'][i%3]}"/><circle cx="110" cy="${height/2}" r="45" fill="#ffffff55"/></svg>`)}));

 ipcMain.removeHandler('models:state');ipcMain.handle('models:state',()=>hub);

 ipcMain.removeHandler('local:state');ipcMain.handle('local:state',()=>({assets}));

 win.webContents.send('workspace:navigate','Images');

 await until(()=>js(`document.querySelectorAll('.creation-image').length===6`),'gallery');

 assert.equal(await js(`document.querySelector('.creation-image').innerText`),'');

 assert.equal(await js(`getComputedStyle(document.querySelector('.creation-image-actions')).opacity`),'0');

 assert.equal(await js(`getComputedStyle(document.querySelector('.creation-masonry')).columnWidth`),'220px');

 await js(`document.querySelector('.creation-image-open').click()`);

 await until(()=>js(`document.querySelector('.creation-lightbox').open`),'preview');

 assert.equal(await js(`getComputedStyle(document.querySelector('.creation-lightbox')).backgroundColor`),'rgba(0, 0, 0, 0)');

 assert.equal(await js(`!!document.querySelector('.creation-lightbox-details')`),false);

 await js(`document.querySelector('[aria-label="Creation details"]').click()`);

 assert.equal(await js(`document.querySelector('.creation-lightbox-details').innerText.includes('Gallery preview test')`),true);

 await js(`document.querySelector('[aria-label="Close preview"]').click()`);

 await until(()=>js(`!document.querySelector('.creation-lightbox').open`),'close');

 assert.ok(await js(`document.querySelectorAll('.studio-ratios .ratio-shape').length>0`));

 let generated;ipcMain.removeHandler('models:generate');ipcMain.handle('models:generate',(_,input)=>{generated=input;return assets[0]});

 await js(`Array.from(document.querySelectorAll('[aria-label="Generation device"] button')).find(b=>b.textContent==='CPU').click()`);

 await js(`document.querySelector('[aria-label="Creation prompt"]').focus()`);await win.webContents.insertText('A quiet garden');

 await js(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Generate').click()`);

 await until(()=>!!generated,'generation device request');assert.equal(generated.device,'cpu');

 await js(`Array.from(document.querySelectorAll('[role="tab"]')).find(b=>b.textContent==='Video').click()`);await sleep(100);

 await js(`document.querySelector('button[aria-label^="Generation model:"]').click()`);await sleep(100);

 assert.ok(await js(`document.body.innerText.includes('LTX-Video · 13B Distilled')`));

 await js(`Array.from(document.querySelectorAll('[role="dialog"] button')).find(b=>b.textContent.startsWith('LTX-Video · 2B')).click()`);await sleep(150);

 assert.ok(await js(`document.body.innerText.includes('Starting image · optional')`));

 assert.ok(await js(`document.body.innerText.includes('Duration')`));

 generated=null;await js(`document.querySelector('[aria-label="Creation prompt"]').focus()`);await win.webContents.insertText('A boat glides across the water');

 await js(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Generate').click()`);

 await until(()=>!!generated,'LTX generation request');assert.equal(generated.model,'ltx-video-2b');assert.equal(generated.frames,25);assert.equal(generated.fps,24);

 hub.models.find(m=>m.id==='ltx-video-2b').installed=false;win.webContents.send('models:changed',hub);await sleep(100);
 let installed;ipcMain.removeHandler('models:install');ipcMain.handle('models:install',(_,id)=>{installed=id;return {}});
 await js(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Download LTX model').click()`);
 await until(()=>installed==='ltx-video-2b','LTX download action');

 win.webContents.send('downloads:changed',[{id:'gpu-fixture',title:'NVIDIA GPU runtime \u00b7 ltx',kind:'runtime',status:'active',message:'Downloading CUDA',received:1048576,total:4194304,percent:25,speed:524288,cancellable:true}]);
 await until(()=>js(`!!document.querySelector('progress[aria-label="GPU runtime download"]')`),'GPU progress');
 assert.equal(await js(`document.querySelector('progress[aria-label="GPU runtime download"]').value`),25);
 let paused;ipcMain.removeHandler('downloads:pause');ipcMain.handle('downloads:pause',(_,id)=>{paused=id});
 await js(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Pause download').click()`);
 await until(()=>paused==='gpu-fixture','pause GPU runtime');
 win.webContents.send('downloads:changed',[]);
 win.setSize(700,850);await sleep(250);

 assert.equal(await js(`document.documentElement.scrollWidth<=document.documentElement.clientWidth`),true);

 console.log('PASS: image-only masonry, hidden hover actions, borderless preview, details toggle, CPU selection reaches generation, ratio shapes, LTX model selection and generation request, GPU byte progress and pause, close and narrow viewport.');app.exit(0);

})().catch(e=>{console.error(e);app.exit(1)});

setTimeout(()=>app.exit(1),30000);

