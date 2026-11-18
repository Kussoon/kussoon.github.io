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
 // One source-neutral SVG town-path binding for unprojected SVG paths.
 // The caller supplies geometry, key, label and event policy from the
 // already validated source data. Preserves original SVG path strings.
 function renderPaths({areas,records,nameOf,pathOf,ariaLabel,onSelect}) {
  if(!areas||!Array.isArray(records)||typeof nameOf!=='function'
    ||typeof pathOf!=='function'||typeof onSelect!=='function')
   throw new TypeError('Validated town records, paths and selection handler are required');
  if(ariaLabel!=null&&typeof ariaLabel!=='function')
   throw new TypeError('ariaLabel must be a function');
  // Retain the existing D3 join and attribute-setting order, including
  // data-name and aria-label, so previously verified geometry is untouched.
  const paths=areas.selectAll('path.town').data(records,nameOf).join('path')
   .attr('class','town').attr('d',pathOf).attr('data-name',nameOf);
  if(ariaLabel)paths.attr('aria-label',ariaLabel);
  paths.on('click',(event,record)=>{
   event.stopPropagation();
   onSelect(nameOf(record),event,record);
  });
  return paths;
 }
 function frame({svg,world,d3,features,width,height,padding=22,transform}){
  svg.attr('viewBox','0 0 '+width+' '+height);
  const fc={type:'FeatureCollection',features};
  const projection=d3.geoMercator().fitExtent([[padding,padding],[width-padding,height-padding]],fc);
  const path=d3.geoPath(projection);
  return {projection,path,applyWorld:()=>world.attr('transform',transform.toString())};
 }
 const api=Object.freeze({render,renderPaths,frame});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.KussoonTownSvgRender=api;
})(typeof globalThis!=='undefined'?globalThis:this);
