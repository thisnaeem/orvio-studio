const manifest=require('../runtime/model-download-sizes.json');
function formatBytes(bytes){return bytes>=1e9?`${(bytes/1e9).toFixed(2)} GB`:`${(bytes/1e6).toFixed(1)} MB`}
function modelSize(model){
 const entry=manifest[model.id];
 if(entry&&Number.isSafeInteger(entry.bytes)&&entry.bytes>0)return {...model,size:formatBytes(entry.bytes)+' model files',downloadBytes:entry.bytes,sizeCheckedAt:entry.checkedAt,downloadFileCount:entry.sources.reduce((n,s)=>n+s.files.length,0),sizeNote:'Full model payload. Engine/CUDA setup is additional; cached files are reused.'};
 if(model.importedPath||model.id.startsWith('custom-'))return model;
 return {...model,size:model.engine==='video'?'Engine setup varies':'Size unavailable',sizeNote:'The current download file list could not be verified.'};
}
module.exports={modelSize,formatBytes};
