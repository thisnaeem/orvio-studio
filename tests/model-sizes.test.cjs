const test=require('node:test'),assert=require('node:assert/strict');
const manifest=require('../runtime/model-download-sizes.json'),catalog=require('../runtime/models.json');
const {modelSize,formatBytes}=require('../electron/model-size.cjs');
test('every catalog size is the exact sum of the selected upstream files',()=>{
 for(const model of catalog){const entry=manifest[model.id];assert.ok(entry,model.id);let total=0;for(const source of entry.sources){assert.match(source.revision,/^[a-f0-9]{40}$/);const seen=new Set();for(const file of source.files){assert.ok(Number.isSafeInteger(file.bytes)&&file.bytes>=0);assert.ok(!seen.has(file.path));seen.add(file.path);total+=file.bytes}}assert.equal(entry.bytes,total,model.id);assert.equal(modelSize(model).downloadBytes,total);assert.equal(model.size,formatBytes(total)+' model files')}
});
test('multi-file chat and video include all shards and dependent models',()=>{
 assert.equal(manifest['qwen-tools'].sources[0].files.length,2);
 assert.equal(manifest.animatediff.sources.length,2);
 assert.ok(manifest['ltx-video-2b'].sources[0].files.some(f=>f.path.startsWith('text_encoder/')));
 assert.equal(modelSize({id:'unknown',engine:'diffusion',size:'~5 GB'}).size,'Size unavailable');
 assert.equal(formatBytes(1000000000),'1.00 GB');
});
test('Shap-E download plan excludes obsolete duplicate renderer and includes fp16 components',()=>{
 for(const id of ['shap-e-text','shap-e-image']){const files=manifest[id].sources[0].files;assert.ok(files.some(f=>f.path==='renderer/diffusion_pytorch_model.fp16.safetensors'));assert.ok(!files.some(f=>f.path.startsWith('shap_e_renderer/')||f.path.endsWith('.bin')))}
});
