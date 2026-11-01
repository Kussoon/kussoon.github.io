/* Two data versions, same SVG viewport. The 2026 layer uses shared arcs from ONE topology.
 * Comparison-only; no edits to the live nationwide map.
 */
(()=>{
'use strict';
const NS='http://www.w3.org/2000/svg',W=850,H=720;
const $=id=>document.getElementById(id),map=$('map'),status=$('status');
const area=$('area'),selection=$('selection'),oldBtn=$('old'),newBtn=$('new');
const BOX={
 sango:[135.595,34.535,135.765,34.681],
 taishi:[135.585,34.47,135.765,34.600],
 wide:[135.50,34.40,135.90,34.76]
};
const LABELS=[
 ['八尾市',135.627,34.638],['柏原市',135.64,34.574],
 ['平群町',135.687,34.640],['三郷町',135.681,34.597],
 ['王寺町',135.698,34.579],['香芝市',135.697,34.548],
 ['太子町',135.647,34.517],['斑鳩町',135.733,34.616]
];
let oldData=null,newData=null,mode='new',busy=false;
function svg(tag,attrs={},parent=map){
 const el=document.createElementNS(NS,tag);
 for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));
 parent.append(el);return el;
}
function project(box){
 const c=Math.cos(((box[1]+box[3])/2)*Math.PI/180);
 const scale=Math.min((W-36)/((box[2]-box[0])*c),(H-40)/(box[3]-box[1]));
 const lon=(box[0]+box[2])/2,lat=(box[1]+box[3])/2;
 return ([x,y])=>[W/2+(x-lon)*c*scale,H/2-(y-lat)*scale];
}
function pathData(geom,p){
 let str='';
 function ring(r){
  for(let i=0;i<r.length;i++){
   const [x,y]=p(r[i]);str+=(i?'L':'M')+x.toFixed(2)+','+y.toFixed(2);
  }
  str+='Z';
 }
 if(!geom)return str;
 const polys=geom.type==='Polygon'?[geom.coordinates]:geom.type==='MultiPolygon'?geom.coordinates:[];
 for(const poly of polys)for(const r of poly)ring(r);
 return str;
}
function geometryBounds(g){
 let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity;
 function walk(x){
  if(typeof x[0]==='number'){a=Math.min(a,x[0]);b=Math.min(b,x[1]);c=Math.max(c,x[0]);d=Math.max(d,x[1]);}
  else for(const v of x)walk(v);
 }
 walk(g.coordinates);return [a,b,c,d];
}
function intersects(g,box){
 const b=geometryBounds(g);
 return b[0]<box[2]&&b[2]>box[0]&&b[1]<box[3]&&b[3]>box[1];
}
function readFeatures(topology){
 const object=topology.objects[Object.keys(topology.objects)[0]];
 return {object,items:topojson.feature(topology,object).features};
}
async function load(){
 if(!window.topojson)throw Error('TopoJSONライブラリを読み込めませんでした');
 const paths=[
  '../data/national/2021/27.topojson',
  '../data/national/2021/29.topojson',
  '../data/national/2026-common/osaka-nara.topojson'
 ];
 const results=await Promise.all(paths.map(async path=>{
  const response=await fetch(path);
  if(!response.ok)throw Error('データの取得失敗（'+response.status+'） '+path);
  return response.json();
 }));
 const o=results.slice(0,2).map(t=>{
  const x=readFeatures(t);
  return {...x,outline:topojson.merge(t,x.object.geometries)};
 });
 const n=readFeatures(results[2]);
 oldData={features:o.flatMap(x=>x.items),outlines:o.map(x=>x.outline)};
 newData={features:n.items,outline:topojson.mesh(results[2],n.object,
  (a,b)=>a===b || String(a.properties.N03_007).slice(0,2)!==String(b.properties.N03_007).slice(0,2))};
 if(oldData.features.length!==111||newData.features.length!==111)
  throw Error('市町村数が想定と異なります：2021年 '+oldData.features.length+'／2026年 '+newData.features.length);
 render();
}
function render(){
 if(!oldData||!newData)return;
 const box=BOX[area.value],p=project(box),chosen=selection.value;
 const model=mode==='new'?newData:oldData;
 map.replaceChildren();
 const base=svg('g'),pref=svg('g'),selectionLayer=svg('g');
 let drawn=0,active=null;
 for(const feature of model.features){
  if(!intersects(feature.geometry,box))continue;
  const code=String(feature.properties.N03_007||'');
  const isSelected=code===chosen;
  const el=svg('path',{class:'land'+(isSelected?' selected':''),d:pathData(feature.geometry,p),'data-code':code,
   'aria-label':feature.properties.N03_004||code},base);
  svg('title',{},el).textContent=feature.properties.N03_004||code;
  drawn++;
  if(isSelected)active=feature.geometry;
 }
 if(mode==='new'){
  svg('path',{d:pathData(model.outline,p),class:'pref-outline'},pref);
 }else{
  for(const outline of model.outlines)svg('path',{d:pathData(outline,p),class:'pref-outline'},pref);
 }
 if(active)svg('path',{d:pathData(active,p),class:'selection-outline'},selectionLayer);
 for(const [name,lon,lat] of LABELS){
  const [x,y]=p([lon,lat]);if(x<35||x>W-35||y<28||y>H-28)continue;
  svg('text',{class:'map-label',x:x.toFixed(2),y:y.toFixed(2)}).textContent=name;
 }
 oldBtn.setAttribute('aria-pressed',String(mode==='old'));
 newBtn.setAttribute('aria-pressed',String(mode==='new'));
 status.textContent=(mode==='new'?
  '2026年共通境界：全国一括処理と同じ方式で作成した大阪・奈良一体のTopoJSONを表示。':
  '2021年府県別：従来の簡素化境界と府県外郭線を表示。')+
  ' この画面の市町村 '+drawn+'件／元データ111地域。';
}
oldBtn.addEventListener('click',()=>{mode='old';render()});
newBtn.addEventListener('click',()=>{mode='new';render()});
area.addEventListener('change',render);
selection.addEventListener('change',render);
map.addEventListener('click',event=>{
 const p=event.target.closest('path[data-code]');if(!p)return;
 const id=p.getAttribute('data-code');
 if(![...selection.options].some(o=>o.value===id)){
  const option=document.createElement('option');option.value=id;
  option.textContent=p.getAttribute('aria-label');selection.append(option);
 }
 selection.value=id;render();
});
load().catch(error=>{
 status.textContent='比較地図の読み込みに失敗しました：'+error.message;
 console.error(error);
});
})();
