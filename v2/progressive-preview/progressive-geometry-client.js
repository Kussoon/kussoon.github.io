/* Worker scene preparation with coalesced frames and cooperative packing slices (4ms target; allocation/GC may exceed it).
 * Falls back to the retained original renderer if workers are unavailable.
 */
(function(global){'use strict';
function create({url,canWork=()=>true,ownsEntry=()=>true}){
 let worker=null,next=0,dead=false,busy=false,latest=null,selectionRef=null,overviewRef=null;const pending=new Map(),packed=new Map(),metrics={backend:'worker',packMaxSliceMs:0,packWallMs:0,transferMs:0,bufferBytes:0,sceneRequests:0,coalesced:0};
 try{worker=new Worker(url);}catch(e){dead=true;metrics.backend='main-fallback';}
 function fail(e){dead=true;metrics.backend='main-fallback';worker?.terminate();for(const p of pending.values())p.reject(e);pending.clear();for(const p of packed.values())p.cancelled=true;packed.clear();}
 if(worker){worker.onmessage=({data:m})=>{const p=pending.get(m.id);if(!p)return;pending.delete(m.id);if(m.result?.metrics?.sentAt)m.result.metrics.receiveLagMs=Math.max(0,Date.now()-m.result.metrics.sentAt);m.error?p.reject(Error(m.error)):p.resolve(m.result);};worker.onerror=e=>{e.preventDefault();fail(Error(e.message||'Geometry worker failed'));};}
 function request(data,transfer=[]){if(dead)return Promise.reject(Error('Geometry worker unavailable'));const id=++next;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});const t=performance.now();worker.postMessage({...data,id},transfer);metrics.transferMs=Math.max(metrics.transferMs,performance.now()-t);});}
 const yieldTask=async()=>{await new Promise(r=>setTimeout(r,0));while(!canWork()&&!dead)await new Promise(r=>setTimeout(r,32));};
 async function pack(entry){const data=await global.KussoonProgressiveGeometry.pack(entry,yieldTask);metrics.packMaxSliceMs=Math.max(metrics.packMaxSliceMs,data.metrics.maxSliceMs);metrics.packWallMs+=data.metrics.packWallMs;return data;}
 function ensure(key,entry){if(!ownsEntry(key,entry))return Promise.reject(Error('Geometry entry expired'));if(packed.get(key)?.entry===entry)return packed.get(key).promise;const token={entry,cancelled:false};token.promise=(async()=>{const data=await pack(entry);if(token.cancelled||!ownsEntry(key,entry))throw Error('Geometry entry expired');const r=await request({type:'put',key,entry:data},[data.points.buffer]);metrics.bufferBytes=r.bufferBytes;return true;})();token.promise=token.promise.catch(e=>{if(packed.get(key)===token)packed.delete(key);throw e;});packed.set(key,token);return token.promise;}
 async function scene(input){
  if(dead)throw Error('Geometry worker unavailable');
  // One job plus one latest request, so a fast pan cannot queue old expensive scenes.
  if(busy){if(latest){latest.resolve(null);metrics.coalesced++;}return new Promise((resolve,reject)=>{latest={input,resolve,reject};});}
  busy=true;try{
   if(overviewRef!==input.overview){overviewRef=input.overview;const data=await pack(input.overview);await request({type:'overview',entry:data},[data.points.buffer]);}
   await Promise.all(input.entries.map(([key,entry])=>ensure(key,entry)));
   if(selectionRef!==input.selection){selectionRef=input.selection;const data=input.selection?await pack(input.selection):null;await request({type:'selection',entry:data},data?[data.points.buffer]:[]);}
   metrics.sceneRequests++;const r=await request({type:'scene',keys:input.entries.map(x=>x[0]),projection:input.projection,clip:input.clip,selected:input.selected});return r;
  }finally{busy=false;const queued=latest;latest=null;if(queued)scene(queued.input).then(queued.resolve,queued.reject);}
 }
 return Object.freeze({available:()=>!dead,scene,release(key){const token=packed.get(key);if(token)token.cancelled=true;packed.delete(key);if(!dead)worker.postMessage({type:'release',key});},stats:()=>({...metrics,cached:packed.size,pending:pending.size}),destroy(){fail(Error('Geometry worker disposed'));if(latest)latest.resolve(null);latest=null;}});
}
global.KussoonProgressiveGeometryClient=Object.freeze({create});
})(window);
