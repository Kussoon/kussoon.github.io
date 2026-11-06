'use strict';
const assert=require('node:assert/strict');
const {start}=require('./helpers/nationwide-browser.cjs');

function metrics(page){return page.evaluate(()=>{
 const nodes=[...document.querySelectorAll('#map text[data-national-code]')];
 const boxes=nodes.map(node=>{const rect=node.getBoundingClientRect();return {x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom,font:Math.max(+node.getAttribute('font-size'),...Array.from(node.querySelectorAll('tspan'),span=>+span.getAttribute('font-size')||0))*Math.hypot(node.getScreenCTM().a,node.getScreenCTM().b),name:node.getAttribute('aria-label'),rows:node.querySelectorAll('tspan').length};});
 let overlaps=0;
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)if(boxes[i].x<boxes[j].right&&boxes[i].right>boxes[j].x&&boxes[i].y<boxes[j].bottom&&boxes[i].bottom>boxes[j].y)overlaps++;
 const map=document.querySelector('#map'),rect=map.getBoundingClientRect(),matrix=map.getScreenCTM();const anchors=window.KussoonV2ProgressivePreview.controller.anchors().filter(a=>{const p=new DOMPoint(a.point[0],a.point[1]).matrixTransform(matrix);return p.x>=rect.left&&p.x<=rect.right&&p.y>=rect.top&&p.y<=rect.bottom;});return {count:nodes.length,overlaps,maxFont:Math.max(0,...boxes.map(x=>x.font)),inViewAnchors:anchors.length,boxes};
 });}
async function focus(page,query){
 await page.locator('#placeSearch').fill(query);
 await page.locator('#searchResults button').first().waitFor({timeout:10000});
 await page.locator('#searchResults button').first().click();
 await page.waitForFunction(()=>Number.parseFloat(document.querySelector('#zoomLevel')?.textContent)>1&&document.querySelectorAll('#map text[data-national-code]').length>0,{},{timeout:30000});
 await page.waitForTimeout(250);
}
(async()=>{
 const app=await start({engine:'chromium',contextOptions:{viewport:{width:390,height:844}}});
 const page=app.page;
 try{
  await app.open();
  await page.goto(page.url().replace('official-2026-nationwide-pilot.html','label-zoom-trial-v319.html'));
  await page.waitForFunction(()=>window.KussoonV2ProgressivePreview?.controller.snapshot().count===1905,{},{timeout:30000});
  await page.waitForFunction(()=>document.querySelectorAll('#map text[data-national-code]').length>0,{},{timeout:30000});
  assert.equal(await page.locator('#readingMode').inputValue(),'off','readings stay off initially');
  const mobileOverview=await metrics(page);
  await page.setViewportSize({width:1280,height:900});
  await page.waitForTimeout(200);
  const desktopOverview=await metrics(page);
  assert(desktopOverview.maxFont<=13.1&&desktopOverview.maxFont>=7,'responsive resize keeps text within 7–13px: '+desktopOverview.maxFont);
  assert.equal(desktopOverview.overlaps,0,'responsive resize retains collision-free overview labels');
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(200);
  assert(mobileOverview.maxFont<=13.1&&mobileOverview.maxFont>=7);
  for(const [name,query] of [['Hyogo Hanshin/Kobe','神戸市中央区'],['Sapporo','札幌市中央区'],['Tokyo special wards','新宿']]){
   await page.click('#nationBtn');
   await page.waitForTimeout(200);
   await focus(page,query);
   const result=await metrics(page);
   assert(result.count>0,name+' labels are visible');
   assert.equal(result.overlaps,0,name+' labels do not overlap after focus');
   assert(result.maxFont<=13.1&&result.maxFont>=7,name+' physical font size remains in 7–13px range: '+result.maxFont);
   console.log('PASS trial '+name+' labels='+result.count+'/'+result.inViewAnchors+' anchors overlaps='+result.overlaps+' maxFont='+result.maxFont.toFixed(2)+'px');
   if(name==='Hyogo Hanshin/Kobe'){
    await page.click('#mapReadingToggle');
    await page.waitForTimeout(400);
    const ward=page.locator('#map text[data-national-code="28110"]');
    assert.equal(await ward.locator('tspan').count(),4,'reading ON preserves four-row ward labels');
    await page.click('#mapReadingToggle');
    await page.waitForTimeout(400);
    assert.equal(await ward.locator('tspan').count(),2,'reading OFF preserves two-row ward labels');
    // Selected labels keep their established visibility exception. Clear it
    // before asserting collisions among ordinary labels at each scale.
    await page.evaluate(()=>{const c=window.KussoonV2ProgressivePreview.controller;c.clear();c.schedule();});
    await page.waitForTimeout(250);
    // Exercise the public +/- controls, which were the route that exposed
    // the root-SVG CTM scale error on dense prefecture views.
    for(const [button,name] of [['#mapZoomIn','zoom in'],['#mapZoomOut','zoom out']]){
     for(let step=0;step<3;step++){
      await page.click(button);
      await page.waitForTimeout(300);
      const zoomed=await metrics(page);
      assert(zoomed.maxFont<=13.1&&zoomed.maxFont>=7,name+' keeps physical label size within 7–13px: '+zoomed.maxFont);
      assert.equal(zoomed.overlaps,0,name+' keeps labels collision-free after step '+(step+1));
     }
    }

    const beforeGesture=await metrics(page);
    const duringGesture=await page.evaluate(()=>{
     const map=document.querySelector('#map'),viewport=window.KussoonV2ProgressivePreview.viewport;
     map.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:91,pointerType:'touch',clientX:180,clientY:220}));
     viewport.zoomOut();viewport.zoomOut();viewport.zoomOut();
     return Math.max(...[...map.querySelectorAll('text[data-national-code]')].map(n=>Math.max(+n.getAttribute('font-size'),...Array.from(n.querySelectorAll('tspan'),t=>+t.getAttribute('font-size')||0))*Math.hypot(n.getScreenCTM().a,n.getScreenCTM().b)));
    });
    assert(Math.abs(duringGesture-beforeGesture.maxFont)<.5,'gesture zoom keeps physical text size stable ('+beforeGesture.maxFont+'→'+duringGesture+'px)');
    await page.evaluate(()=>document.querySelector('#map').dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:91,pointerType:'touch',clientX:180,clientY:220})));
    await page.waitForTimeout(300);
    for(let i=0;i<3;i++){await page.evaluate(()=>{const v=window.KussoonV2ProgressivePreview.viewport;v.zoomOut();v.zoomIn();window.KussoonV2ProgressivePreview.controller.schedule();});await page.waitForTimeout(350);}
    await page.evaluate(()=>window.KussoonV2ProgressivePreview.viewport.reset());
    await page.waitForTimeout(700);
    const after=await metrics(page);
    assert.equal(after.overlaps,0,'zoom/readings transitions retain collision-free labels (pairs='+after.overlaps+')');
   }
  }
  // The baseline link option reproduces the merged zoom overlap allowance.
  await page.goto(page.url().replace(/label-zoom-trial\.html.*/, 'label-zoom-trial-v319.html?labels=baseline'));
  await page.waitForFunction(()=>window.KussoonV2ProgressivePreview?.controller.snapshot().count===1905,{},{timeout:30000});
  await focus(page,'神戸市中央区');
  const baseline=await metrics(page);
  console.log('DIAG baseline Hyogo labels='+baseline.count+' overlaps='+baseline.overlaps+' maxFont='+baseline.maxFont.toFixed(2)+'px');
  assert(baseline.count>0,'baseline comparison mode renders labels');
  assert(baseline.maxFont<=13.1,'baseline comparison keeps physical text within 7–13px');
  assert.equal(app.errors.length,0,app.errors.join('; '));
 }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
