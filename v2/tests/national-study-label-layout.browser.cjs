'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {start}=require('./helpers/nationwide-browser.cjs');
const PREFS=[
 {pref:'28',name:'兵庫県',denseCode:'28101',denseQuery:'神戸市東灘区'},
 {pref:'27',name:'大阪府',denseCode:'27127',denseQuery:'大阪市北区'},
 {pref:'26',name:'京都府',denseCode:'26104',denseQuery:'京都市中京区'},
 {pref:'13',name:'東京都',denseCode:'13101',denseQuery:'千代田区'},
 {pref:'01',name:'北海道',denseCode:'01101',denseQuery:'札幌市中央区'}
];
const engine=process.env.KUSSOON_BROWSER_ENGINE||'chromium';
const mobile=engine==='webkit';
const ARTIFACTS=process.env.KUSSOON_BROWSER_ARTIFACTS||'/tmp/national-study-label-layout';
function close(a,b,tolerance=.08){return Math.abs(a-b)<=tolerance;}
async function metrics(page,pref){
 return page.locator('#map').evaluate((svg,pref)=>{
  const layer=svg.querySelector('[data-progressive-labels]');
  const nodes=[...(layer?.querySelectorAll('[data-national-code]')||[])];
  const rectOf=node=>{const r=node.getBoundingClientRect();return {x1:r.left,x2:r.right,y1:r.top,y2:r.bottom,w:r.width,h:r.height};};
  const visible=nodes.filter(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(node).display!=='none';});
  const rects=visible.map(node=>({code:node.getAttribute('data-national-code'),text:node.textContent,rect:rectOf(node)}));
  let overlapPairs=0;const overlaps=[];
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
   const a=rects[i].rect,b=rects[j].rect;
   const width=Math.min(a.x2,b.x2)-Math.max(a.x1,b.x1);
   const height=Math.min(a.y2,b.y2)-Math.max(a.y1,b.y1);
   if(width>1&&height>1){overlapPairs++;overlaps.push({codes:[rects[i].code,rects[j].code],texts:[rects[i].text,rects[j].text],width,height});}
  }
  const vb=svg.viewBox?.baseVal,r=svg.getBoundingClientRect(),matrix=typeof svg.getScreenCTM==='function'?svg.getScreenCTM():null;
  const visibleInFrame=rects.filter(item=>Math.min(item.rect.x2,r.right)-Math.max(item.rect.x1,r.left)>1&&Math.min(item.rect.y2,r.bottom)-Math.max(item.rect.y1,r.top)>1).length;
  const screenScale=matrix?Math.hypot(matrix.a,matrix.b):Math.min(r.width/(vb?.width||850),r.height/(vb?.height||700));
  const sizes=visible.map(node=>Number(node.getAttribute('font-size'))*screenScale).filter(Number.isFinite);
  const outside=nodes.filter(node=>node.getAttribute('data-national-code')?.slice(0,2)!==pref);
  const visibleCodes=visible.map(node=>node.getAttribute('data-national-code'));
  return {
   study:document.body.classList.contains('study-pref-view'),
   progressive:Boolean(layer),
   viewBox:svg.getAttribute('viewBox'),
   viewWidth:vb?.width||850,
   totalNodes:nodes.length,
   visible:visible.length,
   visibleInFrame,
   visibleCodes,
   nonTargetNodes:outside.length,
   nonTargetHidden:outside.every(node=>{const b=node.getBoundingClientRect();return b.width===0&&b.height===0;}),
   targetOnly:visibleCodes.every(code=>code.startsWith(pref)),
   overlapPairs,overlaps,
   screenScale,
   screenFontMin:sizes.length?Math.min(...sizes):0,
   screenFontMax:sizes.length?Math.max(...sizes):0,
   anchors:visible.map(node=>[node.getAttribute('data-national-code'),Number(node.getAttribute('x')),Number(node.getAttribute('y'))]),
   reading:document.querySelector('#readingMode')?.value||'',
   arrangeCalls:(window.__nationalArranges||[]).slice(-5)
  };
 },pref);
}
async function waitForStudy(page,pref){
 await page.waitForFunction(pref=>{
  const svg=document.querySelector('#map'),layer=svg?.querySelector('[data-progressive-labels]');
  const vb=svg?.viewBox?.baseVal;
  return document.body.classList.contains('study-pref-view')&&layer&&
   layer.querySelectorAll('[data-national-code]').length>0&&vb&&vb.width<800&&
   [...layer.querySelectorAll('[data-national-code]')].some(n=>n.getAttribute('data-national-code')?.startsWith(pref)&&n.getBoundingClientRect().width>0);
 },pref,{timeout:60000});
 await page.waitForTimeout(230);
}
function assertNoOverlap(state,label){assert.equal(state.overlapPairs,0,label+' has no displayed label overlap '+JSON.stringify(state.overlaps));}
function assertAnchorsSame(before,after,label){
 const a=new Map(before.anchors.map(x=>[x[0],x.slice(1)])),b=new Map(after.anchors.map(x=>[x[0],x.slice(1)]));
 for(const [code,xy] of a){const next=b.get(code);if(!next)continue;
  assert(close(xy[0],next[0],.001)&&close(xy[1],next[1],.001),label+' does not move anchor '+code);}
}
(async()=>{
 await fs.mkdir(ARTIFACTS,{recursive:true});
 const app=await start({engine,contextOptions:mobile?
  {viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}:
  {viewport:{width:1365,height:900},deviceScaleFactor:1}});
 const {page}=app,report=[];
 try{
  await page.addInitScript(()=>{
   let api;
   Object.defineProperty(window,'KussoonDensityLabels',{configurable:true,get(){return api;},set(value){
    if(value&&typeof value.arrange==='function'){
     const arrange=value.arrange;
     api={...value,arrange(models,labels,options){
      const result=arrange(models,labels,options);
      (window.__nationalArranges||(window.__nationalArranges=[])).push({models:models.length,labels:labels.length,stableAnchors:options.stableAnchors===true,zoom:options.zoom,visible:result.visible.filter(Boolean).length});
      return result;
     }};
    }else api=value;
   }});
  });
  await app.open();
  const origin=new URL(page.url()).origin;
  for(const item of PREFS){
   await page.goto(origin+'/maps/national-municipalities.html?studyPref='+item.pref);
   await waitForStudy(page,item.pref);
   let before=await metrics(page,item.pref);
   assert(before.visible>0,item.name+' has visible labels');
   assert(before.nonTargetNodes>0,item.name+' retains nationwide candidates before the CSS mask');
   assert(before.nonTargetHidden,item.name+' hides non-target labels after national placement');
   assert(before.targetOnly,item.name+' displays target-prefecture labels only');
   assertNoOverlap(before,item.name+' initial focus');
   assert(before.arrangeCalls.some(c=>c.models===1905&&c.labels===1905&&c.stableAnchors),
    item.name+' uses the nationwide 1,905-candidate stable-anchor engine');
   const initialView=before.viewBox;
   await page.locator('#mapFrame').screenshot({path:path.join(ARTIFACTS,engine+'-'+item.pref+'-study-initial.png')});
   const zoomImmediate=await page.locator('#map').evaluate(svg=>{
    const collect=()=>{const nodes=[...svg.querySelectorAll('[data-progressive-labels] [data-national-code]')].filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(n).display!=='none';});const matrix=svg.getScreenCTM?.(),scale=matrix?Math.hypot(matrix.a,matrix.b):Math.min(svg.getBoundingClientRect().width/(svg.viewBox.baseVal.width||850),svg.getBoundingClientRect().height/(svg.viewBox.baseVal.height||700));return {viewBox:svg.getAttribute('viewBox'),anchors:nodes.map(n=>[n.dataset.nationalCode,n.getAttribute('x'),n.getAttribute('y')]),sizes:nodes.map(n=>Number(n.getAttribute('font-size'))*scale),overlapPairs:(()=>{let count=0;for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i].getBoundingClientRect(),b=nodes[j].getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)count++;}return count;})()};};
    const before=collect();document.querySelector('#mapZoomIn').click();return {before,after:collect()};
   });
   assert.equal(zoomImmediate.after.overlapPairs,0,item.name+' suppresses collisions before the debounced layout');
   assert(zoomImmediate.after.sizes.length&&zoomImmediate.after.sizes.every(size=>Math.abs(size-zoomImmediate.before.sizes[0])<1.6),
    item.name+' keeps screen text size stable during the zoom delay');
   const afterZoomImmediate={anchors:zoomImmediate.after.anchors.map(x=>[x[0],Number(x[1]),Number(x[2])])};
   assertAnchorsSame({anchors:before.anchors},afterZoomImmediate,item.name+' synchronous zoom compensation');
   await page.waitForTimeout(230);
   let afterZoom=await metrics(page,item.pref);
   assert(afterZoom.visibleInFrame>0,item.name+' button zoom keeps projected labels in the SVG frame');
   assertNoOverlap(afterZoom,item.name+' zoomed');
   assertAnchorsSame(before,afterZoom,item.name+' completed zoom layout');
   await page.locator('#mapFrame').screenshot({path:path.join(ARTIFACTS,engine+'-'+item.pref+'-study-zoomed.png')});
   await page.evaluate(()=>document.querySelector('#mapZoomOut').click());
   await page.waitForTimeout(230);
   let afterZoomOut=await metrics(page,item.pref);
   assertNoOverlap(afterZoomOut,item.name+' zoomed out');
   assertAnchorsSame(before,afterZoomOut,item.name+' zoom out');
   await page.evaluate(()=>document.querySelector('#mapReset').click());
   await page.waitForTimeout(230);
   let afterReset=await metrics(page,item.pref);
   const parse=s=>s.trim().split(/\s+/).map(Number);
   assert.deepEqual(parse(afterReset.viewBox).map(n=>Number(n.toFixed(3))),parse(initialView).map(n=>Number(n.toFixed(3))),item.name+' reset returns to the initial prefecture focus');
   assertNoOverlap(afterReset,item.name+' reset');
   if(item.pref==='28'){
    await page.locator('#mapReadingToggle').click();
    const readingImmediate=await metrics(page,item.pref);
    assertNoOverlap(readingImmediate,'Hyogo immediate reading toggle');
    await page.waitForTimeout(230);
    const withReading=await metrics(page,item.pref);
    assert.equal(withReading.reading,'on','reading toggle stays functional in study focus');
    assertNoOverlap(withReading,'Hyogo with readings');
    await page.locator('#mapReadingToggle').click();
    await page.waitForTimeout(230);
    await page.locator('#mapFrame').scrollIntoViewIfNeeded();
    const candidates=await page.locator('#map').evaluate(svg=>{
     const frame=document.querySelector('#mapFrame').getBoundingClientRect();
     return [...svg.querySelectorAll('[data-progressive-labels] [data-national-code]')].map(node=>{
      const rect=node.getBoundingClientRect(),x=(rect.left+rect.right)/2,y=(rect.top+rect.bottom)/2;
      const hit=document.elementFromPoint(x,y);
      return {code:node.getAttribute('data-national-code'),left:rect.left,right:rect.right,
       top:rect.top,bottom:rect.bottom,x,y,
       inFrame:rect.left>=frame.left&&rect.right<=frame.right&&rect.top>=frame.top&&rect.bottom<=frame.bottom,
       hitTarget:!!hit&&(hit===node||node.contains(hit)||node.contains(hit.closest?.('[data-national-code]')))};
     });
    });
    const viewport=page.viewportSize();
    const target=candidates.find(item=>item.code?.startsWith('28')&&item.inFrame&&item.hitTarget&&
     item.left>=0&&item.right<=viewport.width&&item.top>=0&&item.bottom<=viewport.height);
    assert(target,'Hyogo has an on-screen label that can receive a real pointer tap');
    const tap=async()=>mobile?
     page.touchscreen.tap(target.x,target.y):
     page.mouse.click(target.x,target.y);
    await tap();
    await page.waitForFunction(code=>document.querySelector('#map').dataset.nationalSelection===code,target.code);
    // The selected-area popup can cover the label. Close only the popup (R11
    // keeps the selection), then tap the same label at its current screen point.
    await page.locator('#popupClose').click();
    const selectedTarget=await page.locator('#map').evaluate((svg,code)=>{
     const node=[...svg.querySelectorAll('[data-progressive-labels] [data-national-code]')].find(n=>n.getAttribute('data-national-code')===code);
     if(!node)return null;
     const r=node.getBoundingClientRect(),x=(r.left+r.right)/2,y=(r.top+r.bottom)/2,hit=document.elementFromPoint(x,y);
     return {x,y,visible:r.width>0&&r.height>0,hitLabel:!!hit&&(hit===node||node.contains(hit)||node.contains(hit.closest?.('[data-national-code]')))};
    },target.code);
    assert(selectedTarget?.visible&&selectedTarget.hitLabel,'selected label remains tappable after closing its popup');
    if(mobile)await page.touchscreen.tap(selectedTarget.x,selectedTarget.y);
    else await page.mouse.click(selectedTarget.x,selectedTarget.y);
    await page.waitForFunction(()=>!document.querySelector('#map').dataset.nationalSelection);
    const cleared=await metrics(page,item.pref);
    assertNoOverlap(cleared,'Hyogo after municipality selection and clear');
   }
   await page.locator('#mapFrame').screenshot({path:path.join(ARTIFACTS,engine+'-'+item.pref+'-study-reset.png')});
   await page.locator('#placeSearch').fill(item.denseQuery);
   await page.waitForFunction(query=>[...document.querySelectorAll('#searchResults button')].some(button=>button.textContent.includes(query)),item.denseQuery,{timeout:30000});
   await page.locator('#searchResults button').filter({hasText:item.denseQuery}).first().click();
   await page.waitForFunction(code=>document.querySelector('#map').dataset.nationalSelection===code,item.denseCode,{timeout:30000});
   await page.locator('#popupClose').click();
   await page.waitForTimeout(230);
   const dense=await metrics(page,item.pref);
   assertNoOverlap(dense,item.name+' dense municipality focus '+item.denseQuery);
   assert(dense.visible>0&&dense.targetOnly&&dense.nonTargetHidden,item.name+' dense focus keeps only target-prefecture labels');
   assert(Number(dense.viewBox.split(/\s+/)[2])<Number(initialView.split(/\s+/)[2]),
    item.name+' dense focus zooms in from the prefecture-wide view');
   await page.locator('#mapFrame').screenshot({path:path.join(ARTIFACTS,engine+'-'+item.pref+'-study-dense.png')});
   report.push({browser:engine,pref:item.pref,name:item.name,initial:{labels:before.visible,overlaps:before.overlapPairs,screenFont:[before.screenFontMin,before.screenFontMax],viewBox:before.viewBox},zoom:{labels:afterZoom.visible,overlaps:afterZoom.overlapPairs,screenFont:[afterZoom.screenFontMin,afterZoom.screenFontMax]},reset:{labels:afterReset.visible,viewBox:afterReset.viewBox},dense:{query:item.denseQuery,labels:dense.visible,overlaps:dense.overlapPairs,viewBox:dense.viewBox},readings:item.pref==='28'?'checked':'not toggled'});
  }
  await page.goto(origin+'/maps/national-municipalities.html?pref=28');
  await page.waitForFunction(()=>document.querySelectorAll('#map [data-v2-labels] > g').length===49,null,{timeout:60000});
  const traditional=await page.locator('#map').evaluate(svg=>({study:document.body.classList.contains('study-pref-view'),progressive:Boolean(svg.querySelector('[data-progressive-labels]')),detailLabels:svg.querySelectorAll('[data-v2-labels] > g').length,viewBox:svg.getAttribute('viewBox')}));
  assert.equal(traditional.study,false,'traditional pref route is not study mode');
  assert.equal(traditional.progressive,false,'traditional pref route does not use the study progressive layer');
  assert.equal(traditional.detailLabels,49,'traditional prefecture mode keeps the detail renderer');
  report.push({browser:engine,mode:'pref=28',...traditional,comparison:'separate detail-rendering path; PR #339 applies here, not to studyPref'});
  await page.locator('#mapFrame').screenshot({path:path.join(ARTIFACTS,engine+'-28-pref-detail-baseline.png')});
  await fs.writeFile(path.join(ARTIFACTS,'national-study-label-layout-'+engine+'.json'),JSON.stringify(report,null,2));
  assert.deepEqual(app.errors,[]);
  console.log('PASS '+engine+' nationwide study label layout: '+JSON.stringify(report));
 }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
