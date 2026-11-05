'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{performance}=require('node:perf_hooks');
const ctx={window:{},performance,Float64Array,setTimeout};vm.createContext(ctx);for(const file of ['municipality-renderer','national-progressive-labels','progressive-geometry'])vm.runInContext(fs.readFileSync('v2/shared/'+file+'.js','utf8'),ctx);
const G=ctx.window.KussoonProgressiveGeometry,P=ctx.window.KussoonV2NationalProgressive,R=ctx.window.KussoonV2MunicipalRenderer,segments=require('./helpers/svg-segments.cjs');
const square=[[0,0],[1,0],[1,1],[0,1],[0,0]],opposite=square.slice().reverse();
function entry(){return {arcs:[square,opposite],regions:[{code:'28101',fullName:'神戸市東灘区',polys:[[square]]}],box:[0,0,1,1],bytes:100};}
test('worker scene preserves every rounded fill coordinate and exact unique border edge, without LOD',async()=>{
 const data=await G.pack(entry());data.code='28';const overview=await G.pack({arcs:[],regions:[{code:'28',name:'兵庫県',polys:[[square]]}]});
 const scene=G.buildScene({entries:[data],overview,projection:[10,2,-10,15],clip:{x:-10,y:-10,w:40,h:40},selected:'28101'});
 const land=scene.paths.find(x=>x.kind==='land');assert.equal(land.name,'神戸市東灘区');assert.equal(land.d,R.pathFromPolygons([[square]],p=>[10*p[0]+2,-10*p[1]+15],4));
 const expected=segments(R.pathFromArcs(P.uniqueSegments(entry().arcs,p=>[10*p[0]+2,-10*p[1]+15]),p=>[10*p[0]+2,-10*p[1]+15],4));assert.deepEqual(segments(scene.border).sort(),expected.sort());assert.equal(scene.metrics.segments,4);assert.equal(scene.paths[0].kind,'prefecture-focus');
});
test('viewport culling retains a selected island after its prefecture cache is evicted',async()=>{
 const data=await G.pack(entry()),overview=await G.pack({arcs:[],regions:[{code:'28',name:'兵庫県',polys:[[square]]}]});
 const scene=G.buildScene({entries:[],overview,selection:data,projection:[1,0,-1,0],clip:{x:-2,y:-2,w:4,h:4},selected:'28101'});assert.equal(scene.paths.filter(x=>x.kind==='land').length,1);assert.equal(scene.paths[0].kind,'prefecture');
 const off=G.buildScene({entries:[{...data,code:'28'}],overview,projection:[1,0,-1,0],clip:{x:10,y:10,w:1,h:1},selected:''});assert.equal(off.paths.filter(x=>x.kind==='land').length,0);assert.equal(off.border,'');
});
test('packing yields instead of holding the UI thread and uses transferable numeric buffers',async()=>{
 const points=Array.from({length:100000},(_,i)=>[i/1000,i/2000]);let yields=0;const packed=await G.pack({arcs:[points],regions:[]},async()=>{yields++;});assert(packed.points instanceof Float64Array);assert.equal(packed.points.length,200000);assert.equal(packed.points[199998],99.999);assert(yields>0);assert.equal(packed.metrics.yields,yields);
});
test('LRU eviction releases worker ownership exactly once; hits are not evictions',async()=>{
 const evicted=[],store=P.createStore({capacity:2,onEvict:key=>evicted.push(key),load:async key=>({bytes:100,key})});await store.get('01');await store.get('02');await store.get('01');await store.get('03');assert.deepEqual(evicted,['02']);assert.equal(store.stats().cached,2);
});
test('real 2026 Mie geometry keeps the original fills and clipped boundary edge set',async()=>{
 const path=require('node:path'),base='v2/data/national/2026-common',manifest=JSON.parse(fs.readFileSync(base+'/national-2026-pilot/manifest.json')),meta=manifest.entries.find(x=>x.pref==='24'),t=JSON.parse(fs.readFileSync(path.join(base,meta.source)));
 const arcs=t.arcs.map(a=>{let x=0,y=0;return a.map(q=>{if(!t.transform)return q;x+=q[0];y+=q[1];return [x*t.transform.scale[0]+t.transform.translate[0],y*t.transform.scale[1]+t.transform.translate[1]];});});
 const ring=ids=>ids.flatMap((id,i)=>{const a=arcs[id<0?~id:id],points=id<0?a.slice().reverse():a;return points.slice(i?1:0);});
 const regions=t.objects.municipalities.geometries.map(g=>({code:String(g.properties.N03_007),name:g.properties.N03_004,polys:(g.type==='Polygon'?[g.arcs]:g.arcs).map(p=>p.map(ring))}));
 const data=await G.pack({arcs,regions});data.code='24';const overview=await G.pack({arcs:[],regions:[]}),project=p=>[p[0]*30,-p[1]*30],clip={x:4080,y:-1050,w:60,h:60};
 const scene=G.buildScene({entries:[data],overview,projection:[30,0,-30,0],clip});
 const old=segments(R.pathFromArcs(P.uniqueSegments(arcs,project,clip),project,4)),next=segments(scene.border);assert.deepEqual(next.sort(),old.sort());assert.equal(new Set(next).size,next.length);assert(scene.border.length<R.pathFromArcs(P.uniqueSegments(arcs,project,clip),project,4).length,'contiguous paths compress commands without dropping edges');
 for(const item of scene.paths){const r=regions.find(x=>x.code===item.code),polys=r.polys.filter(poly=>{const b=G.boxOf(poly);return b[2]*30>=clip.x&&b[0]*30<=clip.x+clip.w&&-b[1]*30>=clip.y&&-b[3]*30<=clip.y+clip.h;});assert.equal(item.d,R.pathFromPolygons(polys,project,4));}assert(scene.paths.length>0);
});
