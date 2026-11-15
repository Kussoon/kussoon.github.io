#!/usr/bin/env node
'use strict';
// Regression tests for the municipality-independent town TopoJSON adapter.
// No browser libraries or production map files are modified by this test.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const engine=fs.readFileSync(path.join(root,'common/js/town-map-engine.js'),'utf8');
const labels=fs.readFileSync(path.join(root,'common/js/label-engine.js'),'utf8');
const context={window:{},performance:{now:()=>0}};
vm.runInNewContext(engine,context);
vm.runInNewContext(labels,context);
const decode=context.window.KussoonV2TownMap.decode;
const labelEngine=context.window.KussoonLabelEngine;
const polygon=(arcs,properties={S_NAME:'テスト',R2KAxx_ID:1})=>({type:'Polygon',arcs,properties});
function topology(arcs,geometries,transform){
  const t={type:'Topology',arcs,objects:{town:{type:'GeometryCollection',geometries}}};
  if(transform)t.transform=transform;
  return t;
}
// Without a transform, arcs are absolute coordinates, not accumulated deltas.
const absolute=decode(topology([[[135,34],[136,34],[136,35],[135,35],[135,34]]],[polygon([[0]])]));
assert.equal(absolute.deltaEncoded,false);
assert.equal(absolute.sourceBounds.minX,135);
assert.equal(absolute.sourceBounds.maxX,136);
assert.equal(absolute.sourceBounds.maxY,35);
// Quantized TopoJSON delta arcs must be accumulated and transformed.
const transformed=decode(topology([[[0,0],[10,0],[0,10],[-10,0],[0,-10]]],[polygon([[0]])],{scale:[.1,.1],translate:[135,34]}));
assert.equal(transformed.deltaEncoded,true);
assert.equal(transformed.sourceBounds.minX,135);
assert.equal(transformed.sourceBounds.maxX,136);
assert.equal(transformed.sourceBounds.maxY,35);
// A multipolygon contains polygon->ring->arc nesting.
const multi=decode(topology([
 [[135,34],[136,34],[136,35],[135,35],[135,34]],
 [[137,36],[138,36],[138,37],[137,37],[137,36]]
],[{type:'MultiPolygon',arcs:[[[0]],[[1]]],properties:{S_NAME:'複数',R2KAxx_ID:2}}]));
assert.equal(multi.features.length,1);
assert.equal(multi.features[0].rings.length,2);
// Label sizes are expressed in CSS pixels regardless of SVG viewport zoom.
assert.equal(labelEngine.screenPixelsToSvgUnits(16,1000,400),40);
assert.equal(labelEngine.screenPixelsToSvgUnits(16,100,400),4);
// The adapter must render all planned wrapped lines, not a single original name.
assert.match(engine,/const lines=p\.lines\|\|\[f\.name\]/);
assert.match(engine,/for\(let j=0;j<lines\.length;j\+\+\)/);
assert.match(engine,/screenPixelsToSvgUnits\(font,view\.w,renderedMapWidth\(\)\)/);
// White text outline only, not a white background label rectangle.
const page=fs.readFileSync(path.join(root,'town-map/index.html'),'utf8');
assert.match(page,/\.label\{[^}]*stroke:#fff/);
assert.doesNotMatch(page,/\.town-label-bg/);
assert.doesNotMatch(engine,/town-label-bg/);
assert.match(engine,/t\.setAttribute\('stroke-width',\(p\.fontSize\*\.16\)/);
// Pilot data: independent source shapes count must remain unchanged.
const data=JSON.parse(fs.readFileSync(path.join(root,'data/town-maps/28217.json'),'utf8'));
assert.equal(data.topo.objects.town.geometries.length,191);
const decoded=decode(data.topo);
assert.equal(decoded.features.length,191);
assert.equal(decoded.deltaEncoded,false);
assert.ok(decoded.sourceBounds.minX>134&&decoded.sourceBounds.maxX<137);
console.log('town-map-adapter-regression: PASS');
