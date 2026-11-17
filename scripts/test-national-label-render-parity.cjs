'use strict';
// TOWNMAP-SSOT-001 R-TOWN-00/14: compare every SVG label DOM node and
// rendered location with the accepted previous Takarazuka comparison.
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const base='http://127.0.0.1:8765';
const pages=[
 '/v2/takarazuka-town-svg-unified-source-20261118-pilot.html',
 '/v2/takarazuka-town-svg-unified-label-render-20261118-pilot.html'
];
const cases=[['chromium-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,720]];
async function snapshot(page){
 return page.evaluate(()=>{
  const root=document.querySelector('#map').getBoundingClientRect();
  const round=x=>Math.round(x*100)/100;
  return {
   labels:[...document.querySelectorAll('#labels g.label')].map(g=>{
    const d=g.__data__,r=g.getBoundingClientRect();
    return {key:d.key,name:d.name,reading:d.reading,anchor:d.anchor.map(round),
     secondary:!!d.secondary,componentArea:d.componentArea??null,visible:g.dataset.visible,
     display:g.style.display,transform:g.getAttribute('transform'),
     html:g.innerHTML,rect:[round(r.x-root.x),round(r.y-root.y),round(r.width),round(r.height)]};
   }),
   townPaths:[...document.querySelectorAll('#areas path.town')].map(p=>[p.getAttribute('data-name'),p.getAttribute('d')]),
   regionCount:document.querySelectorAll('#communityOptions button[data-community]').length
  };
 });
}
async function run(browser,html,width,height){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:width<500,hasTouch:width<500});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto(base+html,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#communityCount')?.textContent.includes('125町名'),null,{timeout:60000});
  const result=[];
  async function record(label){await page.waitForTimeout(220);result.push({stage:label,data:await snapshot(page)})}
  await record('city-start');
  await page.locator('#reading').click();await record('readings-on');
  await page.locator('#larger').click();await record('larger-text');
  await page.locator('#zoomIn').click();await page.waitForTimeout(550);await record('map-zoom');
  await page.locator('#reading').click();await record('readings-off');
  await page.locator('#reset').click();await record('city-reset');
  await page.locator('#communityToggle').click();
  await page.evaluate(()=>document.querySelector('#communityOptions button[data-community="仁川"]').click());
  await record('nijigawa-region');
  await page.locator('#communityToggle').click();
  await page.evaluate(()=>document.querySelector('#communityOptions button[data-community="西谷"]').click());
  await record('nishitani-region');
  await page.locator('#communityToggle').click();
  await page.evaluate(()=>document.querySelector('#communityOptions button[data-community=""]').click());
  await record('city-return');
  await page.locator('#fullscreen').click();await record('fullscreen');
  await page.locator('#fullscreen').click();
  assert.deepEqual(errors,[]);
  return result;
 }finally{await page.close()}
}
(async()=>{
 for(const [screen,engine,width,height] of cases){
  const browser=await engine.launch({headless:true});
  try{
   const [before,after]=await Promise.all(pages.map(p=>run(browser,p,width,height)));
   assert.equal(before.length,after.length);
   for(let i=0;i<before.length;i++){
    assert.equal(before[i].stage,after[i].stage);
    // Non-font geometry is a strict invariant.
    assert.deepEqual(after[i].data.townPaths,before[i].data.townPaths);
    assert.equal(after[i].data.regionCount,before[i].data.regionCount);
    const old=before[i].data.labels,newer=after[i].data.labels;
    assert.equal(newer.length,old.length,screen+':'+before[i].stage);
    for(let j=0;j<old.length;j++){
     const a=old[j],b=newer[j];assert.equal(a.key,b.key);
     for(const prop of ['name','reading','anchor','secondary','componentArea','visible','display','transform','html'])assert.deepEqual(b[prop],a[prop],
      screen+':'+before[i].stage+':'+a.name+':'+prop);
     for(let k=0;k<4;k++)assert.ok(Math.abs(b.rect[k]-a.rect[k])<=2,
      screen+':'+before[i].stage+':'+a.name+':screenRect '+k+': '+b.rect[k]+' vs '+a.rect[k]);
    }
   }
   console.log('PASS NATIONAL_LABEL_RENDER_PARITY '+JSON.stringify({screen,states:before.length,
    cityInitialLabels:before[0].data.labels.length,allLabelElementsExact:true,
    allTownPathsExact:true,allStateLocationsWithin2px:true,errors:0}));
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
