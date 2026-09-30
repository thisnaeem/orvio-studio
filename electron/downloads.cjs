const fs = require('node:fs');
const path = require('node:path');
const {randomUUID} = require('node:crypto');

// Display history is separated from private retry sources. Cookies are never persisted here.
function createDownloads({directory, notify = () => {}}) {
  const file = path.join(directory, 'download-history.json'), sourceFile=path.join(directory,'download-sources.json');
  const retryContext=new (require('node:async_hooks').AsyncLocalStorage)(),handlers=new Map();let sources={};try{sources=JSON.parse(fs.readFileSync(sourceFile,'utf8'))}catch{}
  let items = [];
  const cancellations = new Map(),recovering=new Set();let shuttingDown=false,lastSaved=0;
  try { items = JSON.parse(fs.readFileSync(file, 'utf8')).slice(0, 60); } catch {}
  items = items.map(item => item.status === 'active' ? {...item, status: item.cancelRequested?'cancelled':item.pauseRequested?'paused':'interrupted', message: 'Waiting to resume after restart.'} : item);
  const state = () => items.map(item => ({...item, retryable:!recovering.has(item.id)&&item.status!=='active'&&item.status!=='completed'&&!!sources[item.id]&&handlers.has(sources[item.id].type), cancellable: item.status === 'active' && cancellations.has(item.id)}));
  function publish(persist = false) {
    if (persist || Date.now()-lastSaved>2000) {
      lastSaved=Date.now();
      fs.mkdirSync(directory, {recursive: true});
      fs.writeFileSync(file + '.tmp', JSON.stringify(items),{mode:0o600});
      fs.writeFileSync(sourceFile+'.tmp',JSON.stringify(sources),{mode:0o600});fs.renameSync(sourceFile+'.tmp',sourceFile);
      fs.renameSync(file + '.tmp', file);
    }
    notify(state());
  }
  function update(id, info = {}) {
    if(shuttingDown)return;
    const item = items.find(item => item.id === id && item.status === 'active');
    if (!item) return;
    for (const key of ['message','stage','progressScope','file','received','total','speed','eta','title','assetId']) {
      if (info[key] !== undefined) item[key] = info[key];
    }
    if(info.stage==='dependency'){item.message='Preparing engine…';item.total=null;item.received=0;item.speed=null;item.eta=null;}
    if(typeof info.thumbnail==='string'&&info.thumbnail.length<8192){try{const url=new URL(info.thumbnail);if(url.protocol==='https:'&&!url.username&&!url.password)item.thumbnail=url.href}catch{}}
    item.percent = Number.isFinite(item.total) && item.total > 0 && Number.isFinite(item.received) ? Math.min(item.progressScope==='model'?99.9:100, Math.max(0, item.received / item.total * 100)) : null;
    publish();
  }
  function finish(id, status, info = {}) {
    if(shuttingDown)return;
    const item = items.find(item => item.id === id && item.status === 'active');
    if (!item) return;
    if(status==='cancelled'&&item.pauseRequested){status='paused';info.message='Paused · resume when you’re ready'}
    update(id, info);
    Object.assign(item, {status, finishedAt: new Date().toISOString(), speed: null, eta: null, percent: status === 'completed' ? 100 : item.percent});
    cancellations.delete(id);
    publish(true);
  }
  return {
    state, queue:require('./download-queue.cjs').createDownloadQueue(3),
    begin({title, kind, modelId, cancel, retry}) {
      if(shuttingDown)throw Error('Orvio is closing. This download will resume next time.');
      const prior=retryContext.getStore();const id=prior&&sources[prior]?.type===retry?.type?prior:randomUUID();
      const thumbnail=items.find(item=>item.id===id)?.thumbnail;
      items=items.filter(item=>item.id!==id);if(retry)sources[id]=retry;
      items.unshift({id, title, kind, modelId, thumbnail, status: 'active', message: 'Preparing download…', percent: null, received: 0, total: null, createdAt: new Date().toISOString()});
      items = [...items.filter(item => item.status === 'active'), ...items.filter(item => item.status !== 'active').slice(0, 60)];
      if (cancel) cancellations.set(id, cancel);
      publish(true);
      return id;
    },
    update, finish,
    prepareShutdown(){shuttingDown=true;items=items.map(item=>item.status==='active'?{...item,status:item.cancelRequested?'cancelled':item.pauseRequested?'paused':'interrupted',message:'Saved for the next launch.',speed:null,eta:null}:item);publish(true)},
    async resumeInterrupted(){const pending=items.filter(item=>item.status==='interrupted'&&!recovering.has(item.id)&&sources[item.id]&&handlers.has(sources[item.id].type));return Promise.allSettled(pending.map(item=>retryContext.run(item.id,async()=>{recovering.add(item.id);try{return await handlers.get(sources[item.id].type)(sources[item.id].input)}catch(error){if(!shuttingDown){const current=items.find(i=>i.id===item.id);if(current?.status==='interrupted'){current.status='failed';current.message=error.message;publish(true)}}throw error}finally{recovering.delete(item.id)}})))},
    registerRetry(type,handler){handlers.set(type,handler)},
    async retry(id){const item=items.find(i=>i.id===id),source=sources[id];if(!item||recovering.has(id)||item.status==='active'||item.status==='completed'||!source||!handlers.has(source.type))throw Error('This download cannot be retried. Start it again from its tool.');return retryContext.run(id,()=>handlers.get(source.type)(source.input))},
    pause(id){const item=items.find(i=>i.id===id);if(!item||!cancellations.has(id))throw Error('This download cannot be paused.');item.pauseRequested=true;update(id,{message:'Pausing…'});publish(true);cancellations.get(id)()},
    cancel(id) {
      const cancel = cancellations.get(id);
      if (!cancel) throw Error('This download cannot be cancelled here.');
      const item=items.find(i=>i.id===id);if(item)item.cancelRequested=true;
      update(id, {message: 'Cancelling…'});publish(true);
      cancel();
    },
    clear() { items = items.filter(item => item.status === 'active'||item.status==='paused'||item.status==='interrupted');sources=Object.fromEntries(Object.entries(sources).filter(([id])=>items.some(item=>item.id===id)));publish(true); },
  };
}
module.exports = {createDownloads};
