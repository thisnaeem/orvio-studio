const {spawn}=require('node:child_process');
class PreviewProcess {
 constructor(){this.child=null;this.output='';this.exitCode=null;this.command=''}
 state(){return {running:!!this.child,pid:this.child?.pid,command:this.command,output:this.output,exitCode:this.exitCode}}
 start(command,cwd){
  if(this.child)throw Error('Stop the current preview server first.');
  this.output='';this.exitCode=null;this.command=command;
  const child=spawn(command,{cwd,shell:true,windowsHide:true,detached:process.platform!=='win32',env:{...process.env}});this.child=child;
  const read=chunk=>{this.output=(this.output+chunk).slice(-12000)};child.stdout.on('data',read);child.stderr.on('data',read);
  child.on('error',error=>{this.output=error.message;if(this.child===child)this.child=null});
  child.on('close',code=>{if(this.child===child){this.exitCode=code;this.child=null}});
  return this.state();
 }
 stop(){const child=this.child;if(!child)return this.state();if(process.platform==='win32'){const killer=spawn('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true});killer.on('error',()=>child.kill())}else{try{process.kill(-child.pid,'SIGTERM')}catch{child.kill()}}return {...this.state(),stopping:true}}
}
module.exports={PreviewProcess};
