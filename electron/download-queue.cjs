function createDownloadQueue(limit = 3) {
  let running = 0;
  const waiting = [], locks = new Map();
  function pump() {
    while (running < limit && waiting.length) {
      const job = waiting.shift();
      job.signal?.removeEventListener('abort', job.cancel);
      if (job.signal?.aborted) { job.reject(Error('Cancelled')); continue; }
      running++;
      Promise.resolve().then(job.work).then(job.resolve, job.reject).finally(() => { running--; pump(); });
    }
  }
  return {
    run(work, signal) {
      return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(Error('Cancelled'));
        const job = {work: require('node:async_hooks').AsyncResource.bind(work), signal, resolve, reject, cancel: null};
        job.cancel = () => { const index = waiting.indexOf(job); if(index >= 0) {waiting.splice(index,1);reject(Error('Cancelled'));} };
        signal?.addEventListener('abort', job.cancel, {once:true});
        waiting.push(job); pump();
      });
    },
    async lock(key, work) {
      const previous = locks.get(key) || Promise.resolve();
      let unlock;
      const pending = new Promise(resolve => { unlock = resolve; });
      locks.set(key, pending);
      await previous;
      try { return await work(); }
      finally { unlock(); if(locks.get(key) === pending) locks.delete(key); }
    },
  };
}
module.exports = {createDownloadQueue};
