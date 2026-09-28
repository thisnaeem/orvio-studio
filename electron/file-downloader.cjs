const fs=require('node:fs'),fsp=fs.promises,path=require('node:path'),{randomUUID}=require('node:crypto');
const {setTimeout:delay}=require('node:timers/promises');
function webURL(value){const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('Use an HTTP or HTTPS link without embedded credentials.');return u.href}
function filename(value){let name=String(value||'download').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/g,'').slice(0,150);if(!name||/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(name))name='download-'+name;return name}
async function request(url,options={}){for(let n=0;n<8;n++){const response=await fetch(webURL(url),{...options,redirect:'manual'});if([301,302,303,307,308].includes(response.status)){await response.body?.cancel();url=new URL(response.headers.get('location'),url).href;continue}return response}throw Error('Too many redirects.');}
function createFileDownloader({directory,downloads,register}){
 const root=path.join(directory,'file-downloads');fs.mkdirSync(root,{recursive:true});const jobs=new Map();
 async function download(input){
  const url=webURL(input.url),id=/^[a-f0-9-]{36}$/.test(input.transfer||'')?input.transfer:randomUUID();
  const rate=Number(input.rate||0);if(!Number.isFinite(rate)||rate<0||rate>102400)throw Error('Speed limit must be 0–102400 KB/s.');
  const name=filename(input.name||decodeURIComponent(new URL(url).pathname.split('/').pop()||'download'));
  if(jobs.has(id))throw Error('This transfer is already running.');const abort=new AbortController();jobs.set(id,abort);
  const entry=downloads.begin({title:name,kind:input.image?'image':'file',retry:{type:'file',input:{url,transfer:id,name,rate,image:!!input.image}},cancel:()=>abort.abort()});
  const partial=path.join(root,id+'.part'),metaFile=path.join(root,id+'.json');
  downloads.update(entry,{message:'Queued · waiting for a download slot…'});
  try{return await downloads.queue.run(async()=>{
   for(let attempt=0;attempt<3;attempt++)try{
    let offset=0,meta={};try{offset=fs.statSync(partial).size;meta=JSON.parse(fs.readFileSync(metaFile,'utf8'))}catch{}
    // Without a server validator, restart rather than join bytes from different versions.
    if(!meta.validator)offset=0;
    const signal=AbortSignal.any([abort.signal,AbortSignal.timeout(24*60*60*1000)]);
    const headers={'Accept-Encoding':'identity'};if(offset){headers.Range=`bytes=${offset}-`;headers['If-Range']=meta.validator}
    const response=await request(url,{headers,signal});
    if(!response.ok){await response.body?.cancel();if(response.status===416){await fsp.truncate(partial,0);continue}throw Error(`Server returned HTTP ${response.status}.`)}
    const type=response.headers.get('content-type')||'';if(input.image&&!/^image\/(png|jpeg|gif|webp|avif|bmp|tiff|x-icon)/i.test(type)){await response.body?.cancel();throw Error('This link did not return a supported image file.');}
    if(response.status!==206)offset=0;
    const range=response.headers.get('content-range');if(response.status===206&&(!offset||!range?.startsWith(`bytes ${offset}-`))){await response.body?.cancel();throw Error('Server returned an invalid resume range.');}
    const encoded=response.headers.get('content-encoding')&&!/^identity$/i.test(response.headers.get('content-encoding'));if(encoded&&offset){await response.body?.cancel();await fsp.truncate(partial,0);continue}
    const length=encoded?0:Number(response.headers.get('content-length'))||0,total=length?offset+length:null;
    const validator=response.headers.get('etag')?.startsWith('W/')?response.headers.get('last-modified'):response.headers.get('etag')||response.headers.get('last-modified');
    if(offset&&validator&&validator!==meta.validator){await response.body?.cancel();await fsp.truncate(partial,0);continue}
    await fsp.writeFile(metaFile,JSON.stringify({validator:encoded?null:validator}));const handle=await fsp.open(partial,offset?'a':'w');let received=offset,last=0;const started=Date.now();
    try{for await(const chunk of response.body){abort.signal.throwIfAborted();await handle.writeFile(chunk);received+=chunk.length;const elapsed=(Date.now()-started)/1000,speed=(received-offset)/Math.max(.001,elapsed);if(Date.now()-last>200){downloads.update(entry,{message:offset?'Resuming file…':'Downloading file…',received,total,speed,eta:total?(total-received)/speed:null});last=Date.now()}if(rate){const wait=(received-offset)/(rate*1024)*1000-(Date.now()-started);if(wait>0)await delay(wait,undefined,{signal:abort.signal})}}}finally{await handle.close()}
    if(total&&received!==total)throw Error('Connection ended before the complete file arrived.');
    let finalName=name;if(!path.extname(finalName)){const extension={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif','image/avif':'.avif'}[type.split(';')[0]];if(extension)finalName+=extension}
    const dest=path.join(root,id+'-'+finalName);await fsp.rename(partial,dest);await fsp.unlink(metaFile).catch(()=>{});
    const kind=/^image\/(png|jpeg|webp|gif|avif)/i.test(type)?'image':type.startsWith('video/')?'video':type.startsWith('audio/')?'audio':'file';
    const asset=register(dest,kind,finalName);downloads.finish(entry,'completed',{received,total:received,assetId:asset.id,message:'Saved on this computer'});return asset;
   }catch(error){if(abort.signal.aborted||attempt===2)throw error;downloads.update(entry,{message:`Connection interrupted · retry ${attempt+1} of 2…`});await delay(500*(attempt+1),undefined,{signal:abort.signal})}
   throw Error('Server could not resume this file. Retry the download.');
  },abort.signal)}catch(error){downloads.finish(entry,abort.signal.aborted?'cancelled':'failed',{message:abort.signal.aborted?'Download cancelled':error.message});throw error}finally{jobs.delete(id)}
 }
 downloads.registerRetry('file',download);
 return {download,shutdown(){for(const controller of jobs.values())controller.abort()},async images(url){const response=await request(webURL(url),{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`Server returned HTTP ${response.status}.`);let html='';for await(const chunk of response.body){html+=Buffer.from(chunk).toString();if(html.length>2*1024*1024)throw Error('Page is too large to inspect. Paste a direct image link instead.');}const images=new Set();for(const tag of html.match(/<(?:img|meta)\b[^>]*>/gi)||[]){const attrs={};for(const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs[match[1].toLowerCase()]=match[2]??match[3]??match[4];const candidates=/^<img/i.test(tag)?[attrs.src,attrs['data-src'],...(attrs.srcset||'').split(',').map(s=>s.trim().split(/\s/)[0])]:/^(og:image|twitter:image)$/.test(attrs.property||attrs.name||'')?[attrs.content]:[];for(const value of candidates)if(value)try{images.add(webURL(new URL(value.replace(/&amp;/g,'&'),response.url||url).href))}catch{}if(images.size>=100)break}return [...images].slice(0,100)}};
}
module.exports={createFileDownloader,webURL,filename};
