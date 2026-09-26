const allowedExternal = new Set(['developers.facebook.com','console.cloudinary.com','console.cloud.google.com','drive.google.com','docs.google.com','github.com','huggingface.co','studio.youtube.com']);
function externalURL(value){const url=new URL(value);if(url.protocol!=='https:'||!allowedExternal.has(url.hostname)||url.username||url.password)throw new Error('This external destination is not allowed.');return url.href;}
module.exports={externalURL};
