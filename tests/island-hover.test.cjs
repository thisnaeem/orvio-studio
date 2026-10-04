const {test}=require('node:test');
const assert=require('node:assert/strict');
const {keepExpanded}=require('../electron/island-hover.cjs');
const bounds={x:500,y:10,width:405,height:78};
test('resize-induced leave keeps the dock open over gaps, padding and bots',()=>{
 for(const point of [{x:501,y:11},{x:700,y:49},{x:904,y:87}])assert.equal(keepExpanded(false,point,bounds),true);
});
test('leaving any outer edge permits collapse, including negative display coordinates',()=>{
 for(const point of [{x:499,y:40},{x:905,y:40},{x:700,y:9},{x:700,y:88}])assert.equal(keepExpanded(false,point,bounds),false);
 assert.equal(keepExpanded(false,{x:-300,y:20},{x:-500,y:10,width:405,height:78}),true);
});
test('entry always expands even if pointer moved before IPC arrives',()=>assert.equal(keepExpanded(true,{x:0,y:0},bounds),true));
