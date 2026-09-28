const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
function createRunner({launch,log=console.log,onExit=()=>{}}){
 let child=null,restarting=false,stopping=false,timer=null;
 function start(){if(stopping||child)return;child=launch();const current=child;current.once('error',error=>{log('Electron could not start: '+error.message);stopping=true;onExit(1)});current.once('exit',code=>{clearTimeout(timer);if(child===current)child=null;if(restarting&&!stopping){restarting=false;start()}else onExit(code||0)})}
 function requestStop(){if(!child)return;const current=child;if(current.connected)current.send({type:'orvio:dev-restart'},error=>{if(error)log('Could not request graceful restart: '+error.message)});else current.kill();timer=setTimeout(()=>{if(child===current){log('Electron has not exited; close Orvio to finish restarting.')}},10000);timer.unref()}
 function restart(){if(stopping||restarting)return;restarting=true;log('Backend changed. Restarting Electron…');if(child)requestStop();else{restarting=false;start()}}
 function stop(){if(stopping)return;stopping=true;restarting=false;if(child)requestStop();else onExit(0)}
 return {start,restart,stop};
}
if(require.main===module){
 const root=path.resolve(__dirname,'..');let debounce;const watchers=[];
 const runner=createRunner({launch:()=>spawn(require('electron'),['.'],{cwd:root,windowsHide:true,stdio:['inherit','inherit','inherit','ipc']}),onExit:code=>{for(const watcher of watchers)watcher.close();clearTimeout(debounce);process.exitCode=code}});
 const changed=(_event,file)=>{if(!file||! /\.(cjs|js|json|py)$/.test(String(file)))return;clearTimeout(debounce);debounce=setTimeout(()=>runner.restart(),400)};
 watchers.push(fs.watch(path.join(root,'electron'),{recursive:true},changed),fs.watch(path.join(root,'runtime'),changed));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{clearTimeout(debounce);for(const watcher of watchers)watcher.close();runner.stop()});
 runner.start();
}
module.exports={createRunner};
