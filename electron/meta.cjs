// All Meta calls run in the main process. Tokens never enter URLs or renderer state.
const {openAsBlob}=require('node:fs');
const path=require('node:path');
function graphClient({accessToken,version,fetchImpl=fetch}){
 if(!accessToken||!/^v\d+\.\d+$/.test(version||''))throw new Error('A Meta access token and Graph API version are required');
 const origin=`https://graph.facebook.com/${version}/`;
 const id=value=>{if(!/^\d+$/.test(value||''))throw new Error('Invalid Meta ID');return value;};
 async function request(endpoint,params={},method='GET'){
  const url=new URL(endpoint,origin);if(!url.href.startsWith(origin))throw new Error('Invalid Graph endpoint');
  const body=new URLSearchParams(params);if(method==='GET')url.search=body.toString();
  const response=await fetchImpl(url.href,{method,headers:{Authorization:`Bearer ${accessToken}`},...(method==='POST'?{body}:{}),redirect:'error',signal:AbortSignal.timeout(60000)});
  const result=await response.json();if(!response.ok||result.error)throw new Error(`Meta request failed (${result.error?.code||response.status}). Check permissions and token expiry.`);return result;
 }
 return {
  async listAccounts(){const accounts=[];let after;
   do{const result=await request('me/accounts',{fields:'id,name,access_token,picture.type(square){url},instagram_business_account{id,username,profile_picture_url,followers_count,media_count}',limit:'100',...(after?{after}:{})});for(const page of result.data||[]){accounts.push({id:`fb:${page.id}`,kind:'facebook',pageId:page.id,pageName:page.name,username:page.name,pictureUrl:page.picture?.data?.url||'',pageToken:page.access_token||''});if(page.instagram_business_account){const ig=page.instagram_business_account;accounts.push({id:ig.id,kind:'instagram',pageId:page.id,pageName:page.name,username:ig.username||ig.id,pictureUrl:ig.profile_picture_url||'',followers:ig.followers_count,mediaCount:ig.media_count,pageToken:page.access_token||''});}}after=result.paging?.next?result.paging?.cursors?.after:undefined;}while(after);return accounts;
  },
  async listVideos(account){const kind=account.kind;const target=id(kind==='instagram'?account.id:account.pageId);const fields=kind==='instagram'?'id,permalink,media_type,media_url':'id,permalink_url,source';const result=await request(`${target}/${kind==='instagram'?'media':'videos'}`,{fields,limit:'100'});return (result.data||[]).filter(item=>kind==='facebook'||['VIDEO','REEL'].includes(item.media_type)).map(item=>({id:item.id,permalink:item.permalink||item.permalink_url||'',source:item.media_url||item.source||'',platform:kind}));},
  async createImageContainer({accountId,imageUrl,caption,mediaType='image'}){const url=new URL(imageUrl);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Media must have a public HTTPS URL');if(typeof caption!=='string'||caption.length>2200)throw new Error('Caption must be at most 2,200 characters');return request(`${id(accountId)}/media`,mediaType==='video'?{media_type:'REELS',video_url:url.href,caption}:{image_url:url.href,caption},'POST');},
  containerStatus:containerId=>request(id(containerId),{fields:'status_code,status'}),
  publishContainer:({accountId,containerId})=>request(`${id(accountId)}/media_publish`,{creation_id:id(containerId)},'POST'),
  publishPage:({pageId,mediaType,imageUrl,caption,title})=>request(`${id(pageId)}/${mediaType==='video'?'videos':'photos'}`,mediaType==='video'?{file_url:imageUrl,description:caption,title}:{url:imageUrl,caption},'POST'),
  async publishPagePhotoLocal({pageId,filePath,caption}){
   const body=new FormData();
   body.set('source',await openAsBlob(filePath,{type:path.extname(filePath).toLowerCase()==='.png'?'image/png':'image/jpeg'}),path.basename(filePath));
   body.set('caption',caption);
   const response=await fetchImpl(new URL(`${id(pageId)}/photos`,origin).href,{method:'POST',headers:{Authorization:`Bearer ${accessToken}`},body,redirect:'error',signal:AbortSignal.timeout(120000)});
   const result=await response.json();
   if(!response.ok||result.error)throw new Error(`Meta request failed (${result.error?.code||response.status}). Check Page posting permission and token expiry.`);
   return result;
  },
 };
}
module.exports={graphClient};
