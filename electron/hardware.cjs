const os = require('node:os');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const execute = promisify(execFile);
const GB = 1024 ** 3;
function baseHardware() {
  return {ramGB:Math.round(os.totalmem()/GB),freeGB:Number((os.freemem()/GB).toFixed(1)),cpu:os.cpus()[0]?.model||'Unknown processor',threads:os.cpus().length,platform:process.platform,arch:process.arch,gpus:[],detected:false};
}
async function detectHardware(app) {
  const result = baseHardware();
  try {
    const info = await app.getGPUInfo('complete');
    result.gpus = (info.gpuDevice||[]).map(gpu=>({name:gpu.deviceString||gpu.driverVendor||'Graphics adapter',vendorId:gpu.vendorId,active:!!gpu.active,vramGB:null}));
  } catch {}
  if(process.platform==='darwin') {
    try {
      const {stdout} = await execute('/usr/sbin/system_profiler',['SPDisplaysDataType','-json'],{timeout:10000,maxBuffer:1024*1024});
      const info = JSON.parse(stdout);
      result.gpus=(info.SPDisplaysDataType||[]).map(gpu=>({name:gpu.sppci_model||gpu._name||'Apple graphics',active:true,unified:process.arch==='arm64',vramGB:null}));
    } catch {}
  } else {
    try {
      const {stdout} = await execute('nvidia-smi',['--query-gpu=name,memory.total','--format=csv,noheader,nounits'],{timeout:5000,windowsHide:true});
      const nvidia=stdout.trim().split('\n').map(line=>{const parts=line.split(',');return {name:parts[0].trim(),vramGB:Number((Number(parts[1])/1024).toFixed(1)),active:true}});
      if(nvidia.length)result.gpus=[...nvidia,...result.gpus.filter(g=>!/nvidia/i.test(g.name))];
    } catch {}
  }
  result.detected=true;
  return result;
}
function recommendation(model, hardware) {
  const ram=model.ramGB||4;
  if(hardware.ramGB<ram)return {level:'heavy',label:'More memory recommended',detail:`About ${ram} GB system memory is suggested; this PC has ${hardware.ramGB} GB. Loading may fail or cause swapping.`};
  const apple=hardware.platform==='darwin'&&hardware.arch==='arm64';
  if(['lipsync','3d'].includes(model.kind))return {level:'slow',label:'Heavy local generation',detail:'Uses CUDA when available in the installed engine, otherwise CPU. Apple Metal is not used by these pipelines. Try a short job first; detection alone does not guarantee GPU acceleration.'};
  if(model.kind==='chat')return {level:ram<=hardware.ramGB*.65?'good':'tight',label:ram<=hardware.ramGB*.65?'Good starting choice':'Tight memory fit',detail:apple?'Can use Apple Metal acceleration. Benchmark to measure speed.':'The included chat engine runs on CPU. Smaller models respond faster; GPU detection does not imply acceleration.'};
  if(model.kind==='image'||model.kind==='video')return {level:apple&&hardware.ramGB>=ram+4?'good':'slow',label:apple&&hardware.ramGB>=ram+4?'Suitable for a benchmark':'Expect slower generation',detail:apple?'Uses Apple Metal where supported. Keep other memory-heavy apps closed.':'Uses CUDA only if the installed runtime supports your GPU; otherwise CPU. Video generation can be very slow. Benchmark before planning large jobs.'};
  return {level:model.engine==='chatterbox'?'slow':'good',label:model.engine==='chatterbox'?'Cloning takes more time':'Lightweight voice model',detail:model.engine==='chatterbox'?'Runs on CPU with a multi-GB model. A short script is a useful first benchmark.':'Designed for local CPU speech. Download once, then generate offline.'};
}
module.exports={baseHardware,detectHardware,recommendation};
