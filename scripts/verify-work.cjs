const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'orvio-work-check-')),project=path.join(profile,'project');fs.mkdirSync(project);app.setPath('userData',profile);
let window;const errors=[];app.on('browser-window-created',(_event,win)=>{if(window)return;window=win;win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message)})});
const server=http.createServer((req,res)=>{let raw='';req.on('data',data=>raw+=data);req.on('end',()=>{
 const input=JSON.parse(raw||'{}');const task=input.messages?.filter(m=>m.role==='user').at(-1)?.content||'';
 if(task.includes('cancel test'))return;
 if(input.messages?.some(m=>String(m.content).includes('Create fallback file'))){
  const observed=input.messages.some(m=>String(m.content).includes('Tool result')&&String(m.content).includes('fallback.py'));
  const content=input.response_format?JSON.stringify(observed?{final:'Fixture task completed.'}:{tool:'write_file',arguments:{path:'fallback.py',content:'print("agent wrote this file")'}}):'Here is code: ```python print(1)```';
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{role:'assistant',content}}]}));return;
 }

 const message=input.messages?.some(m=>m.role==='tool')?{role:'assistant',content:'Fixture task completed.'}:{role:'assistant',content:null,tool_calls:[{id:'write-1',type:'function',function:{name:'write_file',arguments:JSON.stringify({path:'verified.txt',content:'Verified work output'})}}]};
 if(task.includes('Run version check')&&!input.messages?.some(m=>m.role==='tool')){message.tool_calls[0].function={name:'run_command',arguments:JSON.stringify({command:'node --version'})}}
 setTimeout(()=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message}]}))},120);
})});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(fn,label){const end=Date.now()+10000;while(Date.now()<end){if(await fn())return;await sleep(50)}throw Error('Timed out: '+label)}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 fs.writeFileSync(path.join(profile,'workspace-v3.json'),JSON.stringify({ai:{provider:'openai',baseURL:`http://127.0.0.1:${server.address().port}/v1`,model:'fixture',key:''}}));
 fs.writeFileSync(path.join(profile,'work-projects.json'),JSON.stringify({selectedId:'test',projects:[{id:'test',name:'Test project',root:fs.realpathSync(project),turns:[],changes:[],events:[]}]}));
 require('../electron/main.cjs');await app.whenReady();await waitFor(()=>window&&!window.webContents.isLoading(),'window');await sleep(1800);
 await window.webContents.executeJavaScript(`localStorage.setItem('orvio.v2.preferences',JSON.stringify({onboarded:true,name:'Test',workspace:'Work verification'}));localStorage.setItem('orvio.assistant.mode','work');localStorage.setItem('orvio.work.model','configured');sessionStorage.setItem('orvio.v2.ready','true');location.reload()`);await sleep(1200);
 window.webContents.send('workspace:navigate','Chat');await waitFor(()=>window.webContents.executeJavaScript(`!!document.querySelector('[aria-label="Coding task"]')`),'Work input');
 const scrollResult=await window.webContents.executeJavaScript(`(()=>{const value=document.querySelector('[aria-label="Coding task"]').scrollIntoView();return value===undefined?'undefined':typeof value.then==='function'?'Promise':typeof value})()`);
 async function send(text){await window.webContents.executeJavaScript(`document.querySelector('[aria-label="Coding task"]').focus()`);await window.webContents.insertText(text);await sleep(80);await window.webContents.executeJavaScript(`document.querySelector('[aria-label="Coding task"]').closest('form').requestSubmit()`)}
 await send('Write the verification file');await waitFor(()=>fs.existsSync(path.join(project,'verified.txt')),'written file');await waitFor(()=>window.webContents.executeJavaScript(`window.studio.workState().then(s=>!s.busy)`),'completed task');
 window.webContents.send('workspace:navigate','Home');await sleep(150);window.webContents.send('workspace:navigate','Chat');await sleep(150);
 await send('cancel test');await waitFor(()=>window.webContents.executeJavaScript(`window.studio.workState().then(s=>s.busy)`),'running task');
 await window.webContents.executeJavaScript(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Stop task').click()`);
 await waitFor(()=>window.webContents.executeJavaScript(`window.studio.workState().then(s=>!s.busy&&s.status.includes('stopped'))`),'clean cancellation');
 await send('Retry and verify the file');await waitFor(()=>window.webContents.executeJavaScript(`window.studio.workState().then(s=>!s.busy&&s.status==='Ready for review')`),'successful retry');
 await window.webContents.executeJavaScript(`(()=>{const el=document.querySelector('[aria-label="Work permissions"]');el.value='ask';el.dispatchEvent(new Event('change',{bubbles:true}))})()`);
 await waitFor(()=>window.webContents.executeJavaScript(`window.studio.workState().then(s=>s.permissions==='ask')`),'ask permission setting');
 await send('Write with approval');await waitFor(()=>window.webContents.executeJavaScript(`window.studio.workState().then(s=>s.pending?.kind==='file')`),'file approval');
 await window.webContents.executeJavaScript(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Allow change').click()`);
 await waitFor(()=>window.webContents.executeJavaScript(`window.studio.workState().then(s=>!s.busy)`),'approved file write');
 await window.webContents.executeJavaScript(`(()=>{const el=document.querySelector('[aria-label="Work permissions"]');el.value='full';el.dispatchEvent(new Event('change',{bubbles:true}))})()`);
 await waitFor(()=>window.webContents.executeJavaScript(`window.studio.workState().then(s=>s.permissions==='full')`),'full permission setting');
 await send('Run version check');await waitFor(()=>window.webContents.executeJavaScript(`window.studio.workState().then(s=>!s.busy&&s.projects[0].events.some(e=>e.detail?.includes('v24')||e.detail?.includes('v22')||e.detail?.includes('v20')))`),'automatic command output');
 await send('Create fallback file');await waitFor(()=>fs.existsSync(path.join(project,'fallback.py')),'JSON fallback file write');await waitFor(()=>window.webContents.executeJavaScript(`window.studio.workState().then(s=>!s.busy)`),'JSON fallback completion');
 const state=await window.webContents.executeJavaScript(`({failed:document.body.innerText.includes('This page needs to restart'),text:document.body.innerText.includes('Fixture task completed.')})`);
 if(state.failed||!state.text||errors.length)throw Error(JSON.stringify({state,errors}));
 if(process.env.ORVIO_VERIFY_SCREENSHOT)fs.writeFileSync(process.env.ORVIO_VERIFY_SCREENSHOT,(await window.webContents.capturePage()).toPNG());
 console.log('PASS: UI task submission, file write, navigation, mid-request cancellation, retry, file approval and full-access command execution and code-only to JSON file-action fallback. scrollIntoView returned '+scrollResult);server.closeAllConnections();server.close();app.exit(0);
})().catch(error=>{console.error(error,errors);server.closeAllConnections();server.close();app.exit(1)});
setTimeout(()=>{console.error('Work verification timed out',errors);app.exit(1)},40000);
