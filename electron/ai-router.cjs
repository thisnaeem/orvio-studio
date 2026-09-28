const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {Readable}=require('node:stream'),{pipeline}=require('node:stream/promises');
const {ClaudeProvider}=require('./ai-provider.cjs');
const {AntigravityProvider}=require('./antigravity-provider.cjs');
const providers=require('../runtime/router-providers.json');
const loopback=host=>['localhost','127.0.0.1','[::1]'].includes(host);
function endpoint(value){const u=new URL(value);if((u.protocol!=='https:'&&!(u.protocol==='http:'&&loopback(u.hostname)))||u.username||u.password||u.search||u.hash)throw Error('Use HTTPS or a loopback HTTP endpoint, without credentials or query parameters.');return u.href.replace(/\/$/,'')}
function createAIRouter({directory,safeStorage,modelHub,fetchImpl=fetch,notify=()=>{},nativeAuth}){
 const file=path.join(directory,'ai-router.json');let data={autoStart:false,port:20129,accounts:[],routes:[],key:''};try{data={...data,...JSON.parse(fs.readFileSync(file,'utf8'))}}catch{}
 for(const a of data.accounts){if(a.providerId&&a.baseURL==='http://127.0.0.1:20128/v1'){a.enabled=false;a.models=[];a.manualModels=[];a.needsReconnect=true}}
 let server=null,starting=null,active=0,rotation=0,lastError='';const controllers=new Set(),health=new Map(),events=[];
 const encrypt=value=>{if(!safeStorage.isEncryptionAvailable())throw Error('Operating system credential encryption is unavailable.');return safeStorage.encryptString(value).toString('base64')};
 const decrypt=value=>value?safeStorage.decryptString(Buffer.from(value,'base64')):'';
 const persist=()=>{fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(data),{mode:0o600});fs.renameSync(file+'.tmp',file);publish()};
 const state=()=>({autoStart:!!data.autoStart,lastError,running:!!server?.listening,port:server?.address()?.port||data.port,baseURL:`http://127.0.0.1:${server?.address()?.port||data.port}/v1`,hasKey:!!data.key,active,accounts:data.accounts.map(({key,...a})=>({...a,hasKey:!!key||!!a.authId,health:health.get(a.id)||null})),routes:data.routes,availableModels:publishedRoutes().map(r=>({id:r.name,connections:r.targets.length})),events:events.slice(-30).reverse()});
 const publish=()=>notify(state());
 function log(route,account,status){events.push({at:new Date().toISOString(),route,account,status});if(events.length>30)events.shift();publish()}
 const credential=a=>a.authId?nativeAuth.token(a.authId):Promise.resolve(decrypt(a.key));
 function account(id){const a=data.accounts.find(a=>a.id===id);if(!a)throw Error('Connection no longer exists.');return a}
 const normalizeModels=values=>[...new Set(values.filter(id=>typeof id==='string'&&id.trim()&&id.length<=150).map(id=>id.trim()))].slice(0,2000);
 function publishedRoutes(){const found=new Map();for(const a of data.accounts.filter(a=>a.enabled&&!a.discoveryDenied)){const ids=a.protocol==='local'?modelHub.state().models.filter(m=>m.kind==='chat'&&m.installed).map(m=>m.id):normalizeModels([...(a.models||[]),...(a.manualModels||[])]);for(const id of ids){if(!found.has(id))found.set(id,{name:id,strategy:'fallback',targets:[]});found.get(id).targets.push({accountId:a.id,model:id})}}for(const r of data.routes)if(r.targets.some(t=>data.accounts.some(a=>a.id===t.accountId&&a.enabled&&!a.discoveryDenied)))found.set(r.name,r);return [...found.values()]}
 const discovering=new Map();
 async function models(id){
  if(discovering.has(id))return discovering.get(id);const a=account(id);
  const job=(async()=>{try{let found=[];
   if(a.protocol==='antigravity')found=await new AntigravityProvider(fetchImpl).models(a,await credential(a));
   else if(a.protocol==='local')found=modelHub.state().models.filter(m=>m.kind==='chat'&&m.installed).map(m=>m.id);
   else {const key=await credential(a);let cursor='';for(let page=0;page<20;page++){
    const url=new URL(a.baseURL+'/models');if(a.protocol==='anthropic'){url.searchParams.set('limit','100');if(cursor)url.searchParams.set('after_id',cursor)}
    const response=await fetchImpl(url.href,{redirect:'error',signal:AbortSignal.timeout(20000),headers:a.protocol==='anthropic'?{'x-api-key':key,'anthropic-version':'2023-06-01'}:key?{Authorization:'Bearer '+key,...(a.authId&&a.providerId==='gemini'&&a.project?{'x-goog-user-project':a.project}:{})}:{}});
    if(!response.ok)throw Error(`Model discovery failed (HTTP ${response.status}).`);
    const result=await response.json();if(!Array.isArray(result.data))throw Error('Provider did not return a model catalog. Check the base URL.');
    found.push(...result.data.filter(m=>!m.type||['model','chat','text'].includes(m.type)).map(m=>m.id));
    if(a.protocol!=='anthropic'||!result.has_more||!result.last_id||result.last_id===cursor)break;cursor=result.last_id;
   }

   }
   found=normalizeModels(found);if(data.accounts.includes(a)){a.discoveryDenied=false;a.models=found;a.discoveredAt=Date.now();health.set(id,{ok:found.length>0,message:found.length?`Connected · ${found.length} models`:'No models found. Check the provider account or add model IDs.',at:new Date().toISOString()});persist()}
   return normalizeModels([...found,...(a.manualModels||[])]);
  }catch(error){if(data.accounts.includes(a)){if(error.providerAccessDenied){a.discoveryDenied=true;a.discoveredAt=Date.now();persist()}health.set(id,{ok:false,helpURL:error.helpURL||'',message:error.message.includes('HTTP')||error.message.startsWith('Provider did not')?error.message:'Connection failed. Check endpoint and credentials.',at:new Date().toISOString()});publish()}throw error}})();
  discovering.set(id,job);try{return await job}finally{discovering.delete(id)}
 }
 async function refreshCatalog(force=false){const pending=data.accounts.filter(a=>a.enabled&&(force||!a.discoveredAt||Date.now()-a.discoveredAt>300000));const results=[];let next=0;await Promise.all(Array.from({length:Math.min(3,pending.length)},async()=>{while(next<pending.length){const a=pending[next++];try{const ids=await models(a.id);results.push({id:a.id,ok:ids.length>0,count:ids.length})}catch{results.push({id:a.id,ok:false,count:0})}}}));return results}
 async function complete(payload,signal){
  if(!payload||typeof payload.model!=='string'||!Array.isArray(payload.messages)||!payload.messages.length||payload.messages.length>500)throw Error('Provide a route model and 1–500 messages.');
  const route=publishedRoutes().find(r=>r.name===payload.model);if(!route)throw Error('Unknown model route. Add it in Settings → Unified API.');
  let targets=route.targets.filter(t=>data.accounts.some(a=>a.id===t.accountId&&a.enabled&&!a.discoveryDenied));if(!targets.length)throw Error('No enabled connections for this route.');
  if(route.strategy==='round-robin'){const offset=rotation++%targets.length;targets=[...targets.slice(offset),...targets.slice(0,offset)]}
  let lastStatus=503;
  for(const target of targets){
   signal?.throwIfAborted();const a=account(target.accountId);let response;
   try{const key=await credential(a);signal?.throwIfAborted();const request={...payload,model:target.model};const bounded=signal?AbortSignal.any([signal,AbortSignal.timeout(180000)]):AbortSignal.timeout(180000);
    if(a.protocol==='antigravity')response=await new AntigravityProvider(fetchImpl).complete(a,key,request,bounded);
    else if(a.protocol==='local')response=await modelHub.complete(target.model,{...request,stream:false},bounded);
    else if(a.protocol==='anthropic')response=await new ClaudeProvider(fetchImpl).complete({baseURL:a.baseURL,model:target.model},key,{...request,stream:false},bounded);
    else response=await fetchImpl(a.baseURL+'/chat/completions',{method:'POST',redirect:'error',signal:bounded,headers:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key,...(a.authId&&a.providerId==='gemini'&&a.project?{'x-goog-user-project':a.project}:{})}:{})},body:JSON.stringify(request)});
   }catch{signal?.throwIfAborted();health.set(a.id,{ok:false,message:'Connection failed or timed out',at:new Date().toISOString()});log(route.name,a.name,'connection failed');continue}
   lastStatus=response.status;
   health.set(a.id,{ok:response.ok,message:response.ok?'Connected':`HTTP ${response.status}`,at:new Date().toISOString()});log(route.name,a.name,response.ok?'accepted':`HTTP ${response.status}`);
   if(response.ok)return response;
   await response.body?.cancel();if(![401,403,408,429,500,502,503,504].includes(response.status))return Response.json({error:{message:`Provider rejected the request (HTTP ${response.status}).`,type:'upstream_error'}},{status:response.status});
  }
  return Response.json({error:{message:`No connection completed the request. Last upstream status: ${lastStatus}.`,type:'upstream_error'}},{status:503});
 }
 function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body))}
 async function handle(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
  const supplied=String(req.headers.authorization||'').replace(/^Bearer /,'');const expected=decrypt(data.key);
  if(!expected||Buffer.byteLength(supplied)!==Buffer.byteLength(expected)||!crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return json(res,401,{error:{message:'A valid Orvio API key is required.'}});

  const url=new URL(req.url,'http://127.0.0.1');
  if(req.method==='GET'&&url.pathname==='/v1/models'){await refreshCatalog();return json(res,200,{object:'list',data:publishedRoutes().map(r=>({id:r.name,object:'model',created:0,owned_by:'orvio'}))})}
  if(req.method!=='POST'||url.pathname!=='/v1/chat/completions')return json(res,404,{error:{message:'Use /v1/models or /v1/chat/completions.'}});
  if(active>=4)return json(res,429,{error:{message:'Four requests are already running. Retry shortly.'}});
  const controller=new AbortController();controllers.add(controller);active++;publish();const close=()=>{if(!res.writableEnded)controller.abort()};res.on('close',close);
  try{let length=0,chunks=[];for await(const chunk of req){length+=chunk.length;if(length>2*1024*1024){json(res,413,{error:{message:'Request exceeds 2 MB.'}});req.resume();return}chunks.push(chunk)}let input;try{input=JSON.parse(Buffer.concat(chunks).toString())}catch{return json(res,400,{error:{message:'Invalid JSON request.'}})}
   const response=await complete(input,controller.signal);if(controller.signal.aborted)return;
   if(!response.ok)return json(res,response.status,await response.json());
   if(input.stream&&response.headers.get('content-type')?.includes('text/event-stream')){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','X-Accel-Buffering':'no'});await pipeline(Readable.fromWeb(response.body),res,{signal:controller.signal})}
   else {const result=await response.json();result.id||='chatcmpl-'+crypto.randomUUID();result.object='chat.completion';result.created||=Math.floor(Date.now()/1000);result.model=input.model;
    if(input.stream){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});const common={id:result.id,object:'chat.completion.chunk',created:result.created,model:input.model};const choices=(result.choices||[]).map((c,i)=>({index:c.index??i,delta:{...c.message,...(c.message?.tool_calls?{tool_calls:c.message.tool_calls.map((t,j)=>({...t,index:j}))}:{})},finish_reason:null}));res.write('data: '+JSON.stringify({...common,choices})+'\n\n');res.write('data: '+JSON.stringify({...common,choices:(result.choices||[]).map((c,i)=>({index:c.index??i,delta:{},finish_reason:c.finish_reason||'stop'}))})+'\n\n');res.end('data: [DONE]\n\n')}
    else json(res,200,result);
   }
  }catch(error){if(!controller.signal.aborted){if(!res.headersSent)json(res,400,{error:{message:error.message?.startsWith('Unknown model')||error.message?.startsWith('Provide a route')?error.message:'Request failed. Check connections in Orvio Settings.'}});else res.destroy()}}
  finally{controllers.delete(controller);active--;res.off('close',close);publish()}
 }
 return {state,complete,models,
  attachOAuth(input){const provider=providers.find(p=>p.id===input.providerId&&p.auth==='oauth');if(!provider)throw Error('Unsupported native account.');if(data.accounts.length>=100)throw Error('Maximum 100 connections.');const id=crypto.randomUUID();data.accounts.push({id,providerId:provider.id,name:String(input.name||provider.name).slice(0,80),protocol:provider.protocol,baseURL:provider.url,key:'',authId:input.authId,project:input.project||'',enabled:true,models:[],manualModels:[]});persist();return id},refresh:()=>refreshCatalog(true),setAutoStart(value){data.autoStart=value===true;persist()},
  async check(){
   if(!server?.listening)throw Error('Start the API before checking it.');
   const response=await fetch(state().baseURL+'/models',{headers:{Authorization:'Bearer '+decrypt(data.key)},signal:AbortSignal.timeout(25000)});
   if(!response.ok)throw Error(`API catalog check failed (HTTP ${response.status}).`);
   const catalog=await response.json();const ids=(catalog.data||[]).map(m=>m.id);
   if(!ids.length)throw Error('The API is reachable but has no models. Enable a connection, download a local chat model, or add provider model IDs.');
   return {ok:true,status:response.status,models:ids};
  },
  saveAccount(input){if(input?.id&&account(input.id).authId){const old=account(input.id);old.enabled=input.enabled!==false;persist();return old.id}if(!input||!['openai','anthropic','local'].includes(input.protocol))throw Error('Choose a supported protocol.');const name=String(input.name||'').trim();if(!name||name.length>80)throw Error('Enter a connection name under 80 characters.');const old=input.id?account(input.id):null;if(!old&&data.accounts.length>=100)throw Error('Maximum 100 connections.');if(old?.needsReconnect&&input.baseURL===old.baseURL)throw Error('Replace the old relay URL with a direct provider connection.');const baseURL=input.protocol==='local'?'orvio://local':endpoint(input.baseURL);if(baseURL===state().baseURL||(input.protocol!=='local'&&loopback(new URL(baseURL).hostname)&&Number(new URL(baseURL).port)===state().port))throw Error('A router cannot connect to itself.');let key=old?.baseURL===baseURL&&old?.protocol===input.protocol?old.key:'';if(input.key){if(typeof input.key!=='string'||input.key.length>16384)throw Error('Invalid API key.');key=encrypt(input.key)}if(input.clearKey)key='';const same=old?.baseURL===baseURL&&old?.protocol===input.protocol&&(input.providerId===undefined||input.providerId===(old?.providerId||''));const manualModels=input.manualModels===undefined?(same?old?.manualModels||[]:[]):normalizeModels(Array.isArray(input.manualModels)?input.manualModels:String(input.manualModels).split(/[\n,]+/));const providerId=input.providerId===undefined?old?.providerId||'':String(input.providerId);if(providerId&&!providers.some(p=>p.id===providerId))throw Error('Unknown provider.');const saved={providerId,id:old?.id||crypto.randomUUID(),name,protocol:input.protocol,baseURL,key,enabled:input.enabled!==false,manualModels,models:same?old?.models||[]:[],discoveredAt:same?old?.discoveredAt||0:0};data.accounts=data.accounts.filter(a=>a.id!==saved.id).concat(saved);health.delete(saved.id);persist();return saved.id},
  removeAccount(id){if(data.routes.some(r=>r.targets.some(t=>t.accountId===id)))throw Error('Remove this connection from its model routes first.');const old=account(id);if(old.authId)nativeAuth.remove(old.authId);data.accounts=data.accounts.filter(a=>a.id!==id);persist()},
  saveRoute(input){if(!/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,99}$/.test(input.name||''))throw Error('Use a short route name with letters, numbers, dots, slashes or hyphens.');if(!['fallback','round-robin'].includes(input.strategy)||!Array.isArray(input.targets)||!input.targets.length||input.targets.length>12)throw Error('Add 1–12 route targets.');const targets=input.targets.map(t=>{account(t.accountId);if(typeof t.model!=='string'||!t.model.trim()||t.model.length>150)throw Error('Enter a model ID for each connection.');return {accountId:t.accountId,model:t.model.trim()}});if(!data.routes.some(r=>r.name===input.name)&&data.routes.length>=100)throw Error('Maximum 100 routes.');data.routes=data.routes.filter(r=>r.name!==input.name).concat({name:input.name,strategy:input.strategy,targets});persist()},
  removeRoute(name){data.routes=data.routes.filter(r=>r.name!==name);persist()},
  async test(id){try{const found=await models(id);health.set(id,{ok:found.length>0,message:found.length?`Connected · ${found.length} models`:'No models found. Check the provider account or add model IDs.',at:new Date().toISOString()});publish();return found}catch(error){health.set(id,{ok:false,helpURL:error.helpURL||'',message:error.message.includes('HTTP')?error.message:'Connection failed. Check endpoint and credentials.',at:new Date().toISOString()});publish();throw Error(health.get(id).message)}},
  key(){if(!data.key){data.key=encrypt('orvio-'+crypto.randomBytes(32).toString('hex'));persist()}return decrypt(data.key)},
  rotateKey(){data.key=encrypt('orvio-'+crypto.randomBytes(32).toString('hex'));persist()},
  async start(port=data.port){if(server?.listening)return state();if(starting)return starting;if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Choose a port between 1024 and 65535.');this.key();data.port=port;persist();const next=http.createServer((req,res)=>{void handle(req,res).catch(()=>{if(!res.headersSent)json(res,500,{error:{message:'Router request failed.'}});else res.destroy()})});next.requestTimeout=30000;next.headersTimeout=10000;next.keepAliveTimeout=5000;
   starting=new Promise((resolve,reject)=>{next.once('error',reject);next.listen(port,'127.0.0.1',()=>resolve())});try{await starting;server=next;lastError='';publish();return state()}catch(error){lastError=error.code==='EADDRINUSE'?'Port is already in use. Choose another port.':'Could not start the API listener.';publish();throw Error(lastError)}finally{starting=null}},
  async stop(){if(starting)await starting.catch(()=>{});for(const c of controllers)c.abort();if(server){const old=server;server=null;old.closeAllConnections();await new Promise(r=>old.close(r))}publish()},
 };
}
module.exports={createAIRouter,endpoint};
