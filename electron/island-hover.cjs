// Native resize can emit a renderer mouseleave even while the pointer remains
// over the dock. Trust screen coordinates before allowing a collapse.
function keepExpanded(requested,point,bounds){
 return !!requested || (point.x>=bounds.x && point.x<bounds.x+bounds.width && point.y>=bounds.y && point.y<bounds.y+bounds.height);
}
module.exports={keepExpanded};
