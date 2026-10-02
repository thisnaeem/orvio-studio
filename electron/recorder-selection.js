const image=document.getElementById('image'),box=document.getElementById('box'),size=document.getElementById('size');let start=null,rect=null;
window.selection.image().then(value=>image.src=value);
const point=e=>({x:Math.max(0,Math.min(innerWidth,e.clientX)),y:Math.max(0,Math.min(innerHeight,e.clientY))});
document.addEventListener('pointerdown',e=>{if(e.button!==0)return;start=point(e);rect=null;document.getElementById('shade').style.display='none'});
document.addEventListener('pointermove',e=>{if(!start)return;const end=point(e);rect={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),width:Math.abs(end.x-start.x),height:Math.abs(end.y-start.y)};Object.assign(box.style,{display:'block',left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px'});size.textContent=Math.round(rect.width)+' × '+Math.round(rect.height)});
document.addEventListener('pointerup',()=>{if(rect&&rect.width>=12&&rect.height>=12)window.selection.finish({x:rect.x/innerWidth,y:rect.y/innerHeight,width:rect.width/innerWidth,height:rect.height/innerHeight});start=null});
document.addEventListener('keydown',e=>{if(e.key==='Escape')window.selection.finish(null)});
