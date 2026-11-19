'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const clearance=require('../v2/common/js/one-stroke-coaster-support-clearance.js');
const dir={x:0,y:0,z:1},right={x:1,y:0,z:0},p={x:0,y:12,z:20};
const route=sample=>clearance.create({sample,finish:100,spacing:1.25});
const plain=route(s=>({x:0,y:12,z:s}));
assert.equal(plain.allows({s:20,p,dir,right}),true,'ordinary elevated track needs supports');
assert.equal(plain.allows({s:20,p,dir,right}),true,'cached support result');
assert.equal(plain.stats().checked,1,'stable support decision cache');
const cross=route(s=>s<=50?{x:0,y:12,z:s}:{x:0,y:2,z:20+(s-70)*.3});
assert.equal(cross.allows({s:20,p,dir,right}),false,'other rail below the bridge occupies support corridor');
const nearButNotThrough=route(s=>s<=50?{x:0,y:12,z:s}:{x:14,y:2,z:20+(s-70)*.3});
assert.equal(nearButNotThrough.allows({s:20,p,dir,right}),true,'remote parallel rail must remain untouched');
const highCross=route(s=>s<=50?{x:0,y:12,z:s}:{x:0,y:20,z:20+(s-70)*.3});
assert.equal(highCross.allows({s:20,p,dir,right}),true,'crossing above support should not block it');
assert.equal(plain.allows({s:30,p:{...p,z:30},dir,right:{x:-1,y:0,z:0}}),false,'inverted rails cannot use ground trestle');
assert.equal(plain.allows({s:31,p:{...p,z:31},dir:{x:0,y:0,z:-1},right}),false,'backward loop cannot use ground trestle');
assert.equal(plain.allows({s:32,p:{...p,z:32},dir,right:{x:.8,y:.6,z:0}}),false,'steep bank excludes trestle');
assert.equal(plain.allows({s:33,p:{...p,y:2,z:33},dir,right}),false,'low track does not need a support');
const v78=fs.readFileSync('v2/one-stroke-coaster-3d-v78.html','utf8');
const v79=fs.readFileSync('v2/one-stroke-coaster-3d-v79.html','utf8');
assert.match(v79,/one-stroke-coaster-support-clearance\.js/);
assert.match(v79,/supportClearance\.allows\(\{s:z,p,dir,right:g\.right\}\)/);
assert.match(v79,/supportClearance=null;track=\[\];finish=0/);
for(const segment of ['function geometry(z){','function cam(){','function render(){','function makeTrack(){']){
 assert(v79.includes(segment)&&v78.includes(segment),'existing ride component retained '+segment);
}
const inline=v79.match(/<script>\s*([\s\S]*?)<\/script>/g)||[];
assert(inline.length>0,'Coaster main source exists');
for(const block of inline){
 vm.compileFunction(block.replace(/^<script>/,'').replace(/<\/script>$/,''),[]);
}
console.log('PASS COASTER_V79_SUPPORTS: clear structure, crossing underneath, inverted, backward, banked, low and noncollision; v78 remains preserved');
