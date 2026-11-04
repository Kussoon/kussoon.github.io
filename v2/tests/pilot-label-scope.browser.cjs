'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {start}=require('./helpers/nationwide-browser.cjs');
(async()=>{
 const app=await start(),{page}=app,report=[];
 try{
  await page.addInitScript(()=>{
   window.labelStages=[];
   for(const [name,method,stage,inputIndex] of [['KussoonLabelEngine','buildModels','models',0],['KussoonReadableLabels','planCenterFirstLabels','balanced',0],['KussoonCollisionRefinement','refine','collision',1],['KussoonRegionFit','refine','fit',1]]){
    let current;Object.defineProperty(window,name,{configurable:true,get(){return current},set(value){current={...value,[method](...args){const result=value[method](...args),output=result.models||result.labels||result;window.labelStages.push({stage,input:args[inputIndex].length,output:output.length});return result;}};}});
   }
  });
  await page.setViewportSize({width:390,height:844});await app.open();
  assert(await page.locator('#showNames').isChecked(),'surrounding municipality names are on by default');
  // Observe the actual shared adapter, without changing its implementation.
  await page.evaluate(()=>{const adapter=window.KussoonV2EstablishedLabelAdapter;window.labelCalls=[];window.KussoonV2EstablishedLabelAdapter={...adapter,layout(options){const t=performance.now(),start=window.labelStages.length,result=adapter.layout(options);window.labelCalls.push({input:options.regions.length,all:options.all,selected:options.selected,output:result.size,ms:performance.now()-t,stages:window.labelStages.slice(start)});return result;}};});
  for(const [pref,code] of [['22','22138'],['28','28101'],['01','01101'],['47','47201']]){
   await app.pref(pref);await app.select(code);await page.click('#popupClose');await page.locator('#map').scrollIntoViewIfNeeded();
   const state=await page.locator('#map').evaluate(map=>{
    const box=map.getBoundingClientRect(),labels=[...map.querySelectorAll('[data-v2-labels] > g')];
    const visible=labels.filter(n=>{const b=n.getBoundingClientRect();return b.width>0&&b.right>box.left&&b.left<box.right&&b.bottom>box.top&&b.top<box.bottom;});
    return {paths:map.querySelectorAll('.land').length,labels:labels.length,visible:visible.length,call:window.labelCalls.at(-1)};
   });
   assert.equal(state.labels,state.paths,'all current-prefecture regions survive balanced/collision/fit');
   assert.equal(state.call.output,state.call.input);assert(state.call.all);
   assert.deepEqual(state.call.stages.map(s=>s.stage),['models','balanced','collision','fit','fit']);
   assert(state.call.stages.every(s=>s.input===state.paths&&s.output===state.paths),'no label is culled by any placement stage');assert(state.visible>1,'surrounding names appear in selected frame');
   assert.equal(await page.getAttribute('#mapReadingToggle','aria-pressed'),'false','readings remain initially off');
   const before=await app.snapshot();
   if(pref==='22'&&process.env.KUSSOON_BROWSER_ARTIFACTS){await fs.mkdir(process.env.KUSSOON_BROWSER_ARTIFACTS,{recursive:true});await page.locator('#mapFrame').screenshot({path:path.join(process.env.KUSSOON_BROWSER_ARTIFACTS,'hamamatsu-surrounding.png')});}
   const calls=await page.evaluate(()=>window.labelCalls.length);await page.click('#mapZoomIn');
   const b=await page.locator('#map').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+30);await page.mouse.down();await page.mouse.move(b.x+b.width/2+30,b.y+65,{steps:4});await page.mouse.up();
   assert.equal(await page.evaluate(()=>window.labelCalls.length),calls,'zoom/pan do not recompute the full label layout');
   await page.click('#mapReset');
   assert.equal((await app.snapshot()).viewBox,before.viewBox);
   await page.locator('#showNames').uncheck();assert.equal(await page.locator('#map [data-v2-labels] > g').count(),1);
   const single=await app.snapshot();assert.deepEqual(single.paths,before.paths);assert.equal(single.viewBox,before.viewBox);assert.equal(single.selected,code);assert(single.popupHidden);
   await page.locator('#map').scrollIntoViewIfNeeded();
   if(pref==='22'&&process.env.KUSSOON_BROWSER_ARTIFACTS)await page.locator('#mapFrame').screenshot({path:path.join(process.env.KUSSOON_BROWSER_ARTIFACTS,'hamamatsu-selected-only.png')});
   await page.locator('#showNames').check();report.push({pref,code,...state});
  }
  assert.deepEqual(app.errors,[]);
  if(process.env.KUSSOON_BROWSER_ARTIFACTS)await fs.writeFile(path.join(process.env.KUSSOON_BROWSER_ARTIFACTS,'surrounding-label-report.json'),JSON.stringify(report,null,2));
  console.log('PASS current-prefecture label scope, selected-only opt-out, no zoom/pan relayout: '+JSON.stringify(report));
 }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
