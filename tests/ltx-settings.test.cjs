const {test}=require('node:test'),assert=require('node:assert/strict');
const {normalizeGeneration}=require('../electron/creative-settings.cjs');
const models=require('../runtime/models.json').filter(m=>m.engine==='ltx');
test('LTX duration and frame rate are supported without lifting legacy video limits',()=>{
 for(const model of models){const input=normalizeGeneration(model,{prompt:'A lake',frames:97,fps:24,sourceId:'local-image'});assert.equal(input.frames,97);assert.equal(input.fps,24);assert.equal(input.sourceId,'local-image');assert.throws(()=>normalizeGeneration(model,{prompt:'A lake',frames:24}),/frame/)}
 const legacy=require('../runtime/models.json').find(m=>m.id==='zeroscope');assert.throws(()=>normalizeGeneration(legacy,{prompt:'A lake',frames:97}),/frames/);
});
test('distilled checkpoint enforces its eight-step schedule and disables CFG controls',()=>{
 const model=models.find(m=>m.parameterProfile==='ltx-distilled');assert.throws(()=>normalizeGeneration(model,{prompt:'A lake',steps:30}),/steps/);assert.throws(()=>normalizeGeneration(model,{prompt:'A lake',negativePrompt:'blur'}),/negative/);assert.equal(normalizeGeneration(model,{prompt:'A lake'}).guidance,1);
});
