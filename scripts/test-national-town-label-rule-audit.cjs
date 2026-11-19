'use strict';
const assert=require('node:assert/strict');
const audit=require('../v2/common/js/town-svg-label-rule-audit.js');
const candidateEngine=require('../v2/common/js/town-geojson-component-labels.js');
const approvedAnchors=require('../v2/common/js/town-svg-approved-anchors.js');
const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]];
const features=[
 {type:'Feature',properties:{S_NAME:'単一区域'},geometry:{type:'Polygon',coordinates:[rect(0,0,10,10)]}},
 {type:'Feature',properties:{S_NAME:'分離区域'},geometry:{type:'MultiPolygon',
  coordinates:[[rect(15,0,20,5)],[rect(30,0,35,5)]]}},
 {type:'Feature',properties:{S_NAME:'穴付き区域'},geometry:{type:'Polygon',
  coordinates:[rect(40,0,60,20),rect(45,5,55,15)]}}
];
const approved={multiLabels:{'単一区域':[[3,3],[7,7]]},
 extraLabels:{},labelOffsets:{},expectedLabels:4};
const source=JSON.stringify(features);
const args={features,projection:p=>p,approved,
 componentEngine:candidateEngine,approvedAnchor:approvedAnchors,viewBoxArea:10000};
const result=audit.compare(args);
assert.equal(result.summary.towns,3);
assert.equal(result.summary.approvedLabels,4);
assert.equal(result.summary.automaticLabels,4);
assert.equal(result.summary.mismatchTowns,2,'one missing candidate, one surplus candidate');
assert.equal(result.summary.disjoint,1);
assert.equal(result.summary.withHoles,1);
const byName=Object.fromEntries(result.rows.map(x=>[x.name,x]));
assert.equal(byName['単一区域'].acceptedCount,2);
assert.equal(byName['単一区域'].automaticCount,1);
assert.equal(byName['分離区域'].acceptedCount,1);
assert.equal(byName['分離区域'].automaticCount,2);
assert.equal(byName['穴付き区域'].holes,1);
assert.equal(byName['穴付き区域'].automaticCount,1);
assert.equal(byName['穴付き区域'].acceptedPoints.length,1);
assert.equal(byName['穴付き区域'].acceptedPoints[0].inside,false,
 'a centroid falling inside a hole must be reported, never silently rewritten');
assert.equal(result.summary.approvedOutsideSource,1);
assert.equal(JSON.stringify(features),source,'source geometry never modified');
assert.deepEqual(audit.compare(args),result,'output deterministic');
console.log('PASS TOWN_LABEL_RULE_AUDIT '+JSON.stringify(result.summary));
