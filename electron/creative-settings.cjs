const {profiles,styles}=require('../runtime/creative-settings.json');
function normalizeGeneration(model,input){
 const profile=profiles[model.parameterProfile];if(!profile)throw Error('Model does not support studio parameters.');
 const number=(key,fallback,min,max,integer=false)=>{const value=input[key]===undefined||input[key]===null||input[key]===''?fallback:Number(input[key]);if(!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))throw Error(`Invalid ${key}: use ${min}–${max}.`);return value};
 const size=profile.resolutions.find(r=>r.width===Number(input.width??model.width??512)&&r.height===Number(input.height??model.height??512));if(!size)throw Error('Choose one of this model’s supported resolutions.');
 const steps=number('steps',model.steps||profile.steps.default,profile.fixedSteps?model.steps:profile.steps.min,profile.fixedSteps?model.steps:profile.steps.max,true);
 const guidance=number('guidance',model.guidance??profile.guidance.default,profile.guidance.min,profile.guidance.max);
 const negativePrompt=String(input.negativePrompt||'').trim();if(negativePrompt.length>1500)throw Error('Keep the negative prompt under 1,500 characters.');if(negativePrompt&&(!profile.negativePrompt||guidance<=1))throw Error('This model/configuration does not use negative prompts.');
 const style=styles.find(s=>s.id===(input.style||'none'));if(!style)throw Error('Choose a supported style.');
 const prompt=[String(input.prompt||'').trim(),style.prompt].filter(Boolean).join(', ');if(!prompt||prompt.length>2200)throw Error('Describe your result in up to 2,000 characters.');
 const seed=input.seed===undefined||input.seed===null||input.seed===''?require('node:crypto').randomInt(0,4294967296):number('seed',0,0,4294967295,true);
 const sampler=input.sampler||'default';if(!profile.samplers.includes(sampler))throw Error('Unsupported sampler for this model.');
 const result={prompt,seed,width:size.width,height:size.height,steps,guidance,negativePrompt,style:style.id,sampler};
 if(model.kind==='video'){result.frames=number('frames',model.frames||16,1,24,true);result.fps=number('fps',model.fps||8,1,16,true);if(!profile.frames.includes(result.frames)||!profile.fps.includes(result.fps))throw Error('Choose a supported frame count and playback rate.');}
 return result;
}
module.exports={normalizeGeneration};
