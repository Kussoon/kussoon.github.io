import {test} from 'node:test';
import assert from 'node:assert/strict';
import {topology} from 'topojson-server';
import {presimplify,simplify,quantile} from 'topojson-simplify';
import {protectRings} from '../protect-rings.mjs';

const circle=(cx,cy,r,n=64)=>Array.from({length:n+1},(_,i)=>[cx+r*Math.cos(i*2*Math.PI/n),cy+r*Math.sin(i*2*Math.PI/n)]);
const distinctCount=(topo,ring)=>{
 const pts=[];
 for(const signed of ring){
  const arc=topo.arcs[signed<0?~signed:signed];
  const a=signed<0?[...arc].reverse():arc;
  pts.push(...a);
 }
 return new Set(pts.map(p=>p.join(','))).size;
};
test('ring protection prevents artificial collapse of detached islands and holes',()=>{
 const features={type:'FeatureCollection',features:[
  {type:'Feature',properties:{id:'island'},geometry:{type:'Polygon',coordinates:[circle(0,0,2),[...circle(0,0,.5)].reverse()]}},
  {type:'Feature',properties:{id:'neighbour'},geometry:{type:'Polygon',coordinates:[circle(8,0,1)]}}
 ]};
 const raw=topology({municipalities:features},1000000);
 const weighted=presimplify(raw);
 const threshold=quantile(weighted,.002);
 assert(Number.isFinite(threshold));
 const before=simplify(weighted,threshold);
 const rings=before.objects.municipalities.geometries.flatMap(g=>g.arcs);
 assert(rings.some(r=>distinctCount(before,r)<3),'fixture must expose simplification collapse');
 const s=protectRings(weighted,threshold);
 const out=simplify(weighted,threshold);
 const remaining=out.objects.municipalities.geometries.flatMap(g=>g.arcs);
 assert(s.protectedRings>0);
 assert.equal(s.unrepairableRings,0);
 assert(remaining.every(r=>distinctCount(out,r)>=3),'all polygon rings retain 3 distinct points');
 assert.equal(out.objects.municipalities.geometries.length,2);
 console.log('PASS ring preservation',s);
});
