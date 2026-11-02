#!/usr/bin/env node
// Regression against actual 2026 Hokkaido / Shizuoka municipality polygons,
// using the original 2021-era V2 geometry engines through the 2026 adapter.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root='v2/data/national/2026-common/';
const context={window:{},performance:{now:()=>0},console,document:{
 createElement(tag){return tag==='canvas'?{getContext(){return {set font(v){},measureText(text){return {width:Array.from(String(text)).length*14};}}}}:null;}
}};
for(const file of [
 'v2/common/js/label-engine.js','v2/common/js/readable-labels.js',
 'v2/common/js/collision-refinement.js','v2/common/js/region-fit.js',
 'v2/shared/established-label-adapter.js'
])vm.runInNewContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const L=context.window.KussoonV2EstablishedLabelAdapter;
const E=context.window.KussoonLabelEngine,F=context.window.KussoonRegionFit;
assert(L&&E&&F,'the actual four established V2 geometry engines must be connected');
function decode(t){
 return t.arcs.map(arc=>{
  let x=0,y=0;
  return arc.map(p=>{if(t.transform){x+=p[0];y+=p[1];return [x*t.transform.scale[0]+t.transform.translate[0],y*t.transform.scale[1]+t.transform.translate[1]];}return p;});
 });
}
function polygonRings(g,arcs){
 const ring=ids=>{const pts=[];for(const id of ids){const raw=arcs[id<0?~id:id],part=id<0?raw.slice().reverse():raw;pts.push(...(pts.length?part.slice(1):part));}return pts;};
 return g.type==='Polygon'?[g.arcs.map(ring)]:g.arcs.map(p=>p.map(ring));
}
function sample(code,pref){
 const manifest=JSON.parse(fs.readFileSync(root+'national-2026-pilot/manifest.json'));
 const row=manifest.entries.find(r=>r.pref===pref);
 const topo=JSON.parse(fs.readFileSync(root+row.source));
 const target=topo.objects.municipalities.geometries.find(g=>String(g.properties.N03_007)===code);
 assert(target,'missing official 2026 municipality '+code);
 const region={code,name:target.properties.N03_004,polys:polygonRings(target,decode(topo))};
 const polygon=L.largestPolygon(region.polys,p=>p),pts=polygon[0];
 let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity;
 for(const p of pts){a=Math.min(a,p[0]);b=Math.min(b,p[1]);c=Math.max(c,p[0]);d=Math.max(d,p[1]);}
 const cos=Math.cos((b+d)/2*Math.PI/180),scale=Math.min(780/Math.max((c-a)*cos,.05),630/Math.max(d-b,.05));
 const projection=p=>[425+(p[0]-(a+c)/2)*cos*scale,350-(p[1]-(b+d)/2)*scale];
 const result=L.layout({regions:[region],project:projection,selected:code,all:false,readings:false});
 const point=result.get(code),model=L.modelFor(region,projection);
 assert(point&&point.every(Number.isFinite),'invalid label position: '+code);
 const v=E.buildModels([model]).models[0];
 const inside=E.isInside(point[0],point[1],v.rings);
 const clearance=E.signedDist(point[0],point[1],v.rings);
 assert(inside,'label outside own land polygon: '+code);
 assert(clearance>0,'not enough distance from exterior: '+code);
 console.log('PASS original V2 engine with real 2026 polygon',pref,code,'position',point.map(n=>n.toFixed(2)).join(','),'clearance',clearance.toFixed(2));
}
sample('01102','01'); // Sapporo Kita Ward with long narrow / complex territory.
sample('22205','22'); // Atami: coastal shape and Hatsushima detached island.
const shape={code:'99999',name:'試験町',polys:[
 [[[0,0],[5,0],[5,1],[1,1],[1,5],[0,5],[0,0]]],
 [[[40,40],[40.1,40],[40.1,40.1],[40,40.1],[40,40]]]
]};
const positions=L.layout({regions:[shape],project:p=>[p[0]*100,p[1]*100],selected:'99999'});
const point=positions.get('99999');
assert(point&&point[0]<500&&point[1]<500,'offshore island displaced label anchor');
console.log('PASS established V2 shared placement: geometry-driven / no per-municipality coordinates');
