const {spawn}=require('node:child_process');
// One serial image worker. Release VRAM after two minutes without another request.
function createInferenceWorker({idleMs=120000,spawnImpl=spawn}={}){
 let child=null,key='',pending=null,timer=null;
 function close(){clearTimeout(timer);const old=child;child=null;key='';if(old){old.stdin.end();if(process.platform==='win32')spawnImpl('taskkill',['/pid',String(old.pid),'/T','/F'],{windowsHide:true});else try{process.kill(-old.pid,'SIGTERM')}catch{old.kill()}}}
 function run(executable,args,{env,input,signal,onProgress,onChild}){
  if(pending)return Promise.reject(Error('The image worker is busy.'));
  if(signal?.aborted)return Promise.reject(Error('Cancelled'));
  clearTimeout(timer);const nextKey=JSON.stringify([executable,args]);if(child&&key!==nextKey)close();
  return new Promise((resolve,reject)=>{
   const finish=(error,result)=>{const job=pending;if(!job)return;pending=null;signal?.removeEventListener('abort',abort);onChild(null);if(error){close();reject(error)}else{timer=setTimeout(close,idleMs);timer.unref();resolve(result)}};
   const abort=()=>finish(Error('Cancelled'));
   pending={finish,onProgress};
   if(!child){
    key=nextKey;const proc=child=spawnImpl(executable,[...args,'--serve'],{env,windowsHide:true,detached:process.platform!=='win32'});let buffer='',errors='';
    proc.stdout.on('data',chunk=>{buffer+=chunk;let index;while((index=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,index);buffer=buffer.slice(index+1);if(proc!==child)continue;
     try{if(line.startsWith('ORVIO_RESULT '))pending?.finish(null,JSON.parse(line.slice(13)));else if(line.startsWith('ORVIO_PROGRESS '))pending?.onProgress(JSON.parse(line.slice(15)));else if(line.startsWith('ORVIO_ERROR '))pending?.finish(Error(JSON.parse(line.slice(12))))}catch(error){pending?.finish(error)}
    }});
    proc.stderr.on('data',chunk=>{errors=(errors+chunk).slice(-2000)});
    proc.on('error',error=>{if(proc===child)pending?.finish(error)});
    proc.on('close',code=>{if(proc!==child)return;child=null;key='';pending?.finish(Error(errors||`Image worker exited (${code})`))});
    proc.stdin.on('error',error=>{if(proc===child)pending?.finish(error)});
   }
   signal?.addEventListener('abort',abort,{once:true});onChild(child);child.stdin.write(JSON.stringify(input)+'\n');
  });
 }
 return {run,close};
}
module.exports={createInferenceWorker};
