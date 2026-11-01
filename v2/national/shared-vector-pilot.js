/* V2 Osaka-Nara shared vector border comparison.
 * First render is always original lightweight SVG.
 * Optional vector recalculation runs in a separate Worker.
 */
(()=>{
'use strict';
const NS='http://www.w3.org/2000/svg',W=850,H=720;
const $=id=>document.getElementById(id),map=$('map'),status=$('status');
const area=$('area'),selection=$('selection'),original=$('original'),shared=$('shared');
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
let source=null,mode='original',running=null,worker=null;
const originalCache=new Map(),sharedCache=new Map(),errors=new Map();
function projectFor(box){
 const cos=Math.cos((box[1]+box[3])/2*Math.PI/360);
 const dx=(box[2]-box[0])*cos,dy=box[3]-box[1],s=Math.min((W-30)/dx,(H-34)/dy);
 const mx=(box[0]+box[2])/2,my=(box[1]+box[3])/2;
 return ([lon,lat])=>[W/2+(lon-mx)*cos*s,H/2-(lat-my)*s];
}
function mp(geometry){return geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];}
function pathData(multipolygon,project){
 let d='';
 for(const polygon of multipolygon||[])for(const ring of polygon){
  if(!ring||ring.length<3)continue;
  for(let i=0;i<ring.length;i++){
   const [x,y]=project(ring[i]);d+=(i?'L':'M')+x.toFixed(2)+','+y.toFixed(2);
  }
  d+='Z';
 }
 return d;
}
function segmentData(segments,project){
 let d='';
 for(const [a,b] of segments){
  const p=project(a),q=project(b);
  d+='M'+p[0].toFixed(2)+','+p[1].toFixed(2)+'L'+q[0].toFixed(2)+','+q[1].toFixed(2);
 }
 return d;
}
function element(tag,attrs={},parent=map){
 const e=document.createElementNS(NS,tag);
 for(const [key,val] of Object.entries(attrs))e.setAttribute(key,String(val));
 parent.append(e);return e;
}
function bboxIntersects(geometry,box){
 let xmin=Infinity,ymin=Infinity,xmax=-Infinity,ymax=-Infinity;
 function walk(coords){
  if(typeof coords[0]==='number'){
   xmin=Math.min(xmin,coords[0]);xmax=Math.max(xmax,coords[0]);
   ymin=Math.min(ymin,coords[1]);ymax=Math.max(ymax,coords[1]);
  }else coords.forEach(walk);
 }
 walk(geometry.coordinates);
 return xmin<=box[2]&&xmax>=box[0]&&ymin<=box[3]&&ymax>=box[1];
}
function originalFor(key){
 if(originalCache.has(key))return originalCache.get(key);
 const box=BOX[key],pad=[box[0]-.01,box[1]-.01,box[2]+.01,box[3]+.01];
 const shapes=[],outlines=[];
 for(const pref of ['27','29']){
  const {topology,features,outline}=source[pref];
  for(const f of features)if(bboxIntersects(f.geometry,pad))
   shapes.push({id:f.properties.N03_007,name:f.properties.N03_004,pref,geometry:mp(f.geometry)});
  outlines.push(outline);
 }
 const value={shapes,outlines,project:projectFor(box)};
 originalCache.set(key,value);return value;
}
function render(message){
 if(!source)return;
 const key=area.value,base=originalFor(key),candidate=sharedCache.get(key);
 const useShared=mode==='shared'&&Boolean(candidate),chosen=selection.value;
 map.replaceChildren();
 const polygons=useShared?candidate.adjusted:base.shapes;
 const group=element('g'),outlineGroup=element('g');
 for(const f of polygons){
  const selected=f.id===chosen;
  const p=element('path',{
   class:'region'+(selected?' selected':''),d:pathData(f.geometry,base.project),
   'data-id':f.id,'aria-label':f.name
  },group);
  element('title',{},p).textContent=f.name;
 }
 if(useShared){
  element('path',{d:segmentData(candidate.lines,base.project),class:'pref-border'},outlineGroup);
 }else for(const polygon of base.outlines){
  element('path',{d:pathData(polygon,base.project),class:'pref-border'},outlineGroup);
 }
 const selected=polygons.find(f=>f.id===chosen);
 if(selected)element('path',{d:pathData(selected.geometry,base.project),class:'selection-border'},outlineGroup);
 for(const [name,lon,lat] of LABELS){
  const [x,y]=base.project([lon,lat]);if(x<35||x>W-35||y<30||y>H-30)continue;
  element('text',{x:x.toFixed(2),y:y.toFixed(2),class:'map-label'}).textContent=name;
 }
 original.setAttribute('aria-pressed',String(mode==='original'));
 shared.setAttribute('aria-pressed',String(mode==='shared'));
 status.textContent=message||(
  useShared?'共通ベクター境界：計算済みの同一形状からSVGで表示中。':
  '従来の境界を表示しています。共通ベクター方式は右の切替ボタンから確認できます。');
}
function stopWorker(){
 if(worker){worker.terminate();worker=null;}
 running=null;
}
function calculateShared(key){
 if(sharedCache.has(key)){render();return;}
 if(errors.has(key)){render('共通境界の計算を開始できませんでした：'+errors.get(key)+'。従来地図は利用できます。');return;}
 if(!window.Worker){
  render('この環境では別スレッドの計算ができないため、従来地図を表示しています。');
  return;
 }
 if(worker)stopWorker();
 render('共通ベクター境界を計算しています。地図表示は利用できます。');
 const token={key};running=token;
 try{
  worker=new Worker('shared-vector-worker.js?v=20261101-b');
  worker.onmessage=event=>{
   if(running!==token)return;
   const data=event.data;stopWorker();
   if(data.ok){
    sharedCache.set(key,{adjusted:data.adjusted,lines:data.lines,extraCells:data.extraCells});
    if(area.value===key&&mode==='shared')render('共通ベクター境界を表示中。補正対象の奈良県区域：'+data.extraCells+'件。');
   }else{
    errors.set(key,data.error||'計算に失敗しました');
    if(area.value===key&&mode==='shared')render('共通境界の計算に失敗しました：'+errors.get(key)+'。従来地図を表示しています。');
   }
  };
  worker.onerror=event=>{
   if(running!==token)return;
   const reason=event.message||'ワーカーの読み込みに失敗しました';
   stopWorker();errors.set(key,reason);
   if(area.value===key)render('共通境界の計算を開始できませんでした：'+reason+'。従来地図を表示しています。');
  };
  worker.postMessage({area:key,box:BOX[key]});
 }catch(error){
  stopWorker();
  errors.set(key,String(error.message||error));
  render('共通境界の計算を開始できませんでした。従来地図は利用できます。');
 }
}
original.addEventListener('click',()=>{
 mode='original';
 if(worker)stopWorker();
 render();
});
shared.addEventListener('click',()=>{mode='shared';if(source)calculateShared(area.value);});
area.addEventListener('change',()=>{
 if(worker)stopWorker();
 render();
 if(mode==='shared')calculateShared(area.value);
});
selection.addEventListener('change',()=>render());
map.addEventListener('click',event=>{
 const p=event.target.closest('path[data-id]');
 if(!p)return;
 const id=p.getAttribute('data-id');
 if(![...selection.options].some(o=>o.value===id)){
  const option=document.createElement('option');option.value=id;
  option.textContent=p.getAttribute('aria-label');selection.append(option);
 }
 selection.value=id;render();
});
async function load(){
 if(!window.topojson)throw Error('地図データの読み込みライブラリが利用できません');
 const result={};
 for(const pref of ['27','29']){
  const response=await fetch('../data/national/2021/'+pref+'.topojson');
  if(!response.ok)throw Error(pref+'の地図データを取得できません（HTTP '+response.status+'）');
  const topology=await response.json(),obj=topology.objects[Object.keys(topology.objects)[0]];
  result[pref]={
   topology,
   features:topojson.feature(topology,obj).features,
   outline:mp(topojson.merge(topology,obj.geometries))
  };
 }
 if(result['27'].features.length!==72||result['29'].features.length!==39)
  throw Error('行政区域数が想定と異なります');
 source=result;render();
}
load().catch(error=>{status.textContent='地図の読み込みに失敗しました：'+error.message;console.error(error);});
})();
