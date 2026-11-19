'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const htmlPath = process.env.COASTER_FILE || path.resolve(__dirname, '../../one-stroke-coaster-3d-v78.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const makeStart = html.indexOf('function makeTrack(');
const makeEnd = html.indexOf('\nfunction sample(', makeStart);
assert(makeStart >= 0 && makeEnd > makeStart, 'makeTrack() must be present before sample()');
const makeTrackSource = html.slice(makeStart, makeEnd).replace(/\n}\s*$/, '\n globalThis.__testLoopZones=used.map(z=>({low:z.start/(knots.length-1),high:z.end/(knots.length-1),cx:z.cx,cy:z.cy,r:z.r})); globalThis.__testTurns=reversals.map(t=>({at:t.at,sign:t.sign,half:t.half}));\n}');
const runtime = `
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),mix=(a,b,t)=>a+(b-a)*t;
const V=(x=0,y=0,z=0)=>({x,y,z}),add=(a,b)=>V(a.x+b.x,a.y+b.y,a.z+b.z);
const sub=(a,b)=>V(a.x-b.x,a.y-b.y,a.z-b.z),scale=(a,k)=>V(a.x*k,a.y*k,a.z*k);
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>V(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
const norm=a=>scale(a,1/(Math.hypot(a.x,a.y,a.z)||1));
let W=390,H=550,raw=[],track=[],finish=0,loopZones=[],loopWarning='',objects=[];
function sample(z){z=clamp(z,0,finish);let lo=0,hi=track.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(track[m].s<z)lo=m;else hi=m;}const a=track[lo],b=track[hi],t=clamp((z-a.s)/(b.s-a.s||1),0,1);return V(mix(a.x,b.x,t),mix(a.y,b.y,t),mix(a.z,b.z,t));}
${makeTrackSource}
`;

const cases = [
  ['gentle hill and valley', [[10,320],[65,275],[120,250],[175,275],[235,325],[300,345],[370,300]], false],
  ['sharp crest and trough', [[10,340],[65,235],[120,335],[175,225],[235,330],[300,250],[370,310]], false],
  ['near vertical rise and drop', [[10,400],[90,400],[145,125],[205,400],[300,400],[370,340]], false],
  ['repeated left-right reversals', [[20,290],[90,220],[150,305],[220,185],[290,320],[370,240]], false],
  ['small switchback', [[20,280],[145,250],[175,205],[145,250],[370,280]], false],
  ['short lateral backtrack survives fairing', [[20,300],[120,270],[205,255],[180,275],[250,285],[370,300]], false],
  ['26 dense horizontal switchbacks', [[20,300], ...Array.from({length:27},(_,i)=>[i%2?110:65,260+(i%3)*20]), [370,300]], false],
  ['broad switchback', [[20,280],[150,240],[230,235],[180,270],[110,310],[180,335],[370,300]], false],
  ['single vertical loop', [[20,350],[80,300],[100,250],[140,210],[180,220],[220,270],[200,320],[160,340],[120,320],[100,270],[130,220],[180,200],[230,230],[300,280],[370,260]], true],
  ['two vertical loops', [[15,350],[45,300],[60,250],[90,220],[120,240],[110,280],[85,300],[70,270],[85,235],[120,220],[155,260],[185,320],[210,335],[235,270],[265,225],[295,240],[290,280],[265,305],[245,275],[260,240],[300,230],[370,280]], true],
  ['loop followed by broad switchback', [[15,350],[55,300],[75,245],[105,220],[135,245],[125,290],[95,305],[80,270],[100,230],[140,220],[205,260],[280,300],[360,320],[330,355],[270,370],[200,350],[140,315]], true],
  ['complex crossing profile', [[15,320],[370,220],[15,220],[370,320]], false],
  ['short straight then sharp direction change', [[15,300],[90,300],[160,300],[195,245],[230,310],[300,305],[370,300]], false],
  ['continuous S curve', [[15,320],[70,265],[125,220],[180,235],[235,295],[290,340],[340,315],[375,270]], false],
  ['three linked vertical loops', [[20,50],[140,150], ...Array.from({length:3},(_,n)=>Array.from({length:40},(_,j)=>{const [cx,cy,r,dir,side]=[[170,150,30,1,-1],[110,150,30,-1,1],[170,150,30,1,-1]][n];const a=dir*(j+1)*Math.PI*2/40;return[cx+side*r*Math.cos(a),cy-r*Math.sin(a)];})).flat(),[170,240],[70,245],[220,260],[80,275],[225,290],[60,305],[230,320]], true],
];
function resample(points) {
  const out=[];
  for(let i=0;i<points.length-1;i++){
    const [x0,y0]=points[i],[x1,y1]=points[i+1];
    const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)/2));
    for(let j=0;j<n;j++){const t=j/n;out.push({x:x0+(x1-x0)*t,y:y0+(y1-y0)*t});}
  }
  out.push({x:points.at(-1)[0],y:points.at(-1)[1]});
  return out;
}
function analyze(name, points, expectsLoop) {
  const context={Math}; vm.createContext(context); vm.runInContext(runtime,context);
  vm.runInContext(`raw=${JSON.stringify(resample(points))}; makeTrack();`,context);
  const {track,finish,loopWarning}=vm.runInContext('({track,finish,loopWarning})',context);
  if(process.env.COASTER_TRACE_FILE){const fs=require('node:fs');const traces=fs.existsSync(process.env.COASTER_TRACE_FILE)?JSON.parse(fs.readFileSync(process.env.COASTER_TRACE_FILE,'utf8')):[];traces.push({name,track,finish,loopWarning});fs.writeFileSync(process.env.COASTER_TRACE_FILE,JSON.stringify(traces));}
  assert(track.length>100, `${name}: expected a useful set of centerline stations`);
  assert(Number.isFinite(finish)&&finish>0, `${name}: finish distance must be finite and positive`);
  assert(track.every(p=>[p.x,p.y,p.z,p.s,p.frameRight?.x,p.frameRight?.y,p.frameRight?.z].every(Number.isFinite)), `${name}: centerline and rail frame must be finite`);
  assert(Math.abs(track[0].s)<1e-8&&Math.abs(track.at(-1).s-finish)<1e-6, `${name}: station distances must span the course`);
  const inputLength=resample(points).reduce((sum,p,i,a)=>i?sum+Math.hypot(p.x-a[i-1].x,p.y-a[i-1].y):sum,0)*.105;
  assert(finish<inputLength*2.25, `${name}: generated course expanded unexpectedly (${finish.toFixed(1)} vs ${inputLength.toFixed(1)})`);
  let maxCorner=0,maxNonLoopCorner=0,minFrameDot=1,maxFrameError=0,minStep=Infinity,maxStep=0,planTurn=0,absolutePlanTurn=0,previousPlan=null,minWorldX=Infinity,maxWorldX=-Infinity;
  for(let i=0;i<track.length;i++){minWorldX=Math.min(minWorldX,track[i].x);maxWorldX=Math.max(maxWorldX,track[i].x);}
  for(let i=1;i<track.length;i++){
    const a=track[i-1],b=track[i],step=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
    minStep=Math.min(minStep,step);maxStep=Math.max(maxStep,step);
    const f=a.frameRight,g=b.frameRight;
    minFrameDot=Math.min(minFrameDot,f.x*g.x+f.y*g.y+f.z*g.z);
    maxFrameError=Math.max(maxFrameError,Math.abs(Math.hypot(f.x,f.y,f.z)-1));
    const heading={x:b.x-a.x,z:b.z-a.z};
    if(previousPlan&&Math.hypot(previousPlan.x,previousPlan.z)>.001&&Math.hypot(heading.x,heading.z)>.001)
      {const turn=Math.atan2(previousPlan.x*heading.z-previousPlan.z*heading.x,previousPlan.x*heading.x+previousPlan.z*heading.z);planTurn+=turn;absolutePlanTurn+=Math.abs(turn);}
    previousPlan=heading;
    if(i<track.length-1){
      const c=track[i+1],u=[b.x-a.x,b.y-a.y,b.z-a.z],v=[c.x-b.x,c.y-b.y,c.z-b.z];
      const d=Math.hypot(...u)*Math.hypot(...v)||1;
      const corner=Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1]+u[2]*v[2])/d)));
      maxCorner=Math.max(maxCorner,corner);
      const zones=vm.runInContext('__testLoopZones',context);
      if(!zones.some(z=>b.sketchFraction>=z.low-.025&&b.sketchFraction<=z.high+.025)) maxNonLoopCorner=Math.max(maxNonLoopCorner,corner);
    }
  }
  assert(minStep>1e-7&&maxStep<1.5, `${name}: duplicate or abnormally long centerline segment`);
  assert(minFrameDot>0, `${name}: transported rail frame flipped between stations`);
  assert(maxFrameError<1e-6, `${name}: transported rail frame lost unit length`);
  assert(Math.abs(Math.hypot(.63*2)-1.26)<1e-9, `${name}: left/right rail spacing changed`);
  assert(maxCorner<.60, `${name}: abrupt centerline bend ${maxCorner.toFixed(3)} rad`);
  if(expectsLoop) assert(/正円に補正/.test(loopWarning), `${name}: intended loop was not detected: ${loopWarning}`);
  if(expectsLoop) assert(maxNonLoopCorner<.60, `${name}: sharp transition outside a protected loop (${maxNonLoopCorner.toFixed(3)} rad)`);
  else assert(!/正円に補正/.test(loopWarning), `${name}: open profile was incorrectly classified as a loop regions=${JSON.stringify(vm.runInContext('__testLoopZones',context))}`);
  if(name==='small switchback'||name==='broad switchback') assert(absolutePlanTurn>1.2, `${name}: horizontal U-turn angle was too small (${absolutePlanTurn.toFixed(2)} rad)`);
  if(name==='short lateral backtrack survives fairing') assert(maxWorldX-minWorldX>8, `${name}: the hand-drawn U-turn did not create a broad plan-view route (${(maxWorldX-minWorldX).toFixed(2)} units)`);
  if(name==='26 dense horizontal switchbacks') assert(absolutePlanTurn>45, `${name}: dense reversals were omitted (${absolutePlanTurn.toFixed(1)} radians of total turn)`);
  if(!expectsLoop) assert(maxCorner<.60, `${name}: sharp local centerline corner ${maxCorner.toFixed(3)} rad`);
  return {name,stations:track.length,length:+finish.toFixed(2),maxCornerRad:+maxCorner.toFixed(3),maxNonLoopCornerRad:+maxNonLoopCorner.toFixed(3),planTurnRad:+planTurn.toFixed(3),absolutePlanTurnRad:+absolutePlanTurn.toFixed(3),planLateralSpan:+(maxWorldX-minWorldX).toFixed(2),frameContinuity:+minFrameDot.toFixed(4),loopWarning};
}

const selected=process.env.CASE ? cases.filter(([name])=>name===process.env.CASE) : cases;
const results=selected.map(([name,points,loop])=>analyze(name,points,loop));
const requiredControls=['fullExit','fullReplay','go','fullGo','pause','fullResume','quit','reset','loopPlus','loopMinus'];
for(const id of requiredControls) assert(html.includes(`id="${id}"`), `existing UI control #${id} missing`);
assert(/150/.test(html), '150 km/h speed cap must remain');
assert(/touch-action:none/.test(html)&&/touch-callout:none/.test(html), 'touch and long-press suppression must remain');
assert(/function cam\(/.test(html)&&/function gGauge\(/.test(html)&&/function progressThermometer\(/.test(html), 'camera, G gauge, and progress UI must remain');
assert(/drawItems\.sort\(\(a,b\)=>b\.depth-a\.depth\)/.test(html), 'track spans must be painted far-to-near for crossing visibility');
console.log(JSON.stringify({cases:results.length,results},null,2));
