'use strict';
const assert=require('node:assert/strict');
const {start}=require('./helpers/nationwide-browser.cjs');
const {adjacency,pairs}=require('./fixtures/prefecture-adjacencies.cjs');

function expectedTable(page){
 return page.evaluate(()=>window.KussoonV2PrefectureColors.colorByPrefecture);
}
async function colorRows(page,selector){
 return page.locator(selector).evaluateAll(nodes=>nodes.map(node=>({
  code:node.dataset.pref||((node.dataset.code||node.dataset.nationalCode||'').slice(0,2)),
  color:node.style.getPropertyValue('--pref-color').trim()
 })));
}
async function waitForOverviewColors(page){
 await page.waitForFunction(()=>window.KussoonV2PrefectureColors&&
  document.querySelectorAll('#map path.prefecture').length===47&&
  [...document.querySelectorAll('#map path.prefecture')].every(p=>p.style.getPropertyValue('--pref-color')));
}
function assertAdjacentColors(rows,table,mode){
 const byCode=new Map(rows.map(row=>[row.code,row.color]));
 assert.equal(byCode.size,47,mode+' has all 47 prefecture colors');
 for(const [a,b] of pairs)assert.notEqual(byCode.get(a),byCode.get(b),mode+' adjacent pair '+a+'/'+b);
 for(const [code,color] of Object.entries(table))assert.equal(byCode.get(code),color,mode+' uses fixed color '+code);
}
(async()=>{
 for(const engine of ['chromium','webkit']){
  const app=await start({engine,contextOptions:{viewport:{width:390,height:844}}});
  const {page}=app;
  try{
   await app.open();
   const origin=new URL(page.url()).origin;
   const openPublic=async query=>{
    await page.goto(origin+'/maps/national-municipalities.html'+(query?'?'+query:''));
    await page.waitForFunction(()=>window.KussoonV2PrefectureColors&&
     window.KussoonV2ProgressivePreview?.controller.snapshot().count===1905,{},{timeout:90000});
    await waitForOverviewColors(page);
   };
   await openPublic('');
   const table=await expectedTable(page);
   assertAdjacentColors(await colorRows(page,'#map path.prefecture'),table,'nationwide overview');
   assert.equal(await page.locator('#mapReadingToggle').getAttribute('aria-pressed'),'false');

   await openPublic('studyPref=28');
   await page.waitForFunction(()=>document.body.classList.contains('study-pref-view'));
   assertAdjacentColors(await colorRows(page,'#map path.prefecture'),table,'studyPref=28');
   assert.equal(await page.locator('#map path.prefecture[data-pref="28"]').evaluate(n=>n.style.getPropertyValue('--pref-color').trim()),table['28']);
   assert.notEqual(table['28'],table['33'],'Hyogo and Okayama remain distinct in studyPref mode');

   await page.goto(origin+'/maps/national-municipalities.html?pref=28');
   await page.waitForFunction(()=>window.KussoonV2PrefectureColors&&
    document.querySelector('#pref')?.value==='28'&&
    document.querySelector('#status')?.textContent.includes('市区町村を選べます')&&
    document.querySelectorAll('#map path.land').length>0,{},{timeout:90000});
   await page.waitForFunction(()=>[...document.querySelectorAll('#map path.land')].every(p=>p.style.getPropertyValue('--pref-color')));
   const countyRows=await colorRows(page,'#map path.land');
   assert(countyRows.length>0,'prefecture detail mode has municipality paths');
   assert(countyRows.every(row=>row.code==='28'),'prefecture detail mode contains only Hyogo municipality paths');
   assert(countyRows.every(row=>row.color===table['28']),'prefecture detail uses the shared Hyogo color');

   await page.locator('#areaSettings').evaluate(el=>{el.open=true;});
   const selectedCode=await page.locator('#region option:not([value=""])').first().getAttribute('value');
   assert(selectedCode?.startsWith('28'),'Hyogo municipality is available for selection');
   await page.locator('#region').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));},selectedCode);
   const chosen=page.locator('#map path.land.chosen[data-code="'+selectedCode+'"]');
   await chosen.waitFor({timeout:30000});
   const selected=await chosen.evaluate(node=>({color:node.style.getPropertyValue('--pref-color').trim(),animation:getComputedStyle(node).animationName}));
   assert.equal(selected.color,table['28'],'selection retains prefecture fill');
   const reduced=await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
   assert.equal(selected.animation,reduced?'none':'kussoon-selected-area-two-tone','existing selection pulse is preserved');
   assert.equal(await page.locator('#map path.land.chosen').count(),1,'one selection is highlighted');
   await page.locator('#region').evaluate(el=>{el.value='';el.dispatchEvent(new Event('change',{bubbles:true}));});
   await page.waitForFunction(()=>document.querySelectorAll('#map path.land.chosen').length===0);
   assert.equal(app.errors.length,0,app.errors.join('; '));
   console.log('PASS adjacent-prefecture palette '+engine+': nationwide, studyPref=28, prefecture detail and selection');
  }finally{await app.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
