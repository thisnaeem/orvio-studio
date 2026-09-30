const {spawn}=require('node:child_process');
// One pipe-based worker, one request at a time. No HTTP listener or open port.
function createMediaWorker({file,args,env,idleMs=600000,spawnImpl=spawn}){
 let child=null,pending=null,timer=null;
 function dispose(){clearTimeout(timer);const old=child;child=null;if(pending){const p=pending;pending=null;p.cleanup();p.reject(Error('Generation cancelled.'))}if(old){if(process.platform==='win32')spawnImpl('taskkill',['/pid',String(old.pid),'/T','/F'],{windowsHide:true});else try{process.kill(-old.pid,'SIGTERM')}catch{old.kill()}}}
 function start(){const proc=spawnImpl(file,args,{env,windowsHide:true,detached:process.platform!=='win32'});child=proc;let buffer='',errors='';
 const fail=error=>{if(child!==proc)return;child=null;if(pending){const p=pending;pending=null;p.cleanup();p.reject(error)}};
 proc.on('error',fail);proc.on('close',code=>fail(Error(errors||`Media worker stopped (${code}). Try again.`)));proc.stderr.on('data',d=>{errors=(errors+d).slice(-2000)});proc.stdin.on('error',fail);
 proc.stdout.on('data',d=>{buffer+=d;let at;while((at=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,at);buffer=buffer.slice(at+1);if(child!==proc||!pending)continue;try{if(line.startsWith('ORVIO_PROGRESS '))pending.report(JSON.parse(line.slice(15)));else if(line.startsWith('ORVIO_RESULT ')||line.startsWith('ORVIO_ERROR ')){const error=line.startsWith('ORVIO_ERROR '),value=JSON.parse(line.slice(error?12:13)),p=pending;pending=null;p.cleanup();if(error){dispose();p.reject(Error(value))}else{timer=setTimeout(dispose,idleMs);timer.unref();p.resolve(value)}}}catch{}}if(buffer.length>1024*1024)buffer=buffer.slice(-4096)});
 }
 return {dispose,run(input,{signal,report=()=>{}}={}){if(pending)return Promise.reject(Error('Media worker is busy.'));if(signal?.aborted)return Promise.reject(Error('Generation cancelled.'));clearTimeout(timer);if(!child)start();return new Promise((resolve,reject)=>{const abort=()=>dispose();pending={resolve,reject,report,cleanup:()=>signal?.removeEventListener('abort',abort)};signal?.addEventListener('abort',abort,{once:true});child.stdin.write(JSON.stringify(input)+'\n',error=>{if(error)dispose()})})},get active(){return !!pending}};
}
module.exports={createMediaWorker};
