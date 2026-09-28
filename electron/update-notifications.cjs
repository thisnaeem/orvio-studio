const fs=require('node:fs');
const path=require('node:path');
function createUpdateNotifications({directory,show,open}){
 const file=path.join(directory,'update-notifications.json');let seen={};try{seen=JSON.parse(fs.readFileSync(file,'utf8'))}catch{}
 return (kind,info)=>{if(!['available','ready'].includes(kind)||!info?.version||seen[kind]===info.version)return;const title=kind==='ready'?'Orvio update is ready':'A new Orvio update is available';const body=kind==='ready'?`Version ${info.version} is downloaded. Open Orvio to restart when you’re ready.`:`Version ${info.version} is available. Click to view the update.`;try{if(show({title,body,onClick:open})===false)return;seen[kind]=info.version;fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(file,JSON.stringify(seen),{mode:0o600})}catch{/* In-app update status remains available when notifications are blocked. */}};
}
module.exports={createUpdateNotifications};
