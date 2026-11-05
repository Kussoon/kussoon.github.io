/* Opt-in 2026 nationwide progressive labels. Geometry is streamed separately.
 * Fixed, generated geographic anchors; visibility and screen fonts follow view.
 */
(function(global){'use strict';
const NS='http://www.w3.org/2000/svg',fontSize=z=>Math.min(13,7+1.8*Math.log2(Math.max(1,z)));
function validateIndex(d){
 if(d?.version!==1||d.year!==2026||d.count!==1905||d.entries?.length!==1905)throw Error('Invalid 2026 label index');
 if(!d.prefectureBytes||Object.keys(d.prefectureBytes).length!==47||Object.values(d.prefectureBytes).some(x=>!Number.isFinite(x)||x<=0))throw Error('Invalid detail byte metadata');
 const seen=new Set();for(const r of d.entries){if(!/^\d{5}$/.test(r.code)||r.pref!==r.code.slice(0,2)||+r.pref<1||+r.pref>47||seen.has(r.code)||!r.name||!r.anchor?.every(Number.isFinite)||r.anchor.length!==2||r.bounds?.length!==4||!r.bounds.every(Number.isFinite)||r.anchor[0]<r.bounds[0]||r.anchor[0]>r.bounds[2]||r.anchor[1]<r.bounds[1]||r.anchor[1]>r.bounds[3])throw Error('Invalid/duplicate label '+r.code);seen.add(r.code);}return d;
}
function createStore({load,capacity=3,concurrency=2,pinned=()=>'',byteCapacity=Infinity,weight=v=>v.bytes||0,onEvict=()=>{}}){
 const cache=new Map(),pending=new Map(),queue=[];let active=0,peak=0,loads=0;
 const bytes=()=>[...cache.values()].reduce((sum,v)=>sum+weight(v),0);
 function trim(){while(cache.size>capacity||(cache.size>1&&bytes()>byteCapacity)){const key=[...cache.keys()].find(k=>k!==pinned());if(!key)break;cache.delete(key);onEvict(key);}}
 function pump(){while(active<concurrency&&queue.length){const task=queue.shift();active++;peak=Math.max(peak,active);loads++;Promise.resolve().then(()=>load(task.key)).then(value=>{cache.set(task.key,value);trim();pending.delete(task.key);task.resolve(value);},error=>{pending.delete(task.key);task.reject(error);}).finally(()=>{active--;pump();});}}
 function get(key){if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return Promise.resolve(value);}if(pending.has(key))return pending.get(key);const p=new Promise((resolve,reject)=>queue.push({key,resolve,reject}));pending.set(key,p);pump();return p;}
 function retain(keys){const keep=new Set([...keys,pinned()]);for(let i=queue.length-1;i>=0;i--){const task=queue[i];if(!keep.has(task.key)){queue.splice(i,1);pending.delete(task.key);const error=Error('Obsolete detail request');error.code='cancelled';task.reject(error);}}}
 return Object.freeze({get,retain,peek:key=>cache.get(key),entries:()=>[...cache.entries()],stats:()=>({cached:cache.size,cachedBytes:bytes(),byteCapacity,keys:[...cache.keys()],active,queued:queue.length,peakConcurrent:peak,loads})});
}
function models(index,project){return index.entries.map(r=>{const p=project(r.anchor),a=project([r.bounds[0],r.bounds[3]]),b=project([r.bounds[2],r.bounds[1]]);return {...r,id:r.code,prefectureCode:r.pref,readingParts:r.parts,point:p,box:{minX:Math.min(a[0],b[0]),minY:Math.min(a[1],b[1]),maxX:Math.max(a[0],b[0]),maxY:Math.max(a[1],b[1]),w:Math.abs(b[0]-a[0]),h:Math.abs(b[1]-a[1])}};});}
function plan(ms,{view,width,height,ratio,zoom,readings=false,selected='',measure}){
 const px=fontSize(zoom),size=px/ratio,L=global.KussoonAdministrativeLabels,R=global.KussoonNationalReadings;
 const labels=ms.map(m=>{const [x,y]=m.point,w=measure(m.name,size)+size*.24,h=size*1.2;const p={x,y,width:w,height:h,box:{x1:x-w/2,y1:y-h/2,x2:x+w/2,y2:y+h/2}};return readings&&m.readingParts?.length?R.boxFor(m,p,size,measure):L.boxFor(m,p,size,measure);});
 const result=global.KussoonDensityLabels.arrange(ms,labels,{view,zoom,mode:'adaptive',density:'dense',selectedId:selected,screenWidth:width,screenHeight:height,stableAnchors:true});
 return {...result,size,px};
}
function uniqueSegments(arcs,project=null,clip=null){const seen=new Set(),out=[];for(const arc of arcs)for(let i=1;i<arc.length;i++){const a=arc[i-1],b=arc[i],pa=project?project(a):a,pb=project?project(b):b;if(clip&&(Math.max(pa[0],pb[0])<clip.x||Math.min(pa[0],pb[0])>clip.x+clip.w||Math.max(pa[1],pb[1])<clip.y||Math.min(pa[1],pb[1])>clip.y+clip.h))continue;const ka=pa.map(n=>n.toFixed(project?4:9)).join(','),kb=pb.map(n=>n.toFixed(project?4:9)).join(',');if(ka===kb)continue;const k=ka<kb?ka+'|'+kb:kb+'|'+ka;if(seen.has(k))continue;seen.add(k);out.push([a,b]);}return out;}
function create({map,viewport,loadIndex,store,loadOffices,overview,project,isActive,onSelection,onStatus,prefName=code=>code}){
 let index=null,ms=[],selected='',selectionEntry=null,selectionSequence=0,generation=0,timer=null,disposed=false,shapeKey=null,shapes=null,labelLayer=null,projection=project,labelNodes=new Map(),prepared=new WeakMap(),activePointers=new Set(),selectionError='',detailError='';
 const timing={labelPasses:0,lastLabelMs:0,firstLabelMs:0,maxLabelMs:0,shapePasses:0,lastShapeMs:0,maxShapeMs:0,indexBytes:0},canvas=document.createElement('canvas'),context=canvas.getContext('2d'),widths=new Map();
 const tag=(n,attrs={})=>{const x=document.createElementNS(NS,n);for(const [k,v] of Object.entries(attrs))x.setAttribute(k,v);return x;};
 const ready=loadIndex().then(d=>{index=validateIndex(d);timing.indexBytes=new TextEncoder().encode(JSON.stringify(d)).length;if(isActive())mount(projection);return index;});
 function frame(){const r=map.getBoundingClientRect(),m=map.getScreenCTM(),inverse=m.inverse();function pt(x,y){const p=map.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(inverse);}const a=pt(r.left+1,r.top+1),b=pt(r.right-1,r.bottom-1);return {view:{x:a.x,y:a.y,w:b.x-a.x,h:b.y-a.y},width:r.width-2,height:r.height-2,ratio:Math.hypot(m.a,m.b),zoom:850/viewport.view().w};}
 function measure(text,size){const px=fontSize(850/viewport.view().w),physical=size*frameRatio,cacheKey=text+'|'+physical.toFixed(4);if(!widths.has(cacheKey)){if(widths.size>=12000)widths.clear();context.font='850 '+physical+'px "Hiragino Sans","Yu Gothic",Meiryo,sans-serif';widths.set(cacheKey,context.measureText(text).width);}return widths.get(cacheKey)/frameRatio;}
 let frameRatio=1,shapePending=false,sceneSequence=0,requestKey='',overviewEntry=null;
 const geometry=global.KussoonProgressiveGeometryClient&&new URLSearchParams(location.search).get('geometry')!=='main'?global.KussoonProgressiveGeometryClient.create({url:'../shared/progressive-geometry.worker.js',canWork:()=>!activePointers.size}):null;
 function refreshLabels(){
  if(!index||!isActive()||!labelLayer||disposed||activePointers.size)return null;const start=performance.now(),f=frame();frameRatio=f.ratio;
  const readings=document.getElementById('readingMode').value==='on',p=plan(ms,{...f,readings,selected,measure});
  const wantedCodes=new Set();let count=0;
  ms.forEach((model,i)=>{if(!p.visible[i])return;const point=p.labels[i],attributes={'data-national-code':model.code,'data-label-code':model.code,x:point.x,y:point.y,'font-size':p.size.toFixed(6),'font-weight':'850','text-anchor':'middle','dominant-baseline':'central',fill:'#193e58',stroke:'#fff','stroke-width':(p.size*.18).toFixed(6),'stroke-linejoin':'round','paint-order':'stroke'};let t=labelNodes.get(model.code);if(!t){t=tag('text');labelNodes.set(model.code,t);labelLayer.append(t);}wantedCodes.add(model.code);for(const [key,value] of Object.entries(attributes))if(t.getAttribute(key)!==String(value))t.setAttribute(key,value);t.style.cursor='pointer';if(readings&&model.readingParts?.length)global.KussoonNationalReadings.paint(t,model,point.x,point.y,p.size,measure,6);else{global.KussoonAdministrativeLabels.paint(t,model,point.x,p.size,6);}t.setAttribute('aria-label',model.fullName);count++;});
  for(const [code,node] of labelNodes)if(!wantedCodes.has(code)){node.remove();labelNodes.delete(code);}timing.lastLabelMs=performance.now()-start;if(!timing.labelPasses)timing.firstLabelMs=timing.lastLabelMs;timing.labelPasses++;timing.maxLabelMs=Math.max(timing.maxLabelMs,timing.lastLabelMs);map.dataset.nationalSelection=selected;onStatus?.(selectionError||detailError||'全国のまま 拡大 '+f.zoom.toFixed(2)+'倍・地名 '+count+'件（2026年1905区域）');return {visible:count,px:p.px,ms:timing.lastLabelMs};
 }
 function regionBox(polys){let w=Infinity,s=Infinity,e=-Infinity,n=-Infinity;for(const poly of polys)for(const ring of poly)for(const p of ring){w=Math.min(w,p[0]);s=Math.min(s,p[1]);e=Math.max(e,p[0]);n=Math.max(n,p[1]);}return [w,s,e,n];}
 function prepare(entry){if(!prepared.has(entry))prepared.set(entry,{arcs:entry.arcs.map(a=>({arc:a,box:regionBox([[a]])})),regions:entry.regions.map(r=>({region:r,polys:r.polys.map(p=>({poly:p,box:regionBox([p])}))}))});return prepared.get(entry);}
 function renderShapesMain(){
  if(!index||!isActive()||!shapes)return;if(activePointers.size){schedule();return;}const f=frame(),v={x:f.view.x-f.view.w*.5,y:f.view.y-f.view.h*.5,w:f.view.w*2,h:f.view.h*2};
  const overlaps=b=>{const a=projection([b[0],b[3]]),z=projection([b[2],b[1]]);return z[0]>=v.x&&a[0]<=v.x+v.w&&z[1]>=v.y&&a[1]<=v.y+v.h;};
  const entries=f.zoom>=8?store.entries().filter(([,e])=>overlaps(e.box)):[],key=entries.map(([code])=>code).sort().join(',')+'|'+[v.x,v.y,v.w,v.h].map(n=>n.toFixed(3)).join(',')+'|'+(selectionEntry?selected:'');
  if(key===shapeKey){for(const n of shapes.querySelectorAll('.land'))n.classList.toggle('chosen',n.dataset.code===selected);return;}
  shapeKey=key;const shapeStart=performance.now(),fragment=document.createDocumentFragment(),arcs=[],loaded=new Set(entries.map(([code])=>code)),R=global.KussoonV2MunicipalRenderer;
  for(const feat of overview().features){const code=feat.properties.code,detail=loaded.has(code),polys=feat.geometry.type==='Polygon'?[feat.geometry.coordinates]:feat.geometry.coordinates;const p=tag('path',{d:R.pathFromPolygons(polys,projection,4),class:detail?'prefecture-focus':'prefecture','data-pref':code,tabindex:0,role:'button','aria-label':prefName(code)});p.append(tag('title'));p.firstChild.textContent=prefName(code);fragment.append(p);if(!detail)for(const poly of polys)arcs.push(...poly);}
  let chosenDrawn=false;
  const land=(r,polys)=>{if(!polys.length)return;const p=tag('path',{d:R.pathFromPolygons(polys,projection,4),class:'land'+(r.code===selected?' chosen':''),'data-code':r.code,'data-national-code':r.code});p.append(tag('title'));p.firstChild.textContent=r.fullName||r.name;fragment.append(p);if(r.code===selected)chosenDrawn=true;};
  for(const [,entry] of entries){const data=prepare(entry);for(const a of data.arcs)if(overlaps(a.box))arcs.push(a.arc);for(const x of data.regions)land(x.region,x.polys.filter(p=>overlaps(p.box)).map(p=>p.poly));}
  if(!chosenDrawn&&selectionEntry){const r=selectionEntry.regions[0];land(r,r.polys.filter(p=>overlaps(regionBox([p]))));}
  const generatedAt=performance.now(),segments=uniqueSegments(arcs,projection,v),dedupAt=performance.now(),border=tag('path',{d:R.pathFromArcs(segments,projection,4),class:'borders','pointer-events':'none'}),pathsAt=performance.now();fragment.append(border);shapes.replaceChildren(fragment);timing.shapePhases={prepareAndFillsMs:generatedAt-shapeStart,dedupMs:dedupAt-generatedAt,borderPathMs:pathsAt-dedupAt,domCommitMs:performance.now()-pathsAt,segments:segments.length};timing.shapePasses++;timing.lastShapeMs=performance.now()-shapeStart;timing.maxShapeMs=Math.max(timing.maxShapeMs,timing.lastShapeMs);
 }
 async function renderShapes(){
  if(!geometry?.available()){renderShapesMain();return;}
  if(!index||!isActive()||!shapes||disposed)return;if(activePointers.size){schedule();return;}
  const f=frame(),v={x:f.view.x-f.view.w*.5,y:f.view.y-f.view.h*.5,w:f.view.w*2,h:f.view.h*2};
  const overlaps=b=>{const a=projection([b[0],b[3]]),z=projection([b[2],b[1]]);return z[0]>=v.x&&a[0]<=v.x+v.w&&z[1]>=v.y&&a[1]<=v.y+v.h;};
  const entries=f.zoom>=8?store.entries().filter(([,e])=>overlaps(e.box)):[],key=entries.map(([code])=>code).sort().join(',')+'|'+[v.x,v.y,v.w,v.h].map(n=>n.toFixed(3)).join(',')+'|'+(selectionEntry?selected:'');
  if(key===shapeKey){for(const n of shapes.querySelectorAll('.land'))n.classList.toggle('chosen',n.dataset.code===selected);return;}
  if(shapePending&&requestKey===key)return;
  requestKey=key;shapePending=true;const id=++sceneSequence,layer=shapes,version=generation,start=performance.now(),o=projection([0,0]),x=projection([1,0]),y=projection([0,1]);
  try{
   const scene=await geometry.scene({entries,overview:overviewEntry,selection:selectionEntry,projection:[x[0]-o[0],o[0],y[1]-o[1],o[1]],clip:v,selected});
   if(!scene||id!==sceneSequence||layer!==shapes||version!==generation||!isActive()||activePointers.size)return;
   const fragment=document.createDocumentFragment(),domStart=performance.now();let sliceStart=domStart,maxSlice=0;
   for(const item of scene.paths){const county=item.kind!=='land',node=tag('path',{d:item.d,class:item.kind+(item.kind==='land'&&item.code===selected?' chosen':''),...(county?{'data-pref':item.code,tabindex:0,role:'button','aria-label':prefName(item.code)}:{'data-code':item.code,'data-national-code':item.code})});node.append(tag('title'));node.firstChild.textContent=county?prefName(item.code):item.name;fragment.append(node);
    if(performance.now()-sliceStart>=4){maxSlice=Math.max(maxSlice,performance.now()-sliceStart);await new Promise(r=>setTimeout(r,0));sliceStart=performance.now();if(id!==sceneSequence||version!==generation||activePointers.size)return;}}
   fragment.append(tag('path',{d:scene.border,class:'borders','pointer-events':'none'}));maxSlice=Math.max(maxSlice,performance.now()-sliceStart);
   if(id!==sceneSequence||version!==generation||layer!==shapes||activePointers.size||!isActive())return;
   const commitAt=performance.now();shapes.replaceChildren(fragment);shapeKey=key;timing.shapePasses++;timing.lastShapeMs=performance.now()-domStart;timing.maxShapeMs=Math.max(timing.maxShapeMs,timing.lastShapeMs);timing.shapePhases={backend:'worker',wallMs:performance.now()-start,worker:scene.metrics,domCommitMs:performance.now()-commitAt,domMaxSliceMs:maxSlice};
  }catch(e){if(id===sceneSequence&&version===generation&&isActive()&&!activePointers.size){if(!geometry.available())renderShapesMain();else{requestKey='';schedule();}}}
  finally{if(id===sceneSequence){shapePending=false;requestKey='';if(shapeKey!==key&&geometry.available()&&isActive()&&!disposed&&!activePointers.size)schedule();}}
 }
 function bounded(list){const result=[];let bytes=0;const budget=store.stats().byteCapacity;for(const pref of list){const size=index.prefectureBytes[pref];if(!result.length||bytes+size<=budget){result.push(pref);bytes+=size;}if(result.length===3||bytes>budget)break;}return result;}
 function wanted(){const f=frame(),v=f.view,cx=v.x+v.w/2,cy=v.y+v.h/2,rank=new Map();for(const m of ms){const b=m.box;if(b.maxX<v.x||b.minX>v.x+v.w||b.maxY<v.y||b.minY>v.y+v.h)continue;const distance=Math.hypot((m.point[0]-cx)/v.w,(m.point[1]-cy)/v.h);rank.set(m.pref,Math.min(rank.get(m.pref)??Infinity,distance));}const list=[...rank].sort((a,b)=>a[1]-b[1]).map(x=>x[0]);if(selected){const m=ms.find(r=>r.code===selected),b=m.box;if(b.maxX>=v.x&&b.minX<=v.x+v.w&&b.maxY>=v.y&&b.minY<=v.y+v.h){const pin=selected.slice(0,2);return bounded([pin,...list.filter(x=>x!==pin)]);}}return bounded(list);}
 async function flush(){
  timer=null;if(!index||!isActive()||disposed)return;if(activePointers.size){schedule();return;}if(!labelLayer){mount(projection);return;}const id=++generation;refreshLabels();if(frame().zoom<8){store.retain(selected?[selected.slice(0,2)]:[]);renderShapes();return;}
  const targets=wanted();store.retain(targets);
  try{await Promise.all(targets.map(code=>store.get(code)));if(id===generation&&isActive()){detailError='';renderShapes();refreshLabels();}}
  catch(e){if(id===generation&&isActive()){detailError='詳細地図の読み込みに失敗しました。地名は表示できます。操作すると再試行します。';onStatus?.(selectionError||detailError);}}
 }
 function schedule(){if(disposed)return;generation++;clearTimeout(timer);timer=setTimeout(flush,160);}
 function mount(p){projection=p;if(activePointers.size){schedule();return;}if(!index){schedule();return;}ms=models(index,projection);shapeKey=null;requestKey='';sceneSequence++;shapePending=false;overviewEntry={arcs:[],regions:overview().features.map(f=>({code:f.properties.code,name:prefName(f.properties.code),polys:f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates}))};labelNodes.clear();shapes=tag('g',{'data-national-shapes':''});labelLayer=tag('g',{'data-progressive-labels':''});map.replaceChildren(shapes,labelLayer);map.classList.add('progressive-national');const boxes=ms.map(m=>m.box);viewport.setContentBounds({minX:Math.min(...boxes.map(b=>b.minX)),minY:Math.min(...boxes.map(b=>b.minY)),maxX:Math.max(...boxes.map(b=>b.maxX)),maxY:Math.max(...boxes.map(b=>b.maxY))});renderShapesMain();refreshLabels();schedule();}
 function pause(){generation++;sceneSequence++;shapePending=false;requestKey='';selectionSequence++;selected='';selectionError='';detailError='';selectionEntry=null;clearTimeout(timer);map.classList.remove('progressive-national');}
 async function select(code){await ready;if(!isActive())return;if(!index.entries.some(x=>x.code===code))throw Error('Unknown municipality');selected=selected===code?'':code;selectionError='';selectionEntry=null;const id=++selectionSequence;onSelection?.();refreshLabels();renderShapes();if(!selected)return;try{const entry=await store.get(code.slice(0,2));if(id!==selectionSequence||!isActive()||selected!==code)return;entry.offices=await loadOffices(code.slice(0,2));if(id!==selectionSequence||!isActive()||selected!==code)return;const region=entry.regions.find(r=>r.code===code);if(!region)throw Error('Selected code missing from detail source');selectionEntry={arcs:[],regions:[region],offices:entry.offices};renderShapes();onSelection?.();}catch(e){if(id===selectionSequence){selectionError='庁舎・詳細地図を取得できませんでした。地名選択は保持しています。';onStatus?.(selectionError);}}}
 async function focus(code){await ready;if(!isActive())return;const m=ms.find(x=>x.code===code);if(!m)throw Error('Unknown municipality');const w=Math.min(850/8,Math.max(850/128,m.box.w*1.6,m.box.h*850/700*1.6));viewport.setView({x:m.point[0]-w/2,y:m.point[1]-w*700/850/2,w,h:w*700/850});if(selected===code){selected='';}await select(code);schedule();}
 function clear(){selected='';selectionError='';detailError='';selectionEntry=null;selectionSequence++;onSelection?.();}
 function press(e){activePointers.add(e.pointerId);}function release(e){if(activePointers.delete(e.pointerId)&&!activePointers.size)schedule();}function blur(){activePointers.clear();schedule();}
 map.addEventListener('pointerdown',press);global.addEventListener('pointerup',release,true);global.addEventListener('pointercancel',release,true);global.addEventListener('blur',blur);global.addEventListener('resize',schedule);
 return Object.freeze({ready,mount,pause,schedule,refreshLabels,select,focus,clear,selected:()=>selected,selection:()=>selectionEntry&&selected?{entry:selectionEntry,code:selected,pref:selected.slice(0,2)}:null,releaseGeometry:key=>geometry?.release(key),project:p=>projection(p),snapshot:()=>({selected,selectionError,detailError,measureEntries:widths.size,count:index?.count||0,store:store.stats(),...timing,shapePending,geometry:geometry?.stats()||{backend:'main'}}),anchors:()=>ms.map(m=>({code:m.code,point:m.point.slice(),bounds:m.box})),destroy(){pause();geometry?.destroy();map.removeEventListener('pointerdown',press);global.removeEventListener('pointerup',release,true);global.removeEventListener('pointercancel',release,true);global.removeEventListener('blur',blur);global.removeEventListener('resize',schedule);disposed=true;}});
}
global.KussoonV2NationalProgressive=Object.freeze({fontSize,validateIndex,createStore,models,plan,uniqueSegments,create});
})(window);
