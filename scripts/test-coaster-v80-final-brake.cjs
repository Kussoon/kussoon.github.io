'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('v2/one-stroke-coaster-3d-v80.html','utf8');
const match=html.match(/function updateRideSpeed\(dt\)\{[\s\S]*?\n\}/);
assert(match,'v80 must have a separately testable final-approach speed controller');
const setup=`
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finish=100;
let ridePos=0,speed=0,launchElapsed=3;
function sample(){return{x:0,y:0,z:0};}
`;
function state(position,velocity,dt=.01,launch=3){
 const context={Math};vm.createContext(context);
 vm.runInContext(setup+`ridePos=${position};speed=${velocity};launchElapsed=${launch};\n${match[0]}`,context);
 vm.runInContext(`updateRideSpeed(${dt})`,context);
 return vm.runInContext('({ridePos,speed,launchElapsed,displaySpeed:speed*5})',context);
}
const before=state(94,5,.01);
assert.equal(before.speed,5,'normal speed continues before the 95% braking point');
const crossing=state(94.9,30,.02);
assert.equal(crossing.speed,3,'a frame that would cross 95% brakes before advancing');
const atMark=state(95,30,.02);
assert.equal(atMark.speed,3,'95% applies the sharp brake immediately');
assert.equal(atMark.displaySpeed,15,'the displayed speed is exactly 15 km/h');
const after=state(98,3,.02);
assert.equal(after.speed,3,'15 km/h is held to the finish');
const launchEdge=state(95.1,12,.02,1);
assert.equal(launchEdge.speed,3,'the final brake overrides launch acceleration');
assert.equal(launchEdge.launchElapsed,3,'launch cannot restart after the final brake');
assert.match(html,/one-stroke-coaster-support-clearance\.js/,'v79 support clearance remains included');
assert.match(html,/function makeTrack\(/,'v79 track generation remains included');
assert.match(html,/Math\.round\(speed\*5\)/,'15 km/h remains visible in the existing speed display');
console.log('PASS COASTER_V80_FINAL_BRAKE '+JSON.stringify({threshold:95,finalSpeedKmh:15,cases:5}));
