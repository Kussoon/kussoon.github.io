/* Osaka/Nara shared boundary proof of concept.
 * This isolated canvas demo does NOT rewrite or claim to correct legal geometry.
 * One ownership raster drives fill, outlines and hit testing.
 */
(()=>{
'use strict';
const W=850,H=720,canvas=document.getElementById('map'),ctx=canvas.getContext('2d');
const status=document.getElementById('status'),areaBox=document.getElementById('area'),selectionBox=document.getElementById('selection');
const originalButton=document.getElementById('original'),sharedButton=document.getElementById('shared');
const PRESETS={
 sango:{box:[135.605,34.54,135.75,34.676],caption:'柏原市・三郷町・平群町付近'},
 taishi:{box:[135.59,34.48,135.76,34.585],caption:'太子町・香芝市付近'},
 whole:{box:[135.56,34.44,135.81,34.71],caption:'大阪府と奈良県の府県境'}
};
const LABELS=[
 ['八尾市',135.632,34.636],['柏原市',135.640,34.578],
 ['平群町',135.686,34.642],['三郷町',135.682,34.604],
 ['王寺町',135.699,34.580],['香芝市',135.695,34.552],
 ['太子町',135.649,34.517],['斑鳩町',135.732,34.617]
];
let topologies=null,features=null,currentMode='shared',cache=new Map(),current=null;
const areaCode=code=>String(code).slice(0,2);
const prefColor=code=>areaCode(code)==='27'?'大阪府':'奈良県';
function projection(b){
 const midLon=(b[0]+b[2])/2,midLat=(b[1]+b[3])/2;
 const cos=Math.cos(midLat*Math.PI/180);
 const scale=Math.min((W-50)/((b[2]-b[0])*cos),(H-52)/(b[3]-b[1]));
 return ([lon,lat])=>[W/2+(lon-midLon)*cos*scale,H/2-(lat-midLat)*scale];
}
function shapePath(geometry,project){
 const path=new Path2D();
 const polygons=geometry.type==='Polygon'?[geometry.coordinates]:
  geometry.type==='MultiPolygon'?geometry.coordinates:[];
 for(const polygon of polygons)for(const ring of polygon){
  if(ring.length<3)continue;
  for(let i=0;i<ring.length;i++){
   const [x,y]=project(ring[i]);
   if(i===0)path.moveTo(x,y);else path.lineTo(x,y);
  }
  path.closePath();
 }
 return path;
}
async function fetchTopologies(){
 const codes=['27','29'];
 const result=await Promise.all(codes.map(async code=>{
  const response=await fetch('../data/national/2021/'+code+'.topojson');
  if(!response.ok)throw Error(code+'の境界データを取得できません（HTTP '+response.status+'）');
  return [code,await response.json()];
 }));
 topologies=Object.fromEntries(result);
 features=[];
 for(const [code,t] of result){
  const object=t.objects[Object.keys(t.objects)[0]];
  const items=topojson.feature(t,object).features;
  for(const item of items)features.push({
   id:item.properties.N03_007, name:item.properties.N03_004,
   prefecture:code,geometry:item.geometry
  });
 }
 if(features.length!==111)throw Error('行政区域数が一致しません：'+features.length+'（想定111）');
}
function build(area){
 if(cache.has(area))return cache.get(area);
 const project=projection(PRESETS[area].box);
 const shapes=features.map((f,i)=>({...f,index:i+1,path:shapePath(f.geometry,project)}));
 const outlines=['27','29'].map(code=>{
  const t=topologies[code],object=t.objects[Object.keys(t.objects)[0]];
  return shapePath(topojson.merge(t,object.geometries),project);
 });
 const maskCanvas=document.createElement('canvas');
 maskCanvas.width=W;maskCanvas.height=H;
 const mc=maskCanvas.getContext('2d',{willReadFrequently:true});
 // Encode each region as a unique red channel value. A single pixel can only
 // belong to one region, including where independently simplified polygons overlap.
 for(const f of shapes){
  mc.fillStyle='rgb('+f.index+',0,0)';
  mc.fill(f.path,'evenodd');
 }
 const rgba=mc.getImageData(0,0,W,H).data;
 const ids=new Uint8Array(W*H);
 for(let i=0;i<ids.length;i++){
  const a=rgba[i*4+3],id=rgba[i*4];
  if(a>=128&&id>=1&&id<=shapes.length)ids[i]=id;
 }
 // Fill only short gaps specifically bracketed by two different prefectures.
 // This is a raster experiment, not a repaired cadastral/admin geometry.
 const LIMIT=26;
 let filled=0,runs=0;
 const pair=(a,b)=>a&&b&&areaCode(shapes[a-1].id)!==areaCode(shapes[b-1].id);
 for(let y=0;y<H;y++){
  const base=y*W;
  for(let x=0;x<W;){
   if(ids[base+x]){x++;continue;}
   const from=x;
   while(x<W&&!ids[base+x])x++;
   const length=x-from,left=from?ids[base+from-1]:0,right=x<W?ids[base+x]:0;
   if(length<=LIMIT&&pair(left,right)){
    runs++;
    for(let k=0;k<length;k++){ids[base+from+k]=k<length/2?left:right;filled++;}
   }
  }
 }
 // Close short nearly-horizontal gaps not handled by horizontal scan lines.
 for(let x=0;x<W;x++){
  for(let y=0;y<H;){
   if(ids[y*W+x]){y++;continue;}
   const from=y;
   while(y<H&&!ids[y*W+x])y++;
   const length=y-from,top=from?ids[(from-1)*W+x]:0,bottom=y<H?ids[y*W+x]:0;
   if(length<=LIMIT&&pair(top,bottom)){
    runs++;
    for(let k=0;k<length;k++){ids[(from+k)*W+x]=k<length/2?top:bottom;filled++;}
   }
  }
 }
 const prepared={project,shapes,outlines,ids,filled,runs};
 cache.set(area,prepared);
 return prepared;
}
function drawLabels(project){
 ctx.textAlign='center';ctx.textBaseline='middle';
 for(const [name,lon,lat] of LABELS){
  const [x,y]=project([lon,lat]);
  if(x<30||x>W-30||y<30||y>H-30)continue;
  ctx.font='bold 22px "Hiragino Sans","Yu Gothic",Meiryo,sans-serif';
  ctx.lineWidth=4.5;ctx.lineJoin='round';ctx.strokeStyle='#fff';
  ctx.strokeText(name,x,y);ctx.fillStyle='#204761';ctx.fillText(name,x,y);
 }
}
function drawOriginal(p,chosen){
 ctx.clearRect(0,0,W,H);ctx.fillStyle='#eff7fb';ctx.fillRect(0,0,W,H);
 ctx.lineJoin='round';ctx.lineCap='round';
 for(const f of p.shapes){
  ctx.fillStyle=f.id===chosen?'#ffc36e':'#a8d5eb';
  ctx.strokeStyle='#fff';ctx.lineWidth=1.1;
  ctx.fill(f.path,'evenodd');ctx.stroke(f.path);
 }
 for(const outline of p.outlines){
  ctx.strokeStyle='#376383';ctx.lineWidth=2.1;ctx.stroke(outline);
 }
 const selected=p.shapes.find(f=>f.id===chosen);
 if(selected){
  ctx.strokeStyle='#88420f';ctx.lineWidth=2.6;ctx.stroke(selected.path);
 }
 drawLabels(p.project);
}
function drawShared(p,chosen){
 const {ids,shapes}=p,n=ids.length,colors=new Uint8Array(n*4);
 const ranks=new Uint8Array(n),selected=shapes.find(f=>f.id===chosen)?.index||0;
 const samePref=(a,b)=>areaCode(shapes[a-1].id)===areaCode(shapes[b-1].id);
 // One membership mask is the single source of truth for fills and outlines.
 for(let i=0;i<n;i++){
  const id=ids[i],k=i*4;
  if(id===selected){colors[k]=255;colors[k+1]=195;colors[k+2]=110;}
  else if(id){colors[k]=168;colors[k+1]=213;colors[k+2]=235;}
  else {colors[k]=239;colors[k+1]=247;colors[k+2]=251;}
  colors[k+3]=255;
 }
 function edge(a,b){
  if(a===b)return 0;
  if((a===selected||b===selected)&&selected)return 3;
  if(!a||!b)return 2;
  return samePref(a,b)?1:2;
 }
 for(let y=0;y<H;y++){
  const base=y*W;
  for(let x=0;x<W;x++){
   const i=base+x,a=ids[i];
   if(x<W-1){const rank=edge(a,ids[i+1]);if(rank){ranks[i]=Math.max(ranks[i],rank);ranks[i+1]=Math.max(ranks[i+1],rank);}}
   if(y<H-1){const rank=edge(a,ids[i+W]);if(rank){ranks[i]=Math.max(ranks[i],rank);ranks[i+W]=Math.max(ranks[i+W],rank);}}
  }
 }
 // Tiny morphological expansion gives the same apparent line width after
 // the canvas is reduced to a phone display; each seam is still painted once.
 const expanded=new Uint8Array(ranks);
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
  const i=y*W+x,r=ranks[i];
  if(r>=2){
   expanded[i-1]=Math.max(expanded[i-1],r);
   expanded[i+1]=Math.max(expanded[i+1],r);
  }
 }
 for(let i=0;i<n;i++){
  const r=expanded[i];if(!r)continue;
  const k=i*4;
  if(r===3){colors[k]=136;colors[k+1]=66;colors[k+2]=15;}
  else if(r===2){colors[k]=55;colors[k+1]=99;colors[k+2]=131;}
  else {colors[k]=255;colors[k+1]=255;colors[k+2]=255;}
 }
 const out=new ImageData(new Uint8ClampedArray(colors),W,H);
 ctx.putImageData(out,0,0);
 drawLabels(p.project);
}
function render(){
 if(!features)return;
 const p=build(areaBox.value);
 current=p;
 const chosen=selectionBox.value==='none'?null:selectionBox.value;
 if(currentMode==='original')drawOriginal(p,chosen);else drawShared(p,chosen);
 originalButton.setAttribute('aria-pressed',String(currentMode==='original'));
 sharedButton.setAttribute('aria-pressed',String(currentMode==='shared'));
 status.textContent=(currentMode==='original'?'従来方式：府県ごとの外郭線を重ねて描画。':
  '共通境界：全区域で一つの所属マスクを共有し、境界を1回だけ描画。')+
  ' '+PRESETS[areaBox.value].caption+'／111区域。'+
  (currentMode==='shared'?'短い隙間の補完 '+p.filled.toLocaleString()+'画素（'+p.runs+'区間）。':'');
}
originalButton.addEventListener('click',()=>{currentMode='original';render();});
sharedButton.addEventListener('click',()=>{currentMode='shared';render();});
areaBox.addEventListener('change',render);
selectionBox.addEventListener('change',render);
canvas.addEventListener('click',event=>{
 if(!current)return;
 const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*W/rect.width,y=(event.clientY-rect.top)*H/rect.height;
 let found=null;
 if(currentMode==='shared'){
  const id=current.ids[Math.max(0,Math.min(H-1,Math.floor(y)))*W+Math.max(0,Math.min(W-1,Math.floor(x)))];
  found=id?current.shapes[id-1]:null;
 }else{
  for(let i=current.shapes.length-1;i>=0;i--){
   const shape=current.shapes[i];
   if(ctx.isPointInPath(shape.path,x,y,'evenodd')){found=shape;break;}
  }
 }
 if(found){
  if(![...selectionBox.options].some(option=>option.value===found.id)){
   const option=document.createElement('option');option.value=found.id;
   option.textContent=prefColor(found.id)+' '+found.name;selectionBox.append(option);
  }
  selectionBox.value=found.id;render();
 }
});
if(!window.topojson){status.textContent='TopoJSONライブラリを読み込めませんでした。';return;}
fetchTopologies().then(render).catch(error=>{
 status.textContent='試作地図の読み込みに失敗しました：'+error.message;
 console.error(error);
});
})();
