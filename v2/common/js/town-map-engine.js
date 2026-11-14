/* Kussoon V2 town-map adapter (comparison pilot).
 * Reuses the nationwide label engine and SVG viewport; municipality data is injected.
 */
(function(global){
'use strict';
const NS='http://www.w3.org/2000/svg';
function decode(top){
  if(top.type!=='Topology'||!top.objects?.town||!Array.isArray(top.arcs)) throw Error('Invalid town TopoJSON');
  const arcs=top.arcs.map(a=>{let x=0,y=0;return a.map(p=>{x+=p[0];y+=p[1];return [x,y];});});
  const tr=top.transform;
  if(tr) for(const a of arcs) for(const p of a){p[0]=p[0]*tr.scale[0]+tr.translate[0];p[1]=p[1]*tr.scale[1]+tr.translate[1];}
  const arc=(i)=>{const a=arcs[i<0?~i:i];return i<0?a.slice().reverse().map(p=>p.slice()):a.map(p=>p.slice());};
  const rings=g=>g.arcs.flatMap(r=>{let out=[];for(const i of r){const part=arc(i);out=out.concat(out.length?part.slice(1):part);}return out;});
  const geoms=top.objects.town.geometries.map(g=>({rings:g.type==='Polygon'?g.arcs.map(r=>rings({arcs:[r]})):g.arcs.flatMap(r=>rings({arcs:[r]})),props:g.properties||{}}));
  const all=geoms.flatMap(g=>g.rings.flat());const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const sx=930/(maxX-minX),sy=570/(maxY-minY),s=Math.min(sx,sy),ox=(1000-(maxX-minX)*s)/2,oy=(650-(maxY-minY)*s)/2;
  const project=p=>[(p[0]-minX)*s+ox,650-((p[1]-minY)*s+oy)];
  const path=rings=>rings.map(r=>r.map((p,i)=>`${i?'L':'M'}${project(p)[0].toFixed(3)},${project(p)[1].toFixed(3)}`).join(' ')+'Z').join(' ');
  const features=geoms.map((g,i)=>({id:String(g.props.R2KAxx_ID||g.props.KEY_CODE||i),name:String(g.props.S_NAME||''),d:path(g.rings),rings:g.rings.map(r=>r.map(project))}));
  return {features,projectedBounds:{minX:0,minY:0,maxX:1000,maxY:650}};
}
function kanaMap(kana){
 const m=new Map((kana.entries||[]).filter(x=>x.name&&x.reading).map(x=>[x.name,KussoonReadableLabels.normalizeReading(String(x.reading).replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)))]));
 return m;
}
function create({svg,topo,kana,controls}){
 const data=decode(topo), readings=kanaMap(kana), byName=new Map();
 for(const f of data.features){if(!f.name)continue;if(!byName.has(f.name))byName.set(f.name,[]);byName.get(f.name).push(f);}
 const areas=[...byName].map(([name,parts])=>({name,parts,reading:readings.get(name)||'',ids:parts.map(p=>p.id)}));
 const shapeLayer=svg.querySelector('[data-layer="shapes"]'),labelLayer=svg.querySelector('[data-layer="labels"]');
 const paths=[];for(const f of data.features){const p=document.createElementNS(NS,'path');p.setAttribute('d',f.d);p.dataset.town=f.name;p.className.baseVal='region';p.addEventListener('click',()=>select(f.name,true));shapeLayer.append(p);paths.push(p);}
 const labelFeatures=[...byName].map(([name,parts])=>({id:name,name,d:parts.map(p=>p.d).join(' '),rings:parts.flatMap(p=>p.rings)}));
 const models=KussoonLabelEngine.buildModels(labelFeatures).models;
 const index=new Map(models.map((m,i)=>[data.features[i].id,{model:m,feature:data.features[i]}]));
 let selected='',font=16,visible=true,showReading=false;
 const viewport=KussoonV2MapViewport.init({svg,width:1000,height:650,minZoom:1,maxZoom:24,onZoomChange:renderLabels});
 viewport.setContentBounds(data.projectedBounds);
 const measure=(text,size)=>{const c=measure.canvas||(measure.canvas=document.createElement('canvas')),x=c.getContext('2d');x.font=`700 ${size}px sans-serif`;return x.measureText(text).width;};
 function renderLabels(){labelLayer.replaceChildren();if(!visible)return;const zoom=1000/viewport.view().w,size=Math.max(10,Math.min(26,font*Math.pow(zoom,.4)/Math.pow(zoom,1)));const plans=KussoonLabelEngine.planAdaptiveLabels(models,models.map(m=>m.polylabel),size,measure,{wrap:true,shrink:false});for(let i=0;i<plans.length;i++){const f=labelFeatures[i],a=areas.find(x=>x.name===f.name),p=plans[i],t=document.createElementNS(NS,'text');t.setAttribute('x',p.x);t.setAttribute('y',p.y);t.setAttribute('text-anchor','middle');t.setAttribute('dominant-baseline','middle');t.classList.add('label');t.dataset.town=f.name;t.textContent=f.name;if(showReading&&a?.reading){const s=document.createElementNS(NS,'tspan');s.classList.add('reading');s.setAttribute('x',p.x);s.setAttribute('dy','1.2em');s.textContent=a.reading;t.append(s);}t.addEventListener('click',()=>select(f.name,true));labelLayer.append(t);}}
 function select(name,zoom){selected=name;paths.forEach(p=>p.classList.toggle('active',p.dataset.town===name));const a=areas.find(x=>x.name===name);document.getElementById('selected').textContent=a?`選択：${a.name}${a.reading?'（よみ：'+a.reading+'）':'（読み仮名は未照合）'}（統計ポリゴン ${a.parts.length}件）`:'区域を選ぶと名称を表示します。';if(a&&zoom){const all=a.parts.flatMap(x=>x.rings.flat()),xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);const v=viewport.view(),w=Math.max(40,maxX-minX+80),h=w*650/1000;viewport.setView({x:(minX+maxX-w)/2,y:(minY+maxY-h)/2,w,h});}}
 function search(value){const q=value.trim();const hit=q?[...areas].filter(a=>(a.name+a.reading).includes(q)).slice(0,35):[];const box=document.getElementById('matches');box.replaceChildren();for(const a of hit){const b=document.createElement('button');b.type='button';b.textContent=a.name;b.onclick=()=>select(a.name,true);box.append(b);}document.getElementById('status').textContent=q?`${hit.length}町名一致、最大35件表示（統計区画191件）`:`町名候補 ${areas.length}件／統計ポリゴン ${data.features.length}件を表示中（2020年基準）`; }
 controls.plus.onclick=()=>viewport.zoomIn();controls.minus.onclick=()=>viewport.zoomOut();controls.reset.onclick=()=>viewport.reset();controls.smaller.onclick=()=>{font=Math.max(10,font-2);renderLabels();};controls.larger.onclick=()=>{font=Math.min(28,font+2);renderLabels();};controls.size.onclick=()=>{font=16;renderLabels();};controls.search.addEventListener('input',e=>search(e.target.value));controls.labels.addEventListener('change',e=>{visible=e.target.checked;renderLabels();});controls.readings.addEventListener('change',e=>{showReading=e.target.checked;renderLabels();});
 const town=new URLSearchParams(location.search).get('town');if(town&&areas.some(a=>a.name===town))select(town,true);renderLabels();search('');
 return {areas,features:data.features,viewport};
}
global.KussoonV2TownMap=Object.freeze({create});
})(window);
