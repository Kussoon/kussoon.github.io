#!/usr/bin/env node
'use strict';
/* S39 read-only: compare each 2026 overview outline against per-prefecture
 * detail outer arcs. A mismatch is evidence of two *different* geometries,
 * NOT proof of a legal boundary error. No files under v2/data are changed.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const base='v2/data/national/2026-common/';
const m=read(base+'national-2026-pilot/manifest.json');
const o=read(base+'national-2026-pilot/prefectures-overview.geojson');
const key=p=>p[0].toFixed(7)+','+p[1].toFixed(7);
function segments(rings) {
 const result=new Set(), points=new Map();
 for(const ring of rings)for(let i=1;i<ring.length;i++){
  const a=key(ring[i-1]),b=key(ring[i]);
  if(a===b)continue;
  result.add(a<b?a+'|'+b:b+'|'+a);
  if(!points.has(a))points.set(a,ring[i-1]);
  if(!points.has(b))points.set(b,ring[i]);
 }
 return {edges:result,points};
}
function overviewRings(g){
 const p=g.type==='Polygon'?[g.coordinates]:g.coordinates;
 assert(['Polygon','MultiPolygon'].includes(g.type));
 return p.flatMap(poly=>poly);
}
function decode(t,index){
 const source=t.arcs[index<0?~index:index];
 let x=0,y=0;
 const out=source.map(p=>{if(t.transform){x+=p[0];y+=p[1];return [x*t.transform.scale[0]+t.transform.translate[0],y*t.transform.scale[1]+t.transform.translate[1]];}return p;});
 return index<0?out.reverse():out;
}
function detailRings(t){
 const usage=new Map();
 for(const g of t.objects.municipalities.geometries){
  const polygons=g.type==='Polygon'?[g.arcs]:g.arcs;
  for(const poly of polygons)for(const ring of poly)for(const signed of ring){
   const id=signed<0?~signed:signed;usage.set(id,(usage.get(id)||0)+1);
  }
 }
 return [...usage].filter(([,n])=>n===1).map(([id])=>decode(t,id));
}
function bucketize(points,cell=.003){
 const buckets=new Map();
 for(const pt of points.values()){
  const x=Math.floor(pt[0]/cell),y=Math.floor(pt[1]/cell),k=x+','+y;
  if(!buckets.has(k))buckets.set(k,[]);
  buckets.get(k).push(pt);
 }
 return {buckets,cell};
}
function distanceToPoints(p,b){
 const {cell,buckets}=b,ix=Math.floor(p[0]/cell),iy=Math.floor(p[1]/cell);
 let closest=Infinity;
 for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
  for(const q of buckets.get((ix+dx)+','+(iy+dy))||[]){
   const d=Math.hypot((p[0]-q[0])*Math.cos(p[1]*Math.PI/180),p[1]-q[1])*111200;
   if(d<closest)closest=d;
  }
 }
 return Number.isFinite(closest)?closest:null;
}
function compare(a,b){
 let exact=0;for(const edge of a.edges)if(b.edges.has(edge))exact++;
 const spatial=bucketize(b.points),distances=[],noNearby=[];
 let n=0;
 for(const p of a.points.values()){
  if(n++%17!==0)continue;
  const d=distanceToPoints(p,spatial);
  if(d===null){if(noNearby.length<8)noNearby.push(p);continue;}
  distances.push(d);
 }
 distances.sort((x,y)=>x-y);
 const q=ratio=>distances.length?Number(distances[Math.floor((distances.length-1)*ratio)].toFixed(1)):null;
 return {overviewEdges:a.edges.size,detailExteriorEdges:b.edges.size,identicalEdges:exact,
  overviewOnlyEdges:a.edges.size-exact,detailOnlyEdges:b.edges.size-exact,
  overviewVertexSampleSize:Math.ceil(a.points.size/17),nearbySamples:distances.length,
  sampleDistanceMeters:{median:q(.5),p95:q(.95),max:q(1)},noNearbyExamples:noNearby};
}
function run(){
 assert.equal(m.entries.length,47);assert.equal(o.features.length,47);
 const byCode=new Map(o.features.map(f=>[f.properties.code,f]));
 const rows=[];
 for(const entry of m.entries){
  const f=byCode.get(entry.pref);
  assert(f,'missing overview '+entry.pref);
  const t=read(base+entry.source),a=segments(overviewRings(f.geometry)),b=segments(detailRings(t));
  rows.push({pref:entry.pref,regions:entry.regions,...compare(a,b)});
 }
 const s={prefectures:rows.length,withMixedExactMismatch:rows.filter(x=>x.overviewOnlyEdges||x.detailOnlyEdges).length,
  withNearbyDistanceOver30m:rows.filter(x=>x.sampleDistanceMeters.p95>30).length,
  mixedSummary:'The two drawn sources are geometrically different where exact edges differ; this is not an identification of gap locations or a claim of a faulty official boundary.'};
 return {schemaVersion:1,kind:'S39-overview-vs-detail-readonly',summary:s,rows,
  limitations:['Overview is intentionally simplified, so many differing edges are expected.',
  'Distances use sampled overview vertices and nearby detail vertices; do not equate vertex distance with a legal boundary displacement.',
  'Region interiors, SVG rings, raster antialiasing, worker main/fallback and real-touch states still require separate checks.',
  'Both sources are compared without editing geometry, label data or region selection.']};
}
function selfTest(){
 const a=segments([[[0,0],[1,0],[1,1],[0,1],[0,0]]]);
 const b=segments([[[0,0],[1,0],[1,1],[0,1],[0,0]]]);
 assert.equal(compare(a,b).overviewOnlyEdges,0);
 const c=segments([[[0,0],[1,0],[1.01,1],[0,1],[0,0]]]);
 assert(compare(a,c).overviewOnlyEdges>0);
 assert.equal(decode({arcs:[[[0,0],[1,0]]]},~0)[0][0],1);
 console.log('PASS S39 matched, shifted, reversed source geometry negative controls');
}
if(process.argv.includes('--self-test'))selfTest();
else{
 const report=run(),output=process.argv[2];
 if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify(report.summary));
 for(const r of report.rows)console.log(r.pref+': overviewOnly='+r.overviewOnlyEdges+', detailOnly='+r.detailOnlyEdges+', p95='+r.sampleDistanceMeters.p95+'m');
}
