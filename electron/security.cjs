const allowedExternal = new Set(['developers.facebook.com','developer.paddle.com']);
function externalURL(value){const url=new URL(value);if(url.protocol!=='https:'||!allowedExternal.has(url.hostname)||url.username||url.password)throw new Error('This external destination is not allowed.');return url.href;}
function serviceURL(base,route){if(!base)throw new Error('Configure ORVIO_SERVICE_URL with your secure connection and billing service first.');const url=new URL(base);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Your service URL must use HTTPS without embedded credentials.');return new URL(route,url.origin).href;}
module.exports={serviceURL,externalURL};
