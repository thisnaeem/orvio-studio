const {spawn}=require('node:child_process'),path=require('node:path');
function createFieldBridge({python,resources,platform=process.platform,spawnImpl=spawn}){
 const child=spawnImpl(platform==='win32'?'powershell.exe':python,platform==='win32'?['-NoProfile','-NonInteractive','-Command',require('node:fs').readFileSync(path.join(resources,'dictation_field.ps1'),'utf8')]:[path.join(resources,'dictation_field.py')],{windowsHide:true});let sequence=0,buffer='',closed=false;const pending=new Map();
 function close(){if(closed)return;closed=true;child.kill();for(const p of pending.values()){clearTimeout(p.timer);p.resolve({ok:false,live:false,tracked:false})}pending.clear()}
 child.on('error',close);child.on('close',close);child.stderr.on('data',()=>{});child.stdin.on('error',close);child.stdout.on('data',data=>{buffer+=data;let index;while((index=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,index);buffer=buffer.slice(index+1);try{const row=JSON.parse(line),p=pending.get(row.id);if(p){pending.delete(row.id);clearTimeout(p.timer);p.resolve(row.result)}}catch{}}if(buffer.length>10000)close()});
 return {close,request(action,text){if(closed)return Promise.resolve({ok:false,live:false,tracked:false});return new Promise(resolve=>{const id=++sequence,timer=setTimeout(()=>{close()},4000);pending.set(id,{resolve,timer});child.stdin.write(JSON.stringify({id,action,text})+'\n')})}};
}
module.exports={createFieldBridge};
