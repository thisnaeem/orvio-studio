const fs=require('node:fs/promises');
const path=require('node:path');
const bots=Object.freeze({seo:'Atlas','pc-helper':'Tidy',instagram:'Mingle',chat:'Orbi',integrations:'Relay',automations:'Tempo',studio:'Prisma',models:'Sage',live:'Beacon',captions:'Glyph','video-editor':'Cut',recorder:'Frame',voice:'Echo',clipping:'Slice',downloader:'Fetch'});
function validateBot(id){if(typeof id!=='string'||!Object.hasOwn(bots,id))throw Error('Choose a bot from your crew.');return id}
function parseBotArgs(args){const value=args.find(v=>typeof v==='string'&&v.startsWith('--orvio-bot='))?.slice(12);return Object.hasOwn(bots,value)?value:null}
const quoteShell=value=>"'"+String(value).replaceAll("'","'\\''")+"'";
const xml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function ico(png){const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);return Buffer.concat([header,png])}
function icns(png){const header=Buffer.alloc(16);header.write('icns');header.writeUInt32BE(png.length+16,4);header.write('ic09',8);header.writeUInt32BE(png.length+8,12);return Buffer.concat([header,png])}
function desktopQuote(value){return '"'+String(value).replaceAll('\\','\\\\').replaceAll('"','\\"').replaceAll('`','\\`').replaceAll('$','\\$').replaceAll('%','%%')+'"'}
function createBotShortcuts({app,shell,dialog,nativeImage,platform=process.platform,executable=process.env.APPIMAGE||process.execPath,assets=path.join(__dirname,'../dist/bots')}){
 return {async create(id,parent){
  validateBot(id);
  if(!app.isPackaged)throw Error('Create shortcuts from the installed Orvio app so they keep working without a development server.');
  const choice=await dialog.showOpenDialog(parent,{title:`Where should ${bots[id]} live?`,defaultPath:app.getPath('desktop'),buttonLabel:'Create shortcut here',properties:['openDirectory','createDirectory']});
  if(choice.canceled||!choice.filePaths.length)return null;
  const ext=platform==='win32'?'.lnk':platform==='darwin'?'.app':'.desktop';
  const target=path.join(choice.filePaths[0],`${bots[id]} — Orvio${ext}`);
  // Never overwrite an existing app, directory or unrelated shortcut.
  try{await fs.lstat(target);throw Error('A shortcut with this name already exists here. Choose another folder or remove the old shortcut.')}catch(error){if(error.code!=='ENOENT')throw error}
  const image=nativeImage.createFromPath(path.join(assets,id+'.png'));
  if(image.isEmpty())throw Error('This bot’s icon is missing. Reinstall the latest Orvio update.');
  const cache=path.join(app.getPath('userData'),'bot-icons');await fs.mkdir(cache,{recursive:true});
  const args=`--orvio-bot=${id}`;
  if(platform==='win32'){
   const icon=path.join(cache,id+'.ico');await fs.writeFile(icon,ico(image.resize({width:256,height:256}).toPNG()));
   if(!shell.writeShortcutLink(target,'create',{target:executable,args,icon,iconIndex:0,description:`Open ${bots[id]} in Orvio Studio`,appUserModelId:'com.orvio.studio'}))throw Error('Windows could not create the shortcut. Try another folder.');
  }else if(platform==='darwin'){
   const staging=await fs.mkdtemp(path.join(choice.filePaths[0],'.orvio-shortcut-'));
   try{
    const contents=path.join(staging,'Contents');await fs.mkdir(path.join(contents,'MacOS'),{recursive:true});await fs.mkdir(path.join(contents,'Resources'));
    await fs.writeFile(path.join(contents,'Resources','bot.icns'),icns(image.resize({width:512,height:512}).toPNG()));
    await fs.writeFile(path.join(contents,'Info.plist'),`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleName</key><string>${xml(bots[id])}</string><key>CFBundleIdentifier</key><string>com.orvio.shortcut.${id}</string><key>CFBundleExecutable</key><string>launch</string><key>CFBundleIconFile</key><string>bot.icns</string><key>CFBundlePackageType</key><string>APPL</string><key>LSUIElement</key><true/></dict></plist>`);
    await fs.writeFile(path.join(contents,'MacOS','launch'),`#!/bin/sh\nexec ${quoteShell(executable)} ${quoteShell(args)}\n`,{mode:0o755});
    await fs.rename(staging,target);
   }catch(error){await fs.rm(staging,{recursive:true,force:true});throw error}
  }else{
   const icon=path.join(cache,id+'.png');await fs.writeFile(icon,image.toPNG());
   await fs.writeFile(target,`[Desktop Entry]\nType=Application\nName=${bots[id]} — Orvio\nComment=Open ${bots[id]} in Orvio Studio\nExec=${desktopQuote(executable)} ${args}\nIcon=${icon}\nTerminal=false\nCategories=Utility;\n`,{mode:0o755,flag:'wx'});
  }
  return {path:target,name:bots[id]};
 }};
}
module.exports={bots,validateBot,parseBotArgs,quoteShell,ico,icns,desktopQuote,createBotShortcuts};
