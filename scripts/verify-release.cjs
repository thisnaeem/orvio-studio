const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const yaml=require('js-yaml');
const root=path.resolve(__dirname,'../release');
const version=require('../package.json').version;
const sums=[];
for(const name of ['latest.yml','latest-mac.yml']){
 const metadata=yaml.load(fs.readFileSync(path.join(root,name),'utf8'));
 if(metadata.version!==version)throw new Error(`${name}: version mismatch`);
 if(!metadata.files?.length)throw new Error(`${name}: no artifacts`);
 for(const entry of metadata.files){
  if(path.basename(entry.url)!==entry.url)throw new Error('Unexpected artifact path');
  const data=fs.readFileSync(path.join(root,entry.url));
  if(data.length!==entry.size)throw new Error(`${entry.url}: size mismatch`);
  if(crypto.createHash('sha512').update(data).digest('base64')!==entry.sha512)throw new Error(`${entry.url}: SHA-512 mismatch`);
  console.log(`Verified ${entry.url} (${data.length} bytes)`);
 }
}
for(const name of fs.readdirSync(root).filter(name=>/\.(exe|dmg|zip|blockmap|yml)$/.test(name)&&!name.startsWith('builder-')).sort()){
 const data=fs.readFileSync(path.join(root,name));sums.push(`${crypto.createHash('sha256').update(data).digest('hex')}  ${name}`);
}
fs.writeFileSync(path.join(root,'SHA256SUMS.txt'),sums.join('\n')+'\n');
console.log('Saved SHA256SUMS.txt');
