(()=>{
'use strict';
const $=id=>document.getElementById(id),svg=$('map'),status=$('status');
const W=900,H=600,NS='http://www.w3.org/2000/svg';
const root='../data/national/2026-common/';
const cache=new Map();
let manifest=null,mode='shared',serial=0;
const coord=p=>p[0].toFixed(7)+','+p[1].toFixed(7);
const key=(a,b)=>[coord(a),coord(b)].sort().join('|');
function decode(t,n){
 const raw=t.arcs[n<0?~n:n];if(!raw)throw Error('TopoJSONのアーク参照が不正です');
 let x=0,y=0;
 const out=raw.map(p=>{if(!t.transform)return p;x+=p[0];y+=p[1];return [x*t.transform.scale[0]+t.transform.translate[0],y*t.transform.scale[1]+t.transform.translate[1]];});
 return n<0?out.reverse():out;
}
function extract(t){
 const obj=t.objects?.municipalities;
 if(!obj||!Array.isArray(obj.geometries))throw Error('自治体データ形式が不正です');
 const counts=new Map(),rings=[];
 for(const g of obj.geometries){
  const polygons=g.type==='Polygon'?[g.arcs]:g.type==='MultiPolygon'?g.arcs:[];
  for(const poly of polygons)for(const ring of poly){
   rings.push(ring);
   for(const n of ring){const i=n<0?~n:n;counts.set(i,(counts.get(i)||0)+1);}
  }
 }
 const edges=new Map();
 for(const ring of rings)for(const n of ring){
  if(counts.get(n<0?~n:n)!==1)continue;
  const pts=decode(t,n);
  for(let i=1;i<pts.length;i++)if(coord(pts[i-1])!==coord(pts[i]))edges.set(key(pts[i-1],pts[i]),[pts[i-1],pts[i]]);
 }
 return edges;
}
async function topology(code){
 if(cache.has(code))return cache.get(code);
 const meta=manifest.entries.find(e=>e.pref===code);
 if(!meta)throw Error(code+'の県別データがありません');
 const res=await fetch(root+meta.source);
 if(!res.ok)throw Error('HTTP '+res.status+': '+meta.source);
 const val=await res.json();cache.set(code,val);return val;
}
function addPath(name,segments,project,box){
 let d='',count=0;
 for(const [a,b] of segments){
  if(Math.max(a[0],b[0])<box[0]||Math.min(a[0],b[0])>box[2]||
     Math.max(a[1],b[1])<box[1]||Math.min(a[1],b[1])>box[3])continue;
  const [x,y]=project(a),[u,v]=project(b);
  d+='M'+x.toFixed(2)+','+y.toFixed(2)+'L'+u.toFixed(2)+','+v.toFixed(2);count++;
 }
 if(!count)return 0;
 const el=document.createElementNS(NS,'path');el.setAttribute('class',name);el.setAttribute('d',d);svg.append(el);return count;
}
function viewport(lines){
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const [a,b] of lines)for(const p of [a,b]){minX=Math.min(minX,p[0]);minY=Math.min(minY,p[1]);maxX=Math.max(maxX,p[0]);maxY=Math.max(maxY,p[1]);}
 if(!Number.isFinite(minX))throw Error('共有する境界線が見つかりません');
 const dx=Math.max(maxX-minX,0.005),dy=Math.max(maxY-minY,0.005);
 const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 // Wide features: fit both longitude and latitude, with additional visual margin.
 const c=Math.cos(cy*Math.PI/180),span=Math.max(dx*c/W,dy/H)*1.32;
 const bw=span*W/c,bh=span*H,box=[cx-bw/2,cy-bh/2,cx+bw/2,cy+bh/2];
 const project=p=>[(p[0]-box[0])*c/span,(box[3]-p[1])/span];
 return {box,project};
}
async function render(){
 const id=++serial,pair=$('pair').value.split('-');
 status.textContent='2026年版の県別データを読み込み中です…';
 try{
  if(!manifest){
   const res=await fetch(root+'national-2026-pilot/manifest.json');
   if(!res.ok)throw Error('manifest HTTP '+res.status);
   manifest=await res.json();
   if(manifest.entries.length!==47)throw Error('対象47都道府県が揃っていません');
  }
  const [a,b]=await Promise.all(pair.map(topology));
  if(id!==serial)return;
  const A=extract(a),B=extract(b),common=[],onlyA=[],onlyB=[];
  for(const [k,coords] of A)(B.has(k)?common:onlyA).push(coords);
  for(const [k,coords] of B)if(!A.has(k))onlyB.push(coords);
  const {box,project}=viewport(common);
  svg.replaceChildren();
  const aCount=addPath(mode==='old'?'old-a':'unknown-a',mode==='old'?[...A.values()]:onlyA,project,box);
  const bCount=addPath(mode==='old'?'old-b':'unknown-b',mode==='old'?[...B.values()]:onlyB,project,box);
  if(mode==='shared')addPath('shared',common,project,box);
  $('old').setAttribute('aria-pressed',String(mode==='old'));
  $('shared').setAttribute('aria-pressed',String(mode==='shared'));
  status.textContent=pair.join('・')+'：完全一致する共有線分 '+common.length+'本。'+
   (mode==='old'?'2県の外周を別々に表示中。':'一致線分を一度だけ描画中。')+
   ' この表示範囲の外周線分：県A '+aCount+'本、県B '+bCount+'本。';
 }catch(e){if(id===serial)status.textContent='読み込み・描画に失敗しました：'+e.message;}
}
$('pair').addEventListener('change',render);
$('old').addEventListener('click',()=>{mode='old';render()});
$('shared').addEventListener('click',()=>{mode='shared';render()});
render();
})();
