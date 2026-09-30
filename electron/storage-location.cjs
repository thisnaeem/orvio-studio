const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const io=fs.promises;
const {pipeline}=require('node:stream/promises'),{Transform}=require('node:stream');
async function copyWithProgress(source,target,report){
 await io.mkdir(target,{recursive:true});
 for(const entry of await io.readdir(source,{withFileTypes:true})){
  const from=path.join(source,entry.name),to=path.join(target,entry.name);
  if(entry.isDirectory())await copyWithProgress(from,to,report);
  else if(entry.isSymbolicLink()){if(await exists(to))await io.unlink(to);await io.cp(from,to,{verbatimSymlinks:true})}
  else if(entry.isFile()){const size=(await io.stat(from)).size;report(0,entry.name);if(size>32*1024*1024){await pipeline(fs.createReadStream(from),new Transform({transform(chunk,_,done){report(chunk.length,entry.name);done(null,chunk)}}),fs.createWriteStream(to))}else{await io.copyFile(from,to);report(size,entry.name)}}
 }
}

// Stable links preserve absolute paths in model registries, Python environments and media assets.
const folders=['model-hub','local-studio','file-downloads','recordings','media','downloads','package-cache','runtime-temp'];
const exists=async file=>{try{return await io.lstat(file)}catch(e){if(e.code==='ENOENT')return null;throw e}};
const inside=(parent,child)=>{const relative=path.relative(parent,child);return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)};
async function inventory(root){let bytes=0,files=0;async function visit(folder){for(const entry of await io.readdir(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())await visit(file);else if(entry.isFile()){bytes+=(await io.stat(file)).size;files++}}}await visit(root);return {bytes,files}}
function createStorageLocation(directory){
 directory=path.resolve(directory);const file=path.join(directory,'storage-location.json');let config={root:directory};
 try{config=JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){if(e.code!=='ENOENT')throw Error('Storage settings could not be read. Restore storage-location.json before starting Orvio.')}
 function save(){fs.mkdirSync(directory,{recursive:true});const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(config,null,2));fs.renameSync(temp,file)}
 const state=()=>({directory:config.root||directory,pending:config.pending||null,managedFolders:folders});
 async function choose(parent){
  if(config.moves)throw Error('Finish the pending storage move by restarting Orvio first.');
  const base=await io.realpath(parent),root=path.join(base,'Orvio Studio');
  if(root===directory||inside(directory,root)||inside(root,directory)||root===config.root||inside(config.root,root)||inside(root,config.root))throw Error('Choose a separate folder outside the current Orvio storage location.');
  if(await exists(root))throw Error('This folder already contains an Orvio Studio directory. Choose an empty destination to avoid overwriting files.');
  const probe=path.join(base,'.orvio-write-check-'+randomUUID());await io.writeFile(probe,'');await io.unlink(probe);
  config.pending=root;save();return state();
 }
 function cancel(){if(config.moves)throw Error('Storage relocation has already started. Restart to finish it.');delete config.pending;save();return state()}
 async function apply(notify=()=>{}){
  if(!config.pending){
   if(config.root!==directory){await io.access(config.root);for(const name of folders){const source=path.join(directory,name),target=path.join(config.root,name);if(await io.realpath(source)!==await io.realpath(target))throw Error('Storage link changed: '+name)}}
   return;
  }
  const targetRoot=config.pending;
  if(!config.moves){
   if(await exists(targetRoot))throw Error('The destination is no longer empty. Cancel the storage change and select another folder.');
   const moves=[];let bytes=0;
   for(const name of folders){const source=path.join(directory,name);await io.mkdir(source,{recursive:true});const real=await io.realpath(source);if(real!==source&&real!==path.join(config.root,name))throw Error('Unexpected storage link: '+source);const size=await inventory(real);bytes+=size.bytes;moves.push({name,real,backup:path.join(directory,'.storage-backup-'+randomUUID()),size})}
   const disk=await io.statfs(path.dirname(targetRoot));if(disk.bavail*disk.bsize<bytes+256*1024*1024)throw Error(`Not enough space in the selected location. At least ${Math.ceil(bytes/1024**3)} GB plus 256 MB is needed.`);
   config.moves=moves;save();
  }
  await io.mkdir(targetRoot,{recursive:true});
  for(const move of config.moves){
   if(!folders.includes(move.name)||!inside(directory,move.backup)||!path.basename(move.backup).startsWith('.storage-backup-'))throw Error('Invalid storage migration record.');
   const source=path.join(directory,move.name),target=path.join(targetRoot,move.name);
   if(move.real!==source&&move.real!==path.join(config.root,move.name))throw Error('Invalid original storage path.');
   notify('Moving '+move.name+'â€¦');
   if(!move.copied){let received=0,last=0;await copyWithProgress(move.real,target,(bytes,name)=>{received+=bytes;if(Date.now()-last>250){last=Date.now();notify(`Moving ${move.name} · ${Math.min(100,Math.floor(received/Math.max(1,move.size.bytes)*100))}% · ${name}`)}});notify('Verifying '+move.name+'…');const copied=await inventory(target);if(copied.bytes!==move.size.bytes||copied.files!==move.size.files)throw Error('Storage verification failed for '+move.name+'. Original files are preserved.');move.copied=true;save()}
   if(!move.linked){
    const backup=await exists(move.backup),current=await exists(source);
    if(current&&!backup)await io.rename(source,move.backup);
    if(!await exists(source))await io.symlink(target,source,process.platform==='win32'?'junction':'dir');
    if(await io.realpath(source)!==await io.realpath(target))throw Error('Could not verify the new storage link.');
    move.linked=true;save();
   }
   // Only remove the verified, app-owned original after the replacement link is durable.
   if(!move.cleaned){
    const backup=await exists(move.backup);
    if(backup?.isSymbolicLink())await io.unlink(move.backup);else if(backup)await io.rm(move.backup,{recursive:true});
    if(move.real!==source){if(!inside(config.root,move.real))throw Error('Unsafe old storage path.');await io.rm(move.real,{recursive:true,force:true})}
    move.cleaned=true;save();
   }
  }
  config={root:targetRoot};save();
 }
 return {state,choose,cancel,apply};
}
module.exports={createStorageLocation,folders};
