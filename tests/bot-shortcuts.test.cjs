const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {bots,parseBotArgs,validateBot,ico,icns,createBotShortcuts}=require('../electron/bot-shortcuts.cjs');
test('shortcut routes accept only known bot IDs',()=>{
 for(const id of Object.keys(bots)){assert.equal(parseBotArgs(['app','--orvio-bot='+id]),id);assert.equal(validateBot(id),id)}
 for(const id of ['../../bad','constructor','__proto__','chat --evil','']){assert.equal(parseBotArgs(['--orvio-bot='+id]),null);assert.throws(()=>validateBot(id))}
 assert.equal(parseBotArgs([]),null);
});
test('native icon containers preserve PNG and correct offsets',()=>{
 const png=Buffer.from('PNG payload');const win=ico(png),mac=icns(png);
 assert.equal(win.readUInt16LE(2),1);assert.equal(win.readUInt32LE(18),22);assert.equal(win.readUInt32LE(14),png.length);assert.deepEqual(win.subarray(22),png);
 assert.equal(mac.toString('ascii',0,4),'icns');assert.equal(mac.readUInt32BE(4),mac.length);assert.equal(mac.toString('ascii',8,12),'ic09');assert.deepEqual(mac.subarray(16),png);
});
async function fixture(t,platform){const root=await fs.mkdtemp(path.join(os.tmpdir(),'orvio-shortcut-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));let writes=[];const png=Buffer.from('avatar');const image={isEmpty:()=>false,resize:()=>image,toPNG:()=>png};const options={platform,executable:"/Applications/Creator's $ Studio/Orvio",app:{isPackaged:true,getPath:()=>root},dialog:{showOpenDialog:async()=>({canceled:false,filePaths:[root]})},nativeImage:{createFromPath:()=>image},shell:{writeShortcutLink:(...args)=>{writes.push(args);return true}}};return {root,options,writes,service:createBotShortcuts(options)}}
test('Windows shortcut targets selected bot and its persistent custom icon',async t=>{const f=await fixture(t,'win32');const result=await f.service.create('studio');assert.ok(result.path.endsWith('Prisma — Orvio.lnk'));const [file,op,details]=f.writes[0];assert.equal(file,result.path);assert.equal(op,'create');assert.equal(details.args,'--orvio-bot=studio');assert.equal(details.target,f.options.executable);assert.ok((await fs.readFile(details.icon)).length>22)});
test('macOS launcher has executable, icon and safely quoted target; refuses overwrite',async t=>{const f=await fixture(t,'darwin');const result=await f.service.create('voice');const root=path.join(result.path,'Contents');const script=await fs.readFile(path.join(root,'MacOS/launch'),'utf8');assert.ok(script.includes("Creator'\\''s $ Studio"));assert.ok(script.includes("'--orvio-bot=voice'"));assert.equal((await fs.stat(path.join(root,'MacOS/launch'))).mode&0o111,0o111);assert.match(await fs.readFile(path.join(root,'Info.plist'),'utf8'),/com.orvio.shortcut.voice/);assert.ok((await fs.stat(path.join(root,'Resources/bot.icns'))).size>16);await assert.rejects(()=>f.service.create('voice'),/already exists/)});
test('Linux launcher quotes executable and carries avatar icon',async t=>{const f=await fixture(t,'linux');const result=await f.service.create('seo');const text=await fs.readFile(result.path,'utf8');assert.match(text,/--orvio-bot=seo/);assert.match(text,/\\\$ Studio/);assert.match(text,/Icon=.*seo.png/);assert.equal((await fs.stat(result.path)).mode&0o111,0o111)});
test('cancellation and development mode do not write launchers',async t=>{const f=await fixture(t,'win32');f.options.dialog.showOpenDialog=async()=>({canceled:true,filePaths:[]});assert.equal(await f.service.create('chat'),null);assert.equal(f.writes.length,0);f.options.app.isPackaged=false;await assert.rejects(()=>f.service.create('chat'),/installed Orvio/)});
