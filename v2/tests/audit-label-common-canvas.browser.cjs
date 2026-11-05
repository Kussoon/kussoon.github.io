'use strict';
// Controlled audit: equal canvas, geographic centre and longitudinal screen
// scale. Different source years/projections remain explicit. No app code edits.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');const {start}=require('./helpers/nationwide-browser.cjs');
const out=process.env.KUSSOON_AUDIT_OUTPUT||'/tmp/kussoon-common-canvas',client=process.env.KUSSOON_AUDIT_TOPOJSON;
async function setup(kind,viewport){
 const a=await start({contextOptions:{viewport}}),p=a.page;
 await p.addInitScript(()=>{window.probe={};let module;Object.defineProperty(window,'KussoonNationalBoundaries',{get(){return module},set(value){module={...value,project(...args){const r=value.project(...args);probe.project=r.projectPoint;return r;}}}});let labels;Object.defineProperty(window,'KussoonV2PlaceLabels',{get(){return labels},set(value){labels={...value,show(options){probe.project=options.project;return value.show(options)}}}});});
 await a.context.route('https://unpkg.com/topojson-client@3/dist/topojson-client.min.js',r=>r.fulfill({path:client,contentType:'application/javascript'}));
 await a.open();if(kind==='legacy'){await p.goto(new URL('density.html?area=japan',p.url()).href);await p.waitForFunction(()=>document.querySelectorAll('#map .place-label').length===1902,null,{timeout:120000});}else await a.pref('24');
 await p.addStyleTag({content:'#map{width:'+(viewport.width===1280?900:356)+'px!important;height:'+(viewport.width===1280?700:574)+'px!important}'});await p.evaluate(()=>window.dispatchEvent(new Event('resize')));await p.waitForTimeout(220);await p.locator('#map').scrollIntoViewIfNeeded();
 return a;
}
async function state(a,kind){return a.page.locator('#map').evaluate((svg,kind)=>{
 const project=probe.project,center=project([136.5,34.7]),east=project([136.6,34.7]),m=svg.getScreenCTM(),r=svg.getBoundingClientRect(),v=svg.viewBox.baseVal;
 const nodes=[...svg.querySelectorAll(kind==='legacy'?'.place-label':'[data-v2-labels] > g')];let count=0,full=0,fonts=[];const names=[];
 for(const n of nodes){const b=n.getBoundingClientRect();if(getComputedStyle(n).display==='none'||!b.width||b.right<r.left||b.left>r.right||b.bottom<r.top||b.top>r.bottom)continue;count++;names.push(n.textContent);if(b.left>=r.left&&b.right<=r.right&&b.top>=r.top&&b.bottom<=r.bottom)full++;const t=kind==='legacy'?n:n.querySelector('text'),matrix=t.getScreenCTM();fonts.push(parseFloat(getComputedStyle(t).fontSize)*Math.hypot(matrix.a,matrix.b));}
 fonts.sort((a,b)=>a-b);
 return {scalePxPerPointOneLongitude:Math.abs(east[0]-center[0])*m.a,view:{x:v.x,y:v.y,w:v.width,h:v.height},map:{x:r.x,y:r.y,width:r.width,height:r.height},center,unitX:kind==='legacy'?r.width/v.width:m.a,unitY:kind==='legacy'?r.height/v.height:m.d,centerOffsetPx:{x:(v.x+v.width/2-center[0])*m.a,y:(v.y+v.height/2-center[1])*m.d},generated:nodes.length,inViewport:count,completeBoxes:full,fontPx:fonts.length?{min:fonts[0],median:fonts[Math.floor(fonts.length/2)],max:fonts.at(-1)}:null,names};
 },kind);}
async function center(a,kind){
 for(let i=0;i<10;i++){const s=await state(a,kind),dx=(s.view.x+s.view.w/2-s.center[0])*s.unitX,dy=(s.view.y+s.view.h/2-s.center[1])*s.unitY;if(Math.hypot(dx,dy)<8)return;const b=s.map,x=b.x+b.width/2,y=b.y+b.height/2;await a.page.mouse.move(x,y);await a.page.mouse.down();await a.page.mouse.move(x+Math.max(-b.width*.35,Math.min(b.width*.35,dx)),y+Math.max(-b.height*.35,Math.min(b.height*.35,dy)),{steps:4});await a.page.mouse.up();await a.page.waitForTimeout(180);}
}
async function zoom(a,kind,scale){
 for(let i=0;i<60;i++){const s=await state(a,kind);if(s.scalePxPerPointOneLongitude>=scale-.01)return;const b=s.map;await a.page.mouse.move(Math.round(b.x+b.width/2),Math.round(b.y+b.height/2));await a.page.keyboard.down('Control');await a.page.mouse.wheel(0,kind==='legacy'?-100:-Math.log(scale/s.scalePxPerPointOneLongitude)/.003);await a.page.keyboard.up('Control');await a.page.waitForTimeout(180);}
 throw Error('requested longitudinal scale unreachable');
}
(async()=>{
 assert(client,'KUSSOON_AUDIT_TOPOJSON required');assert.equal(createHash('sha256').update(await fs.readFile(client)).digest('hex'),'25cd02ae486cc5063e0215a4e4cfb15de83700c87ac48bac4d57dc6aaf3ebb89');await fs.mkdir(out,{recursive:true});
 const report={scope:'Controlled test-only CSS; same canvas, centre 136.5E/34.7N and pixels per 0.1 degree longitude, readings OFF. 2021/2026 geometry and latitude projection differ; no pixel-perfect equivalence claimed.',sourceRef:execFileSync('git',['rev-parse','HEAD'],{cwd:path.resolve(__dirname,'../..'),encoding:'utf8'}).trim(),runs:[]};
 for(const viewport of [{width:1280,height:1000},{width:390,height:844}]){
  const legacy=await setup('legacy',viewport),pilot=await setup('pilot',viewport),rows=[];
  try{
   for(const requested of [80,160,320,640]){
    await zoom(legacy,'legacy',requested);await center(legacy,'legacy');const before=await state(legacy,'legacy');await zoom(pilot,'pilot',before.scalePxPerPointOneLongitude);await center(pilot,'pilot');const after=await state(pilot,'pilot');
    assert(Math.abs(before.scalePxPerPointOneLongitude-after.scalePxPerPointOneLongitude)<.01,'equal longitudinal screen scale: '+before.scalePxPerPointOneLongitude+' vs '+after.scalePxPerPointOneLongitude);
    rows.push({requested,matchedCenter:[before,after].every(s=>Math.hypot(s.centerOffsetPx.x,s.centerOffsetPx.y)<8),legacy:before,pilot:after});
    if([80,640].includes(requested))for(const [kind,a] of [['legacy',legacy],['pilot',pilot]])await a.page.locator('#map').screenshot({path:path.join(out,kind+'-'+viewport.width+'-scale'+requested+'.png')});
   }
   for(const a of [legacy,pilot])assert.deepEqual(a.errors,[]);
   report.runs.push({viewport,rows});await fs.writeFile(path.join(out,'common-canvas.json'),JSON.stringify(report,null,2));
  }finally{await legacy.close();await pilot.close();}
 }
 console.log('RECORDED controlled measurements only: '+path.join(out,'common-canvas.json'));
})().catch(e=>{console.error(e);process.exitCode=1});
