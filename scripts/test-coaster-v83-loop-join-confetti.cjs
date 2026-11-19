'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const root=process.cwd();
function instrument(html){
 const loopMarker='// Unit-tangent vectors derived';
 assert(html.includes(loopMarker),'track generator marker must exist');
 html=html.replace(loopMarker,'window.__loopSnapshot={used:used.map(z=>({...z,startPoint:{...knots[z.start]},endPoint:{...knots[z.end]}})),knots:knots.map(p=>({...p}))};\n '+loopMarker);
 const planeMarker='const separatedLoopCount=loopPlanes.filter';
 assert(html.includes(planeMarker),'post-offset loop snapshot marker must exist');
 html=html.replace(planeMarker,'window.__planeSnapshot=loopPlanes.map(p=>({index:p.index,lane:p.lane,low:p.low,high:p.high,first:p.first,last:p.last,axis:{...p.axis},points:p.points.map(q=>({...q})),conflicts:[...loopConflicts[p.index]]}));\n '+planeMarker);
 const end='})();\n</script>';
 assert(html.includes(end),'inline game script must be instrumentable');
 const hooks=`window.__runLoopTest=points=>{raw=points;makeTrack();return{warning:loopWarning,finish,track:track.map(p=>({...p})),snapshot:window.__loopSnapshot}};
window.__runGoalTest=points=>{raw=points;makeTrack();mode="ride";ridePos=finish;speed=3;paused=true;startGoalConfetti();updateGoalConfetti(.6);const count=goalConfetti.length,streamers=goalConfetti.filter(p=>p.streamer).length,sides=[...new Set(goalConfetti.map(p=>p.side))];const saved=overlay;let labels=[];overlay=value=>{labels.push(value);saved(value)};render();overlay=saved;return{count,streamers,sides,labels};};
`;
 return html.replace(end,hooks+end);
}
const pages={
 '/v2/one-stroke-coaster-3d-v82.html':instrument(fs.readFileSync(path.join(root,'v2/one-stroke-coaster-3d-v82.html'),'utf8')),
 '/v2/one-stroke-coaster-3d-v83.html':instrument(fs.readFileSync(path.join(root,'v2/one-stroke-coaster-3d-v83.html'),'utf8'))
};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1').pathname;
 if(pages[url]){res.setHeader('content-type','text/html; charset=utf-8');res.end(pages[url]);return;}
 const file=path.join(root,decodeURIComponent(url));
 if(!file.startsWith(root)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,body)=>{if(error){res.writeHead(404).end();return;}
  res.setHeader('content-type',file.endsWith('.js')?'text/javascript; charset=utf-8':'application/octet-stream');res.end(body);
 });
});
function retracedCircle(d=80,repeats=3,height=600){
 const cx=260,cy=height*.5,r=d/2,count=Math.max(24,Math.ceil(Math.PI*d/2)),points=[{x:cx,y:cy-r}];
 for(let q=0;q<repeats;q++)for(let i=1;i<=count;i++){const a=-Math.PI/2+Math.PI*2*i/count;points.push({x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)});}
 for(let i=1;i<=50;i++)points.push({x:cx,y:cy-r});
 points.push({x:cx+100,y:cy-r});return points;
}
function hill(width=560,height=600){
 const points=[];for(let i=0;i<=160;i++){const t=i/160;points.push({x:24+width*t,y:height*.53-70*Math.sin(2*Math.PI*t)-20*Math.sin(4*Math.PI*t)});}return points;
}
function actualLoopGap(a,b){
 let d=Infinity;
 for(let i=2;i<a.points.length-2;i+=2)for(let j=2;j<b.points.length-2;j+=2){
  const p=a.points[i],q=b.points[j];if(Math.abs(p.s-q.s)<8)continue;
  d=Math.min(d,Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z));
 }
 return d;
}
function maxCurvature(track){
 let maximum=0,location=-1;
 for(let i=1;i<track.length-1;i++){
  const a=track[i-1],b=track[i],c=track[i+1];
  const u={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z},v={x:c.x-b.x,y:c.y-b.y,z:c.z-b.z};
  const lu=Math.hypot(u.x,u.y,u.z),lv=Math.hypot(v.x,v.y,v.z);
  if(lu<.02||lv<.02)continue;
  const cos=Math.max(-1,Math.min(1,(u.x*v.x+u.y*v.y+u.z*v.z)/(lu*lv)));
  const value=Math.acos(cos)/((lu+lv)*.5);
  if(value>maximum){maximum=value;location=i;}
 }
 const p=track[location]||{};
 const neighbors=track.slice(Math.max(0,location-3),location+4).map(q=>({x:+q.x.toFixed(2),y:+q.y.toFixed(2),z:+q.z.toFixed(2),s:+q.s.toFixed(2),f:+q.sketchFraction.toFixed(4)}));
 return{value:maximum,index:location,s:+(p.s||0).toFixed(2),point:{x:+(p.x||0).toFixed(2),y:+(p.y||0).toFixed(2),z:+(p.z||0).toFixed(2)},sketchFraction:p.sketchFraction,neighbors};
}
async function run(browserType,label){
 const browser=await browserType.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:640,height:800},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const route=retracedCircle(80,3),results={};
  for(const version of ['v82','v83']){
   await page.goto('http://127.0.0.1:8767/v2/one-stroke-coaster-3d-'+version+'.html',{waitUntil:'domcontentloaded'});
   await page.waitForTimeout(60);
   const generated=await page.evaluate(points=>window.__runLoopTest(points),route);
   const planes=await page.evaluate(()=>window.__planeSnapshot);
   const gaps=[];for(let i=0;i<planes.length;i++)for(let j=i+1;j<planes.length;j++)gaps.push(actualLoopGap(planes[i],planes[j]));
   results[version]={planes,gaps,maxCurvature:maxCurvature(generated.track),trackPoints:generated.track.length};
  }
  await page.goto('http://127.0.0.1:8767/v2/one-stroke-coaster-3d-v83.html',{waitUntil:'domcontentloaded'});
  const goal=await page.evaluate(points=>window.__runGoalTest(points),hill());
  const v83=results.v83;
  if(label==='chromium'){
   fs.mkdirSync(path.join(root,'v2/verification/coaster-v83'),{recursive:true});
   await page.screenshot({path:path.join(root,'v2/verification/coaster-v83/goal-confetti.png')});
  }
  console.log('METRICS '+JSON.stringify({browser:label,v82:{lanes:results.v82.planes.map(p=>p.lane),gaps:results.v82.gaps,maxCurvature:results.v82.maxCurvature},v83:{lanes:v83.planes.map(p=>p.lane),gaps:v83.gaps,maxCurvature:v83.maxCurvature},goal,errors}));
  assert.equal(v83.planes.length,3,'dense repeated-loop pattern should retain all detected loops');
  assert(v83.gaps.every(gap=>gap>=2.7),`actual generated loop-route clearance must be at least 2.7m: ${JSON.stringify(v83.gaps)}`);
  assert(v83.maxCurvature.value<.55,`generated track has a sharp connector curvature ${v83.maxCurvature.value.toFixed(3)}/m near ${JSON.stringify(v83.maxCurvature)}`);
  assert(goal.count>=45,'goal celebration should launch a visible volley');
  assert(goal.streamers>0,'goal volley should include curved streamer ribbons');
  assert(goal.sides.includes(-1)&&goal.sides.includes(1),'both lower-side launchers must fire');
  assert(goal.labels.includes('ゴール')&&!goal.labels.includes('ゴール！'),'goal overlay should say only ゴール');
  const hills=await page.evaluate(points=>window.__runLoopTest(points),hill());
  assert.equal(hills.snapshot.used.length,0,'ordinary hills must not be detected as loops');
  assert.deepEqual(errors,[],'no browser page errors');
 }finally{await browser.close();}
}
(async()=>{
 await new Promise(resolve=>server.listen(8767,'127.0.0.1',resolve));
 try{await run(chromium,'chromium');await run(webkit,'webkit');}
 finally{server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
