const RELEASES_URL = 'https://github.com/thisnaeem/orvio-studio/releases/latest';
function createUpdateController({updater, packaged, platform, macSigned=false, send=()=>{}}) {
  const manualMac = platform === 'darwin' && !macSigned;
  let state = {phase:'idle', message:packaged ? 'Checks automatically at startup and every 4 hours.' : 'Updates are available in packaged releases.'};
  let checking = null;
  const publish = (phase,message,extra={}) => {state={phase,message,...extra};send(state);};
  updater.autoDownload = !manualMac;
  updater.autoInstallOnAppQuit = !manualMac;
  updater.allowPrerelease = false;
  updater.allowDowngrade = false;
  updater.on('checking-for-update',()=>publish('checking','Checking GitHub for a new release…'));
  updater.on('update-available',info=>publish(manualMac?'manual':'downloading',manualMac?`Version ${info.version} is available. Download it from GitHub; this unsigned Mac build cannot install updates automatically.`:`Downloading version ${info.version}…`,{version:info.version}));
  updater.on('update-not-available',()=>publish('current',manualMac?'You’re up to date. Unsigned Mac releases require manual installation.':'You’re up to date.'));
  updater.on('download-progress',progress=>publish('downloading',`Downloading update: ${Math.round(progress.percent)}%`,{percent:Math.round(progress.percent),received:progress.transferred,total:progress.total,speed:progress.bytesPerSecond}));
  updater.on('update-downloaded',info=>publish('ready',`Version ${info.version} is ready. Restart to install, or it will install when you quit.`,{version:info.version}));
  updater.on('error',()=>publish('error','Could not check or download the update. Check your connection and try again.'));
  async function check() {
    if(!packaged) return state;
    if(state.phase==='downloading'||state.phase==='ready')return state;
    if(checking)return checking;
    checking=(async()=>{try{const result=await updater.checkForUpdates();if(!result)publish('error','No update information was returned. Try again later.');result?.downloadPromise?.catch(()=>publish('error','Update download failed. Try checking again.'));}catch{publish('error','Could not check for updates. Check your connection and try again.');}return state;})();
    try{return await checking;}finally{checking=null;}
  }
  function install(){if(!packaged||manualMac||state.phase!=='ready')throw new Error('No installable update is ready.');updater.quitAndInstall(false,true);}
  return {check,install,getState:()=>({...state}),manualMac};
}
module.exports={createUpdateController,RELEASES_URL};
