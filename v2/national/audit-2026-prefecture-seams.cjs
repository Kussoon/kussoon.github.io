#!/usr/bin/env node
'use strict';
// Read-only diagnostic: compare 2026 prefectural outer-edge segments.
// Exact edge agreement is evidence of a common border, not proof of no gaps.
// Near neighbours are reported separately; this tool never modifies any map.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifest=read('v2/data/national/2026-common/national-2026-pilot/manifest.json');
const dir='v2/data/national/2026-common/';
const precision=7;
const round=n=>Number(n).toFixed(precision);
const pointKey=p=>round(p[0])+','+round(p[1]);
const edgeKey=(a,b)=>{const x=pointKey(a),y=pointKey(b);return x<y?x+'|'+y:y+'|'+x;};
function decodedArc(t,i){
 const coords=t.arcs[i<0?~i:i];
 assert(Array.isArray(coords)&&coords.length>=2,'invalid arc');
 let x=0,y=0;
 const out=coords.map(p=>{
  if(t.transform){x+=p[0];y+=p[1];return [x*t.transform.scale[0]+t.transform.translate[0],y*t.transform.scale[1]+t.transform.translate[1]];}
  return p;
 });
 return i<0?out.reverse():out;
}
function extract(t,pref){
 assert.equal(t.type,'Topology',pref+' type');
 const obj=t.objects.municipalities;
 assert.equal(obj.type,'GeometryCollection',pref+' object');
 const usages=new Map();
 const rings=[];
 for(const g of obj.geometries){
  const polygons=g.type==='Polygon'?[g.arcs]:g.type==='MultiPolygon'?g.arcs:null;
  assert(polygons,pref+' geometry');
  for(const poly of polygons)for(const ring of poly){
   rings.push(ring);
   for(const signed of ring){const index=signed<0?~signed:signed;usages.set(index,(usages.get(index)||0)+1);}
  }
 }
 const points=new Map(), edges=new Set();
 let bbox=[Infinity,Infinity,-Infinity,-Infinity],outerArcs=0;
 for(const ring of rings)for(const signed of ring){
  const index=signed<0?~signed:signed;
  if(usages.get(index)!==1)continue;
  outerArcs++;
  const coordinates=decodedArc(t,signed);
  for(const p of coordinates){
   assert(Number.isFinite(p[0])&&Number.isFinite(p[1]),'invalid point');
   const key=pointKey(p);points.set(key,p);
   bbox=[Math.min(bbox[0],p[0]),Math.min(bbox[1],p[1]),Math.max(bbox[2],p[0]),Math.max(bbox[3],p[1])];
  }
  for(let i=1;i<coordinates.length;i++)if(pointKey(coordinates[i-1])!==pointKey(coordinates[i]))edges.add(edgeKey(coordinates[i-1],coordinates[i]));
 }
 assert(edges.size>0,pref+' empty outer border');
 return {pref,points,edges,bbox,outerArcs};
}
function bboxNear(a,b,tolerance){
 return a[0]<=b[2]+tolerance&&b[0]<=a[2]+tolerance&&a[1]<=b[3]+tolerance&&b[1]<=a[3]+tolerance;
}
function compare(a,b){
 let matchingEdges=0,matchingVertices=0;
 const small=a.edges.size<b.edges.size?a:b,large=small===a?b:a;
 for(const e of small.edges)if(large.edges.has(e))matchingEdges++;
 const psmall=a.points.size<b.points.size?a:b,plarge=psmall===a?b:a;
 for(const p of psmall.points.keys())if(plarge.points.has(p))matchingVertices++;
 return {prefectures:[a.pref,b.pref],matchingEdges,matchingVertices,
  assessment:matchingEdges?'exact-segments-found':matchingVertices>=2?'shared-vertices-only':'no-exact-shared-border-evidence'};
}
function run(){
 assert.equal(manifest.prefectureCount,47);
 assert.equal(manifest.entries.length,47);
 const all=manifest.entries.map(e=>extract(read(dir+e.source),e.pref));
 const pairs=[];
 // Nearby bounding boxes can also be coastal neighbours; classify as candidates, not proven adjacency.
 for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
  if(!bboxNear(all[i].bbox,all[j].bbox,0.005))continue;
  pairs.push(compare(all[i],all[j]));
 }
 const summary={prefectures:all.length,candidatePairs:pairs.length,
  exactEdgePairs:pairs.filter(x=>x.matchingEdges>0).length,
  sharedVerticesOnly:pairs.filter(x=>!x.matchingEdges&&x.matchingVertices>=2).length,
  unconfirmedPairs:pairs.filter(x=>!x.matchingEdges&&! (x.matchingVertices>=2)).length};
 const report={schemaVersion:1,source:'2026-common per-prefecture source TopoJSON',
  note:'Bbox-proximity generates candidates, NOT certified adjacency. No exact match does NOT alone prove a gap. This report is diagnostic until a canonical shared-border topology and adjacency truth set are available.',
  precision,summary,prefectures:all.map(({pref,edges,points,outerArcs})=>({pref,outerEdges:edges.size,outerVertices:points.size,outerArcs})),pairs};
 return report;
}
function selfTest(){
 const make=(pref,x0,x1)=>({type:'Topology',objects:{municipalities:{type:'GeometryCollection',geometries:[{type:'Polygon',arcs:[[0]],properties:{N03_007:pref+'001'}}]}},
 arcs:[[[x0,0],[x1,0],[x1,1],[x0,1],[x0,0]]]});
 const a=extract(make('01',0,1),'01');
 const b=extract(make('02',1,2),'02');
 const bad=extract(make('03',1.0001,2),'03');
 assert.equal(compare(a,b).matchingEdges,1,'shared edge detected');
 assert.equal(compare(a,bad).matchingEdges,0,'separate edges rejected');
 console.log('PASS synthetic shared-edge/shifted-edge fixtures');
}
if(process.argv.includes('--self-test'))selfTest();
else{
 const report=run();
 if(process.argv[2]){const dest=process.argv[2];fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n');}
 console.log('PASS read-only 2026 outer-boundary diagnostics '+JSON.stringify(report.summary));
 console.log('WARNING candidate pairs are not validated shared-border neighbours; do not use this result as an automatic production-switch approval.');
 for(const p of report.pairs)console.log(p.prefectures.join('-')+' exactEdges='+p.matchingEdges+' exactVertices='+p.matchingVertices+' '+p.assessment);
}
