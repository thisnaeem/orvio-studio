function normalizeSpatial(model,input){
 const number=(key,fallback,min,max)=>{const value=input[key]??fallback;if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error(`Choose ${key} between ${min} and ${max}.`);return value};
 const seed=number('seed',Math.floor(Math.random()*4294967296),0,4294967295);if(!Number.isInteger(seed))throw Error('Seed must be a whole number.');
 if(model.kind==='lipsync'){
  if(typeof input.sourceId!=='string'||typeof input.audioId!=='string')throw Error('Choose a portrait or video and a speech recording.');
  if(input.consent!==true)throw Error('Confirm you have permission to animate this person.');
  let box=null;if(input.box){if(!Array.isArray(input.box)||input.box.length!==4||!input.box.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1))throw Error('Choose a valid face area.');const [x,y,w,h]=input.box;if(w<.08||h<.08||x+w>1.001||y+h>1.001)throw Error('Keep the face area inside the picture.');box=input.box}
  return {seed,sourceId:input.sourceId,audioId:input.audioId,consent:true,duration:number('duration',10,1,30),box};
 }
 if(model.input==='image'&&typeof input.sourceId!=='string')throw Error('Choose an image of a single object.');
 if(model.input==='text'&&(typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>1000))throw Error('Describe one object in up to 1,000 characters.');
 const steps=number('steps',32,16,64);if(!Number.isInteger(steps))throw Error('Steps must be a whole number.');
 return {seed,steps,guidance:number('guidance',model.input==='text'?15:3,1,30),prompt:model.input==='text'?input.prompt.trim():'',sourceId:model.input==='image'?input.sourceId:undefined};
}
module.exports={normalizeSpatial};
