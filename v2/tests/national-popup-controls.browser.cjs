'use strict';
const assert=require('node:assert/strict');
const {start}=require('./helpers/nationwide-browser.cjs');
(async()=>{
 for(const engine of ['chromium','webkit']){
  const app=await start({engine,contextOptions:{viewport:{width:390,height:844}}});
  const page=app.page;
  try{
   await app.open();
   const origin=new URL(page.url()).origin;
   await page.goto(origin+'/v2/national/popup-controls-trial.html');
   const frame=page.frameLocator('#mapPreview');
   const child=()=>page.frames().find(item=>item.url().includes('/maps/national-municipalities.html'));
   await frame.locator('#map .prefecture').first().waitFor({timeout:90000});
   await frame.locator('#map path.prefecture[style*="pref-color"]').first().waitFor({timeout:60000});
   await page.waitForFunction(()=>document.querySelector('#mapPreview')?.dataset.trialReady==='true',{},{timeout:60000});

   await page.getByRole('button',{name:'現行表示'}).click();
   await frame.locator('#map .prefecture').first().waitFor();
   await page.getByRole('button',{name:/西宮市・3リンク/}).click();
   await frame.locator('#officePopup:not([hidden])').waitFor({timeout:120000});
   assert.equal(await frame.locator('#popupCollapse').count(),0,'current view retains the original popup controls');

   await page.getByRole('button',{name:'試作表示'}).click();
   await page.waitForFunction(()=>document.querySelector('#mapPreview')?.dataset.trialReady==='true',{},{timeout:60000});
   await page.getByRole('button',{name:/西宮市・3リンク/}).click();
   const popup=frame.locator('#officePopup');
   await popup.waitFor({state:'visible',timeout:120000});
   const grip=frame.getByRole('img',{name:'ここをつかんで上下に移動できます'});
   const fold=frame.getByRole('button',{name:'吹き出し本文を折り畳む'});
   const close=frame.getByRole('button',{name:'吹き出しを閉じる'});
   await grip.waitFor();
   assert.equal(await frame.locator('#popupActions a').count(),3,'single-office sample keeps its three destination links');
   const row=await child().evaluate(()=>{
    const h=document.querySelector('.popup-head').getBoundingClientRect();
    const title=document.querySelector('.popup-heading').getBoundingClientRect();
    const fold=document.querySelector('#popupCollapse').getBoundingClientRect();
    const close=document.querySelector('#popupClose').getBoundingClientRect();
    return {headingAfterGrip:title.left>=h.left+24,notOverFold:title.right<=fold.left,notOverClose:fold.right<=close.left+1,foldSize:[fold.width,fold.height],closeSize:[close.width,close.height]};
   });
   assert(row.headingAfterGrip&&row.notOverFold&&row.notOverClose,'390px title and controls do not overlap');
   assert(row.foldSize[0]>=44&&row.foldSize[1]>=44&&row.closeSize[0]>=44&&row.closeSize[1]>=44,'collapse and close targets are at least 44px');

   const topBefore=await popup.evaluate(e=>e.getBoundingClientRect().top-e.offsetParent.getBoundingClientRect().top);
   await fold.click();
   await child().waitForFunction(()=>document.querySelector('#popupBody').hidden);
   assert.equal(await frame.locator('#popupBody').isVisible(),false,'collapsed body is hidden');
   assert.equal(await frame.locator('#popupCollapse').getAttribute('aria-expanded'),'false');
   const topCollapsed=await popup.evaluate(e=>e.getBoundingClientRect().top-e.offsetParent.getBoundingClientRect().top);
   assert(Math.abs(topBefore-topCollapsed)<2,'collapse preserves the popup top edge');
   let box=await grip.boundingBox();
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2+70,{steps:4});await page.mouse.up();
   const collapsedDragTop=await popup.evaluate(e=>e.getBoundingClientRect().top);
   assert(collapsedDragTop>topCollapsed+40,'collapsed popup still drags vertically');
   const leftAfterCollapsedDrag=await popup.evaluate(e=>e.getBoundingClientRect().left);
   await frame.getByRole('button',{name:'吹き出し本文を展開'}).click();
   await frame.locator('#popupBody:not([hidden])').waitFor();
   assert.equal(await frame.locator('#popupActions a').count(),3,'reopened body restores the links');
   const content=frame.locator('#popupNote');
   const bodyBox=await content.boundingBox();
   const bodyTop=await popup.evaluate(e=>e.getBoundingClientRect().top);
   await page.mouse.move(bodyBox.x+Math.min(30,bodyBox.width/2),bodyBox.y+Math.min(20,bodyBox.height/2));await page.mouse.down();
   await page.mouse.move(bodyBox.x+Math.min(30,bodyBox.width/2),bodyBox.y+Math.min(20,bodyBox.height/2)+45,{steps:4});await page.mouse.up();
   assert((await popup.evaluate(e=>e.getBoundingClientRect().top))>bodyTop+25,'noninteractive popup body still drags vertically');
   assert.equal(await frame.locator('#popupCollapse').getAttribute('aria-expanded'),'true');
   assert.equal(await popup.evaluate(e=>e.getBoundingClientRect().left),leftAfterCollapsedDrag,'popup remains horizontally fixed');

   box=await grip.boundingBox();const expandedTop=await popup.evaluate(e=>e.getBoundingClientRect().top);
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2+60,{steps:4});await page.mouse.up();
   assert((await popup.evaluate(e=>e.getBoundingClientRect().top))>expandedTop+35,'expanded popup still drags vertically');

   await frame.getByRole('button',{name:'吹き出し本文を折り畳む'}).click();
   await page.getByRole('button',{name:/神戸市中央区・6リンク/}).click();
   await frame.locator('#popupBody:not([hidden])').waitFor();
   assert.equal(await frame.locator('#popupActions a').count(),6,'new municipality selection reopens all six destination links');
   assert.equal(await frame.locator('#map .chosen[data-code="28110"]').count(),1,'selected district remains highlighted');
   const scroll=frame.locator('#popupScroll');
   const scrollable=await scroll.evaluate(e=>({overflow:getComputedStyle(e).overflowY,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight}));
   assert.equal(scrollable.overflow,'auto','six-link popup retains its internal scroll container');
   await scroll.evaluate(e=>e.scrollTop=e.scrollHeight);
   assert.equal(await frame.locator('#popupActions a').count(),6,'all links remain reachable after internal scroll');

   await frame.getByRole('button',{name:'吹き出し本文を折り畳む'}).click();
   await frame.getByRole('button',{name:'吹き出しを閉じる'}).click();
   await child().waitForFunction(()=>document.querySelector('#officePopup').hidden);
   assert.equal(await frame.locator('#map .chosen[data-code="28110"]').count(),1,'closing popup retains selected map region');

   await page.getByRole('button',{name:/上北郡東北町/}).click();
   await frame.locator('#popupBody:not([hidden])').waitFor();
   assert(await frame.locator('#popupName').textContent().then(x=>x.includes('東北町')),'county sample loads its official municipality name');
   await page.getByRole('button',{name:/東京都新宿区/}).click();
   assert.equal(await frame.locator('#popupBody').isVisible(),true,'Tokyo ward selection displays the body');
   assert(await frame.locator('#popupName').textContent().then(x=>x.includes('新宿区')));

   const beforeZoom=await frame.locator('#map').getAttribute('viewBox');
   await frame.getByRole('button',{name:'地図を拡大'}).click();
   assert.notEqual(await frame.locator('#map').getAttribute('viewBox'),beforeZoom,'map zoom remains operable');
   await frame.locator('#mapFrame').evaluate(()=>document.body.classList.add('map-screen-mode'));
   assert.equal(await frame.locator('#officePopup').isVisible(),true,'popup remains visible in fullscreen mode');
   await frame.locator('#mapFullscreen').click();
   assert.equal(await frame.locator('body').evaluate(e=>e.classList.contains('map-screen-mode')),false,'fullscreen return remains operable');
   assert.equal(await frame.locator('#map path.borders').count(),1,'shared boundary stroke remains a single path');
   assert.equal(await frame.locator('#map path.coastlines').count(),1,'coastline layer remains unchanged');
   assert(await frame.locator('#map .prefecture').count()===47,'all prefecture overview shapes remain');
   assert.equal(await frame.locator('#map .chosen').count(),1,'one selected municipality remains after view controls');

   await page.getByRole('button',{name:'現行表示'}).click();
   assert.equal(await frame.locator('#popupCollapse').count(),0,'comparison can return to the unchanged current popup');
   assert.equal(await page.locator('a[href="/maps/national-municipalities.html"]').count(),1,'official page link is available');
   assert.deepEqual(app.errors,[]);
   console.log('PASS popup-controls '+engine+': phone-width collision, title grip and noninteractive body drag, collapse/reopen, selection, links, fullscreen, zoom and boundary contracts');
  }finally{await app.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});