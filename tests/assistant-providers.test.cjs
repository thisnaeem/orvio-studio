const {test}=require('node:test'),assert=require('node:assert/strict');
const {ClaudeProvider}=require('../electron/ai-provider.cjs');
const {browserURL}=require('../electron/work-browser.cjs');
const {compactContext}=require('../electron/work-agent.cjs');
test('managed preview captures output and releases its process on exit',async()=>{
 const {PreviewProcess}=require('../electron/preview-process.cjs');const preview=new PreviewProcess();
 preview.start(`"${process.execPath}" --version`,process.cwd());
 const deadline=Date.now()+5000;while(preview.state().running&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(preview.state().running,false);assert.equal(preview.state().exitCode,0);assert.match(preview.state().output,/v\d+\./);
});
test('Claude native adapter preserves tool ids, results and output truncation',async()=>{
 let request;const provider=new ClaudeProvider(async(url,options)=>{request={url,...options,body:JSON.parse(options.body)};return Response.json({stop_reason:'tool_use',content:[{type:'text',text:'Inspecting'},{type:'tool_use',id:'next',name:'read_file',input:{path:'app.ts'}}]})});
 const response=await provider.complete({baseURL:'https://api.anthropic.com/v1',model:'test'},'secret',{messages:[{role:'system',content:'System'},{role:'user',content:'Fix app'},{role:'assistant',content:null,tool_calls:[{id:'one',function:{name:'list_files',arguments:'{}'}}]},{role:'tool',tool_call_id:'one',content:'files'}],tools:[{function:{name:'read_file',description:'Read',parameters:{type:'object'}}}]});
 assert.equal(request.url,'https://api.anthropic.com/v1/messages');assert.equal(request.headers['x-api-key'],'secret');assert.equal(request.body.system,'System');assert.equal(request.body.messages[2].content[0].tool_use_id,'one');assert.equal(request.body.tools[0].name,'read_file');const result=await response.json();assert.equal(result.choices[0].message.tool_calls[0].id,'next');assert.equal(result.choices[0].finish_reason,'tool_calls');
});
test('browser accepts previews and HTTPS but rejects privileged URLs and embedded credentials',()=>{
 assert.equal(browserURL('http://localhost:5173'),'http://localhost:5173/');assert.equal(browserURL('https://example.com'),'https://example.com/');for(const url of ['file:///C:/secret','javascript:alert(1)','https://user:pass@example.com','orvio-media://asset/id'])assert.throws(()=>browserURL(url));
});
test('context compaction preserves initial request and complete latest tool round',()=>{
 const messages=[{role:'system',content:'rules'},{role:'user',content:'task'}];for(let i=0;i<10;i++)messages.push({role:'assistant',tool_calls:[{id:String(i)}]},{role:'tool',tool_call_id:String(i),content:'x'.repeat(2000)});
 compactContext(messages,5000);assert.equal(messages[1].content,'task');assert.equal(messages.at(-1).tool_call_id,'9');assert.ok(JSON.stringify(messages).length<5000);for(let i=2;i<messages.length;i+=2)assert.equal(messages[i].tool_calls[0].id,messages[i+1].tool_call_id);
});
