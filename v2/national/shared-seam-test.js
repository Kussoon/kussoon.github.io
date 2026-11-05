/* S39: old per-pref vs one nationwide common-arc candidate at the SAME camera.
 * Standalone diagnostic, no shared production renderer or data modifications.
 */
(()=>{'use strict';
const W=850,H=700,NS='http://www.w3.org/2000/svg';
const $=id=>document.getElementById(id),map=$('map'),status=$('status');
const pairOptions=new Set(['04-07','27-28','27-29','43-44']);
const viewport=KussoonV2MapViewport.init({svg:map,width:W,height:H,maxZoom:256,onZoomChange:x=>{$('zoom').textContent=x.toFixed(1)+'倍';}});
$('plus').onclick=()=>viewport.zoomIn();$('minus').onclick=()=>viewport.zoomOut();$('reset').onclick=()=>viewport.reset();
let manifest=null,current=null,serial=0,mode='old';
const flat=t=>{
 let x=0,y=0;
 return t.arcs.map(arc=>{x=0;y=0;return arc.map(p=>{
  if(!t.transform)return [p[0],p[1]];
  x+=p[0];y+=p[1];return [x*t.transform.scale[0]+t.transform.translate[0],y*t.transform.scale[1]+t.transform.translate[1]];
 });});
};
function bboxOf(arcs){
 let x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;
 for(const a of arcs)for(const p of a){x1=Math.min(x1,p[0]);y1=Math.min(y1,p[1]);x2=Math.max(x2,p[0]);y2=Math.max(y2,p[1]);}
 return [x1,y1,x2,y2];
}
const ix=id=>id<0?~id:id;
function ringPath(ids,arcs,project){
 let d='',last=null,start=null;
 for(const [j,id] of ids.entries()){
  const arc=arcs[ix(id)];if(!arc)throw Error('欠落アーク '+id);
  for(let i=0;i<arc.length;i++){
   if(j>0&&i===0)continue;
   const original=arc[id<0?arc.length-1-i:i],p=project(original),v=p[0].toFixed(3)+','+p[1].toFixed(3);
   if(!start)start=v;
   if(v===last)continue;
   d+=(d?'L':'M')+v;last=v;
  }
 }
 return d+'Z';
}
function polygonPath(geom,arcs,project){
 const polys=geom.type==='Polygon'?[geom.arcs]:geom.arcs;
 if(!polys)throw Error('未対応の区域形状');
 return polys.map(poly=>poly.map(ring=>ringPath(ring,arcs,project)).join('')).join('');
}
function buildScene(pack,project){
 const fragment=document.createDocumentFragment(),seen=new Set();
 let landCount=0,edgeCount=0,outline='';
 const fmt=p=>p[0].toFixed(3)+','+p[1].toFixed(3);
 for(const [j,topo] of pack.topologies.entries()){
  const g=topo.objects?.municipalities?.geometries||[];
  const arcs=pack.decoded[j];
  for(const region of g){
   const path=document.createElementNS(NS,'path');
   path.setAttribute('class','land'+(j?' other':''));
   path.setAttribute('d',polygonPath(region,arcs,project));
   fragment.append(path);landCount++;
  }
  for(const arc of arcs){
   for(let i=1;i<arc.length;i++){
    const a=fmt(project(arc[i-1])),b=fmt(project(arc[i]));
    if(a===b)continue;
    const id=a<b?a+'|'+b:b+'|'+a;
    if(seen.has(id))continue;
    seen.add(id);outline+='M'+a+'L'+b;edgeCount++;
   }
  }
 }
 const border=document.createElementNS(NS,'path');border.setAttribute('class','borders');border.setAttribute('d',outline);fragment.append(border);
 return {fragment,landCount,edgeCount};
}
async function fetchTopo(url){
 const response=await fetch(url);if(!response.ok)throw Error(url+' HTTP '+response.status);
 const raw=await response.text();const topo=JSON.parse(raw);
 if(topo.type!=='Topology'||!Array.isArray(topo.arcs)||!Array.isArray(topo.objects?.municipalities?.geometries))throw Error('Topology形式不正：'+url);
 return {topo,bytes:new TextEncoder().encode(raw).length};
}
async function loadPack(pair,kind,items){
 const list=await Promise.all(items.map(pref=>{
  const path=kind==='old'?manifest.entries.find(e=>e.pref===pref)?.source:null;
  if(kind==='old'&&!path)throw Error('旧版の県データがありません：'+pref);
  const src=kind==='old'?'../data/national/2026-common/'+path:'../data/national/2026-shared-preview/'+pref+'.topojson';
  return fetchTopo(src);
 }));
 return {topologies:list.map(x=>x.topo),decoded:list.map(x=>flat(x.topo)),bytes:list.reduce((n,x)=>n+x.bytes,0)};
}
function projectFor(packs){
 const bounds=packs.flatMap(pack=>pack.decoded.map(bboxOf));
 const left=Math.min(...bounds.map(b=>b[0])),right=Math.max(...bounds.map(b=>b[2]));
 const south=Math.min(...bounds.map(b=>b[1])),north=Math.max(...bounds.map(b=>b[3]));
 const centerLon=(left+right)/2,centerLat=(south+north)/2,cos=Math.cos(centerLat*Math.PI/180);
 const spanX=Math.max(.01,(right-left)*cos),spanY=Math.max(.01,north-south);
 const scale=Math.min((W-38)/spanX,(H-42)/spanY);
 return p=>[W/2+(p[0]-centerLon)*cos*scale,H/2-(p[1]-centerLat)*scale];
}
function updateButtons(){
 $('old').setAttribute('aria-pressed',String(mode==='old'));
 $('new').setAttribute('aria-pressed',String(mode==='new'));
}
async function show(){
 if(!current)return;
 const pack=current[mode],start=performance.now();
 const scene=buildScene(pack,current.project);map.replaceChildren(scene.fragment);
 status.textContent=(mode==='old'?'旧・県別データ':'新・全国共通境界')+'：'+scene.landCount+'区域／'+scene.edgeCount.toLocaleString('ja-JP')+'線分・データ約'+(pack.bytes/1048576).toFixed(2)+'MiB／描画 '+Math.round(performance.now()-start)+'ms';
 updateButtons();
}
async function changePair(){
 const value=$('pair').value;
 if(!pairOptions.has(value))return;
 const id=++serial,parts=value.split('-');status.textContent='旧版と共通境界データを読み込み中です…';
 $('pair').disabled=true;$('old').disabled=true;$('new').disabled=true;
 try{
  if(!manifest){
   const res=await fetch('../data/national/2026-common/national-2026-pilot/manifest.json');
   if(!res.ok)throw Error('全国マニフェストの取得に失敗');
   manifest=await res.json();
  }
  const [oldPack,newPack]=await Promise.all([loadPack(value,'old',parts),loadPack(value,'new',parts)]);
  if(id!==serial)return;
  current={old:oldPack,new:newPack,project:projectFor([oldPack,newPack])};mode='old';
  viewport.setContentBounds({minX:-W,minY:-H,maxX:W*2,maxY:H*2});
  viewport.reset();await show();
 }catch(e){status.textContent='比較データを取得できません：'+e.message;console.error(e);}
 finally{$('pair').disabled=false;$('old').disabled=false;$('new').disabled=false;}
}
$('old').onclick=async()=>{mode='old';await show();};
$('new').onclick=async()=>{mode='new';await show();};
$('pair').onchange=changePair;
changePair();
})();
