const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {EventEmitter}=require('node:events');

test('microphone has a serial CPU lane independent of GPU setup',async t=>{
 const children=[];
 const cp=require('node:child_process');
 const original=cp.spawn;
 cp.spawn=(_file,args)=>{
  const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();
  child.stdin.end=input=>{child.input=input?JSON.parse(input):null;children.push(child);if(child.input?.action?.startsWith('install_')||args.includes('-m')||args.some(a=>a.endsWith('install_packages.py')))queueMicrotask(()=>child.finish({ready:true}))};
  child.finish=result=>{child.stdout.emit('data',Buffer.from('ORVIO_RESULT '+JSON.stringify(result)+'\n'));child.emit('close',0)};
  return child;
 };
 const modulePath=require.resolve('../electron/local-studio.cjs');delete require.cache[modulePath];
 const {createLocalStudio,catalog}=require(modulePath);cp.spawn=original;delete require.cache[modulePath];
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'orvio-mic-lane-'));
 t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const python=path.join(directory,'python');fs.writeFileSync(python,'fixture');
 const studio=createLocalStudio({directory,resources:directory,python});
 await studio.install('whisper');
 const env=path.join(directory,'local-studio/diffusion',process.platform==='win32'?'Scripts/python.exe':'bin/python');fs.mkdirSync(path.dirname(env),{recursive:true});fs.writeFileSync(env,'fixture');
 const setup=studio.acceleration(catalog.find(m=>m.engine==='diffusion').id);
 await new Promise(r=>setImmediate(r));const setupChild=children.at(-1);
 const first=studio.petTranscribe(new Uint8Array([1,2]));
 const second=studio.petTranscribe(new Uint8Array([3,4]));
 await new Promise(r=>setImmediate(r));
 assert.equal(children.filter(c=>c.input?.action==='transcribe').length,1);
 assert.equal(studio.state().active.name,'Check GPU runtime');
 children.at(-1).finish({text:'hello'});assert.equal((await first).text,'hello');
 await new Promise(r=>setImmediate(r));assert.equal(children.filter(c=>c.input?.action==='transcribe').length,2);
 children.at(-1).finish({text:'second'});assert.equal((await second).text,'second');
 assert.equal(studio.state().active.name,'Check GPU runtime');
 setupChild.finish({ready:true,device:'cuda'});await setup;
 assert.equal(studio.state().active,null);
 assert.equal(fs.readdirSync(path.join(directory,'local-studio')).some(f=>f.endsWith('.pet.webm')),false);
});
