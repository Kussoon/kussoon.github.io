import {test} from 'node:test';
import assert from 'node:assert/strict';
import {topology} from 'topojson-server';
import {presimplify,simplify,quantile} from 'topojson-simplify';

// A non-collinear synthetic boundary with strongly varying triangle weights.
// The regression is about quantile direction: topojson sorts DESCENDING.
test('S39: requested keep fraction removes vertices in correct direction',()=>{
 const pts=[];
 for(let i=0;i<=1000;i++){
  const x=i*.01;
  const y=Math.sin(i*.19)*.2+Math.sin(i*.033)*.13+Math.cos(i*.91)*.0002;
  pts.push([x,y]);
 }
 const t=topology({line:{type:'LineString',coordinates:pts}},1000000);
 const w=presimplify(t);
 const n=t.arcs.reduce((v,a)=>v+a.length,0);
 const at=p=>{
  const threshold=quantile(w,p);
  assert(Number.isFinite(threshold),'finite simplification threshold for p='+p);
  const s=simplify(w,threshold);
  return s.arcs.reduce((v,a)=>v+a.length,0);
 };
 const n020=at(.02),n005=at(.005),n002=at(.002);
 assert(n020<n*.25,'2% keep should not retain ~98% of vertices');
 assert(n005<=n020,'0.5% should not keep more vertices than 2%');
 assert(n002<=n005,'0.2% should not keep more vertices than 0.5%');
 assert(at(.98)>n020*2,'old 1-keep would keep substantially more points');
 console.log({original:n,keep020:n020,keep005:n005,keep002:n002,oldWrong098:at(.98)});
});
