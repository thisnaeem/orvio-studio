const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');

function createComfyConnector({directory,fetchImpl=fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 const portOf=value=>{const port=Number(value||8188);if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Choose a local ComfyUI port between 1024 and 65535.');return port};
 const endpoint=(port,route)=>`http://127.0.0.1:${portOf(port)}${route}`;
 async function request(port,route,options={}){let response;try{response=await fetchImpl(endpoint(port,route),{redirect:'error',signal:AbortSignal.timeout(options.timeout||10000),...options});}catch{throw new Error('ComfyUI is unavailable. Start it locally, then try again.')}if(!response.ok)throw new Error(`ComfyUI request failed (${response.status}). Check the model and workflow.`);return response}
 const models=async port=>{const response=await request(port,'/models/checkpoints');const names=await response.json();return Array.isArray(names)?names.filter(x=>typeof x==='string').sort():[]};
 function workflow({model,prompt,negative='',size=512,seed}){if(![512,768,1024].includes(Number(size)))throw new Error('Choose 512, 768, or 1024 pixels.');return {
  '3':{class_type:'KSampler',inputs:{cfg:7,denoise:1,latent_image:['5',0],model:['4',0],negative:['7',0],positive:['6',0],sampler_name:'euler',scheduler:'normal',seed,steps:20}},
  '4':{class_type:'CheckpointLoaderSimple',inputs:{ckpt_name:model}},
  '5':{class_type:'EmptyLatentImage',inputs:{batch_size:1,height:Number(size),width:Number(size)}},
  '6':{class_type:'CLIPTextEncode',inputs:{clip:['4',1],text:prompt}},
  '7':{class_type:'CLIPTextEncode',inputs:{clip:['4',1],text:negative}},
  '8':{class_type:'VAEDecode',inputs:{samples:['3',0],vae:['4',2]}},
  '9':{class_type:'SaveImage',inputs:{filename_prefix:'Orvio',images:['8',0]}}
 }}
 async function generate({port,model,prompt,negative='',size=512}){
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>3000)throw new Error('Describe an image in up to 3,000 characters.');
  const available=await models(port);if(!available.includes(model))throw new Error('Choose an installed ComfyUI checkpoint. Refresh the model list if it changed.');
  const seed=Math.floor(Math.random()*2147483647);
  const response=await request(port,'/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:workflow({model,prompt:prompt.trim(),negative:String(negative).slice(0,1000),size,seed})}),timeout:20000});
  const queued=await response.json();if(!queued.prompt_id)throw new Error('ComfyUI rejected this workflow. Choose a compatible checkpoint.');
  let image;
  for(let attempt=0;attempt<90;attempt++){
   await wait(2000);
   const status=await request(port,`/history/${encodeURIComponent(queued.prompt_id)}`);const history=await status.json();const record=history[queued.prompt_id];
   if(record?.status?.status_str==='error')throw new Error('ComfyUI could not generate the image. Check its console for model details.');
   image=record?.outputs?.['9']?.images?.[0];if(image)break;
  }
  if(!image)throw new Error('Image generation timed out. Check the ComfyUI queue.');
  const params=new URLSearchParams({filename:image.filename,subfolder:image.subfolder||'',type:image.type||'output'});
  const fileResponse=await request(port,`/view?${params}`,{timeout:30000});const bytes=Buffer.from(await fileResponse.arrayBuffer());if(!bytes.length||bytes.length>20*1024*1024)throw new Error('Generated image exceeds the 20 MB preview limit.');
  if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('ComfyUI returned an unexpected image format.');
  const id=randomUUID()+'.png';const folder=path.join(directory,'generated');fs.mkdirSync(folder,{recursive:true,mode:0o700});fs.writeFileSync(path.join(folder,id),bytes,{mode:0o600});return {id,name:id,model,seed,size,prompt:prompt.trim(),preview:`data:image/png;base64,${bytes.toString('base64')}`};
 }
 function filePath(id){if(!/^[0-9a-f-]{36}\.png$/.test(id||''))throw new Error('Choose a generated image.');const result=path.join(directory,'generated',id);if(!fs.existsSync(result))throw new Error('Generated image no longer exists on this computer.');return result}
 return {models,generate,filePath,workflow};
}
module.exports={createComfyConnector};
