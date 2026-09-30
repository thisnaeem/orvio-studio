const {test}=require('node:test'),assert=require('node:assert/strict');
const models=require('../runtime/models.json'),{normalizeGeneration}=require('../electron/creative-settings.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createLocalStudio}=require('../electron/local-studio.cjs');
test('image-to-image requires an effective step and rejects invalid strengths',()=>{
 for(const m of models.filter(m=>m.imageInput==='img2img')){
  const p=normalizeGeneration(m,{prompt:'Change the lighting',sourceId:'photo',seed:0});assert.equal(p.sourceId,'photo');assert.ok(p.strength*p.steps>=1);
  for(const strength of [0,2,NaN])assert.throws(()=>normalizeGeneration(m,{prompt:'Edit',sourceId:'photo',strength}),/strength/);
 }
 const turbo=models.find(m=>m.id==='sd-turbo');assert.equal(normalizeGeneration(turbo,{prompt:'Edit',sourceId:'photo',steps:1}).strength,1);
});
test('Qwen reference editing does not receive denoising strength or unsupported CFG',()=>{
 const model=models.find(m=>m.id==='qwen-image-21');const p=normalizeGeneration(model,{prompt:'Change the background',sourceId:'photo'});assert.equal(p.sourceId,'photo');assert.equal(p.strength,undefined);assert.equal(p.guidance,1);assert.throws(()=>normalizeGeneration(model,{prompt:'Edit',negativePrompt:'blur'}),/negative/);
 const video=models.find(m=>m.id==='zeroscope');assert.throws(()=>normalizeGeneration(video,{prompt:'Edit',sourceId:'photo'}),/starting image/);
});
test('reference IDs are validated before any download or subprocess',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'orvio-ref-check-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const studio=createLocalStudio({directory,resources:directory,python:'missing'});
 for(const model of ['z-image-turbo','qwen-image-21','sd-turbo'])await assert.rejects(()=>studio.generateModel({model,prompt:'Edit',sourceId:'../../outside.png'}),/local library/);
 assert.equal(studio.state().active,null);
});

test('modern profiles preserve requested dimensions without pipeline rounding',()=>{
 const profiles=require('../runtime/creative-settings.json').profiles;
 for(const m of models.filter(m=>m.engine==='modern-image'))for(const size of profiles[m.parameterProfile].resolutions){assert.equal(size.width%32,0);assert.equal(size.height%32,0);assert.equal(normalizeGeneration(m,{prompt:'Test',...size}).width,size.width)}
});
