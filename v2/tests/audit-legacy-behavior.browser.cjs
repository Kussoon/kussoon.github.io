'use strict';
// Audit diagnostic, NOT a pass/fail guarantee of feature inheritance.
// Production code/data are read-only. No expected legacy behavior is patched in.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const {start}=require('./helpers/nationwide-browser.cjs');
const out=process.env.KUSSOON_AUDIT_OUTPUT||'/tmp/kussoon-behavior-audit';
const client=process.env.KUSSOON_AUDIT_TOPOJSON;
assert(client,'set KUSSOON_AUDIT_TOPOJSON to the original CDN dependency topojson-client 3.1.0 min.js');
const levels=[1,2,4,8,16,32,64,128,256,512,768];
async function instrument(page){
 await page.addInitScript(()=>{
  window.audit={calls:[],longtasks:[],inputFrames:[],lastDensity:null,lastPlace:null,scheduledRenders:[]};
  try{new PerformanceObserver(list=>audit.longtasks.push(...list.getEntries().map(x=>({start:x.startTime,ms:x.duration})))).observe({entryTypes:['longtask']});}catch(_){}
  const nativeTimeout=window.setTimeout.bind(window);
  window.setTimeout=(fn,delay,...args)=>nativeTimeout(typeof fn==='function'&&fn.name==='renderLabels'?()=>{const t=performance.now();try{return fn(...args)}finally{audit.scheduledRenders.push({ms:performance.now()-t,delay});}}:fn,delay,...args);
  document.addEventListener('wheel',()=>{const t=performance.now();requestAnimationFrame(()=>audit.inputFrames.push(performance.now()-t));},{capture:true});
  for(const [name,method,kind] of [['KussoonDensityLabels','arrange','density'],['KussoonV2EstablishedLabelAdapter','layout','layout'],['KussoonV2PlaceLabels','show','show']]){
   let value;Object.defineProperty(window,name,{configurable:true,get(){return value},set(original){value={...original,[method](...args){const t=performance.now(),result=original[method](...args);audit.calls.push({kind,phase:audit.phase||'native',ms:performance.now()-t});if(kind==='density')audit.lastDensity={models:args[0],labels:args[1],options:args[2],result};if(kind==='show')audit.lastPlace=args[0];return result;}};}});
  }
 });
}
async function snapshot(page,kind){return page.evaluate(kind=>{
 const svg=document.querySelector('#map'),r=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;
 const raw=kind==='legacy'?[...svg.querySelectorAll('.place-label')]:[...svg.querySelectorAll('[data-v2-labels] > g')];
 const visible=[],fonts=[],codes=[];let complete=0;
 for(const node of raw){
  const b=node.getBoundingClientRect();if(getComputedStyle(node).display==='none'||!b.width||!b.height)continue;
  if(b.right<r.left||b.left>r.right||b.bottom<r.top||b.top>r.bottom)continue;
  codes.push(kind==='legacy'?audit.lastDensity.models[raw.indexOf(node)].code:audit.lastPlace?.regions[raw.indexOf(node)]?.code);
  visible.push({text:node.textContent,x:b.x,y:b.y,w:b.width,h:b.height});
  if(b.left>=r.left&&b.right<=r.right&&b.top>=r.top&&b.bottom<=r.bottom)complete++;
  const text=kind==='legacy'?node:node.querySelector('text'),m=text.getScreenCTM();fonts.push(parseFloat(getComputedStyle(text).fontSize)*Math.hypot(m.a,m.b));
 }
 let overlaps=0;for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){const a=visible[i],b=visible[j];if(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)overlaps++;}
 fonts.sort((a,b)=>a-b);
 const d=audit.lastDensity,p=audit.lastPlace;let candidatesInFrame=0,visibleAnchors=0;
 if(d){const m=svg.getScreenCTM();d.labels.forEach((n,i)=>{const point=svg.createSVGPoint();point.x=n.x;point.y=n.y;const q=point.matrixTransform(m);if(q.x>=r.left&&q.x<=r.right&&q.y>=r.top&&q.y<=r.bottom){candidatesInFrame++;if(d.result.visible[i])visibleAnchors++;}});}
 const ref=svg.querySelector('.land[aria-label="津市"],.land[data-code="24201"]');
 let outsideNominalVisible=0;
 raw.forEach((n,i)=>{const point=kind==='legacy'?d?.labels[i]:p?.positions?.get(p.regions[i]?.code);if(!point||getComputedStyle(n).display==='none')return;const x=Array.isArray(point)?point[0]:point.x,y=Array.isArray(point)?point[1]:point.y;const q=svg.createSVGPoint();q.x=x;q.y=y;const screen=q.matrixTransform(svg.getScreenCTM());if(screen.x>=r.left&&screen.x<=r.right&&screen.y>=r.top&&screen.y<=r.bottom&&(x<vb.x||x>vb.x+vb.width||y<vb.y||y>vb.y+vb.height))outsideNominalVisible++;});


 return {view:{x:vb.x,y:vb.y,w:vb.width,h:vb.height},map:{width:r.width,height:r.height},municipalPaths:svg.querySelectorAll('.land').length,prefecturePaths:svg.querySelectorAll('.prefecture').length,generated:raw.length,outsideNominalVisible,referenceTsuWidthPx:ref?.getBoundingClientRect().width||null,codesInFrame:codes,candidatesInFrame:kind==='legacy'?candidatesInFrame:null,visibleAnchors:kind==='legacy'?visibleAnchors:null,eligible:kind==='legacy'?d?.result.visible.filter(Boolean).length:raw.length,inViewport:visible.length,completeBoxes:complete,overlapPairs:overlaps,fontPx:fonts.length?{min:fonts[0],median:fonts[Math.floor(fonts.length/2)],max:fonts.at(-1)}:null,names:visible.map(n=>n.text).slice(0,16),statusText:document.querySelector('#status').textContent,zoomOutputVisible:kind==='legacy'?null:Boolean(document.querySelector('#zoomLevel').getClientRects().length),readingOn:kind==='legacy'?document.querySelector('#reading').value==='on':document.querySelector('#readingMode').value==='on',currentReadings:p?{total:p.regions.length,withReading:p.regions.filter(x=>x.reading).length,missing:p.regions.filter(x=>!x.reading).map(x=>({code:x.code,name:x.fullName||x.name}))}:null,calls:audit.calls.length,lastCall:audit.calls.at(-1),scheduledRender:audit.scheduledRenders.at(-1)||null};
 },kind);}
async function wheelSteps(page,kind,startWidth,target,anchor){
 await page.locator('#map').scrollIntoViewIfNeeded();const box=await page.locator('#map').boundingBox();
 await page.mouse.move(anchor.x,anchor.y);await page.keyboard.down('Control');
 let previous=Infinity;
 for(let i=0;i<50;i++){
  const width=await page.locator('#map').evaluate(n=>n.viewBox.baseVal.width);
  if(startWidth/width>=target-.001||Math.abs(width-previous)<1e-8)break;
  previous=width;await page.mouse.wheel(0,-Math.log(1.2)/.003);
 }
 await page.keyboard.up('Control');await page.waitForTimeout(220);
}
async function centerReference(page,kind){
 for(let attempt=0;attempt<4;attempt++){
  const move=await page.locator('#map').evaluate((svg,kind)=>{
   const v=svg.viewBox.baseVal,r=svg.getBoundingClientRect();let point;
   if(kind==='legacy'){const d=audit.lastDensity,i=d.models.findIndex(m=>m.code==='24201');point=d.labels[i];}
   else{const p=audit.lastPlace?.positions?.get('24201');if(p)point={x:p[0],y:p[1]};else{const b=svg.querySelector('.prefecture[data-pref="24"]').getBBox();point={x:b.x+b.width/2,y:b.y+b.height/2};}}
   const m=svg.getScreenCTM(),dx=(v.x+v.width/2-point.x)*(kind==='legacy'?r.width/v.width:m.a),dy=(v.y+v.height/2-point.y)*(kind==='legacy'?r.height/v.height:m.d);
   return {x:r.x+r.width/2,y:r.y+r.height/2,dx:Math.max(-r.width*.4,Math.min(r.width*.4,dx)),dy:Math.max(-r.height*.4,Math.min(r.height*.4,dy))};
  },kind);
  if(Math.hypot(move.dx,move.dy)<1)break;
  await page.mouse.move(move.x,move.y);await page.mouse.down();await page.mouse.move(move.x+move.dx,move.y+move.dy,{steps:4});await page.mouse.up();await page.waitForTimeout(220);
 }
}
async function sequence(app,kind,label){
 const {page}=app,initial=await snapshot(page,kind),rows=[],seen=new Set();
 await page.locator('#map').scrollIntoViewIfNeeded();
 const anchor=await page.locator('#map').evaluate(svg=>{const land=svg.querySelector('.land[aria-label="津市"],.land[data-code="24201"],.prefecture[data-pref="24"]'),b=land.getBBox(),p=svg.createSVGPoint();p.x=b.x+b.width/2;p.y=b.y+b.height/2;const q=p.matrixTransform(svg.getScreenCTM());return {x:Math.round(q.x),y:Math.round(q.y)}});

 for(const target of levels){
  if(target>1)await wheelSteps(page,kind,initial.view.w,target,anchor);
  if(target>=2)await centerReference(page,kind);
  const row=await snapshot(page,kind);row.target=target;row.actualZoom=initial.view.w/row.view.w;row.newCodesInFrame=row.codesInFrame.filter(c=>!seen.has(c));for(const code of row.codesInFrame)seen.add(code);row.cumulativeCodesSeen=seen.size;rows.push(row);
  if([1,4,16,128].includes(target))await page.locator('#map').screenshot({path:path.join(out,label+'-z'+target+'.png')});
  if(target>1&&row.actualZoom<target-.01)break;
 }
 return rows;
}
async function censusLegacy(page,base){return page.evaluate(base=>{
 const {models,labels,options}=audit.lastDensity,zoom=768,w=base.w/zoom,h=base.h/zoom;
 const r=document.querySelector('#map').getBoundingClientRect(),ratio=Math.min(r.width/w,r.height/h),missing=[],partial=[];const t=performance.now();
 audit.phase='census';
 // Algorithmic census at each anchor-centred legal viewport, not 1,902 native gestures.
 for(let i=0;i<models.length;i++){
  const p=labels[i],x=Math.max(base.x-w*.13,Math.min(base.x+base.w-w+w*.13,p.x-w/2)),y=Math.max(base.y-h*.13,Math.min(base.y+base.h-h+h*.13,p.y-h/2));
  const view={x:x-(r.width/ratio-w)/2,y:y-(r.height/ratio-h)/2,w:r.width/ratio,h:r.height/ratio};
  const result=KussoonDensityLabels.arrange(models,labels,{...options,view,zoom,screenWidth:r.width,screenHeight:r.height});
  if(!result.visible[i])missing.push(models[i].code);
  const b=p.box;if(!(b.x1>=view.x&&b.x2<=view.x+view.w&&b.y1>=view.y&&b.y2<=view.y+view.h))partial.push(models[i].code);
 }
 audit.phase='native';audit.censusInterval={start:t,end:performance.now()};
 return {scope:'algorithmic anchor-centred legal viewports at 768x, not exhaustive native UI gestures',total:models.length,missing,partialBoxes:partial,ms:performance.now()-t,readings:models.filter(m=>m.readingParts?.length).length,codeSample:models.slice(0,3).map(m=>m.code)};
},base);}
async function interactionAudit(app,kind){
 const {page}=app,legacy=kind==='legacy',search=legacy?'#search':'#placeSearch',results=legacy?'#suggestions':'#searchResults',result={};
 await page.fill(search,'西宮市');await page.locator(results+' button').first().waitFor();await page.press(search,'Escape');result.escapeDismissed=!(await page.locator(results+' button').first().isVisible());
 await page.fill(search,'西宮');await page.locator(results+' button').first().waitFor();await page.press(search,'Enter');await page.waitForTimeout(250);result.enterSelected=legacy?await page.locator('#map .land.selected').count()>0:await page.locator('#map .land.chosen').count()>0;
 // Explicit click restores a comparable selected state when Enter is missing.
 await page.fill(search,'西宮市');await page.locator(results+' button').first().waitFor();await page.locator(results+' button').first().click();
 await page.waitForFunction(legacy=>document.querySelector(legacy?'#map .land.selected':'#map .land.chosen'),legacy);
 const selected=()=>page.locator(legacy?'#map .land.selected':'#map .land.chosen').count();
 await page.locator('#map').scrollIntoViewIfNeeded();
 const blank=await page.locator('#map').evaluate(svg=>{const r=svg.getBoundingClientRect();for(const fx of [.01,.1,.5,.9,.99])for(const fy of [.01,.1,.5,.9,.99]){const x=r.x+r.width*fx,y=r.y+r.height*fy;if(document.elementFromPoint(x,y)===svg)return {x,y};}return null;});
 if(blank)await page.mouse.click(blank.x,blank.y);else await page.locator('#map').dispatchEvent('click');
 result.blankInput=blank?'native mouse click on hit-tested SVG background':'synthetic handler diagnostic; no background point found';result.blankClickCleared=!(await selected());
 await page.waitForTimeout(300); // old native-tap click suppression window
 const land=page.locator(legacy?'#map .land[aria-label="西宮市"]':'#map .land[data-code="28204"]');
 result.keyboard={tabIndex:await land.getAttribute('tabindex'),role:await land.getAttribute('role')};await land.evaluate(n=>n.focus());result.keyboard.nativeFocusable=await land.evaluate(n=>document.activeElement===n);
 if(await selected())await land.dispatchEvent('click');
 await land.evaluate(n=>n.focus());await page.keyboard.press('Enter');result.keyboard.enterSelected=Boolean(await selected());
 if(await selected())await land.dispatchEvent('click');await land.evaluate(n=>n.focus());await page.keyboard.press('Space');result.keyboard.spaceSelected=Boolean(await selected());
 // Native key presses: municipality focusability is recorded separately.
 return result;
}
async function run(kind,viewport){
 const app=await start({contextOptions:{viewport}}),{page}=app;await instrument(page);
 await app.context.route('https://unpkg.com/topojson-client@3/dist/topojson-client.min.js',r=>r.fulfill({path:client,contentType:'application/javascript'}));
 try{
  await app.open();if(kind==='legacy'){await page.goto(new URL('density.html?area='+(process.env.KUSSOON_AUDIT_INTERACTIONS_ONLY?'west-shikoku':'japan'),page.url()).href);await page.waitForFunction(()=>document.querySelectorAll('#map .place-label').length===(window.location.search.includes('west-shikoku')?457:1902),null,{timeout:120000});}
  if(process.env.KUSSOON_AUDIT_INTERACTIONS_ONLY)return {kind,viewport,scope:'native background click; focusability and native key presses; old general density UI vs pilot',interactions:await interactionAudit(app,kind),errors:app.errors};
  const result={kind,viewport,browser:app.browser.version(),national:await sequence(app,kind,kind+'-'+viewport.width)};
  if(kind==='legacy'&&viewport.width===1280)result.reachability=await censusLegacy(page,result.national[0].view);
  // Reading ON must work after zoom as well as at the initial frame.
  await page.click(kind==='legacy'?'#reading-toggle':'#mapReadingToggle');result.readingAtMax=await snapshot(page,kind);await page.click(kind==='legacy'?'#reset':'#mapReset');result.readingAfterReset=await snapshot(page,kind);
  result.nationalPerformance=await page.evaluate(()=>({longTasks:audit.longtasks.filter(x=>!audit.censusInterval||x.start+x.ms<audit.censusInterval.start||x.start>audit.censusInterval.end),calls:audit.calls.filter(c=>c.phase==='native'),scheduledRenders:audit.scheduledRenders,inputToRafMs:audit.inputFrames}));
  if(viewport.width===1280){
   if(kind==='legacy'){await page.goto(new URL('density.html?area=west-shikoku',page.url()).href);await page.waitForFunction(()=>document.querySelectorAll('#map .place-label').length===457,null,{timeout:120000});}
   result.interactionScope=kind==='legacy'?'density.html?area=west-shikoku; search is deliberately hidden on area=japan':'pilot normal search / selected prefecture';
   result.interactions=await interactionAudit(app,kind);
   if(kind==='pilot'){
    await app.pref('24');result.prefecture=await sequence(app,kind,'pilot-pref24');
    const census=[];for(let n=1;n<=47;n++){await app.pref(String(n).padStart(2,'0'));const x=await snapshot(page,kind);census.push({pref:n,paths:x.municipalPaths,labels:x.generated,readings:x.currentReadings});}result.prefectureCensus=census;
   }
  }
  if(viewport.width===390&&kind==='pilot'){
   await app.pref('24');result.mobilePrefecture=await sequence(app,kind,'pilot-pref24-mobile');
   result.orientation=[];for(const size of [{width:844,height:390},{width:390,height:844}]){await page.setViewportSize(size);await page.waitForTimeout(220);result.orientation.push(await snapshot(page,kind));}
  }
  result.performance=await page.evaluate(()=>({longTasks:audit.longtasks.filter(x=>!audit.censusInterval||x.start+x.ms<audit.censusInterval.start||x.start>audit.censusInterval.end),censusInterval:audit.censusInterval||null,layoutCalls:audit.calls.filter(c=>c.kind==='layout'&&c.phase==='native'),densityArrangeCalls:audit.calls.filter(c=>c.kind==='density'&&c.phase==='native').slice(0,60),scheduledRenders:audit.scheduledRenders,inputToRafMs:audit.inputFrames}));
  result.errors=app.errors;assert.deepEqual(app.errors,[],'diagnostic execution errors, not inheritance verdicts');
  return result;
 }finally{await app.close();}
}
(async()=>{
 await fs.mkdir(out,{recursive:true});const hash=createHash('sha256').update(await fs.readFile(client)).digest('hex');assert.equal(hash,'25cd02ae486cc5063e0215a4e4cfb15de83700c87ac48bac4d57dc6aaf3ebb89');
 const report={scope:'Audit measurements, not a comprehensive conformance pass. Native national zoom ratios; different source years/projections. See docs for reachability limitations.',sourceRef:execFileSync('git',['rev-parse','HEAD'],{cwd:path.resolve(__dirname,'../..'),encoding:'utf8'}).trim(),engine:process.env.KUSSOON_BROWSER_ENGINE||'chromium',topojsonClient:{version:'3.1.0',sha256:hash},runs:[]};
 for(const viewport of (process.env.KUSSOON_AUDIT_INTERACTIONS_ONLY?[{width:1280,height:1000}]:[{width:1280,height:1000},{width:390,height:844}]))for(const kind of ['legacy','pilot']){
  process.stdout.write('MEASURE '+kind+' '+viewport.width+'\n');report.runs.push(await run(kind,viewport));await fs.writeFile(path.join(out,'behavior-audit.json'),JSON.stringify(report,null,2));
 }
 console.log('RECORDED measurements only: '+path.join(out,'behavior-audit.json'));
})().catch(error=>{console.error(error);process.exitCode=1;});
