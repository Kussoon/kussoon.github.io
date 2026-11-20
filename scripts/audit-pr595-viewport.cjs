'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
async function run(page,cfg,out,city){
 const report={city,browser:cfg.name};
 const snapshot=()=>page.evaluate(()=>{const a=window.__audit,t=a.transform(),b=a.path().bounds({type:'FeatureCollection',features:a.features()}),svg=document.querySelector('#map').getBoundingClientRect();return {k:t.k,x:t.x,y:t.y,fit:a.cityFit(),min:a.minScale(),range:a.zoomRange(),width:svg.width,height:svg.height,bounds:b.map(p=>[p[0]*t.k+t.x,p[1]*t.k+t.y])}});
 const checkFit=async()=>{await page.waitForFunction(()=>Math.abs(window.__audit.transform().k-window.__audit.minScale())<1e-8);const s=await snapshot();assert(Math.abs(s.k-s.min)<1e-8);assert(Math.abs(s.x-s.fit.x)<1e-6);assert(Math.abs(s.y-s.fit.y)<1e-6);assert.equal(s.range[0],s.min);assert(s.bounds[0][0]>=-1&&s.bounds[0][1]>=-1&&s.bounds[1][0]<=s.width+1&&s.bounds[1][1]<=s.height+1,'city clipped at min');return s};
 await page.evaluate(()=>window.__audit.showRegion(''));
 await page.locator('#zoomSlider').press('Home');report.minimum=await checkFit();
 await page.locator('#zoomOut').click();await page.waitForTimeout(180);await checkFit();
 // Uses D3's scaleTo, the same extent enforcement as wheel/pinch zoom.
 await page.evaluate(()=>window.__audit.underzoom());await checkFit();
 report.focus=await page.evaluate(()=>{const a=window.__audit,result=[];for(const f of a.features()){
  const name=f.properties.S_NAME;a.startQuiz(1,[name]);a.quizReveal();const t=a.transform(),b=a.path().bounds(f),r=document.querySelector('#map').getBoundingClientRect();
  result.push({name,k:t.k,min:a.minScale(),bounds:b.map(p=>[p[0]*t.k+t.x,p[1]*t.k+t.y]),width:r.width,height:r.height});a.stopQuiz(false);
 }return result});
 for(const s of report.focus){assert(s.k>=s.min,'focus underzoom');assert(s.bounds[0][0]>=-1&&s.bounds[0][1]>=-1&&s.bounds[1][0]<=s.width+1&&s.bounds[1][1]<=s.height+1,'focus clipped '+s.name)}
 const sample=report.focus.find(s=>s.k>s.min*1.5);assert(sample,'small-town reveal never zooms');
 await page.evaluate(name=>{window.__audit.startQuiz(1,[name]);window.__audit.quizReveal()},sample.name);
 await page.locator('#frame').screenshot({path:path.join(out,cfg.name+'-'+city+'-answer-focus.png')});
 await page.locator('#zoomSlider').press('Home');await checkFit();
 await page.evaluate(()=>window.__audit.stopQuiz(false));
 // Interrupted-result focus, preserving the established result selection/blink.
 await page.evaluate(name=>window.__audit.startQuiz(1,[name]),sample.name);
 await page.locator('#quizQuit').click();const interrupted=await snapshot();assert(interrupted.k>interrupted.min*1.5);assert((await page.locator('#status').textContent()).includes(sample.name));
 await page.evaluate(()=>window.__audit.stopQuiz(true));
 await page.locator('#fullscreen').click();await page.waitForTimeout(140);await page.locator('#zoomSlider').press('Home');report.fullscreen=await checkFit();
 await page.locator('#fullscreen').click();await page.waitForTimeout(140);await page.locator('#zoomSlider').press('Home');await checkFit();
 fs.writeFileSync(path.join(out,cfg.name+'-'+city+'-viewport.json'),JSON.stringify(report,null,2));
 console.log('PASS VIEWPORT '+JSON.stringify({city,browser:cfg.name,answerFocus:report.focus.length,min:report.minimum.min,fullscreenMin:report.fullscreen.min}));
}
module.exports={run};
