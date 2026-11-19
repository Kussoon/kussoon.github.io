'use strict';
// R-TOWN-12/14/21/23/24/40/41/44: combine operations rather than testing
// isolated buttons. Do not loosen the already accepted 136-candidate baseline.
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const url='http://127.0.0.1:8765/v2/town-map-shared-browser-fullscreen-20261119-pilot.html';
async function verify(page,stage,{reading=false,expectedRegion=null,expectedQuiz=null}={}){
 await page.waitForTimeout(400); // settled SVG, queued label layout and range measurement
 const snap=await page.evaluate(()=>{
  const groups=[...document.querySelectorAll('#labels g.label')];
  const paths=[...document.querySelectorAll('#areas path.town')];
  const t=window.d3.zoomTransform(document.querySelector('#map'));
  const matrix=document.querySelector('#world').getScreenCTM();
  const mode=window.__townPreview.quizMode();
  const reading=document.querySelector('#reading').getAttribute('aria-pressed')==='true';
  const names=new Set(paths.map(p=>p.__data__.name));
  const candidates=groups.map(g=>{
   const d=g.__data__,span=g.querySelector('tspan.town-name');
   const rect=span&&window.KussoonTownMultipartLabels.glyphScreenRect(span,document);
   const anchor=d?.point;
   const center=anchor&&matrix?{
    x:matrix.a*anchor[0]+matrix.c*anchor[1]+matrix.e,
    y:matrix.b*anchor[0]+matrix.d*anchor[1]+matrix.f
   }:null;
   const visible=g.dataset.visible==='true';
   return {key:d?.key,name:d?.name,visible,display:g.style.display,
    font:Number(g.querySelector('text.town-label')?.getAttribute('font-size')),
    hasReading:!!g.querySelector('tspan.town-reading'),
    hasName:!!span,
    error:visible&&!reading&&mode===0&&center&&rect?
     Math.hypot(center.x-rect.left-rect.width/2,center.y-rect.top-rect.height/2):null};
  });
  return {
   count:groups.length,areaCount:paths.length,active:window.__townPreview.activeCount(),
   region:window.__townPreview.currentRegion(),allCandidateCount:window.__townPreview.labelCandidateCount(),
   quiz:mode,reading,zoom:t.k,fullscreen:document.body.classList.contains('fullscreen'),
   keys:candidates.map(d=>d.key),unmapped:candidates.filter(d=>!names.has(d.name)).map(d=>d.name),
   malformed:candidates.filter(d=>!d.key||!d.name||!d.hasName||(reading&&!d.hasReading)||
     !Number.isFinite(d.font)||d.font<=0||d.display===''&& !d.visible ||
     d.display==='none'&&d.visible),
   errors:candidates.map(d=>d.error).filter(x=>x!==null),font:candidates[0]?.font,
   visible:candidates.filter(x=>x.visible).length,
   readingButton:document.querySelector('#reading').textContent
  };
 });
 assert.equal(snap.allCandidateCount,136,stage+' source candidate count');
 assert.equal(snap.areaCount,snap.active,stage+' path count');
 assert.equal(snap.keys.length,new Set(snap.keys).size,stage+' duplicate candidate keys');
 assert.equal(snap.count,snap.keys.length,stage+' candidate count');
 assert.deepEqual(snap.unmapped,[],stage+' stale labels from previous region');
 assert.deepEqual(snap.malformed,[],stage+' invalid visibility/label layout');
 if(snap.quiz===0)assert(snap.visible>0,stage+' has no visible labels after quiz');
 if(!reading&&snap.quiz===0&&snap.errors.length)assert(Math.max(...snap.errors)<1.8,
  stage+' visible glyph center displaced '+Math.max(...snap.errors));
 assert.equal(snap.reading,reading,stage+' reading state');
 if(expectedRegion!==null)assert.equal(snap.region,expectedRegion,stage+' region');
 if(expectedQuiz!==null)assert.equal(snap.quiz,expectedQuiz,stage+' quiz');
 return snap;
}
async function run(browserType,label,width,height){
 const browser=await browserType.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<600,
   isMobile:width<600,deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__townPreview?.allCandidateCount===136
    ||window.__townPreview?.labelCandidateCount()===136,null,{timeout:60000});
  const history=[];
  let s=await verify(page,'initial',{expectedRegion:''});
  assert.equal(s.count,136);assert.equal(s.areaCount,125);
  history.push({stage:'initial',shown:s.visible,count:s.count});
  await page.locator('#region').selectOption('仁川');
  s=await verify(page,'scoped',{expectedRegion:'仁川'});
  assert(s.count<136&&s.count>0);
  const scopeCount=s.count;
  await page.locator('#reading').click();
  s=await verify(page,'reading-on',{reading:true,expectedRegion:'仁川'});
  assert.equal(s.count,scopeCount);
  await page.locator('#larger').click();
  s=await verify(page,'font-125',{reading:true,expectedRegion:'仁川'});
  const bigger=s.font;
  await page.locator('#zoomPlus').click();
  s=await verify(page,'zoom-plus',{reading:true,expectedRegion:'仁川'});
  const zoomBefore=s.zoom;
  await page.locator('#quizTwo').click();
  s=await verify(page,'quiz2',{reading:true,expectedRegion:'仁川',expectedQuiz:2});
  assert.equal(await page.locator('#quizChoices button').count(),4);
  await page.locator('#fullscreen').click();
  s=await verify(page,'fullscreen',{reading:true,expectedRegion:'仁川',expectedQuiz:2});
  assert.equal(s.fullscreen,true);
  assert(Math.abs(s.zoom-zoomBefore)<1e-5,'fullscreen changed map zoom');
  await page.locator('#quizQuit').click();
  await page.locator('#quizBack').click();
  s=await verify(page,'quiz-end',{reading:true,expectedRegion:'仁川',expectedQuiz:0});
  await page.locator('#reading').click();
  s=await verify(page,'reading-off',{reading:false,expectedRegion:'仁川'});
  await page.locator('#size').click();
  s=await verify(page,'font-100',{reading:false,expectedRegion:'仁川'});
  assert(s.font<bigger,'100% must be smaller than 125% at unchanged zoom');
  await page.locator('#fullscreen').click();
  s=await verify(page,'fullscreen-exit',{reading:false,expectedRegion:'仁川'});
  assert.equal(s.fullscreen,false);
  const second=await page.locator('#region option').evaluateAll(els=>
   els.map(el=>el.value).find(value=>value&&value!=='仁川'));
  assert(second,'a second verified region exists');
  await page.locator('#region').selectOption(second);
  s=await verify(page,'other-region',{reading:false,expectedRegion:second});
  history.push({stage:'second-region',region:second,count:s.count,shown:s.visible});
  await page.locator('#zoomSlider').evaluate(el=>{
   el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  s=await verify(page,'slider-bottom-city',{reading:false,expectedRegion:''});
  assert.equal(s.areaCount,125);assert.equal(s.count,136);
  history.push({stage:'return-to-city',shown:s.visible,count:s.count});
  await page.locator('#reading').click();
  s=await verify(page,'city-reading-on',{reading:true,expectedRegion:''});
  assert.equal(s.count,136);
  await page.locator('#reading').click();
  s=await verify(page,'city-reading-off',{reading:false,expectedRegion:''});
  assert.equal(s.count,136);
  assert.deepEqual(errors,[],label+' uncaught browser errors');
  console.log('PASS NATIONAL_TOWN_COMBINED_SEQUENCE '+JSON.stringify({label,history,scopeCount}));
 }finally{await browser.close()}
}
(async()=>{
 await run(chromium,'chromium-1280',1280,800);
 await run(webkit,'webkit-390',390,844);
 await run(webkit,'webkit-320',320,668);
})().catch(e=>{console.error(e);process.exitCode=1});
