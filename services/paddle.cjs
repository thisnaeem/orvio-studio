// Server-only helpers. Never bundle Paddle secrets in Electron or the renderer.
const {createHmac,timingSafeEqual}=require('node:crypto');
function verifyPaddleWebhook(rawBody,signature,secret,now=Math.floor(Date.now()/1000)){
 if(!secret||!signature||!(Buffer.isBuffer(rawBody)||typeof rawBody==='string'))throw new Error('Missing webhook verification input');
 const fields=signature.split(';').map(x=>x.trim().split('='));
 const timestamp=fields.find(([key])=>key==='ts')?.[1];
 if(!/^\d+$/.test(timestamp||'')||Math.abs(now-Number(timestamp))>5)throw new Error('Expired or invalid webhook timestamp');
 const expected=createHmac('sha256',secret).update(timestamp+':').update(rawBody).digest();
 const valid=fields.filter(([key])=>key==='h1').some(([,value])=>/^[0-9a-f]{64}$/i.test(value||'')&&timingSafeEqual(expected,Buffer.from(value,'hex')));
 if(!valid)throw new Error('Invalid Paddle signature');
 return JSON.parse(rawBody.toString());
}
function subscriptionState(event,priceId){
 if(!priceId)throw new Error('A Studio Pro price ID is required');
 if(!event.event_type?.startsWith('subscription.'))return null;
 const subscription=event.data;
 const studioPrice=subscription.items?.some(item=>item.price?.id===priceId);
 return {eventId:event.event_id,occurredAt:event.occurred_at,subscriptionId:subscription.id,customerId:subscription.customer_id,status:subscription.status,entitled:Boolean(studioPrice&&['active','trialing'].includes(subscription.status)),nextBilledAt:subscription.next_billed_at};
}
async function createCheckout({apiKey,priceId,workspaceId,sandbox=true,fetchImpl=fetch}){
 if(!apiKey||!priceId||!workspaceId)throw new Error('Missing Paddle checkout configuration');
 const base=sandbox?'https://sandbox-api.paddle.com':'https://api.paddle.com';
 // workspaceId must come from an authenticated server session, never trust a client-supplied tenant.
 const response=await fetchImpl(base+'/transactions',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({items:[{price_id:priceId,quantity:1}],collection_mode:'automatic',custom_data:{workspace_id:workspaceId}}),signal:AbortSignal.timeout(15000)});
 const result=await response.json();if(!response.ok)throw new Error(`Paddle checkout failed (${response.status})`);
 if(!result.data?.checkout?.url)throw new Error('Configure an approved default payment link in Paddle');
 const url=new URL(result.data.checkout.url);if(url.protocol!=='https:')throw new Error('Paddle checkout requires HTTPS');return url.href;
}
module.exports={verifyPaddleWebhook,subscriptionState,createCheckout};
