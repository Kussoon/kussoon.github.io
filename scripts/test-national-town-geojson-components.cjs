'use strict';
/* TOWNMAP-SSOT-001: isolated geometry-first candidate contract.
 * Approved Nishinomiya V34 labels remain authoritative and untouched.
 * Test each detached component, interior hole, winding independence,
 * small footprint fallback, tiny narrow shapes and deterministic output.
 */
const assert=require('node:assert/strict');
const engine=require('../v2/common/js/town-geojson-component-labels.js');
const ring=(x0,y0,x1,y1,reverse=false)=>{
 const v=[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]];
 return reverse?v.slice().reverse():v;
};
const contains=(p,r)=>engine.insideRing(p,r);
const config={viewBoxArea:10000,minimumAreaFraction:0};
function candidate(g,overrides={}){return engine.candidates({geometry:g,...config,...overrides})}
const multi={type:'MultiPolygon',coordinates:[
 [ring(0,0,20,20)],[ring(50,20,60,30)],[ring(80,80,83,83)]
]};
const m=candidate(multi);
assert.deepEqual(m.map(x=>x.component),[2,1,0],'stable smallest-to-largest component order');
assert.equal(m.length,3,'every meaningful detached part gets a label');
for(const p of m){assert(contains(p.point,multi.coordinates[p.component][0]),'label inside its assigned component')}
assert.deepEqual(candidate(multi),m,'deterministic result');
const reversed={...multi,coordinates:multi.coordinates.map(part=>part.map(r=>r.slice().reverse()))};
assert.equal(candidate(reversed).length,3,'ring orientation does not control component identity');
const hole={type:'Polygon',coordinates:[ring(0,0,50,50),ring(8,8,42,42)]};
const a=candidate(hole);
assert.equal(a.length,1,'hole MUST NOT produce another town label');
assert(contains(a[0].point,hole.coordinates[0]),'inside outer ring');
assert(!contains(a[0].point,hole.coordinates[1]),'outside hole');
assert(a[0].clearance>0,'valid label has interior clearance');
const holeReversed={...hole,coordinates:hole.coordinates.map(r=>r.slice().reverse())};
assert.equal(candidate(holeReversed).length,1,'hole classification independent of winding');
const tiny=candidate(multi,{viewBoxArea:10000,minimumAreaFraction:.015});
assert.deepEqual(tiny.map(x=>x.component),[0],'tiny fragment may be omitted only at configured threshold');
const none=candidate(multi,{viewBoxArea:10000,minimumAreaFraction:5});
assert.equal(none.length,1,'always retain largest valid component');
assert.equal(none[0].component,0);
const narrow={type:'Polygon',coordinates:[[
 [0,0],[100,0.1],[100,0.25],[0,.15],[0,0]
]]};
const thin=candidate(narrow);
assert.equal(thin.length,1,'thin corridor still has a label');
assert(contains(thin[0].point,narrow.coordinates[0]));
const concave={type:'Polygon',coordinates:[[
 [0,0],[50,0],[50,8],[8,8],[8,50],[0,50],[0,0]
]]};
const c=candidate(concave);
assert.equal(c.length,1);
assert(contains(c[0].point,concave.coordinates[0]));
const displaced=candidate(hole,{projection:p=>[p[0]*2+100,p[1]*3+50],viewBoxArea:100000});
assert.equal(displaced.length,1);
assert(displaced[0].point[0]>=100);
const wrong=[
 ()=>candidate({type:'LineString',coordinates:[]}),
 ()=>candidate({type:'Polygon',coordinates:[]}),
 ()=>candidate({type:'Polygon',coordinates:[[[0,0],[1,1]]]})
];
for(const invalid of wrong)assert.throws(invalid);
assert.deepEqual(multi.coordinates[0][0],ring(0,0,20,20),'no mutation of source data');
console.log('PASS TOWN_COMPONENT_LABEL_GEOMETRY '+JSON.stringify({
 detached:m.length,holeCandidates:a.length,
 thin:true,concave:true,windingIndependent:true,deterministic:true,
 sourceUnmodified:true
}));
