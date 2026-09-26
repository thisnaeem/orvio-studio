// Server-only Graph API adapter. Store tokens encrypted in your service.
function graphClient({accessToken,version,fetchImpl=fetch}){
 if(!accessToken||!/^v\d+\.\d+$/.test(version||''))throw new Error('A Meta access token and Graph API version are required');
 const origin=`https://graph.facebook.com/${version}/`;
 async function request(endpoint,params={},method='GET'){
  const url=new URL(endpoint,origin);if(!url.href.startsWith(origin))throw new Error('Invalid Graph endpoint');
  const body=new URLSearchParams(params);if(method==='GET')url.search=body.toString();
  const response=await fetchImpl(url.href,{method,headers:{Authorization:`Bearer ${accessToken}`},...(method==='POST'?{body}:{}),signal:AbortSignal.timeout(20000)});
  const result=await response.json();if(!response.ok||result.error)throw new Error(`Meta request failed (${result.error?.code||response.status}). Check account permissions and token expiry.`);return result;
 }
 const id=value=>{if(!/^\d+$/.test(value||''))throw new Error('Invalid Meta ID');return value;};
 return {
  async listAccounts(){
   const accounts=[];let after;
   do{const result=await request('me/accounts',{fields:'id,name,instagram_business_account{id,username,profile_picture_url,followers_count,media_count}',limit:'100',...(after?{after}:{})});accounts.push(...(result.data||[]).filter(page=>page.instagram_business_account).map(page=>({pageId:page.id,pageName:page.name,...page.instagram_business_account})));after=result.paging?.next?result.paging?.cursors?.after:undefined;}while(after);
   return accounts;
  },
  async createImageContainer({accountId,imageUrl,caption}){
   const url=new URL(imageUrl);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Media must have a public HTTPS URL');
   if(typeof caption!=='string'||caption.length>2200)throw new Error('Caption must be at most 2,200 characters');
   return request(`${id(accountId)}/media`,{image_url:url.href,caption},'POST');
  },
  containerStatus:containerId=>request(id(containerId),{fields:'status_code,status'}),
  publishContainer:({accountId,containerId})=>request(`${id(accountId)}/media_publish`,{creation_id:id(containerId)},'POST')
 };
}
module.exports={graphClient};
