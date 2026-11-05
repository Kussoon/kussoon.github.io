/* Bounded, buffer-only geometry cache. No fetches or administrative data edits. */
importScripts('progressive-geometry.js');
const entries=new Map();let overview=null,selection=null;
self.onmessage=({data:m})=>{try{
 if(m.type==='put'){entries.set(m.key,m.entry);self.postMessage({id:m.id,result:{cached:entries.size,bufferBytes:[...entries.values()].reduce((n,e)=>n+e.points.byteLength,0)}});}
 else if(m.type==='release'){entries.delete(m.key);}
 else if(m.type==='overview'){overview=m.entry;self.postMessage({id:m.id,result:true});}
 else if(m.type==='selection'){selection=m.entry;self.postMessage({id:m.id,result:true});}
 else if(m.type==='scene'){const data=m.keys.map(code=>{const e=entries.get(code);if(!e)throw Error('Geometry expired '+code);return {...e,code};});const result=KussoonProgressiveGeometry.buildScene({...m,entries:data,overview,selection});result.metrics.workerCached=entries.size;result.metrics.workerBufferBytes=[...entries.values()].reduce((n,e)=>n+e.points.byteLength,0)+(selection?.points.byteLength||0)+(overview?.points.byteLength||0);const encodeAt=performance.now(),encoder=new TextEncoder(),buffers=[];for(const path of result.paths){path.data=encoder.encode(path.d);delete path.d;buffers.push(path.data.buffer);}result.borderData=encoder.encode(result.border);delete result.border;buffers.push(result.borderData.buffer);result.metrics.encodeMs=performance.now()-encodeAt;result.metrics.replyBytes=buffers.reduce((n,b)=>n+b.byteLength,0);result.metrics.sentAt=Date.now();self.postMessage({id:m.id,result},buffers);}
 }catch(e){self.postMessage({id:m.id,error:e.message});}};
