'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.NISHINOMIYA_TEST_BASE||'https://kussoon.com';
const target=process.env.NISHINOMIYA_TEST_PATH||'/v2/verify-pr595-one-label/';
const out='pr595-tap-accuracy';fs.mkdirSync(out,{recursive:true});
(async()=>{for(const [driver,name,width,height] of [[chromium,'chromium-1280',1280,800],[webkit,'webkit-390',390,844],[webkit,'webkit-320',320,668]]){
 const browser=await driver.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:width<600});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**'+target,async route=>{
   const response=await route.fetch(),html=await response.text(),marker='KussoonTownSvgDataContract.load({';
   assert.equal(html.split(marker).length,2);
   const exposure=`window.__tapAudit={cases:()=>features.flatMap(f=>(f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates]).map((_,part)=>({name:f.properties.S_NAME,part}))),prepare:(name,part)=>{
    startQuiz(1,[name]);
    const f=features.find(f=>f.properties.S_NAME===name),coords=f.geometry.type==='MultiPolygon'?f.geometry.coordinates[part]:f.geometry.coordinates;
    const partFeature={type:'Feature',properties:f.properties,geometry:{type:'Polygon',coordinates:coords}};
    const bounds=path.bounds(partFeature),fit=KussoonTownSvgViewport.fitBounds(bounds,baseWidth,baseHeight,100,.6,40);
    if(!fit)throw Error('No component viewport');
    cLabelReflow();svg.call(zoom.transform,d3.zoomIdentity.translate(fit.x,fit.y).scale(fit.scale));
    return coords.map(r=>r.map(projection));
   },stop:()=>stopQuiz(false)};\n`;
   await route.fulfill({response,body:html.replace(marker,exposure+marker)});
  });
  await page.goto(base+target,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#labels g.label').length===321,null,{timeout:60000});
  await page.locator('#fullscreen').click();await page.waitForTimeout(180);
  const cases=await page.evaluate(()=>window.__tapAudit.cases());
  assert.equal(new Set(cases.map(c=>c.name)).size,321);
  const report={browser:name,towns:321,components:cases.length,passed:0,failures:[],cases:[]};
  for(const item of cases){
   try{
    const rings=await page.evaluate(c=>window.__tapAudit.prepare(c.name,c.part),item);
    const hit=await page.evaluate(({rings,name})=>{
     const inside=(p,r)=>{let yes=false;for(let i=0,j=r.length-1;i<r.length;j=i++)if((r[i][1]>p[1])!==(r[j][1]>p[1])&&p[0]<(r[j][0]-r[i][0])*(p[1]-r[i][1])/(r[j][1]-r[i][1])+r[i][0])yes=!yes;return yes};
     const valid=p=>inside(p,rings[0])&&!rings.slice(1).some(r=>inside(p,r));
     const xs=rings[0].map(p=>p[0]),ys=rings[0].map(p=>p[1]);
     const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
     const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],q=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-q*dx,p[1]-a[1]-q*dy)};
     const points=[];for(let y=0;y<31;y++)for(let x=0;x<31;x++){
      const p=[minX+(maxX-minX)*(x+.5)/31,minY+(maxY-minY)*(y+.5)/31];
      if(valid(p))points.push({p,clearance:Math.min(...rings.flatMap(r=>r.slice(1).map((b,i)=>distance(p,r[i],b))))});
     }
     points.sort((a,b)=>b.clearance-a.clearance);
     const matrix=document.getElementById('world').getScreenCTM();
     for(const candidate of points){
      const point=new DOMPoint(...candidate.p).matrixTransform(matrix),el=document.elementFromPoint(point.x,point.y);
      if(point.x<0||point.y<0||point.x>=innerWidth||point.y>=innerHeight)continue;
      if(el?.closest('.controls,.zoom-slider-slot,.full'))continue;
      return {x:point.x,y:point.y,clearancePixels:candidate.clearance*matrix.a,hitName:el?.__data__?.properties?.S_NAME||null,hitTag:el?.tagName||null};
     }
     throw Error('No visible interior sample at supported zoom');
    },{rings,name:item.name});
    assert.equal(hit.hitName,item.name,'DOM hit target differs from source geometry');
    if(width>=600)await page.mouse.click(hit.x,hit.y);else await page.touchscreen.tap(hit.x,hit.y);
    const state=await page.evaluate(()=>({feedback:document.getElementById('quizFeedback').textContent,progress:document.getElementById('quizProgress').textContent,next:!document.getElementById('quizNext').hidden}));
    assert(state.feedback.includes('正解です')&&state.feedback.includes(item.name),'coordinate input was not graded as intended town');
    assert(state.progress.includes('得点 1')&&state.next,'wrong score/next state');
    report.cases.push({...item,...hit});report.passed++;
   }catch(e){report.failures.push({...item,error:e.message})}
   finally{await page.evaluate(()=>window.__tapAudit.stop())}
  }
  report.pageErrors=errors;fs.writeFileSync(`${out}/${name}.json`,JSON.stringify(report,null,2));
  await page.screenshot({path:`${out}/${name}.png`});
  console.log('TAP_ACCURACY '+JSON.stringify({browser:name,towns:321,components:cases.length,passed:report.passed,failures:report.failures}));
  assert.deepEqual(report.failures,[]);assert.deepEqual(errors,[]);
 }finally{await browser.close()}
}})().catch(e=>{console.error(e);process.exitCode=1});
