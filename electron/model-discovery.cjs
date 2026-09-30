const fs=require('node:fs'),fsp=fs.promises,path=require('node:path'),os=require('node:os'),{createHash}=require('node:crypto');
const modelSkip=new Set(['node_modules','.git','.Trash','$RECYCLE.BIN','Windows','System Volume Information','.venv','venv','env','site-packages','__pycache__','.gradle','.npm','python_embeded','python_embedded']);
const catalog=require('../runtime/models.json'),manifest=require('../runtime/model-download-sizes.json');
// Read bounded GGUF metadata, never tensor data. Diffusion GGUFs are not chat models.
function ggufMetadata(buffer){
 const result={};let offset=24;
 function number(bytes){if(offset+bytes>buffer.length)throw Error('Metadata exceeds scan window');const n=bytes===8?Number(buffer.readBigUInt64LE(offset)):buffer.readUInt32LE(offset);offset+=bytes;if(!Number.isSafeInteger(n))throw Error('Invalid length');return n}
 function string(){const n=number(8);if(n>buffer.length-offset)throw Error('Truncated metadata');const s=buffer.toString('utf8',offset,offset+n);offset+=n;return s}
 function value(type,level=0){if(level>2)throw Error('Nested metadata');if(type===8)return string();if(type===9){const item=number(4),count=number(8);if(count>100000)throw Error('Array too large');for(let i=0;i<count;i++)value(item,level+1);return}const width={0:1,1:1,2:2,3:2,4:4,5:4,6:4,7:1,10:8,11:8,12:8}[type];if(!width||offset+width>buffer.length)throw Error('Invalid metadata');offset+=width}
 try{if(buffer.length<24||![2,3].includes(buffer.readUInt32LE(4)))return result;const count=Number(buffer.readBigUInt64LE(16));for(let i=0;i<Math.min(count,10000);i++){const key=string(),v=value(number(4));if(key==='general.architecture')result.architecture=v;if(key==='general.name')result.name=v;if(result.name&&result.architecture)break}}catch{}
 return result;
}
function defaultRoots({home=os.homedir(),env=process.env,directory,knownFolders=[]}){
 const roots=[env.HF_HUB_CACHE,env.HUGGINGFACE_HUB_CACHE,env.TRANSFORMERS_CACHE,env.HF_HOME&&path.join(env.HF_HOME,'hub'),env.OLLAMA_MODELS,
 ...['.cache/huggingface/hub','.ollama/models','.lmstudio/models','.cache/lm-studio/models','ComfyUI-Shared/models','ComfyUI/models','ComfyUI-Installs','pinokio/api','Library/Caches/huggingface'].map(p=>path.join(home,p)),
 directory&&path.join(directory,'model-hub'),directory&&path.join(directory,'local-studio/models'),directory&&path.join(directory,'local-studio'),
 ...['OneDrive','OneDriveConsumer','OneDriveCommercial'].flatMap(key=>env[key]?[path.join(env[key],'Desktop'),path.join(env[key],'Documents')]:[]),
 ...knownFolders,...['Downloads','Desktop','Documents'].map(p=>path.join(home,p))];
 if(process.platform==='win32')for(const drive of ['C:','D:','E:','F:'])for(const folder of ['pinokio/api','ComfyUI/models','AI/models','Models'])roots.unshift(path.join(drive+path.sep,folder));
 // Discover common portable model apps in the home folder without scanning every project.
 try{for(const entry of fs.readdirSync(home,{withFileTypes:true}))if(entry.isDirectory()&&/^(comfy|stable[-_ ]?diffusion|fooocus|invoke|qwen[-_ ]?image|pinokio)/i.test(entry.name))roots.unshift(path.join(home,entry.name))}catch{}
 return [...new Set(roots.filter(Boolean).map(p=>path.resolve(p)))];
}
function createModelDiscovery({directory,walk,home=os.homedir(),env=process.env,knownFolders=[]}){
 const rootsFile=path.join(directory,'model-scan-folders.json');let saved=[];
 try{saved=JSON.parse(fs.readFileSync(rootsFile,'utf8')).filter(p=>typeof p==='string'&&path.isAbsolute(p))}catch{}
 async function scan({folder,signal,onProgress=()=>{}}={}){
  if(folder&&!saved.includes(path.resolve(folder))){saved.push(path.resolve(folder));fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(rootsFile,JSON.stringify(saved),{mode:0o600})}
  const roots=folder?[path.resolve(folder)]:[...new Set([...saved,...defaultRoots({home,env,directory,knownFolders})])];
  // Ollama stores names in manifests; blob filenames are content digests.
  const names=new Map(),seenDirs=new Set(),seenFiles=new Set(),found=[],pipelines=[];
  const ollamaRoots=[env.OLLAMA_MODELS,path.join(home,'.ollama/models'),...roots.filter(r=>fs.existsSync(path.join(r,'manifests')))];
  for(const root of new Set(ollamaRoots.filter(Boolean))){const base=path.join(root,'manifests');await walk([base],async(file,stat)=>{
   if(stat.size>2*1024**2)return;
   try{const data=JSON.parse(await fsp.readFile(file,'utf8')),parts=path.relative(base,file).split(path.sep);const tag=parts.pop(),name=parts.slice(1).join('/').replace(/^library\//,'')+':'+tag;
    for(const layer of data.layers||[])if(layer.mediaType==='application/vnd.ollama.image.model'&&/^sha256:[a-f0-9]{64}$/.test(layer.digest)){const blob=path.join(root,'blobs',layer.digest.replace(':','-'));names.set(await fsp.realpath(blob),name)}
   }catch{}
  },{signal,limit:10000,depth:8})}
  let scanned=0,truncated=false,last=0;const checkedRoots=[];
  function add(file,kind,size,extra={}){const id=createHash('sha256').update(file).digest('hex').slice(0,24);found.push({id,path:file,file,name:path.basename(file),kind,size,usable:false,...extra})}
  const voices=require('./local-studio.cjs').catalog.filter(m=>m.engine==='piper');
  for(const root of roots){if(signal?.aborted)throw Error('Scan cancelled');if(scanned>=200000){truncated=true;break}if(!fs.existsSync(root))continue;checkedRoots.push(root);
   const result=await walk([root],async(file,stat,count)=>{
    if(Date.now()-last>300){last=Date.now();onProgress({models:found.map(({file,...m})=>m),scanned:scanned+count,root})}
    const name=path.basename(file),voice=voices.find(m=>name===m.id+'.onnx');
    if(voice&&fs.existsSync(file+'.json')){const real=await fsp.realpath(file);if(!seenFiles.has(real)){seenFiles.add(real);add(path.dirname(file),'voice',stat.size,{name:voice.name,modelId:voice.id,usable:true,format:'Piper'})}return}
    if(name==='model_index.json'){
     let config;try{config=JSON.parse(await fsp.readFile(file,'utf8'))}catch{return}
     const folder=path.dirname(file),model=catalog.find(m=>['diffusion','ltx','spatial'].includes(m.engine)&&!m.adapter&&(file.includes('models--'+m.repo.replaceAll('/','--'))||path.basename(folder).toLowerCase()===m.repo.split('/').pop().toLowerCase()));
     const source=model&&manifest[model.id]?.sources.find(s=>s.repo===model.repo);let complete=!!source,size=0;
     if(source)for(const entry of source.files){try{const local=await fsp.stat(path.join(folder,entry.path));size+=local.size;if(local.size<=0)complete=false}catch{complete=false}}
     const usable=!!(model&&complete&&model.engine==='diffusion'&&model.kind==='image');
     add(folder,model?.kind||'image',size,{name:model?.name||path.basename(path.dirname(folder))+' pipeline',modelId:model?.id,usable,format:'Diffusers',reason:usable?undefined:!complete?'Incomplete model folder; missing required files.':'Detected on device; this pipeline cannot be linked yet.'});pipelines.push(folder+path.sep);return;
    }
    if(stat.size<1024)return;
    if(/\.gguf$/i.test(file)||/[/\\]blobs[/\\](?:sha256-)?[a-f0-9]{64}$/.test(file)){
     const real=await fsp.realpath(file);if(seenFiles.has(real))return;
     const handle=await fsp.open(file,'r'),header=Buffer.alloc(Math.min(stat.size,1024**2));try{await handle.read(header,0,header.length,0)}finally{await handle.close()}
     if(header.toString('utf8',0,4)!=='GGUF')return;
     const metadata=ggufMetadata(header),nonChat=/^(clip|t5|flux|sd[123]|sdxl|stable.diffusion|wan|ltx|z[_.-]?image|qwen[_.-]?image)/i.test(metadata.architecture||'')||/[/\\](diffusion_models|unet|text_encoders|clip|vae|loras|lora)[/\\]/i.test(file);
     seenFiles.add(real);add(real,nonChat?'weights':'chat',stat.size,{name:names.get(real)||(!/^(?:sha256-)?[a-f0-9]{32,64}$/i.test(metadata.name||name)?metadata.name||name:(file.match(/models--([^/\\]+)/)?.[1].replaceAll('--','/')||name)),usable:!nonChat,format:names.has(real)?'Ollama / GGUF':'GGUF',reason:nonChat?'This GGUF contains image or encoder weights, not a chat model. It needs its matching pipeline.':undefined});return;
    }
    if((/\.(safetensors|ckpt|pt|pth|onnx)$/i.test(name)||/^(model|pytorch_model|diffusion_pytorch_model)([.-][\w-]+)?\.bin$/i.test(name))&&stat.size>=1024**2){const real=await fsp.realpath(file);if(seenFiles.has(real))return;seenFiles.add(real);const adapter=/[/\\](loras?|adapters?)[/\\]/i.test(file);add(file,adapter?'adapter':'weights',stat.size,{format:path.extname(name).slice(1),reason:adapter?'Adapter weights need their compatible base model.':'Detected on device. Standalone weights need a supported pipeline before Orvio can use them.'})}
   },{signal,limit:30000,depth:24,skipNames:modelSkip,followFileLinks:true,followDirectoryLinks:true,seen:seenDirs});
   scanned+=result.count;truncated ||= result.truncated;
  }
  const models=found.filter(m=>!pipelines.some(prefix=>m.path.startsWith(prefix))).sort((a,b)=>Number(b.usable)-Number(a.usable)||a.name.localeCompare(b.name));
  return {models,scanned,truncated,roots:checkedRoots,savedRoots:saved};
 }
 return {scan};
}
module.exports={createModelDiscovery,defaultRoots,ggufMetadata};
