const allowedExternal = new Set(['developers.facebook.com','console.cloudinary.com','console.cloud.google.com','drive.google.com','docs.google.com','github.com','huggingface.co','studio.youtube.com']);
function externalURL(value){const url=new URL(value);if(url.protocol!=='https:'||!allowedExternal.has(url.hostname)||url.username||url.password)throw new Error('This external destination is not allowed.');return url.href;}
function oauthExternalURL(value){
 const url=new URL(value);
 const allowed=(url.origin==='https://accounts.google.com'&&url.pathname==='/o/oauth2/v2/auth')||(url.origin==='https://openrouter.ai'&&url.pathname==='/auth');
 if(!allowed||url.username||url.password||url.hash)throw new Error('This sign-in destination is not allowed.');
 return url.href;
}
module.exports={externalURL,oauthExternalURL};
