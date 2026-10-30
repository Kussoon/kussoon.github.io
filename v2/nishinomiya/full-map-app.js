/* Nishinomiya 322 town-name groups, V2-only full-area label trial. */
(()=>{
'use strict';
const E=window.KussoonLabelEngine,R=window.KussoonReadableLabels,$=id=>document.getElementById(id);
const NS='http://www.w3.org/2000/svg',svg=$('map'),pointers=new Map();
let models=[],shapes=[],texts=[],selected=-1,full={x:0,y:0,w:900,h:900},view={...full},timer=0,ignoreTap=0;
const node=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
const groupedName=name=>String(name||'').replace(/[一二三四五六七八九十百]+丁目$/,'');
function arcsToRegions(topo){
 if(topo.type!=='Topology'||topo.transform||!topo.objects?.town||!Array.isArray(topo.arcs))throw Error('想定外の町域TopoJSON');
 const arcs=topo.arcs;
 const cached=new Map();
 const getArc=id=>{const k=id<0?~id:id;if(!cached.has(k))cached.set(k,arcs[k]);const points=cached.get(k);if(!points)throw Error('Arc参照エラー');return id<0?[...points].reverse():points;};
 const ring=ids=>ids.flatMap((id,j)=>getArc(id).slice(j?1:0));
 const groups=new Map();
 for(const g of topo.objects.town.geometries){
  const name=groupedName(g.properties?.S_NAME);
  if(!name)throw Error('町名がありません');
  const polys=g.type==='Polygon'?[g.arcs]:g.type==='MultiPolygon'?g.arcs:null;
  if(!polys)throw Error('未対応形状');
  if(!groups.has(name))groups.set(name,[]);
  for(const poly of polys)for(const ids of poly){const pts=ring(ids);if(pts.length>=3)groups.get(name).push(pts);}
 }
 return groups;
}
function project(groups){
 const all=[...groups.values()].flat(2);
 const c=Math.cos(34.75*Math.PI/180);
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const [lon,lat] of all){const x=lon*c,y=-lat;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
 const scale=840/Math.max(maxX-minX,maxY-minY);
 const width=(maxX-minX)*scale+60,height=(maxY-minY)*scale+60;
 const models=[...groups].map(([name,parts],i)=>{
  const rings=parts.map(part=>part.map(([lon,lat])=>[30+(lon*c-minX)*scale,30+(-lat-minY)*scale]));
  return {name,id:String(i),code:String(i),rings,box:E.bbox(rings),centroid:E.centroid(rings),polylabel:E.polylabel(rings)};
 });
 return {models,bounds:{x:0,y:0,w:width,h:height}};
}
function pathData(rings){return rings.map(r=>'M'+r.map(p=>p[0].toFixed(2)+','+p[1].toFixed(2)).join('L')+'Z').join('');}
function setView(){svg.setAttribute('viewBox',[view.x,view.y,view.w,view.h].join(' '));}
function clamp(){
 const mx=view.w*.15,my=view.h*.15;
 view.x=Math.max(full.x-mx,Math.min(full.x+full.w-view.w+mx,view.x));
 view.y=Math.max(full.y-my,Math.min(full.y+full.h-view.h+my,view.y));
}
function updateSoon(){clearTimeout(timer);timer=setTimeout(renderLabels,150);}
function zoomBy(factor,x=.5,y=.5){
 const w=Math.max(full.w/18,Math.min(full.w,view.w/factor)),h=w*full.h/full.w;
 view.x+=(view.w-w)*x;view.y+=(view.h-h)*y;view.w=w;view.h=h;clamp();setView();updateSoon();
}
function pan(dx,dy){
 const rect=svg.getBoundingClientRect();
 if(!rect.width||!rect.height)return;
 view.x-=dx*view.w/rect.width;view.y-=dy*view.h/rect.height;clamp();setView();updateSoon();
}
function select(i,scroll=false){
 selected=i;
 shapes.forEach((p,j)=>p.classList.toggle('selected',i===j));
 texts.forEach((p,j)=>p.classList.toggle('selected',i===j));
 $('selection').textContent=i<0?'町名をタップすると選択できます。':models[i].name+'（全域地図で紫色表示）';
 if(scroll){view={...full};setView();renderLabels();svg.scrollIntoView({behavior:'smooth',block:'center'});}
}
function build(){
 const layer=node('g'),textLayer=node('g',{'aria-hidden':'true'});
 shapes=models.map((m,i)=>{const p=node('path',{d:pathData(m.rings),class:'town','data-index':i,role:'button',tabindex:0,'aria-label':m.name});p.append(node('title'));p.firstChild.textContent=m.name;layer.append(p);return p;});
 texts=models.map(m=>{const t=node('text',{class:'name'});t.textContent=m.name;textLayer.append(t);return t;});
 svg.replaceChildren(layer,textLayer);
 svg.addEventListener('click',e=>{if(performance.now()<ignoreTap)return;const p=e.target.closest('.town');if(p)select(Number(p.dataset.index));});
 svg.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const p=e.target.closest('.town');if(p){e.preventDefault();select(Number(p.dataset.index));}});
 let moved=false;
 svg.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;moved=false;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});try{svg.setPointerCapture(e.pointerId);}catch(_){}});
 svg.addEventListener('pointermove',e=>{const old=pointers.get(e.pointerId);if(!old)return;const dx=e.clientX-old.x,dy=e.clientY-old.y;if(Math.abs(dx)+Math.abs(dy)>.7)moved=true;
 if(pointers.size===1)pan(dx,dy);
 else if(pointers.size===2){const other=[...pointers].find(([id])=>id!==e.pointerId)?.[1];if(other){const a=Math.hypot(old.x-other.x,old.y-other.y),b=Math.hypot(e.clientX-other.x,e.clientY-other.y),rect=svg.getBoundingClientRect();if(a>1&&b>1)zoomBy(b/a,((e.clientX+other.x)/2-rect.left)/rect.width,((e.clientY+other.y)/2-rect.top)/rect.height);pan(dx/2,dy/2);}}
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});e.preventDefault();});
 for(const kind of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(kind,e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(moved)ignoreTap=performance.now()+250;});
 svg.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();const r=svg.getBoundingClientRect();zoomBy(e.deltaY<0?1.2:1/1.2,(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);},{passive:false});
}
function renderLabels(){
 if(!models.length)return;
 const start=performance.now(),screen=svg.getBoundingClientRect(),size=E.screenPixelsToSvgUnits(Number($('font').value),view.w,screen.width||390);
 const measure=(value,font)=>[...value].length*font;
 const labels=R.planCenterFirstLabels(models,null,'kanji',size,measure,E,{anchor:$('anchor').value,shift:$('shift').value});
 for(let i=0;i<texts.length;i++){
  const label=labels[i],t=texts[i];
  t.setAttribute('x',label.x.toFixed(2));t.setAttribute('y',label.y.toFixed(2));t.setAttribute('font-size',label.size.toFixed(2));t.setAttribute('stroke-width',(label.size*.18).toFixed(2));
 }
 const inView=labels.map((l,i)=>l.x>=view.x&&l.x<=view.x+view.w&&l.y>=view.y&&l.y<=view.y+view.h?i:-1).filter(i=>i>=0);
 const stats=R.evaluateVisible(models,labels,models.map(()=>true),E,view);
 $('metrics').textContent='全町名：'+models.length+'件／画面内中心：'+inView.length+'件／ラベルの重なり（概算）：'+stats.collisions+'組／区域境界またぎ（概算）：'+stats.outside+'件。';
 $('status').textContent='拡大'+(full.w/view.w).toFixed(2)+'倍・配置'+(performance.now()-start).toFixed(0)+'ms。322町名を省略せず表示。';
}
function suggestions(){
 const q=$('find').value.trim(),box=$('suggestions');box.replaceChildren();
 if(!q){box.hidden=true;return;}
 const matches=models.map((m,i)=>({m,i})).filter(({m})=>m.name.includes(q)).slice(0,50);
 for(const {m,i} of matches){const b=document.createElement('button');b.type='button';b.textContent=m.name;b.addEventListener('click',()=>{$('find').value=m.name;box.hidden=true;select(i,true)});box.append(b);}
 box.hidden=matches.length===0;
}
for(const id of ['anchor','shift','font'])$(id).addEventListener('change',renderLabels);
$('zoom-in').addEventListener('click',()=>zoomBy(1.5));$('zoom-out').addEventListener('click',()=>zoomBy(1/1.5));
$('reset').addEventListener('click',()=>{view={...full};setView();renderLabels()});
$('clear').addEventListener('click',()=>select(-1));
$('find').addEventListener('input',suggestions);
$('find').addEventListener('keydown',e=>{if(e.key==='Escape')$('suggestions').hidden=true;if(e.key==='Enter'){e.preventDefault();const q=$('find').value.trim(),i=models.findIndex(m=>m.name===q);if(i>=0)select(i,true);}});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.finder'))$('suggestions').hidden=true;});
window.addEventListener('resize',updateSoon);
fetch('/nishinomiya/data/nishinomiya-towns.topojson').then(r=>{if(!r.ok)throw Error('町域データ HTTP '+r.status);return r.json();}).then(topo=>{
 const regions=arcsToRegions(topo);
 if(regions.size!==322)throw Error('町名グループ数が想定と異なります：'+regions.size);
 const p=project(regions);models=p.models;full=p.bounds;view={...full};setView();build();renderLabels();
}).catch(err=>{console.error(err);$('status').textContent='読込み失敗：'+err.message;});
})();