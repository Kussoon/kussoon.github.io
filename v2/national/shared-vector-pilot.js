/* V2 Osaka/Nara vector-topology comparison. Trial only.
 * The original 2021 simplified data and the live map are never modified.
 * polygon-clipping 0.15.7: boolean polygon operations.
 * turf 7.2.0: geographically calibrated 350-meter buffer.
 */
(()=>{
'use strict';
const NS='http://www.w3.org/2000/svg';
const $=id=>document.getElementById(id);
const map=$('map'),status=$('status'),areaSelect=$('area'),selectionSelect=$('selection');
const originalButton=$('original'),sharedButton=$('shared');
const BOX={
 sango:[135.595,34.535,135.765,34.681],
 taishi:[135.585,34.47,135.765,34.600]
};
const LABELS=[
 ['八尾市',135.627,34.638],['柏原市',135.640,34.574],
 ['平群町',135.687,34.640],['三郷町',135.681,34.597],
 ['王寺町',135.698,34.579],['香芝市',135.697,34.548],
 ['太子町',135.647,34.517],['斑鳩町',135.733,34.616],
 ['上牧町',135.733,34.551],['大阪狭山市',135.55,34.5]
];
const W=850,H=720,BUFFER_KM=.35;
const pc=window.polygonClipping,topo=window.topojson,turf=window.turf;
let originals=null,modified=new Map(),mode='shared',working=false,sequence=0;
function pointProject(box){
 const cos=Math.cos(((box[1]+box[3])/2)*Math.PI/180);
 const dx=(box[2]-box[0])*cos,dy=box[3]-box[1],scale=Math.min((W-30)/dx,(H-34)/dy);
 const mx=(box[0]+box[2])/2,my=(box[1]+box[3])/2;
 return ([lon,lat])=>[W/2+(lon-mx)*cos*scale,H/2-(lat-my)*scale];
}
function pointInsideBox(g,box){
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 const visit=c=>{
  if(typeof c[0]==='number'){minX=Math.min(minX,c[0]);maxX=Math.max(maxX,c[0]);minY=Math.min(minY,c[1]);maxY=Math.max(maxY,c[1]);}
  else c.forEach(visit);
 };
 visit(g.coordinates);
 return !(minX>box[2]||maxX<box[0]||minY>box[3]||maxY<box[1]);
}
function multi(g){return g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];}
function nonempty(g){return Array.isArray(g)&&g.length>0;}
function union(geoms){
 const valid=geoms.filter(nonempty);
 if(!valid.length)return [];
 if(valid.length===1)return valid[0];
 return pc.union(...valid);
}
function clip(g,windowRect){return pc.intersection(g,[[
 [windowRect[0],windowRect[1]],[windowRect[2],windowRect[1]],
 [windowRect[2],windowRect[3]],[windowRect[0],windowRect[3]],
 [windowRect[0],windowRect[1]]
 ]]);}
function buffer(g){if(!nonempty(g))return [];const result=turf.buffer({type:'Feature',properties:{},geometry:{type:'MultiPolygon',coordinates:g}},BUFFER_KM,{units:'kilometers',steps:5});return result?multi(result.geometry):[];}
function linePaths(multiPoly,project){
 let d='';
 for(const poly of multiPoly)for(const ring of poly){
  if(ring.length<3)continue;
  for(let i=0;i<ring.length;i++){
   const [x,y]=project(ring[i]);d+=(i?'L':'M')+x.toFixed(2)+','+y.toFixed(2);
  }
  d+='Z';
 }
 return d;
}
function inRing(point,ring){
 const [x,y]=point;let odd=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])odd=!odd;
 }
 return odd;
}
function inMulti(point,geometry){
 for(const polygon of geometry){
  if(!inRing(point,polygon[0]))continue;
  if(!polygon.slice(1).some(hole=>inRing(point,hole)))return true;
 }
 return false;
}
function sharedOutline(osakaUnion,naraBuffer,project){
 // This single line is copied from Osaka's trial reference geometry.
 // No separately simplified Nara prefecture outline is drawn.
 let d='',count=0;
 for(const polygon of osakaUnion)for(const ring of polygon){
  for(let i=0;i<ring.length-1;i++){
   const a=ring[i],b=ring[i+1],m=[(a[0]+b[0])/2,(a[1]+b[1])/2];
   if(!inMulti(m,naraBuffer))continue;
   const p=project(a),q=project(b);
   d+='M'+p[0].toFixed(2)+','+p[1].toFixed(2)+'L'+q[0].toFixed(2)+','+q[1].toFixed(2);
   count++;
  }
 }
 return {d,count};
}
function node(tag,attributes={},parent=map){
 const e=document.createElementNS(NS,tag);
 for(const [k,v] of Object.entries(attributes))e.setAttribute(k,String(v));
 parent.append(e);return e;
}
async function load(){
 const files=await Promise.all(['27','29'].map(async pref=>{
  const r=await fetch('../data/national/2021/'+pref+'.topojson');
  if(!r.ok)throw Error('行政区域データHTTP '+r.status+'（'+pref+'）');
  return [pref,await r.json()];
 }));
 originals={};
 for(const [pref,t] of files){
  const obj=t.objects[Object.keys(t.objects)[0]];
  const items=topo.feature(t,obj).features;
  originals[pref]={
   features:items.map(item=>({id:item.properties.N03_007,name:item.properties.N03_004,
    pref,geometry:multi(item.geometry)})),
   outline:multi(topo.merge(t,obj.geometries))
  };
 }
 if(originals['27'].features.length!==72||originals['29'].features.length!==39)
  throw Error('大阪・奈良の元データ件数が想定外です');
}
function prepare(area){
 const box=BOX[area],pad=[box[0]-.01,box[1]-.01,box[2]+.01,box[3]+.01];
 const project=pointProject(box);
 const features=[];
 for(const pref of ['27','29'])for(const f of originals[pref].features){
  if(!pointInsideBox({coordinates:f.geometry},pad))continue;
  const geometry=clip(f.geometry,pad);
  if(nonempty(geometry))features.push({...f,geometry});
 }
 const outlines=['27','29'].map(pref=>clip(originals[pref].outline,pad));
 const osaka=features.filter(f=>f.pref==='27'),nara=features.filter(f=>f.pref==='29');
 const osakaUnion=union(osaka.map(f=>f.geometry));
 const naraUnion=union(nara.map(f=>f.geometry));
 if(!nonempty(osakaUnion)||!nonempty(naraUnion))throw Error('境界の比較領域に両府県が含まれていません');
 // Geometric partition: overlap belongs to the Osaka reference geometry.
 // Near-border gaps are filled only if they are close to both prefectures.
 const osakaNear=buffer(osakaUnion),naraNear=buffer(naraUnion);
 const fringe=pc.difference(osakaNear,osakaUnion);
 const gaps=nonempty(fringe)?pc.intersection(fringe,naraNear):[];
 const adjusted=osaka.map(f=>({...f,geometry:f.geometry}));
 let claimed=[];
 let extraCells=0;
 for(const f of nara){
  const cut=pc.difference(f.geometry,osakaUnion);
  const additions=nonempty(gaps)?pc.intersection(gaps,buffer(f.geometry)):[];
  let candidate=union([cut,additions]);
  if(nonempty(claimed)&&nonempty(candidate))candidate=pc.difference(candidate,claimed);
  if(!nonempty(candidate))continue;
  claimed=union([claimed,candidate]);
  adjusted.push({...f,geometry:candidate});
  if(nonempty(additions))extraCells++;
 }
 return {project,original:features,originalOutlines:outlines,adjusted,
  commonLine:sharedOutline(osakaUnion,naraNear,project),
  originalCount:features.length,extraCells};
}
function labels(project){
 for(const [name,lon,lat] of LABELS){
  const [x,y]=project([lon,lat]);if(x<35||x>W-35||y<30||y>H-30)continue;
  node('text',{x:x.toFixed(2),y:y.toFixed(2),class:'map-label'}).textContent=name;
 }
}
function draw(){
 if(!originals)return;
 const area=areaSelect.value,chosen=selectionSelect.value,selected=chosen==='none'?null:chosen;
 const p=modified.get(area);
 if(!p)return;
 map.replaceChildren();
 const items=mode==='shared'?p.adjusted:p.original;
 const wrap=node('g');
 const foreground=node('g');
 // The same corrected SVG geometry drives fill, selection, and hit testing.
 for(const f of items){
  const isChosen=f.id===selected;
  const el=node('path',{d:linePaths(f.geometry,p.project),class:'region'+(isChosen?' selected':''),
   'data-id':f.id,'aria-label':f.name},wrap);
  const title=node('title',{},el);title.textContent=f.name;
 }
 if(mode==='shared'){
  node('path',{d:p.commonLine.d,class:'pref-border'},foreground);
 }else for(const g of p.originalOutlines)
  node('path',{d:linePaths(g,p.project),class:'pref-border'},foreground);
 const focus=items.find(f=>f.id===selected);
 if(focus)node('path',{d:linePaths(focus.geometry,p.project),class:'selection-border'},foreground);
 labels(p.project);
 originalButton.setAttribute('aria-pressed',String(mode==='original'));
 sharedButton.setAttribute('aria-pressed',String(mode==='shared'));
 status.textContent=(mode==='shared'?
  '共通ベクター試作：大阪府側を基準にポリゴン演算で重複・短い隙間を整理。府県境は1本。':
  '従来表示：両府県の外郭線を別々に描画。')+
  ' 表示する市区町村'+items.length+'件／共通線の構成区間'+p.commonLine.count+
  '本／隙間補完に使った奈良県の区域'+p.extraCells+'件。';
}
async function render(){
 if(!originals)return;
 const area=areaSelect.value,token=++sequence;
 if(!modified.has(area)){
  status.textContent='共通ベクター境界を計算しています…';
  await new Promise(resolve=>setTimeout(resolve,20));
  try{
   const result=prepare(area);
   if(token!==sequence)return;
   modified.set(area,result);
  }catch(error){
   status.textContent='境界計算に失敗しました：'+error.message;
   console.error(error);return;
  }
 }
 draw();
}
originalButton.addEventListener('click',()=>{mode='original';render()});
sharedButton.addEventListener('click',()=>{mode='shared';render()});
areaSelect.addEventListener('change',render);
selectionSelect.addEventListener('change',render);
map.addEventListener('click',event=>{
 const path=event.target.closest('path[data-id]');if(!path)return;
 const id=path.getAttribute('data-id');
 if(![...selectionSelect.options].some(o=>o.value===id)){
  const option=document.createElement('option');option.value=id;
  option.textContent=path.getAttribute('aria-label');selectionSelect.append(option);
 }
 selectionSelect.value=id;render();
});
if(!pc||!topo||!turf){status.textContent='必要な地理演算ライブラリを読み込めませんでした。';return;}
load().then(render).catch(error=>{
 status.textContent='境界データの読み込みに失敗しました：'+error.message;
 console.error(error);
});
})();
