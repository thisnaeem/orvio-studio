// Explicit local smoke test: uses installed weights; creates two temporary images.
const {createInferenceWorker}=require('../electron/inference-worker.cjs');
const path=require('node:path'),fs=require('node:fs'),os=require('node:os'),assert=require('node:assert/strict');
if(!process.env.ORVIO_TEST_PYTHON||!process.env.ORVIO_TEST_MODELS)throw Error('Set ORVIO_TEST_PYTHON and ORVIO_TEST_MODELS to the installed runtime and model cache.');
const worker=createInferenceWorker(),directory=fs.mkdtempSync(path.join(os.tmpdir(),'orvio-cuda-check-')),abort=new AbortController();
const timeout=setTimeout(()=>abort.abort(),300000);
(async()=>{try{for(let i=0;i<2;i++){
 const result=await worker.run(process.env.ORVIO_TEST_PYTHON,[path.resolve(__dirname,'../runtime/worker.py')],{env:{...process.env,PYTHONUNBUFFERED:'1',HF_HUB_OFFLINE:'1',HF_HUB_DISABLE_XET:'1'},input:{action:'generate_model',models:process.env.ORVIO_TEST_MODELS,model:'dreamshaper',prompt:'A ceramic vase on a wooden table',device:'gpu',width:512,height:512,steps:20,guidance:7.5,seed:42,output:path.join(directory,i+'.png')},signal:abort.signal,onProgress:()=>{},onChild:()=>{}});
 assert.equal(result.device,'cuda');assert.ok(result.peakVRAMGB>0);assert.equal(result.reusedModel,i===1);assert.ok(fs.existsSync(path.join(directory,i+'.png')));console.log(JSON.stringify(result));
}console.log('PASS: real worker IPC, CUDA generation and warm reuse. Outputs: '+directory)}finally{clearTimeout(timeout);worker.close()}})().catch(error=>{console.error(error);process.exitCode=1});
