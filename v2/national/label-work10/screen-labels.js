/* Work(10) label-only candidate. One CSS-pixel layout for national/prefecture
 * views; geometry, index, viewport, selection and office engines are reused.
 * Not imported by the official page. No municipality-specific overrides.
 */
(function(global){'use strict';
const NS='http://www.w3.org/2000/svg',FAMILY='"Hiragino Sans","Yu Gothic",Meiryo,sans-serif';
function frameFor(view,width,height){
 const ratio=Math.min(width/view.w,height/view.h);
 if(!(ratio>0)||!Number.isFinite(ratio))throw Error('Invalid label frame');
 return {ratio,width,height,view,ox:(width-view.w*ratio)/2,oy:(height-view.h*ratio)/2};
}
function screen(point,f){return [(point[0]-f.view.x)*f.ratio+f.ox,(point[1]-f.view.y)*f.ratio+f.oy];}
// Reuse the regional study map's bounded screen-size principle, not its offsets.
function fontSize(zoom,selected=false){return Math.round(Math.min(18,(selected?16:15)*Math.pow(Math.max(1,zoom),Math.log2(1.6)))*2)/2;}
function spec(model,size,readings,measure){
 const L=global.KussoonAdministrativeLabels,R=global.KussoonNationalReadings;
 let rows;
 if(readings&&model.readingParts?.length&&model.readingParts.every(p=>p.reading)){
  const g=R.geometry(model,size,(text,font)=>measure(text,font,850));
  rows=g.rows.map((r,i)=>({text:r.text,font:g.rowSizes[i],y:g.positions[i],weight:r.kind==='reading'?700:850,kind:r.kind}));
 }else{const pair=L.rows(model);rows=(pair||[model.fullName||model.labelName||model.name]).map((text,i)=>({text,font:size,y:pair?(i?size*.58:-size*.58):0,weight:850,kind:'name'}));}
 const width=Math.max(...rows.map(r=>measure(r.text,r.font,r.weight)+r.font*.36))+2;
 const top=Math.min(...rows.map(r=>r.y-r.font*.84-r.font*.18));
 const bottom=Math.max(...rows.map(r=>r.y+r.font*.84+r.font*.18));
 return {rows,width,height:bottom-top,top,bottom,size};
}
const overlaps=(a,b,gap=1)=>a.x1<b.x2+gap&&a.x2+gap>b.x1&&a.y1<b.y2+gap&&a.y2+gap>b.y1;
function layout(models,f,{selected='',readings=false,measure,inside=()=>false,declutter=true}={}){
 const zoom=850/f.view.w,active=[];
 for(const m of models){const [x,y]=screen(m.point,f);if(x<0||x>f.width||y<0||y>f.height)continue;active.push({m,x,y});}
 active.sort((a,b)=>(b.m.code===selected)-(a.m.code===selected)||((a.m.box?.w||1)*(a.m.box?.h||1)-(b.m.box?.w||1)*(b.m.box?.h||1))||a.m.code.localeCompare(b.m.code));
 const placed=[],grid=new Map(),cell=64,hidden=[];
 function cells(b){const keys=[];for(let x=Math.floor((b.x1-1)/cell);x<=Math.floor((b.x2+1)/cell);x++)for(let y=Math.floor((b.y1-1)/cell);y<=Math.floor((b.y2+1)/cell);y++)keys.push(x+','+y);return keys;}
 for(const a of active){const s=spec(a.m,fontSize(zoom,a.m.code===selected),readings,measure),offsets=[[0,0]];
  if(a.m.rings)for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1],[-1,1],[1,1]])offsets.push([dx*8,dy*8]);
  let accepted=null;
  for(const [dx,dy] of offsets){const x=a.x+dx,y=a.y+dy,b={x1:x-s.width/2,x2:x+s.width/2,y1:y+s.top,y2:y+s.bottom};
   if(declutter&&(b.x1<0||b.x2>f.width||b.y1<0||b.y2>f.height))continue;
   if((dx||dy)&&!inside(a.m,[a.m.point[0]+dx/f.ratio,a.m.point[1]+dy/f.ratio]))continue;
   const keys=cells(b),neighbors=new Set(keys.flatMap(k=>grid.get(k)||[]));if(declutter&&[...neighbors].some(i=>overlaps(b,placed[i].box)))continue;
   accepted={model:a.m,x,y,spec:s,box:b,offset:[dx,dy]};const i=placed.length;placed.push(accepted);for(const k of keys){if(!grid.has(k))grid.set(k,[]);grid.get(k).push(i);}break;
  }
  if(!accepted)hidden.push(a.m.code);
 }
 return {placed,hidden,eligible:active.length,total:models.length};
}
function create({map,viewport,readings,selected,onCount,declutter=()=>true}){
 let models=[],mode='',layer=null,visible=new Set(),last=null,updates=0,maxMs=0,preparationMs=0,sourceKey=null;
 const pointers=new Set(),nodes=new Map(),widths=new Map(),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 const make=(name,attrs={})=>{const el=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el;};
 function measure(text,size,weight){const key=text+'|'+size.toFixed(3)+'|'+weight;if(!widths.has(key)){if(widths.size>=12000)widths.delete(widths.keys().next().value);ctx.font=weight+' '+size+'px '+FAMILY;const m=ctx.measureText(text);widths.set(key,Math.max(m.width,(m.actualBoundingBoxLeft||0)+(m.actualBoundingBoxRight||0)));}return widths.get(key);}
 function update(){
  if(!models.length){if(layer)layer.setAttribute('display','none');onCount?.(0,0,0);return;}
  const start=performance.now(),f=frameFor(viewport.view(),map.clientWidth,map.clientHeight);
  if(!layer){layer=make('g',{'data-screen-labels':'',style:'font-family:'+FAMILY,'pointer-events':'none'});}
  // Root viewBox can change at every input event. Undo its scale synchronously;
  // every coordinate, glyph, stroke and collision box below uses CSS pixels.
  layer.setAttribute('transform','translate('+(f.view.x-f.ox/f.ratio)+' '+(f.view.y-f.oy/f.ratio)+') scale('+(1/f.ratio)+')');layer.removeAttribute('display');if(layer.parentNode!==map)map.append(layer);
  const result=layout(models,f,{selected:selected(),readings:readings(),declutter:declutter(),measure,inside:(m,p)=>global.KussoonLabelEngine.isInside(p[0],p[1],m.rings)}),next=new Set();
  for(const p of result.placed){const code=p.model.code;let text=nodes.get(code);if(!text){text=make('text',{'data-screen-code':code,'data-national-code':code,'data-code':code,'text-anchor':'middle','dominant-baseline':'central',fill:'#193e58',stroke:'#fff','paint-order':'stroke','stroke-linejoin':'round',style:'cursor:pointer;pointer-events:auto'});nodes.set(code,text);layer.append(text);}next.add(code);text.removeAttribute('display');text.setAttribute('x',p.x);text.setAttribute('y',p.y);text.setAttribute('aria-label',p.model.fullName||p.model.name);
   let spans=[...text.children];if(spans.length!==p.spec.rows.length||spans.some((s,i)=>s.textContent!==p.spec.rows[i].text)){spans=p.spec.rows.map(r=>{const t=make('tspan');t.textContent=r.text;return t;});text.replaceChildren(...spans);}
   spans.forEach((span,i)=>{const r=p.spec.rows[i];for(const [k,v] of Object.entries({x:p.x,y:p.y+r.y,'font-size':r.font,'font-weight':r.weight,'stroke-width':r.font*.18,'data-kind':r.kind}))span.setAttribute(k,v);});
  }
  for(const code of visible)if(!next.has(code))nodes.get(code).setAttribute('display','none');visible=next;trim();last=result;updates++;maxMs=Math.max(maxMs,performance.now()-start);onCount?.(result.placed.length,models.length,result.hidden.length);
 }
 function setModels(next,labelMode){models=next;mode=labelMode;update();}
 function setRegions(regions,project){
  const key={geometry:regions[0]?.polys,project};
  if(!sourceKey||sourceKey.geometry!==key.geometry||sourceKey.project!==key.project){const start=performance.now(),seeds=regions.map(r=>global.KussoonV2EstablishedLabelAdapter.modelFor(r,project)).filter(Boolean),built=global.KussoonLabelEngine.buildModels(seeds).models;
   const anchors=global.KussoonReadableLabels.planCenterFirstLabels(built,null,'kanji',1,(t,s)=>measure(t,s,850),global.KussoonLabelEngine,{anchor:'balanced',shift:'none'});
   sourceKey={...key,geometryModels:built.map((m,i)=>({code:seeds[i].code,point:[anchors[i].x,anchors[i].y],rings:m.rings,box:m.box}))};preparationMs=performance.now()-start;
  }
  const names=new Map(regions.map(r=>{const formal=r.labelName||r.fullName||r.name;return [r.code,{...r,name:formal,labelName:formal,fullName:formal}];}));setModels(sourceKey.geometryModels.map(m=>({...names.get(m.code),...m})),'prefecture');
 }
 function trim(){if(pointers.size)return;for(const [code,node] of nodes){if(nodes.size<=Math.max(256,visible.size))break;if(!visible.has(code)){node.remove();nodes.delete(code);}}}function press(e){pointers.add(e.pointerId);}function release(e){pointers.delete(e.pointerId);trim();}map.addEventListener('pointerdown',press);global.addEventListener('pointerup',release,true);global.addEventListener('pointercancel',release,true);
 const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(update):null;ro?.observe(map);
 const observer=new MutationObserver(()=>{if(layer&&layer.parentNode!==map)update();});observer.observe(map,{childList:true});
 return Object.freeze({update,setModels,setRegions,clear(){models=[];mode='';for(const code of visible)nodes.get(code).setAttribute('display','none');visible.clear();last=null;update();},snapshot:()=>({mode,total:models.length,visible:visible.size,hidden:last?.hidden||[],updates,maxMs,preparationMs,nodes:nodes.size,measurements:widths.size}),anchors:()=>models.map(m=>({code:m.code,point:m.point.slice()})),boxes:()=>last?.placed.map(p=>({code:p.model.code,...p.box,offset:p.offset,rows:p.spec.rows}))||[],destroy(){map.removeEventListener('pointerdown',press);global.removeEventListener('pointerup',release,true);global.removeEventListener('pointercancel',release,true);ro?.disconnect();observer.disconnect();layer?.remove();}});
}
global.KussoonScreenLabels=Object.freeze({frameFor,screen,fontSize,spec,layout,overlaps,create});
})(window);
