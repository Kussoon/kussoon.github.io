'use strict';
// S01-S05/S16, PR #81/#139/#148/#245. Real path clicks must preserve both
// the geographic projection (all path.d values) and the SVG viewport.
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {start}=require('./helpers/nationwide-browser.cjs');
const geometry=state=>createHash('sha256').update(JSON.stringify(state.paths)).digest('hex');
async function tapRegion(page,code){
 await page.locator('#map').scrollIntoViewIfNeeded();
 const point=await page.locator('#map [data-code="'+code+'"]').evaluate(path=>{
  const box=path.getBBox(),matrix=path.getScreenCTM(),candidates=[];
  for(let ix=0;ix<25;ix++)for(let iy=0;iy<25;iy++){
   const local=new DOMPoint(box.x+(ix+.5)*box.width/25,box.y+(iy+.5)*box.height/25);
   if(!path.isPointInFill(local))continue;
   const screen=local.matrixTransform(matrix);
   if(document.elementFromPoint(screen.x,screen.y)?.closest('[data-code]')!==path)continue;
   candidates.push({x:screen.x,y:screen.y,score:Math.hypot(ix-12,iy-12)});
  }
  return candidates.sort((a,b)=>a.score-b.score)[0];
 });
 assert(point,'visible hit-testable region '+code);await page.mouse.click(point.x,point.y);
}
(async()=>{
 const app=await start(),{page}=app;
 try{
  await app.open();await app.pref('28');
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:width===390?844:1000});
   for(const code of ['28204','28365','28110']){
    await page.click('#prefBtn');const prefecture=await app.snapshot();
    await tapRegion(page,code);await page.locator('#map .chosen[data-code="'+code+'"]').waitFor();
    assert(await page.locator('#officePopup').isVisible());
    await page.click('#mapZoomIn');
    // Selection focus + an additional user viewport must BOTH survive clearing.
    await page.locator('#map').scrollIntoViewIfNeeded();const box=await page.locator('#map').boundingBox();
    // The top strip is outside the information card, including at 390px.
    await page.mouse.move(box.x+box.width/2,box.y+20);await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+30,box.y+45,{steps:6});await page.mouse.up();
    const before=await app.snapshot();
    await page.click('#popupClose');const closed=await app.snapshot();
    assert.equal(closed.selected,code);assert(closed.popupHidden);
    assert.equal(geometry(closed),geometry(before));assert.equal(closed.viewBox,before.viewBox);
    await tapRegion(page,code);const cleared=await app.snapshot();
    assert.equal(cleared.selected,'');assert(cleared.popupHidden);
    assert.equal(geometry(cleared),geometry(before),'S02 re-tap must not reproject to prefecture');
    assert.equal(cleared.viewBox,before.viewBox,'S02 re-tap must retain user zoom/pan');
    await tapRegion(page,code);await page.locator('#officePopup').waitFor();
    assert.equal((await app.snapshot()).selected,code,'S03 next tap reselects and opens popup');
    if(code==='28365'){
     await page.click('#popupClose');await tapRegion(page,code);
     await page.locator('#map').scrollIntoViewIfNeeded();const panBox=await page.locator('#map').boundingBox();
     for(let n=0;n<4;n++){
      await page.mouse.move(panBox.x+panBox.width/2,panBox.y+20);await page.mouse.down();
      await page.mouse.move(panBox.x+panBox.width/2,panBox.y+140,{steps:8});await page.mouse.up();
     }
     const y=Number((await page.getAttribute('#map','viewBox')).split(' ')[1]);
     assert(y< -350,'S16: re-tap must retain focused contentBounds, not the old -350 pan clamp');
    }
    await page.click('#prefBtn');const reset=await app.snapshot();
    assert.equal(reset.selected,'');assert(reset.popupHidden);
    assert.equal(geometry(reset),geometry(prefecture),'explicit prefecture return still refocuses');
    assert.equal(reset.viewBox,'0 0 850 700');assert.equal(await page.locator('#map .borders').count(),1);
   }
  }
  assert.deepEqual(app.errors,[]);console.log('PASS S01-S05/S16: real re-tap cycles at 1280/390px, Nishinomiya/Taka/Kobe Chuo, projection + viewport retained, explicit reset preserved');
 }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
