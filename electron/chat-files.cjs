const fs = require('node:fs');
const path = require('node:path');
const {randomUUID} = require('node:crypto');
const textExtensions = ['txt','md','csv','json','js','jsx','ts','tsx','py','html','css','xml','yaml','yml','log','srt'];
const extensions = [...textExtensions,'png','jpg','jpeg','webp'];
function capabilities(ai={}) {
 const images = ai.provider==='gemini' ? /^gemini-/.test(ai.model||'')&&!/tts|image|audio/.test(ai.model) : ai.provider==='openai'&&/^https:\/\/api\.openai\.com\/v1\/?$/.test(ai.baseURL||'')&&/^(gpt-4o(?:-|$)|gpt-4\.1(?:-|$)|gpt-5(?:[.-]|$)|o[34](?:-|$))/.test(ai.model||'')&&!/audio|transcribe|tts/.test(ai.model);
 return {images,text:true,reason:images?'Images and text files supported.':'Text files supported. Select a vision-capable Gemini or OpenAI model in AI settings for images.'};
}
function createChatFiles(directory) {
 const root=path.join(directory,'chat-files');
 const location=id=>{if(typeof id!=='string'||!/^[-a-f0-9]{36}$/.test(id))throw Error('Choose this attachment again.');return path.join(root,id+'.json')};
 function add(file) {
  const ext=path.extname(file).slice(1).toLowerCase(),info=fs.statSync(file);
  if(!extensions.includes(ext)||!info.isFile())throw Error('Choose a text, code, JPG, PNG or WebP file.');
  const image=['png','jpg','jpeg','webp'].includes(ext),limit=image?3*1024*1024:64000;
  if(!info.size||info.size>limit)throw Error(image?'Images must be under 3 MB.':'Text files must be under 64 KB.');
  const bytes=fs.readFileSync(file);let mime='',text='';
  if(image){mime=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'image/webp':'';if(!mime)throw Error('This file is not a supported image.');}
  else {try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{throw Error('Choose a UTF-8 text file.')}if(text.includes('\0'))throw Error('This file contains binary data.');}
  const item={id:randomUUID(),name:path.basename(file).slice(0,180),size:bytes.length,kind:image?'image':'text',mime,text,...(image?{data:bytes.toString('base64')}:{})};
  fs.mkdirSync(root,{recursive:true,mode:0o700});fs.writeFileSync(location(item.id),JSON.stringify(item),{mode:0o600});
  return {id:item.id,name:item.name,size:item.size,kind:item.kind};
 }
 function read(ids,ai) {
  if(!Array.isArray(ids)||ids.length>4)throw Error('Attach up to four files per message.');
  return ids.map(id=>{let item;try{item=JSON.parse(fs.readFileSync(location(id),'utf8'))}catch{throw Error('An attachment is no longer available. Start a new chat and attach it again.');}if(item.kind==='image'&&!capabilities(ai).images)throw Error(capabilities(ai).reason);return item;});
 }
 return {add,read};
}
function parts(turn,files,gemini) {
 const text=turn.content+files.filter(f=>f.kind==='text').map(f=>'\n\n<attachment name='+JSON.stringify(f.name)+'>\n'+f.text+'\n</attachment>').join('');
 const images=files.filter(f=>f.kind==='image');
 if(gemini)return {role:turn.role==='assistant'?'model':'user',parts:[{text},...images.map(f=>({inlineData:{mimeType:f.mime,data:f.data}}))]};
 return {role:turn.role,content:images.length?[{type:'text',text},...images.map(f=>({type:'image_url',image_url:{url:`data:${f.mime};base64,${f.data}`}}))]:text};
}
module.exports={createChatFiles,capabilities,parts,extensions};
