'use strict';
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'pr595-common-town-audit');fs.mkdirSync(out,{recursive:true});
const base=process.env.TOWN_TEST_BASE||'http://127.0.0.1:8765';
const prefix='/v2/verify-town-map-pr595/';
const expose=`window.__audit={features:()=>features,regions:()=>communityNames,membership:()=>membership,projection:()=>projection,path:()=>path,transform:()=>transform,startQuiz,quizMapAnswer,stopQuiz,quizReveal,choose,focusTown,reset,showRegion:co=>{cLabelReflow();communityChoice=co;showCommunity()},getSelected:()=>selected,fitPart:(name,index)=>{const f=features.find(f=>f.properties.S_NAME===name),g=f.geometry;const part={type:'Feature',properties:f.properties,geometry:{type:'Polygon',coordinates:g.type==='Polygon'?g.coordinates:g.coordinates[index]}};const b=path.bounds(part),fit=KussoonTownSvgViewport.fitBounds(b,baseWidth,baseHeight,100,.6,40);svg.call(zoom.transform,d3.zoomIdentity.translate(fit.x,fit.y).scale(fit.scale));return part;}};\n`;
let server;
async function main(){
 const sourceCommit='fe3c5692ab0547348b67a47874a1c43f2c382c5a';
 const originalTopology=await fetch('https://raw.githubusercontent.com/Kussoon/takarazuka/'+sourceCommit+'/data/takarazuka-towns.topojson').then(r=>{assert(r.ok);return r.json()});
 const mergedTopology=JSON.parse(fs.readFileSync(path.join(root,prefix,'data/28214.topojson')));
 assert.deepEqual(mergedTopology.arcs,originalTopology.arcs,'Source coordinate arcs changed');
 assert.equal(originalTopology.objects.town.geometries.length,398);
 const originalKeys=originalTopology.objects.town.geometries.map(g=>g.properties.KEY_CODE).sort();
 const mergedKeys=mergedTopology.objects.town.geometries.flatMap(g=>g.properties.sourceKeys).sort();
 assert.deepEqual(mergedKeys,originalKeys,'One or more statistical geometries lost/duplicated');
 assert.equal(new Set(originalKeys).size,337,'Statistical KEY_CODE count changed');
 const sourceRecords=mergedTopology.objects.town.geometries.flatMap(g=>g.properties.sourceRecords).sort((a,b)=>a-b);
 assert.deepEqual(sourceRecords,Array.from({length:398},(_,i)=>i),'Source record coverage changed');
 if(!process.env.TOWN_TEST_BASE){
  const mapping=await fetch('https://kussoon.com/nishinomiya/data/community-town-map.json').then(r=>{assert(r.ok);return r.text()});
  server=http.createServer((req,res)=>{
   const p=new URL(req.url,'http://localhost').pathname;
   if(p==='/nishinomiya/data/community-town-map.json'){res.setHeader('Content-Type','application/json');res.end(mapping);return}
   const file=path.resolve(root,'.'+decodeURIComponent(p)+(p.endsWith('/')?'index.html':''));
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;res.end('missing');return}
   res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html; charset=utf-8':'application/json');res.end(fs.readFileSync(file));
  });await new Promise(r=>server.listen(8765,'127.0.0.1',r));
 }
 for(const cfg of [{name:'chromium1280',engine:chromium,width:1280,height:800},{name:'webkit390',engine:webkit,width:390,height:844},{name:'webkit320',engine:webkit,width:320,height:668}]){
  const browser=await cfg.engine.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width:cfg.width,height:cfg.height},isMobile:cfg.width<600,hasTouch:cfg.width<600});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/town-map.js',async route=>{const response=await route.fetch();const text=await response.text();assert.equal(text.split('KussoonTownSvgDataContract.load(config,{').length,2);await route.fulfill({response,body:text.replace('KussoonTownSvgDataContract.load(config,{',expose+'KussoonTownSvgDataContract.load(config,{')});});
   const report={browser:cfg.name};
   // Shared extraction must preserve every retained Nishinomiya label, not only count.
   const snapshot=()=>page.evaluate(()=>{const b=document.querySelector('#map').getBoundingClientRect();return [...document.querySelectorAll('#labels g.label')].map(g=>{const r=g.querySelector('.town-name').getBoundingClientRect();return {name:g.__data__.name,x:r.x-b.x,y:r.y-b.y,w:r.width,h:r.height}})});
   await page.goto(base+'/v2/verify-pr595-one-label/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelectorAll('g.label').length===321);
   await page.waitForTimeout(400);const before=await snapshot();
   await page.goto(base+prefix+'?code=28204',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelectorAll('g.label').length===321);
   await page.waitForTimeout(400);const after=await snapshot();assert.equal(before.length,after.length);
   report.nishinomiyaMaxDelta=Math.max(...before.flatMap((v,i)=>{assert.equal(v.name,after[i].name);return ['x','y','w','h'].map(k=>Math.abs(v[k]-after[i][k]))}));
   assert(report.nishinomiyaMaxDelta<=.1,'Shared extraction changes accepted baseline');
   await page.goto(base+prefix+'?code=28214',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelectorAll('g.label').length===125);
   await page.waitForTimeout(400);
   report.geometryArea=await page.evaluate(({originalTopology,mergedTopology})=>{const area=t=>d3.sum(topojson.feature(t,t.objects.town).features,d3.geoArea);return {source:area(originalTopology),merged:area(mergedTopology)}},{originalTopology,mergedTopology});
   assert(Math.abs(report.geometryArea.source-report.geometryArea.merged)<1e-9,'Union changed geographic area');
   report.data=await page.evaluate(()=>{const a=window.__audit,fs=a.features(),m=a.membership();return {names:fs.map(f=>f.properties.S_NAME),regions:a.regions(),parts:fs.reduce((n,f)=>n+(f.geometry.type==='Polygon'?1:f.geometry.coordinates.length),0),labels:document.querySelectorAll('g.label').length,readings:document.querySelectorAll('.town-reading').length,memberships:Object.fromEntries(fs.map(f=>[f.properties.S_NAME,a.regions().filter(c=>m.belongs(f.properties.S_NAME,c))]))}});
   assert.equal(new Set(report.data.names).size,125);assert.equal(report.data.regions.length,20);assert.equal(report.data.parts,136);assert.equal(report.data.readings,0);
   report.anchors=await page.evaluate(()=>{const a=window.__audit;return [...document.querySelectorAll('g.label')].map(g=>{const f=a.features().find(f=>f.properties.S_NAME===g.__data__.name),p=g.__data__.point,polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;return {name:g.__data__.name,inside:polys.some(poly=>{const rings=poly.map(r=>r.map(a.projection()));return d3.polygonContains(rings[0],p)&&!rings.slice(1).some(h=>d3.polygonContains(h,p))})}})});
   assert(report.anchors.every(a=>a.inside),'One or more geographic label anchors lie outside the town');
   const config=JSON.parse(fs.readFileSync(path.join(root,prefix,'data/28214.json')));
   for(const [name,extra]of Object.entries(config.membership.additionalRegions))for(const region of extra)assert(report.data.memberships[name].includes(region));
   await page.locator('#frame').screenshot({path:path.join(out,cfg.name+'-whole.png')});
   report.regionCounts={};
   for(const region of report.data.regions){await page.evaluate(c=>window.__audit.showRegion(c),region);await page.waitForTimeout(370);report.regionCounts[region]=await page.locator('path.town').count();assert(report.regionCounts[region]>0);assert.equal(await page.locator('g.label').count(),report.regionCounts[region]);}
   await page.evaluate(()=>window.__audit.showRegion(''));
   report.quizzes=await page.evaluate(()=>{const a=window.__audit,names=a.features().map(f=>f.properties.S_NAME),$=id=>document.getElementById(id),score=()=>Number($('quizProgress').textContent.match(/得点 (\d+)/)?.[1]),r={quiz1:0,quiz2:0,failures:[]};
    for(let i=0;i<names.length;i++){const name=names[i],wrong=names[(i+1)%names.length];try{
     a.startQuiz(1,[name]);if(score()!==1)throw Error('initial');a.quizMapAnswer(wrong);if(score()!==0)throw Error('penalty');a.quizMapAnswer(wrong);if(score()!==0)throw Error('double penalty');a.quizMapAnswer(name);if(!$('quizFeedback').textContent.includes('正解です'))throw Error('correct');$('quizNext').click();if(!$('quizResult').textContent.includes('1問中 0点')||$('quizRetryWrong').hidden)throw Error('result');r.quiz1++;
     a.startQuiz(2,[name]);const bs=[...$('quizChoices').children],ns=bs.map(b=>b.querySelector('.choice-name').textContent);if(bs.length!==4||new Set(ns).size!==4||!ns.includes(name)||bs.some(b=>!b.querySelector('.choice-reading')?.textContent))throw Error('choices');const w=bs.find(b=>b.querySelector('.choice-name').textContent!==name);w.click();if(score()!==0||!w.disabled||!w.classList.contains('quiz-wrong'))throw Error('choice penalty');w.click();if(score()!==0)throw Error('choice double penalty');bs.find(b=>b.querySelector('.choice-name').textContent===name).click();$('quizNext').click();if(!$('quizResult').textContent.includes('1問中 0点'))throw Error('choice result');r.quiz2++;
    }catch(e){r.failures.push({name,message:e.message})}finally{a.stopQuiz(false)}}return r;});
   assert.deepEqual(report.quizzes,{quiz1:125,quiz2:125,failures:[]});
   await page.evaluate(()=>window.__audit.showRegion(''));
   await page.locator('#fullscreen').click();await page.waitForTimeout(150);
   const measurements=()=>page.locator('#map').getAttribute('data-label-measurements');
   const oldCount=await measurements();
   await page.locator('#zoomSlider').evaluate(e=>{e.value=65;e.dispatchEvent(new Event('input',{bubbles:true}))});await page.waitForTimeout(150);assert.equal(await measurements(),oldCount,'zoom remeasures glyphs');
   await page.locator('#larger').click();assert.equal((await page.locator('#size').innerText()).replace(/\s/g,''),'文字100％');await page.locator('#size').click();await page.locator('#reading').click();assert.equal(await page.locator('.town-reading').count(),125);await page.locator('#reading').click();
   await page.evaluate(()=>window.__audit.focusTown('鹿塩'));await page.waitForTimeout(150);await page.locator('#frame').screenshot({path:path.join(out,cfg.name+'-zoom.png')});
   report.taps=[];
   for(const name of report.data.names){const n=await page.evaluate(name=>{const f=window.__audit.features().find(f=>f.properties.S_NAME===name);return f.geometry.type==='Polygon'?1:f.geometry.coordinates.length},name);
    for(let part=0;part<n;part++){
     await page.evaluate(({name,part})=>{window.__audit.startQuiz(1,[name]);window.__audit.fitPart(name,part)},{name,part});
     if(cfg.width<600)await page.waitForTimeout(550);
     const point=await page.evaluate(({name,part})=>{const a=window.__audit,f=a.features().find(f=>f.properties.S_NAME===name),rings=(f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates[part]).map(r=>r.map(a.projection())),svg=document.querySelector('#map'),matrix=document.querySelector('#world').getScreenCTM(),b=svg.getBoundingClientRect(),r=rings[0],xs=r.map(p=>p[0]),ys=r.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);let best=null;
      const dist=(p,x,y)=>{let min=Infinity;for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){const A=ring[j],B=ring[i],dx=B[0]-A[0],dy=B[1]-A[1],t=Math.max(0,Math.min(1,((x-A[0])*dx+(y-A[1])*dy)/(dx*dx+dy*dy||1))),qx=A[0]+t*dx,qy=A[1]+t*dy;min=Math.min(min,(x-qx)**2+(y-qy)**2)}return min};
      for(let i=1;i<40;i++)for(let j=1;j<40;j++){const x=minX+(maxX-minX)*i/40,y=minY+(maxY-minY)*j/40;if(!d3.polygonContains(r,[x,y])||rings.slice(1).some(h=>d3.polygonContains(h,[x,y])))continue;const p=new DOMPoint(x,y).matrixTransform(matrix);if(p.x<b.left+1||p.x>b.right-1||p.y<b.top+1||p.y>b.bottom-1)continue;const el=document.elementFromPoint(p.x,p.y);if(el?.__data__?.properties?.S_NAME!==name)continue;const clearance=dist(null,x,y);if(!best||clearance>best.clearance)best={x:p.x,y:p.y,clearance};}return best;
     },{name,part});
     assert(point,'No visible interior hit target '+name+':'+part);
     if(cfg.width<600)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
     await page.waitForFunction(name=>document.querySelector('#quizFeedback').textContent.includes('正解です')&&document.querySelector('#quizFeedback').textContent.includes(name),name,{timeout:2000});report.taps.push({name,part});
    }
   }
   assert.equal(report.taps.length,136);await page.evaluate(()=>window.__audit.stopQuiz(false));
   // Actual selected-town second input cancels the flash.
   await page.evaluate(()=>{window.__audit.showRegion('');window.__audit.choose('鹿塩');});assert.equal(await page.evaluate(()=>window.__audit.getSelected()),'鹿塩');await page.evaluate(()=>window.__audit.choose('鹿塩'));assert.equal(await page.evaluate(()=>window.__audit.getSelected()),'');
   assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,cfg.name+'.json'),JSON.stringify(report,null,2));
   console.log('PASS COMMON_TOWN '+JSON.stringify({browser:cfg.name,delta:report.nishinomiyaMaxDelta,names:125,regions:20,quiz1:125,quiz2:125,taps:136}));
  }finally{await browser.close()}
 }
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{server?.close()});
