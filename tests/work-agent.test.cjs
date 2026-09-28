const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');const {createWorkAgent,resolveFile}=require('../electron/work-agent.cjs');
function fixture(t,answers,extra={}){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'orvio-work-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));const project=path.join(directory,'project');fs.mkdirSync(project);let index=0;const agent=createWorkAgent({directory,modelHub:{state:()=>({models:[{id:'test',kind:'chat',installed:true}]}),complete:async()=>Response.json({choices:[{message:answers[index++]}]})},...extra});agent.choose(project);return {agent,project:fs.realpathSync(project),directory}}
const call=(name,args)=>({role:'assistant',content:null,tool_calls:[{id:'call-'+name,type:'function',function:{name,arguments:JSON.stringify(args)}}]});
test('aborting an in-flight provider is a clean stop and the next task can run',async t=>{
 let calls=0;const {agent}=fixture(t,[],{completeWork:async(_payload,signal)=>{
  if(calls++===0)return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('This operation was aborted','AbortError')),{once:true}));
  return Response.json({choices:[{message:{content:'Retry completed'}}]});
 }});
 const pending=agent.run({prompt:'First task',model:'configured'});await new Promise(resolve=>setImmediate(resolve));agent.cancel();const stopped=await pending;
 assert.equal(stopped.busy,false);assert.match(stopped.status,/Task stopped/);assert.equal(agent.state().pending,null);
 await agent.run({prompt:'Retry task',model:'configured'});assert.equal(agent.state().projects[0].turns.at(-1).content,'Retry completed');assert.equal(agent.state().busy,false);
});
test('provider timeout and unsolicited abort are actionable errors, not raw DOMExceptions',async t=>{
 for(const name of ['TimeoutError','AbortError']){
  const {agent}=fixture(t,[],{completeWork:async()=>{throw new DOMException('This operation was aborted',name)}});
  await assert.rejects(agent.run({prompt:'Work',model:'configured'}),name==='TimeoutError'?/too long to respond/:/connection was interrupted/);
  assert.equal(agent.state().busy,false);assert.ok(!agent.state().status.includes('This operation was aborted'));
 }
});
test('coding harness edits real files, records changes, persists projects and safely restores',async t=>{const {agent,project}=fixture(t,[call('write_file',{path:'src/app.js',content:'export const answer = 42;'}),{content:'Created src/app.js.'}]);await agent.run({prompt:'Create a module',model:'test'});assert.equal(fs.readFileSync(path.join(project,'src/app.js'),'utf8'),'export const answer = 42;');const change=agent.state().projects[0].changes[0];assert.equal((await agent.review(change.id)).before,null);await agent.undo(change.id);assert.equal(fs.existsSync(path.join(project,'src/app.js')),false);assert.equal(agent.state().busy,false)});
test('path confinement rejects traversal, secrets and symlink escape',t=>{const {project,directory}=fixture(t,[]);fs.writeFileSync(path.join(project,'ok.txt'),'yes');fs.symlinkSync(directory,path.join(project,'escape'),process.platform==='win32'?'junction':'dir');assert.throws(()=>resolveFile(project,'../x',true),/relative/);assert.throws(()=>resolveFile(project,'.env',true),/relative/);assert.throws(()=>resolveFile(project,'escape/out.txt',true),/Symlink/);assert.equal(resolveFile(project,'ok.txt'),path.join(project,'ok.txt'))});
test('terminal commands cannot execute until the exact pending request is approved',async t=>{let ran=0;const {agent}=fixture(t,[call('run_command',{command:'npm test'}),{content:'Done'}],{runCommand:async(command)=>{ran++;assert.equal(command,'npm test');return {exitCode:0,output:'passed'}}});const run=agent.run({prompt:'Test project',model:'test'});await new Promise(r=>setImmediate(r));assert.equal(ran,0);const pending=agent.state().pending;assert.equal(pending.command,'npm test');assert.throws(()=>agent.approve('wrong',true),/expired/);agent.approve(pending.id,true);await run;assert.equal(ran,1)});
test('cancel rejects pending execution and restoring never overwrites later user edits',async t=>{let ran=0;const {agent,project}=fixture(t,[call('write_file',{path:'app.txt',content:'agent'}),call('run_command',{command:'npm test'})],{runCommand:async()=>ran++});const run=agent.run({prompt:'Write and check',model:'test'});while(!agent.state().pending)await new Promise(r=>setImmediate(r));agent.cancel();await run;assert.match(agent.state().status,/stopped/);assert.equal(ran,0);const change=agent.state().projects[0].changes[0];fs.writeFileSync(path.join(project,'app.txt'),'user edit');await assert.rejects(()=>agent.undo(change.id),/changed after/)});

test('configured cloud provider receives cancellation signal and tools without local installation',async t=>{
 let signal;const {agent}=fixture(t,[],{completeWork:async(payload,s)=>{signal=s;assert.ok(payload.tools.some(t=>t.function.name==='browse_page'));return Response.json({choices:[{message:{content:'Ready'}}]})}});
 await agent.run({prompt:'Inspect project',model:'configured'});assert.ok(signal instanceof AbortSignal);assert.equal(agent.state().busy,false);assert.equal(agent.state().projects[0].turns.at(-1).content,'Ready');
});
test('image tool saves new project artwork and refuses overwriting an existing file',async t=>{
 let generated=0;const {agent,project,directory}=fixture(t,[call('generate_image',{model:'art',prompt:'A landscape',path:'public/hero.png'}),call('generate_image',{model:'art',prompt:'Again',path:'public/hero.png'}),{content:'Done'}],{modelHub:{state:()=>({models:[{id:'art',kind:'image',installed:true}]})},completeWork:(()=>{let i=0;const answers=[call('generate_image',{model:'art',prompt:'A landscape',path:'public/hero.png'}),call('generate_image',{model:'art',prompt:'Again',path:'public/hero.png'}),{content:'Done'}];return async()=>Response.json({choices:[{message:answers[i++]}]})})(),generateImage:async()=>{generated++;const file=path.join(directory,'image.png');fs.writeFileSync(file,'png');return {file,preview:'orvio-media://asset/test'}}});
 await agent.run({prompt:'Create artwork',model:'configured'});assert.equal(generated,1);assert.equal(fs.readFileSync(path.join(project,'public/hero.png'),'utf8'),'png');
});
test('paginated discovery reaches files beyond the first 200 entries',async t=>{
 let results;const {agent,project}=fixture(t,[],{completeWork:(()=>{let i=0;return async payload=>{if(i++===0)return Response.json({choices:[{message:call('list_files',{offset:200})}]});results=JSON.parse(payload.messages.at(-1).content);return Response.json({choices:[{message:{content:'Done'}}]})}})()});for(let i=0;i<205;i++)fs.writeFileSync(path.join(project,`file-${String(i).padStart(3,'0')}.txt`),'ok');
 await agent.run({prompt:'Inspect later files',model:'configured'});assert.equal(results.entries.length,5);assert.equal(results.nextOffset,null);
});

test('code-only implementation answer falls back to JSON actions and writes a real file',async t=>{
 const {agent,project}=fixture(t,[{role:'assistant',content:'Here is your code: ```python print(1)```'},{role:'assistant',content:JSON.stringify({tool:'write_file',arguments:{path:'game.py',content:'print(1)'}})},{role:'assistant',content:JSON.stringify({final:'Saved game.py'})}]);
 await agent.run({prompt:'Create a Python game',model:'test'});assert.equal(fs.readFileSync(path.join(project,'game.py'),'utf8'),'print(1)');assert.equal(agent.state().projects[0].changes.length,1);
});
test('always ask prevents file writes until approval and permission changes while busy',async t=>{
 const {agent,project}=fixture(t,[call('write_file',{path:'app.js',content:'ok'}),{content:'Saved'}]);agent.setPermissions('ask');
 const task=agent.run({prompt:'Write app.js',model:'test'});await new Promise(r=>setImmediate(r));assert.equal(fs.existsSync(path.join(project,'app.js')),false);assert.equal(agent.state().pending.kind,'file');assert.throws(()=>agent.setPermissions('full'),/Stop/);agent.approve(agent.state().pending.id,true);await task;assert.equal(fs.readFileSync(path.join(project,'app.js'),'utf8'),'ok');
});
test('full access executes commands automatically and the selected policy persists',async t=>{
 let ran=0;const {agent,directory}=fixture(t,[call('run_command',{command:'node --version'}),{content:'Verified'}],{runCommand:async()=>{ran++;return {exitCode:0,output:'v24'}}});agent.setPermissions('full');await agent.run({prompt:'Run a check',model:'test'});assert.equal(ran,1);assert.equal(agent.state().pending,null);assert.equal(createWorkAgent({directory,modelHub:{}}).state().permissions,'full');assert.ok(agent.state().projects[0].events.some(e=>e.detail==='v24'));
});
test('ask mode cannot mutate even when full access is selected',async t=>{
 const {agent,project}=fixture(t,[call('write_file',{path:'no.txt',content:'no'}),{content:'Read-only mode'}]);agent.setPermissions('full');await agent.run({prompt:'Explain the project',model:'test',mode:'ask'});assert.equal(fs.existsSync(path.join(project,'no.txt')),false);
});
test('targeted edits require a unique match and preserve undo',async t=>{
 const {agent,project}=fixture(t,[call('edit_file',{path:'app.js',old_text:'old',new_text:'new'}),{content:'Edited'}]);fs.writeFileSync(path.join(project,'app.js'),'old value');await agent.run({prompt:'Edit app',model:'test'});assert.equal(fs.readFileSync(path.join(project,'app.js'),'utf8'),'new value');await agent.undo(agent.state().projects[0].changes[0].id);assert.equal(fs.readFileSync(path.join(project,'app.js'),'utf8'),'old value');
});
test('repeated code-only output is not reported as completed work',async t=>{
 const {agent,project}=fixture(t,Array.from({length:4},()=>({content:'```js\nconsole.log(1)\n```'})));await assert.rejects(agent.run({prompt:'Build a script',model:'test'}),/valid tool actions/);assert.equal(fs.readdirSync(project).length,0);assert.notEqual(agent.state().status,'Ready for review');
});
