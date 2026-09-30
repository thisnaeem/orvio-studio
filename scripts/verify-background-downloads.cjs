const {app}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'orvio-background-check-')));
let win;app.on('browser-window-created',(_,w)=>{if(!win)win=w});
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),js=s=>win.webContents.executeJavaScript(s);
async function until(fn,label){for(let n=0;n<200;n++){if(await fn())return;await sleep(100)}throw Error(label)}
let server;
(async()=>{
 server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Length':1024*512,'Content-Type':'application/octet-stream',ETag:'"fixture"'});let chunks=0;const timer=setInterval(()=>{res.write(Buffer.alloc(8192,7));if(++chunks===64){clearInterval(timer);res.end()}},60);res.on('close',()=>clearInterval(timer))});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 require('../electron/main.cjs');await app.whenReady();await until(()=>win&&!win.webContents.isLoading(),'window load');
 await js(`window.downloadTest=window.studio.downloadFile({url:'http://127.0.0.1:${server.address().port}/background.bin'}).then(()=>true).catch(e=>({error:e.message}));void 0`);
 await until(()=>js(`window.studio.downloads().then(items=>items.some(d=>d.status==='active'&&d.received>0&&d.total===524288))`),'live byte progress');
 win.close();assert.equal(win.isDestroyed(),false);assert.equal(win.isVisible(),false);
 await until(()=>js(`window.studio.downloads().then(items=>items.some(d=>d.status==='completed'&&d.received===524288))`),'download while window closed');
 assert.equal(await js('window.downloadTest'),true);
 app.emit('second-instance');assert.equal(win.isVisible(),true);
 console.log('PASS: live byte progress, close-to-tray, completed background transfer, reopen window');
 server.close();app.quit();
})().catch(error=>{console.error(error);server?.close();app.exit(1)});
