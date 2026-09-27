const fs = require('node:fs');
const path = require('node:path');
const {randomUUID} = require('node:crypto');

// Only display metadata is persisted. URLs, cookies, keys and local paths stay out.
function createDownloads({directory, notify = () => {}}) {
  const file = path.join(directory, 'download-history.json');
  let items = [];
  const cancellations = new Map();
  try { items = JSON.parse(fs.readFileSync(file, 'utf8')).slice(0, 60); } catch {}
  items = items.map(item => item.status === 'active' ? {...item, status: 'interrupted', message: 'App closed before this download finished. Start it again to continue.'} : item);
  const state = () => items.map(item => ({...item, cancellable: item.status === 'active' && cancellations.has(item.id)}));
  function publish(persist = false) {
    if (persist) {
      fs.mkdirSync(directory, {recursive: true});
      fs.writeFileSync(file + '.tmp', JSON.stringify(items));
      fs.renameSync(file + '.tmp', file);
    }
    notify(state());
  }
  function update(id, info = {}) {
    const item = items.find(item => item.id === id && item.status === 'active');
    if (!item) return;
    for (const key of ['message','stage','file','received','total','speed','eta','title','assetId']) {
      if (info[key] !== undefined) item[key] = info[key];
    }
    item.percent = Number.isFinite(item.total) && item.total > 0 && Number.isFinite(item.received) ? Math.min(100, Math.max(0, item.received / item.total * 100)) : null;
    publish();
  }
  function finish(id, status, info = {}) {
    const item = items.find(item => item.id === id && item.status === 'active');
    if (!item) return;
    update(id, info);
    Object.assign(item, {status, finishedAt: new Date().toISOString(), speed: null, eta: null, percent: status === 'completed' ? 100 : item.percent});
    cancellations.delete(id);
    publish(true);
  }
  return {
    state, queue:require('./download-queue.cjs').createDownloadQueue(3),
    begin({title, kind, modelId, cancel}) {
      const id = randomUUID();
      items.unshift({id, title, kind, modelId, status: 'active', message: 'Preparing download…', percent: null, received: 0, total: null, createdAt: new Date().toISOString()});
      items = [...items.filter(item => item.status === 'active'), ...items.filter(item => item.status !== 'active').slice(0, 60)];
      if (cancel) cancellations.set(id, cancel);
      publish(true);
      return id;
    },
    update, finish,
    cancel(id) {
      const cancel = cancellations.get(id);
      if (!cancel) throw Error('This download cannot be cancelled here.');
      update(id, {message: 'Cancelling…'});
      cancel();
    },
    clear() { items = items.filter(item => item.status === 'active'); publish(true); },
  };
}
module.exports = {createDownloads};
