const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {createStorageLocation,folders}=require('../electron/storage-location.cjs');
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'orvio-storage-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const data=path.join(root,'data'),drive=path.join(root,'drive');await fs.mkdir(data);await fs.mkdir(drive);return {root,data,drive}}
test('shared location preserves absolute model paths, partial downloads and future writes across two moves',async t=>{
 const {root,data,drive}=await fixture(t);await fs.mkdir(path.join(data,'local-studio'));await fs.writeFile(path.join(data,'local-studio','model.part'),'partial-model');
 let storage=createStorageLocation(data);await storage.choose(drive);assert.equal(storage.state().directory,data);await storage.apply();
 const target=path.join(drive,'Orvio Studio');assert.equal(storage.state().directory,target);assert.equal(await fs.readFile(path.join(data,'local-studio','model.part'),'utf8'),'partial-model');
 for(const folder of folders)assert.equal(await fs.realpath(path.join(data,folder)),await fs.realpath(path.join(target,folder)));
 await fs.writeFile(path.join(data,'file-downloads','new.bin'),'new');
 assert.equal(await fs.readFile(path.join(target,'file-downloads','new.bin'),'utf8'),'new');
 storage=createStorageLocation(data);await storage.apply();const second=path.join(root,'second');await fs.mkdir(second);await storage.choose(second);await storage.apply();
 assert.equal(await fs.readFile(path.join(data,'local-studio','model.part'),'utf8'),'partial-model');assert.equal(await fs.readFile(path.join(second,'Orvio Studio','file-downloads','new.bin'),'utf8'),'new');
 assert.equal((await fs.readdir(data)).some(name=>name.startsWith('.storage-backup-')),false);
});
test('rejects overlap and nonempty destinations, allows cancelling without moving files',async t=>{
 const {data,drive}=await fixture(t),storage=createStorageLocation(data);await assert.rejects(storage.choose(data),/outside/);
 await fs.mkdir(path.join(drive,'Orvio Studio'));await assert.rejects(storage.choose(drive),/already contains/);await fs.rmdir(path.join(drive,'Orvio Studio'));
 await storage.choose(drive);storage.cancel();await storage.apply();assert.equal(storage.state().pending,null);assert.equal(storage.state().directory,data);
});
test('recovers a copy completed before source link installation',async t=>{
 const {data,drive}=await fixture(t);await fs.mkdir(path.join(data,'local-studio'));await fs.writeFile(path.join(data,'local-studio','model.bin'),'model');
 const storage=createStorageLocation(data);await storage.choose(drive);
 // Interrupt between folders. The persisted journal must be safe to replay on launch.
 let count=0;await assert.rejects(storage.apply(()=>{if(++count===2)throw Error('simulated interruption')}),/simulated/);
 const resumed=createStorageLocation(data);await resumed.apply();assert.equal(await fs.readFile(path.join(data,'local-studio','model.bin'),'utf8'),'model');
});
