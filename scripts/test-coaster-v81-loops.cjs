'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium,webkit}=require('playwright');
const root=process.cwd();
function instrument(html){
 const marker='// Unit-tangent vectors derived';
 assert(html.includes(marker),'track generator marker must exist');
 html=html.replace(marker,'window.__loopSnapshot={used:used.map(z=>({...z,startPoint:{...knots[z.start]},endPoint:{...knots[z.end]}})),knots:knots.map(p=>({...p}))};\n '+marker);
 const end='})();\n</script>';
 assert(html.includes(end),'inline game script must be instrumentable');
 return html.replace(end,'window.__runLoopTest=points=>{raw=points;makeTrack();return{warning:loopWarning,finish,track:track.map(p=>({...p})),snapshot:window.__loopSnapshot}};\n'+end);
}
const files={
 '/v2/one-stroke-coaster-3d-v80.html':instrument(fs.readFileSync(path.join(root,'v2/one-stroke-coaster-3d-v80.html'),'utf8')),
 '/v2/one-stroke-coaster-3d-v81.html':instrument(fs.readFileSync(path.join(root,'v2/one-stroke-coaster-3d-v81.html'),'utf8')),
};
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 if(files[pathname]){res.setHeader('content-type','text/html; charset=utf-8');res.end(files[pathname]);return;}
 const file=path.join(root,decodeURIComponent(pathname));
 if(!file.startsWith(root)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,body)=>{if(error){res.writeHead(404).end();return;}
  res.setHeader('content-type',file.endsWith('.js')?'text/javascript; charset=utf-8':'application/octet-stream');res.end(body);
 });
});
function stroke(diameters,gap=12,height=600){
 const cy=height*.5;let cursorX=24,points=[{x:cursorX,y:cy-diameters[0]/2}];
 const line=(x,y)=>{const p=points.at(-1),n=Math.max(1,Math.ceil(Math.hypot(x-p.x,y-p.y)/2));for(let j=1;j<=n;j++)points.push({x:p.x+(x-p.x)*j/n,y:p.y+(y-p.y)*j/n});};
 for(let q=0;q<diameters.length;q++){
  const d=diameters[q],r=d/2,cx=q===0?cursorX+24:cursorX;
  line(cx,cy-r);
  const count=Math.max(24,Math.ceil(Math.PI*d/2));
  for(let i=1;i<=count;i++){const a=-Math.PI/2+Math.PI*2*i/count;points.push({x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)});}
  cursorX=cx+d+gap;
  line(cursorX,cy-(diameters[q+1]??d)/2);
 }
 line(cursorX+80,cy-diameters.at(-1)/2);
 return points;
}
function hill(width=560,height=600){
 const points=[];for(let i=0;i<=160;i++){const t=i/160;points.push({x:24+width*t,y:height*.53-70*Math.sin(2*Math.PI*t)-20*Math.sin(4*Math.PI*t)});}return points;
}
function validateLoop(data,zone){
 const pts=data.snapshot.knots.slice(zone.coreStart,zone.coreEnd+1);
 assert(pts.length>=8,'a detected loop must retain a substantial circular core');
 const errors=pts.map(p=>Math.abs(Math.hypot(p.x-zone.cx,p.y-zone.cy)-zone.r));
 assert(Math.max(...errors)<.02,'loop core must remain a fitted circle after smoothing');
 let winding=0;for(let i=1;i<pts.length;i++){
  const a=pts[i-1],b=pts[i];
  winding+=Math.atan2((a.x-zone.cx)*(b.y-zone.cy)-(a.y-zone.cy)*(b.x-zone.cx),
   (a.x-zone.cx)*(b.x-zone.cx)+(a.y-zone.cy)*(b.y-zone.cy));
 }
 assert(Math.abs(winding)>3.4,'the protected loop core must preserve a full turn');
 const low=zone.start/(data.snapshot.knots.length-1),high=zone.end/(data.snapshot.knots.length-1);
 const route=data.track.filter(p=>p.sketchFraction>=low&&p.sketchFraction<=high);
 assert(route.length>=10,'the generated 3D route must contain the loop span');
 const a=route[0],b=route.at(-1),gap=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
 assert(gap<.7,`3D loop join gap=${gap.toFixed(3)} at diameter=${zone.r*2}px; bounds=${JSON.stringify({low,high,start:zone.start,end:zone.end,startPoint:zone.startPoint,endPoint:zone.endPoint,a,b})}`);
 return{radiusPx:+zone.r.toFixed(2),corePoints:pts.length,winding:+Math.abs(winding).toFixed(3),joinGap:+gap.toFixed(3)};
}
async function run(browserType,label){
 const browser=await browserType.launch({headless:true});const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:640,height:800},deviceScaleFactor:1});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:8765/v2/one-stroke-coaster-3d-v80.html',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(80);
  const sizes=[16,20,24,30,44];
  const expected={};
  for(const d of sizes){
   const result=await page.evaluate(points=>window.__runLoopTest(points),stroke([d]));
   const count=result.snapshot.used.length;
   if(d<26)assert.equal(count,0,`v80 should reproduce its documented minimum-size rejection for ${d}px`);
   expected[d]=count;
  }
  assert.deepEqual([expected[16],expected[20],expected[24]],[0,0,0],
   'v80 fixed minimum bounds should reproduce why the tiny loops were not classified');
  await page.goto('http://127.0.0.1:8765/v2/one-stroke-coaster-3d-v81.html',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(80);
  assert.match(await page.title(),/v81/);
  const corrected={};
  for(const d of sizes){
   const result=await page.evaluate(points=>window.__runLoopTest(points),stroke([d]));
   assert.equal(result.snapshot.used.length,1,`v81 must detect a ${d}px closed loop`);
   corrected[d]=validateLoop(result,result.snapshot.used[0]);
  }
  for(const pattern of [[16,16,16,16,16,16],[20,20,20,20,20],[24,24,24,24],[16,20,24,30,44]]){
   const result=await page.evaluate(points=>window.__runLoopTest(points),stroke(pattern));
   assert.equal(result.snapshot.used.length,pattern.length,`v81 must preserve all ${pattern.length} loops in a dense sequence`);
   pattern.forEach((d,i)=>validateLoop(result,result.snapshot.used[i]));
  }
  const noLoop=await page.evaluate(points=>window.__runLoopTest(points),hill());
  assert.equal(noLoop.snapshot.used.length,0,'ordinary hills and S-shaped profiles must not be classified as loops');
  assert.deepEqual(errors,[],'no browser errors while generating the stress patterns');
  console.log('PASS COASTER_V81_LOOPS '+JSON.stringify({browser:label,v80Detected:expected,v81Detected:Object.fromEntries(Object.keys(corrected).map(x=>[x,1])),v81Core:corrected,densePatterns:4,nonLoopGuard:true}));
  await page.close();
 }finally{await browser.close()}
}
(async()=>{
 await new Promise(resolve=>server.listen(8765,'127.0.0.1',resolve));
 try{await run(chromium,'chromium');await run(webkit,'webkit');}
 finally{server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
