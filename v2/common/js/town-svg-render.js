// Town polygon SVG renderer: generic feature binding and projection construction.
// Event behavior and local special CSS classes are injected by the municipality.
(function(root){
 'use strict';
 function render({areas,features,nameProperty='S_NAME',path,isSpecial,onSelect}){
  areas.selectAll('path.town').data(features,d=>d.properties[nameProperty]).join('path').attr('class','town')
   .classed('okada',d=>Boolean(isSpecial?.(d)))
   .attr('d',path).on('click',(event,d)=>{
    event.stopPropagation();
    onSelect(d.properties[nameProperty],event,d);
   });
 }
 function frame({svg,world,d3,features,width,height,padding=22,transform}){
  svg.attr('viewBox','0 0 '+width+' '+height);
  const fc={type:'FeatureCollection',features};
  const projection=d3.geoMercator().fitExtent([[padding,padding],[width-padding,height-padding]],fc);
  const path=d3.geoPath(projection);
  return {projection,path,applyWorld:()=>world.attr('transform',transform.toString())};
 }
 const api=Object.freeze({render,frame});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgRender=api;
})(typeof globalThis!=='undefined'?globalThis:this);
