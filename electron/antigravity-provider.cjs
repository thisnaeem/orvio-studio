const {randomUUID}=require('node:crypto');
async function discoveryError(response){
 let body;try{body=await response.json()}catch{}
 const details=(Array.isArray(body?.error?.details)?body.error.details:[]).filter(d=>d?.['@type']==='type.googleapis.com/google.rpc.ErrorInfo');
 const reasons=details.map(d=>d.reason);
 const guidance={SERVICE_DISABLED:'The required Google service is disabled for this project. Check the project service configuration.',ACCESS_TOKEN_SCOPE_INSUFFICIENT:'The granted OAuth scopes do not permit this request. Reauthorize only after configuring the required scopes.',CONSUMER_INVALID:'Google rejected the project associated with this account. Verify the project and its service access.',IAM_PERMISSION_DENIED:'This account lacks the required project permissions.',BILLING_DISABLED:'Google reports that billing is disabled for the project.'};
 const reason=reasons.find(r=>Object.hasOwn(guidance,r));
 const metadata=details.find(d=>d.reason===reason)?.metadata||{};
 const service=typeof metadata.service==='string'&&/^[a-z][a-z0-9.-]{0,100}\.googleapis\.com$/.test(metadata.service)?metadata.service:'';
 const consumer=typeof metadata.consumer==='string'&&/^projects\/[a-zA-Z0-9_-]{1,100}$/.test(metadata.consumer)?metadata.consumer.slice(9):'';
 const context=reason==='SERVICE_DISABLED'&&service?` Service: ${service}.${consumer?` Google consumer project: ${consumer}.`:''} If this service is not available to enable, Google must grant access; enabling a different API will not fix it.`:'';
 const message=response.status===403?`Google denied Antigravity model access (HTTP 403). ${reason?guidance[reason]:'Sign-in succeeded, but this client, account, or project is not authorized for this service. The response does not identify a supported configuration fix.'}`:`Model discovery failed (HTTP ${response.status}).`;
 const error=Error(message+context);if(reason==='SERVICE_DISABLED'&&service&&consumer)error.helpURL=`https://console.cloud.google.com/apis/library/${encodeURIComponent(service)}?project=${encodeURIComponent(consumer)}`;error.status=response.status;error.providerAccessDenied=response.status===403;return error;
}
class AntigravityProvider{
 constructor(fetchImpl=fetch){this.fetch=fetchImpl}
 async models(account,token){const r=await this.fetch(account.baseURL+'/v1internal:fetchAvailableModels',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({project:account.project}),signal:AbortSignal.timeout(20000)});if(!r.ok)throw await discoveryError(r);const data=await r.json();if(!data.models||typeof data.models!=='object')throw Error('Provider did not return its available models.');return Object.keys(data.models)}
 async complete(account,token,payload,signal){
  const names=new Map(),contents=[],system=[];
  for(const m of payload.messages){if(['system','developer'].includes(m.role)){system.push({text:String(m.content||'')});continue}const parts=[];if(m.role==='tool')parts.push({functionResponse:{name:names.get(m.tool_call_id)||m.name||'tool',response:{output:m.content}}});else{if(typeof m.content==='string'&&m.content)parts.push({text:m.content});else if(Array.isArray(m.content)){for(const p of m.content){if(p.type==='text')parts.push({text:p.text});else throw Error('This account adapter currently supports text and tools only.')}}for(const t of m.tool_calls||[]){names.set(t.id,t.function.name);parts.push({functionCall:{name:t.function.name,args:JSON.parse(t.function.arguments||'{}')}})}}if(parts.length)contents.push({role:m.role==='assistant'?'model':'user',parts})}
  const request={contents,...(system.length?{systemInstruction:{parts:system}}:{}),generationConfig:{maxOutputTokens:payload.max_tokens||4096,...(payload.temperature!==undefined?{temperature:payload.temperature}:{})},...(payload.tools?.length?{tools:[{functionDeclarations:payload.tools.map(t=>({name:t.function.name,description:t.function.description,parameters:t.function.parameters}))}]}:{})};
  const r=await this.fetch(account.baseURL+'/v1internal:generateContent',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({project:account.project,model:payload.model,request}),signal});if(!r.ok)return r;const json=await r.json(),result=json.response||json,parts=result.candidates?.[0]?.content?.parts||[],calls=parts.filter(p=>p.functionCall).map(p=>({id:'call_'+randomUUID(),type:'function',function:{name:p.functionCall.name,arguments:JSON.stringify(p.functionCall.args||{})}}));return Response.json({choices:[{message:{role:'assistant',content:parts.filter(p=>p.text&&!p.thought).map(p=>p.text).join(''),...(calls.length?{tool_calls:calls}:{})},finish_reason:calls.length?'tool_calls':result.candidates?.[0]?.finishReason==='MAX_TOKENS'?'length':'stop'}],usage:result.usageMetadata});
 }
}
module.exports={AntigravityProvider};
