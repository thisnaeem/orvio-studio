const path=require('node:path'),{execFile}=require('node:child_process'),{promisify}=require('node:util');const execute=promisify(execFile);
const winFocus="Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class OrvioFocus { [DllImport(\"user32.dll\")] public static extern IntPtr GetForegroundWindow(); }'; [OrvioFocus]::GetForegroundWindow().ToInt64()";
async function foreground(){if(process.platform==='darwin'){const value=(await execute('/usr/bin/osascript',['-e','tell application "System Events" to tell first application process whose frontmost is true to return (unix id as text) & "|" & name'],{timeout:10000})).stdout.trim();const [identity,...name]=value.split('|');return {identity,name:name.join('|')}}if(process.platform==='win32'){const script=winFocus.replace('[OrvioFocus]::GetForegroundWindow().ToInt64()',"$h=[OrvioFocus]::GetForegroundWindow(); $p=Get-Process | Where-Object {$_.MainWindowHandle -eq $h} | Select-Object -First 1; @{identity=$h.ToInt64().ToString();name=$p.ProcessName} | ConvertTo-Json -Compress");return JSON.parse((await execute('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:10000})).stdout)}throw Error('Global dictation supports Windows and macOS.')}
async function key(command){const mac={paste:'keystroke "v" using command down',undo:'keystroke "z" using command down',redo:'keystroke "z" using {command down, shift down}','delete-word':'key code 51 using option down','select-all':'keystroke "a" using command down',backspace:'key code 51',bold:'keystroke "b" using command down',italic:'keystroke "i" using command down'};const win={paste:'^v',undo:'^z',redo:'^y','delete-word':'^{BACKSPACE}','select-all':'^a',backspace:'{BACKSPACE}',bold:'^b',italic:'^i'};if(!mac[command])throw Error('Unsupported edit command');if(process.platform==='darwin')await execute('/usr/bin/osascript',['-e','tell application "System Events" to '+mac[command]],{timeout:10000});else await execute('powershell.exe',['-NoProfile','-NonInteractive','-Command',"Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('"+win[command]+"')"],{windowsHide:true,timeout:10000})}
async function paste(clipboard,text,target){let clean=String(text);if(!clean)return 'No speech was detected.';if(/terminal|powershell|cmd|iterm|console/i.test(target?.name||''))clean=clean.replace(/[\r\n]+/g,' ');clipboard.writeText(clean);if(!target||(await foreground()).identity!==target.identity)return 'Text copied. Your focused app changed; paste when ready.';await key('paste');return 'Paste requested · text is also on your clipboard.'}
function createDictation({app,BrowserWindow,screen,ipcMain,clipboard,systemPreferences,localStudio,modelHub,settings,pausePet,resumePet,python,resources,fieldFactory=require('./dictation-field.cjs').createFieldBridge,watch=require('./dictation-hotkey.cjs').watchRelease}){
 let window=null,session=null,opening=false;
 function close(){const old=session;session=null;if(old){old.cancelled=true;old.stopWatch?.();void old.field?.request('rollback').finally(()=>old.field.close())}window?.destroy();window=null;resumePet()}
 function finish(){if(!session)return;session.released=true;session.stopWatch?.();if(session.armed)window?.webContents.send('dictation:finish')}
 function permission(contents,permission,details){return !!window&&contents===window.webContents&&!!session?.armed&&permission==='media'&&(!details?.mediaTypes||details.mediaTypes.every(t=>t==='audio'))&&(!details?.mediaType||details.mediaType==='audio')}
 async function start(hold=false){
  if(opening||session?.processing)return;if(window){if(session?.completed)close();else{finish();return}}opening=true;
  const s={config:settings.state(),released:false,armed:false,processing:false,cancelled:false,live:false,wrote:false,lastText:'',lastLength:0};session=s;
  try{
   pausePet();s.field=fieldFactory({python,resources});s.fieldReady=s.field.request('capture').then(info=>{s.info=info;return info});
   if(hold)try{s.stopWatch=watch({python,resources,shortcut:s.config.shortcuts.dictation,onRelease:finish,onError:message=>{s.warning=message;window?.webContents.send('dictation:notice',message)}})}catch(e){s.warning=e.message;s.released=true}
   s.targetPromise=foreground().catch(()=>null);
   const area=screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
   window=new BrowserWindow({x:Math.round(area.x+area.width/2-260),y:area.y+area.height-170,width:520,height:150,show:false,transparent:true,frame:false,alwaysOnTop:true,skipTaskbar:true,focusable:false,resizable:false,hasShadow:false,webPreferences:{autoplayPolicy:'no-user-gesture-required',preload:path.join(__dirname,'dictation-preload.cjs'),sandbox:true,nodeIntegration:false,contextIsolation:true,backgroundThrottling:false}});
   const owned=window;owned.webContents.setWindowOpenHandler(()=>({action:'deny'}));owned.webContents.on('will-navigate',e=>e.preventDefault());owned.once('ready-to-show',()=>owned.showInactive());owned.on('closed',()=>{if(window===owned){window=null;close()}});
   if(app.isPackaged)void owned.loadFile(path.join(__dirname,'../dist/index.html'),{hash:'dictation'});else void owned.loadURL('http://127.0.0.1:5188/#dictation');s.hold=hold;
  }catch(e){close();throw e}finally{opening=false}
 }
 function handle(name,fn){ipcMain.handle(name,(event,...args)=>{if(!window||event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame)throw Error('Untrusted dictation request');return fn(...args)})}
 async function recognize(s,bytes){const result=s.config.dictationModel==='mms'?await localStudio.petTranscribe(bytes,'mms',s.config.mmsLanguage):await localStudio.dictationTranscribe(bytes,s.config);return result.segments.map(row=>row.text).join(' ').trim()}
 handle('dictation:arm',async()=>{const s=session;if(!s)throw Error('Dictation cancelled.');const model=s.config.dictationModel;if(!(model==='mms'?localStudio.state().mmsInstalled.includes(s.config.mmsLanguage):localStudio.state().models.find(m=>m.id===model)?.installed))throw Error('Download the selected speech model in Settings → Desktop & shortcuts.');if((await s.fieldReady).protected)throw Error('Dictation is disabled in password fields.');if(session!==s)throw Error('Dictation cancelled.');s.armed=true;return {supportsLive:model!=='mms',hold:s.hold,released:s.released,liveInsert:s.config.liveInsert,autoStop:s.config.silenceStop,warning:s.warning||''}});
 handle('dictation:cancel',close);
 handle('dictation:partial',async bytes=>{
  const s=session;if(!s?.armed||s.processing||s.pending)return {text:s?.lastText||''};
  s.pending=(async()=>{const text=await recognize(s,bytes);if(session!==s||s.cancelled)return {text:''};s.lastText=text;s.lastLength=bytes.byteLength;const info=await s.fieldReady;
   if(text&&s.config.liveInsert&&info.live&&!s.liveBlocked){const applied=await s.field.request('replace',text);s.wrote=s.wrote||applied.ok;if(!applied.ok)s.liveBlocked=true}
   return {text,inserted:s.wrote&&!s.liveBlocked,liveUnavailable:!info.live||s.liveBlocked};
  })();try{return await s.pending}finally{s.pending=null}
 });
 handle('dictation:finish',async bytes=>{
  const s=session;if(!s?.armed||s.processing)throw Error('Dictation is not recording.');s.processing=true;s.armed=false;s.stopWatch?.();
  try{
   if(s.pending)await s.pending.catch(()=>{});const text=s.lastLength===bytes.byteLength?s.lastText:await recognize(s,bytes);if(session!==s||s.cancelled)return 'Dictation cancelled.';if(!text)return 'No speech detected.';
   const {editCommand,rewrite,applySnippets}=require('./dictation-text.cjs');const command=s.config.voiceCommands?editCommand(text):null;let output=text,note='';
   if(command&&['newline','paragraph'].includes(command))output=command==='newline'?'\n':'\n\n';
   else if(!command){try{const edited=await rewrite({text,settings:s.config,appName:(await s.targetPromise)?.name||'Unknown app',modelHub});output=applySnippets(edited.text,s.config.snippets||[]);note=edited.note||''}catch{output=applySnippets(text,s.config.snippets||[]);note='Cleanup unavailable; original words used.'}}
   if(session!==s||s.cancelled)return 'Dictation cancelled.';
   const info=await s.fieldReady,checked=await s.field.request('check');
   if(info.protected)return 'Dictation is disabled in password fields.';
   if(s.liveBlocked){clipboard.writeText(output);return 'Text copied. The field changed; your edits were preserved.'}
   if(s.wrote){const applied=await s.field.request(command&&!['newline','paragraph'].includes(command)?'rollback':'replace',output);if(!applied.ok){clipboard.writeText(output);return 'Text copied. The field changed; your edits were preserved.'}if(!command||['newline','paragraph'].includes(command)){s.wrote=false;s.field.close();clipboard.writeText(output);return note||'Inserted into your text field.'}}
   if(info.tracked&&!checked.ok){clipboard.writeText(output);return 'Text copied. Focus changed; paste where you want it.'}
   const target=await s.targetPromise;
   if(command&&!['newline','paragraph'].includes(command)){if(!target||(await foreground()).identity!==target.identity)return 'Command skipped: focus changed.';await key(command);s.wrote=false;return 'Edit command applied.'}
   return [note,await paste(clipboard,output,target)].filter(Boolean).join(' ');
  }catch(error){if(s.lastText){clipboard.writeText(s.lastText);return 'Text copied. Automatic insertion was unavailable.'}throw error}finally{s.processing=false;if(session===s){s.stopWatch?.();s.field?.close();s.completed=true}}
 });
 return {toggle:()=>start(false),shortcut:()=>start(settings.state().dictationMode!=='toggle'),close,permission,busy:()=>!!window,requestAccess(){return process.platform!=='darwin'||systemPreferences.isTrustedAccessibilityClient(true)}};
}
module.exports={createDictation};
