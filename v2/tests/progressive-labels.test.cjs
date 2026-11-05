'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),ctx={window:{},setTimeout,clearTimeout};vm.createContext(ctx);
for(const name of ['v2/common/js/administrative-labels.js','v2/common/js/national-readings.js','v2/national/density-labels.js','v2/shared/national-progressive-labels.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),ctx);
const P=ctx.window.KussoonV2NationalProgressive,index=JSON.parse(fs.readFileSync(path.join(root,'v2/data/national/2026-common/national-2026-pilot/label-index.json')));
test('current 2026 population and exceptions, not legacy 1902',()=>{
 assert.equal(P.validateIndex(index),index);const codes=new Set(index.entries.map(x=>x.code));for(const c of ['22138','22139','22140','01695','01700'])assert(codes.has(c));for(let n=22131;n<=22137;n++)assert(!codes.has(String(n)));assert.equal(index.entries.filter(x=>x.code.endsWith('000')).length,7);
 const duplicate=structuredClone(index);duplicate.entries[1]=duplicate.entries[0];assert.throws(()=>P.validateIndex(duplicate));const missing=structuredClone(index);missing.entries.pop();assert.throws(()=>P.validateIndex(missing));const bad=structuredClone(index);bad.entries[0].anchor=[NaN,0];assert.throws(()=>P.validateIndex(bad));
});
test('screen font follows old progression without changing prefecture defaults',()=>{assert.deepEqual([1,2,4,8,16].map(P.fontSize),[7,8.8,10.6,12.4,13]);assert.equal(P.fontSize(768),13);});
test('progression adds colliding fixed-cohort labels and zooming out culls again',()=>{
 const models=[0,1,2].map(n=>({id:String(n),code:'2800'+n,name:'自治体'+n,point:[50+n*5,50],box:{w:10,h:10}}));
 const run=zoom=>P.plan(models,{view:{x:0,y:0,w:100,h:100},width:390,height:390,ratio:3.9,zoom,measure:(s,z)=>s.length*z});
 const wide=run(1),close=run(16),out=run(1);assert(wide.visible.filter(Boolean).length<3);assert.equal(close.visible.filter(Boolean).length,3);assert.equal(out.visible.filter(Boolean).length,wide.visible.filter(Boolean).length);assert.equal(close.labels[0].x,50);
});
test('reverse and repeated geographic segments render once, distinct geometry stays',()=>{const a=[0,0],b=[1,1],c=[2,2];assert.equal(P.uniqueSegments([[a,b,c],[c,b,a],[a,b]]).length,2);});
test('store coalesces inflight work, bounds concurrency and LRU with a selected pin',async()=>{
 let active=0,peak=0;const store=P.createStore({load:async key=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,5));active--;return {key};},pinned:()=> '01'});
 const first=await Promise.all(['01','01','02','03','04'].map(k=>store.get(k)));assert.equal(first[0],first[1]);assert.equal(peak,2);assert(store.stats().cached<=3);assert(store.peek('01'));assert.equal(store.stats().loads,4);
});
test('failed detail load is observable and can be retried, not cached as success',async()=>{let tries=0;const store=P.createStore({load:async()=>{if(++tries===1)throw Error('offline');return 'ok';}});await assert.rejects(store.get('24'));assert.equal(await store.get('24'),'ok');});
test('all generated anchors are in declared source bounds; ward rows and unresolved northern readings retained',()=>{for(const r of index.entries){assert(r.anchor[0]>=r.bounds[0]&&r.anchor[0]<=r.bounds[2]);assert(r.anchor[1]>=r.bounds[1]&&r.anchor[1]<=r.bounds[3]);}const ward=index.entries.find(x=>x.code==='28101');assert.equal(ward.parts.length,2);assert.equal(ward.parts[0].name,'神戸市');assert.equal(ward.parts[1].name,'東灘区');assert.equal(index.entries.filter(x=>x.reading).length,1892);});
test('camera extension supports national 768 and returns to prefecture 128 without changing reset semantics',()=>{
 const c={window:{},document:{addEventListener(){},removeEventListener(){}}};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'v2/shared/map-viewport.js'),'utf8'),c);
 const attrs={},svg={style:{},setAttribute(k,v){attrs[k]=v},addEventListener(){},removeEventListener(){}};const camera=c.window.KussoonV2MapViewport.init({svg});
 camera.zoom(1000);assert.equal(camera.view().w,850/128);camera.setMaxZoom(768);camera.zoom(1000);assert.equal(camera.view().w,850/768);camera.setMaxZoom(128);assert.equal(camera.view().w,850/128);camera.reset();assert.equal(attrs.viewBox,'0 0 850 700');assert.throws(()=>camera.setMaxZoom(NaN));assert.throws(()=>camera.setView({x:NaN,y:0,w:1}));
});
test('obsolete queued viewport loads are cancelled while active and pinned work remains bounded',async()=>{
 let release;const gate=new Promise(r=>release=r);const store=P.createStore({concurrency:1,load:async key=>{await gate;return key;},pinned:()=> '01'});const a=store.get('01'),b=store.get('02'),rejected=assert.rejects(b,/Obsolete/),c=store.get('03');store.retain(['03']);release();await rejected;assert.equal(await a,'01');assert.equal(await c,'03');assert.equal(store.stats().loads,2);
});
test('resident geometry has a byte budget; a single oversized prefecture is explicit, never 47 retained',async()=>{const store=P.createStore({byteCapacity:150,load:async key=>({key,bytes:key==='03'?200:100})});await store.get('01');await store.get('02');assert.equal(store.stats().cached,1);assert.equal(store.stats().cachedBytes,100);await store.get('03');assert.equal(store.stats().cached,1);assert.equal(store.stats().cachedBytes,200);});
