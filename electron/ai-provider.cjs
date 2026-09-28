// Normalize the native Claude Messages API to the harness message contract.
class ClaudeProvider {
 constructor(fetchImpl=fetch){this.fetch=fetchImpl}
 async complete(config,key,payload,signal){
  const system=payload.messages.filter(m=>['system','developer'].includes(m.role)).map(m=>m.content).join('\n');
  const messages=[];
  for(const m of payload.messages){
   if(['system','developer'].includes(m.role))continue;
   const role=m.role==='tool'?'user':m.role;
   const content=m.role==='tool'?[{type:'tool_result',tool_use_id:m.tool_call_id,content:m.content}]:[
    ...(typeof m.content==='string'&&m.content?[{type:'text',text:m.content}]:Array.isArray(m.content)?m.content.map(p=>{if(p.type==='text')return p;if(p.type==='image_url'){const value=p.image_url.url;const match=/^data:([^;]+);base64,(.+)$/.exec(value);return {type:'image',source:match?{type:'base64',media_type:match[1],data:match[2]}:{type:'url',url:value}}}throw Error('Unsupported Claude attachment.')}):[]),
    ...(m.tool_calls||[]).map(call=>({type:'tool_use',id:call.id,name:call.function.name,input:JSON.parse(call.function.arguments||'{}')}))];
   if(!content.length)continue;
   if(messages.at(-1)?.role===role)messages.at(-1).content.push(...content);else messages.push({role,content});
  }
  const response=await this.fetch(config.baseURL+'/messages',{method:'POST',redirect:'error',headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:config.model,system,messages,max_tokens:payload.max_tokens||4096,...(payload.tools?.length?{tools:payload.tools.map(t=>({name:t.function.name,description:t.function.description,input_schema:t.function.parameters})),tool_choice:{type:'auto'}}:{})}),signal});
  if(!response.ok)return response;
  const result=await response.json();
  return Response.json({choices:[{finish_reason:result.stop_reason==='max_tokens'?'length':result.stop_reason==='tool_use'?'tool_calls':'stop',message:{role:'assistant',content:(result.content||[]).filter(p=>p.type==='text').map(p=>p.text).join('\n'),tool_calls:(result.content||[]).filter(p=>p.type==='tool_use').map(p=>({id:p.id,type:'function',function:{name:p.name,arguments:JSON.stringify(p.input)}}))}}],usage:result.usage});
 }
}
module.exports={ClaudeProvider};
