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
   const child=()=>page.frames().find(item=>item.url().includes('/v2/national/popup-controls-map-preview.html'));
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

   const initialAnchor=await child().evaluate(()=>{
    const p=document.querySelector('#officePopup'),area=(p.offsetParent||p.parentElement).getBoundingClientRect();
    const head=document.querySelector('.popup-head').getBoundingClientRect(),body=document.querySelector('#popupBody').getBoundingClientRect();
    return {area:area.toJSON(),head:head.toJSON(),body:body.toJSON()};
   });
   assert(Math.abs(initialAnchor.area.bottom-8-initialAnchor.head.bottom)<3,'initial title row sits at the lower edge inside the map: '+JSON.stringify(initialAnchor));
   assert(initialAnchor.head.top>=initialAnchor.area.top&&initialAnchor.head.bottom<=initialAnchor.area.bottom,'the title row is contained in the map');
   assert(initialAnchor.body.top>=initialAnchor.area.bottom-14&&initialAnchor.body.bottom>initialAnchor.area.bottom+40,'popup details continue below the map');
   const initialTop=await popup.evaluate(e=>e.getBoundingClientRect().top);
   await fold.focus();await fold.press('Enter');
   await child().waitForFunction(()=>document.querySelector('#popupBody').hidden);
   assert.equal(await frame.locator('#popupBody').isVisible(),false,'collapsed body is hidden');
   assert.equal(await frame.locator('#popupCollapse').getAttribute('aria-expanded'),'false');
   const collapsed=await popup.evaluate(e=>({rect:e.getBoundingClientRect().toJSON(),area:(e.offsetParent||e.parentElement).getBoundingClientRect().toJSON()}));
   assert(Math.abs(collapsed.rect.top-initialTop)<3,'the first fold keeps the title stationary and retracts content upward');
   await grip.scrollIntoViewIfNeeded();
   let box=await grip.boundingBox();
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2-70,{steps:4});await page.mouse.up();
   const collapsedDragTop=await popup.evaluate(e=>e.getBoundingClientRect().top);
   assert(collapsedDragTop<collapsed.rect.top-40,`collapsed popup can still drag upward after docking: before=${collapsed.rect.top} after=${collapsedDragTop}, box=${JSON.stringify(box)}`);
   const leftAfterCollapsedDrag=await popup.evaluate(e=>e.getBoundingClientRect().left);
   await frame.locator('#popupCollapse').focus();await frame.locator('#popupCollapse').press('Space');
   await frame.locator('#popupBody:not([hidden])').waitFor();
   assert(Math.abs((await popup.evaluate(e=>e.getBoundingClientRect().top))-collapsedDragTop)<3,'first expansion grows downward from the dragged collapsed title position');
   assert.equal(await frame.locator('#popupActions a').count(),3,'reopened body restores the links');
   // Every fold keeps the title fixed and retracts content upward; every expansion grows downward.
   const secondExpandedTop=await popup.evaluate(e=>e.getBoundingClientRect().top);
   await frame.locator('#popupCollapse').click();
   assert.equal(await frame.locator('#popupBody').isVisible(),false,'second fold hides body');
   const secondCollapsedTop=await popup.evaluate(e=>e.getBoundingClientRect().top);
   assert(Math.abs(secondCollapsedTop-secondExpandedTop)<3,'second fold keeps title at top, retracting upward instead of redocking');
   await frame.locator('#popupCollapse').click();
   assert.equal(await frame.locator('#popupBody').isVisible(),true,'second expand restores content below title');
   const thirdExpandedTop=await popup.evaluate(e=>e.getBoundingClientRect().top);
   assert(Math.abs(thirdExpandedTop-secondCollapsedTop)<3,'second expansion extends down from stationary title');
   const bodyPoint=await child().evaluate(()=>{
    const r=document.querySelector('#popupScroll').getBoundingClientRect();
    for(let y=r.top+4;y<r.bottom-4;y+=8)for(let x=r.left+4;x<r.right-4;x+=8){
     const target=document.elementFromPoint(x,y);
     if(target&&!target.closest('button,a,input,select,textarea,[role="button"]'))return{x,y};
    }
    throw Error('no noninteractive body drag point found');
   });
   const frameBox=await page.locator('#mapPreview').boundingBox();
   bodyPoint.x+=frameBox.x;bodyPoint.y+=frameBox.y;
   const bodyTop=await popup.evaluate(e=>e.getBoundingClientRect().top);
   await page.mouse.move(bodyPoint.x,bodyPoint.y);await page.mouse.down();
   await page.mouse.move(bodyPoint.x,bodyPoint.y+45,{steps:4});await page.mouse.up();
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
   await frame.getByRole('button',{name:'吹き出しを閉じる'}).focus();await frame.getByRole('button',{name:'吹き出しを閉じる'}).press('Enter');
   await child().waitForFunction(()=>document.querySelector('#officePopup').hidden);
   assert.equal(await frame.locator('#map .chosen[data-code="28110"]').count(),1,'closing popup retains selected map region');

   await page.getByRole('button',{name:/上北郡東北町/}).click();
   await frame.locator('#popupBody:not([hidden])').waitFor();
   assert(await frame.locator('#popupName').textContent().then(x=>x.includes('東北町')),'county sample loads its official municipality name');
   await page.getByRole('button',{name:/東京都新宿区/}).click();
   await child().waitForFunction(()=>document.querySelector('#popupName').textContent.includes('新宿区')&&!document.querySelector('#officePopup').hidden);
   assert.equal(await frame.locator('#popupBody').isVisible(),true,'Tokyo ward selection displays the body');
   assert(await frame.locator('#popupName').textContent().then(x=>x.includes('新宿区')));
   // User-approved revision to R08/R36: map readings remain OFF by default,
   // but verified popup-title readings must always stay visible in trial mode.
   assert((await frame.locator('#mapReadingToggle').textContent()).includes('OFF'),'map labels initially have readings OFF');
   await frame.locator('#popupReading:visible').waitFor();
   const verifiedReading=await frame.locator('#popupReading').textContent();
   assert(verifiedReading&&verifiedReading.trim().length>0,'popup title shows verified reading with map readings OFF');
   await frame.locator('#mapReadingToggle').click();
   assert((await frame.locator('#mapReadingToggle').textContent()).includes('ON'),'map reading toggle still works');
   assert.equal(await frame.locator('#popupReading').textContent(),verifiedReading,'popup title reading persists with map ON');
   await frame.locator('#mapReadingToggle').click();
   assert((await frame.locator('#mapReadingToggle').textContent()).includes('OFF'),'map reading toggle returns to OFF');
   assert.equal(await frame.locator('#popupReading').textContent(),verifiedReading,'popup title reading remains visible with map OFF');
   assert.equal(await frame.locator('#popupReading').isVisible(),true,'popup reading stays visible');
   await frame.locator('#popupCollapse').click();
   assert.equal(await frame.locator('#popupReading').isVisible(),true,'reading remains visible in collapsed title bar');
   await frame.locator('#popupCollapse').click();

   const prefectureShapes=await frame.locator('#map .prefecture').count();
   const beforeZoom=await frame.locator('#map').getAttribute('viewBox');
   await frame.getByRole('button',{name:'地図を拡大'}).click();
   assert.notEqual(await frame.locator('#map').getAttribute('viewBox'),beforeZoom,'map zoom remains operable');
   await frame.locator('#mapFrame').evaluate(()=>document.body.classList.add('map-screen-mode'));
   assert.equal(await frame.locator('#officePopup').isVisible(),true,'popup remains visible in fullscreen mode');
   await frame.locator('#mapFullscreen').click();
   assert.equal(await frame.locator('body').evaluate(e=>e.classList.contains('map-screen-mode')),false,'fullscreen return remains operable');
   assert.equal(await frame.locator('#map path.borders').count(),1,'shared boundary stroke remains a single path');
   assert.equal(await frame.locator('#map path.coastlines').count(),1,'coastline layer remains unchanged');
   assert.equal(await frame.locator('#map .prefecture').count(),prefectureShapes,'map shapes remain unchanged after fullscreen transition');
   assert.equal(await frame.locator('#map .chosen').count(),1,'one selected municipality remains after view controls');

   await page.getByRole('button',{name:'現行表示'}).click();
   await page.waitForFunction(()=>{
    const f=document.getElementById('mapPreview');
    try{return f.contentWindow.location.pathname==='/maps/national-municipalities.html'&&f.contentWindow.location.search==='?popupControlsCurrent=1';}catch{return false;}
   });
   assert.equal(await frame.locator('#popupCollapse').count(),0,'comparison can return to the unchanged current popup');
   assert.equal(await page.locator('a[href="/maps/national-municipalities.html"]').count(),1,'official page link is available');
   await page.goto(origin+'/maps/national-municipalities.html');
   await page.locator('#map .prefecture').first().waitFor({timeout:90000});
   // The popup is hidden until a municipality is selected. Verify the actual
   // default-page interaction instead of waiting for a hidden button to show.
   await page.locator('#popupCollapse').waitFor({state:'attached',timeout:60000});
   // The public map's native selects are visually hidden in the modern
   // region-picker UI. The existing comparison test drives their change events.
   await page.locator('#pref').evaluate(el=>{el.value='28';el.dispatchEvent(new Event('change',{bubbles:true}));});
   await page.waitForFunction(()=>Array.from(document.querySelector('#region').options).some(o=>o.value==='28204'));
   await page.locator('#region').evaluate(el=>{el.value='28204';el.dispatchEvent(new Event('change',{bubbles:true}));});
   await page.locator('#map .chosen[data-code="28204"]').waitFor({timeout:60000});
   await page.locator('#officePopup:not([hidden])').waitFor({timeout:60000});
   await page.locator('#popupCollapse').waitFor({state:'visible',timeout:60000});
   assert.equal(await page.locator('#popupBody').getAttribute('hidden'),null,'formal page enables the improved popup controls by default');
   const formalAnchor=await page.evaluate(()=>{
    const p=document.querySelector('#officePopup'),area=(p.offsetParent||p.parentElement).getBoundingClientRect();
    const head=document.querySelector('.popup-head').getBoundingClientRect(),body=document.querySelector('#popupBody').getBoundingClientRect();
    return {area:area.toJSON(),head:head.toJSON(),body:body.toJSON()};
   });
   assert(Math.abs(formalAnchor.area.bottom-8-formalAnchor.head.bottom)<3,'formal popup title row sits at the lower map edge');
   assert(formalAnchor.body.top>=formalAnchor.area.bottom-14,'formal popup details begin below the map');
   const formalTitleTop=await page.locator('#officePopup').evaluate(e=>e.getBoundingClientRect().top);
   await page.locator('#popupCollapse').click();
   assert.equal(await page.locator('#popupBody').isVisible(),false,'formal page can collapse municipality details');
   assert(Math.abs(await page.locator('#officePopup').evaluate(e=>e.getBoundingClientRect().top)-formalTitleTop)<3,'formal fold keeps title stationary and folds content upward');
   await page.locator('#popupCollapse').click();
   assert.equal(await page.locator('#popupBody').isVisible(),true,'formal page restores municipality details');
   assert(Math.abs(await page.locator('#officePopup').evaluate(e=>e.getBoundingClientRect().top)-formalTitleTop)<3,'formal expansion grows downward from the title');
   assert.deepEqual(app.errors,[]);
   console.log('PASS popup-controls '+engine+': phone-width collision, title grip and noninteractive body drag, collapse/reopen, selection, links, fullscreen, zoom and boundary contracts');
  }finally{await app.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});