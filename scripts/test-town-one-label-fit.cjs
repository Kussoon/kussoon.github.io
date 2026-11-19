'use strict';
const assert=require('node:assert/strict');
const label=require('../v2/common/js/town-svg-one-label-fit.js');
const component=require('../v2/common/js/town-geojson-component-labels.js');
const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]];
const choose=(geometry,width=15,height=7)=>label.place({
 geometry,width,height,padding:.4,componentEngine:component,viewBoxArea:10000,grid:17
});
const island={type:'MultiPolygon',coordinates:[
 [rect(0,0,10,10)],[rect(40,0,100,50)]
]};
let out=choose(island);
assert.equal(out.parts,2);
assert.equal(out.component,1,'largest disconnected usable polygon wins, even if not first/mainland');
assert.equal(out.wholeLabelFits,true);
assert(component.insideRing(out.point,island.coordinates[1][0]));
const reversed={...island,coordinates:[island.coordinates[1],island.coordinates[0]]};
assert.equal(choose(reversed).component,0,'polygon input order does not determine preferred island');
const narrow={type:'MultiPolygon',coordinates:[
 [rect(0,0,250,2)],[rect(270,0,300,30)]
]};
out=choose(narrow);
assert.equal(out.component,1,'whole-label fit is prioritized over area');
assert.equal(out.wholeLabelFits,true);
const l={type:'Polygon',coordinates:[[
 [0,0],[60,0],[60,9],[9,9],[9,60],[0,60],[0,0]
]]};
out=choose(l,7,5);assert.equal(out.wholeLabelFits,true);
const hole={type:'Polygon',coordinates:[rect(0,0,100,100),rect(30,30,70,70)]};
out=choose(hole,21,8);
assert.equal(out.wholeLabelFits,true,'text box avoids enclosed polygon hole');
assert(!component.insideRing(out.point,hole.coordinates[1]));
const tiny={type:'Polygon',coordinates:[rect(0,0,2,2)]};
out=choose(tiny,20,8);
assert.equal(out.wholeLabelFits,false,'small regions fall back to legal center');
assert(component.insideRing(out.point,tiny.coordinates[0]));
const original=JSON.stringify(island);choose(island);assert.equal(JSON.stringify(island),original);
assert.throws(()=>choose({type:'Point',coordinates:[0,0]}));
console.log('PASS ONE_LABEL_FIT_CONTRACT '+JSON.stringify({
largeIsland:true,fitBeforeArea:true,holes:true,concavity:true,smallRegionFallback:true,mutations:false
}));
