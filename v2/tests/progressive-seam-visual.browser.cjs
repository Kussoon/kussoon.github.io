'use strict';
/* S39: Compare real SVG seams at identical camera positions between Worker
 * and main-thread implementations. Read-only on live data and project files.
 * This is evidence gathering, not proof of nationwide seam continuity.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {start}=require('./helpers/nationwide-browser.cjs');
const output=process.env.KUSSOON_BROWSER_ARTIFACTS;
const shots=[
 {name:'fukushima-miyagi',lon:140.75,lat:37.9,zoom:64},
 {name:'hyogo-osaka',lon:135.40,lat:34.93,zoom:64},
 {name:'kyushu-kumamoto',lon:130.73,lat:32.8,zoom:64}
];
async function capture(engine,backend,spot){
 const app=await start({engine,contextOptions:{viewport:{width:390,height:844}}});
 const errors=[];
 app.page.on('pageerror',e=>errors.push(e.message));
 try {
  await app.open();
  const url=app.page.url().replace('official-2026-nationwide-pilot.html','progressive-test.html');
  await app.page.goto(url+(backend==='main'?'?geometry=main':''));
  await app.page.waitForFunction(()=>window.KussoonV2ProgressivePreview?.controller.snapshot().count===1905,{},{timeout:90000});
  await app.page.evaluate(({lon,lat,zoom})=>{
   const {viewport,controller}=window.KussoonV2ProgressivePreview;
   const pt=controller.project([lon,lat]),w=850/zoom,h=700/zoom;
   viewport.setView({x:pt[0]-w/2,y:pt[1]-h/2,w,h});
   controller.schedule();
  },spot);
  await app.page.waitForFunction(()=>{
   const s=window.KussoonV2ProgressivePreview.controller.snapshot();
   return !s.scheduled&&!s.shapePending&&s.store.active===0&&s.store.queued===0&&document.querySelectorAll('#map .prefecture-focus').length>0;
  },{},{timeout:90000});
  await app.page.waitForTimeout(220);
  const state=await app.page.evaluate(()=>{
   const s=window.KussoonV2ProgressivePreview.controller.snapshot(),svg=document.querySelector('#map');
   const border=svg.querySelector('.borders'),paths=[...svg.querySelectorAll('[data-national-shapes] path')];
   const d=border?.getAttribute('d')||'',edges=new Set(),command=/([ML])(-?[0-9.]+),(-?[0-9.]+)/g;
   let part,last=null,unique=0;
   while((part=command.exec(d))){
    const pt=part[2]+','+part[3];
    if(part[1]==='L'&&last&&last!==pt){
     const edge=last<pt?last+'|'+pt:pt+'|'+last;
     edges.add(edge);
    }
    last=pt;
   }
   const hash=arr=>{let h=2166136261;for(const str of arr)for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),16777619);}return (h>>>0).toString(16);};
   return {
    edgeCount:edges.size,edgeHash:hash([...edges].sort()),
    borderD:d,
    borderPathCount:svg.querySelectorAll('.borders').length,
    loadedPrefectures:paths.filter(p=>p.classList.contains('prefecture-focus')).map(p=>p.dataset.pref),
    detailRegionCount:paths.filter(p=>p.classList.contains('land')).length,
    otherPrefectures:paths.filter(p=>p.classList.contains('prefecture')).map(p=>p.dataset.pref),
    visibleLabels:svg.querySelectorAll('[data-label-code]').length,
    mapBox:svg.getAttribute('viewBox'),
    shapePhases:s.shapePhases,geometry:s.geometry,
    pending:s.shapePending,
    status:document.querySelector('#status').textContent
   };
  });
  assert.equal(state.borderPathCount,1,'Single SVG border path');
  assert(state.loadedPrefectures.length>0,'Detailed prefecture surface must load');
  assert(!errors.length,'Browser JS exceptions: '+errors.join('; '));
  if(output){
   await fs.mkdir(output,{recursive:true});
   const name='seam-'+engine+'-'+backend+'-'+spot.name;
   await app.page.screenshot({path:path.join(output,name+'.png')});
   await fs.writeFile(path.join(output,name+'.json'),JSON.stringify({...state,borderD:undefined,errors},null,2));
  }
  delete state.borderD;
  return state;
 }finally{await app.close();}
}
(async()=>{
 const report={scope:'3 representative Japanese regions, WebKit iPhone-like viewport; not iPhone physical device',cases:[]};
 for(const spot of shots){
  const worker=await capture('webkit','worker',spot);
  const main=await capture('webkit','main',spot);
  const row={spot,worker,main};
  report.cases.push(row);
  assert.equal(worker.mapBox,main.mapBox,'equal camera');
  assert.equal(worker.borderPathCount,main.borderPathCount,'same single-path contract');
  assert.deepEqual(worker.loadedPrefectures,main.loadedPrefectures,'same detail vs overview selection');
  const sameEdges=worker.edgeCount===main.edgeCount&&worker.edgeHash===main.edgeHash;
  row.sameBorderGeometry=sameEdges;
  console.log('S39 '+spot.name+' Worker edges='+worker.edgeCount+'/'+worker.edgeHash+' Main edges='+main.edgeCount+'/'+main.edgeHash+' '+(sameEdges?'SAME':'DIFFERENT'));
  console.log('S39 '+spot.name+' detailed='+worker.loadedPrefectures.join(',')+' workerLabels='+worker.visibleLabels+' mainLabels='+main.visibleLabels);
 }
 if(output)await fs.writeFile(path.join(output,'seam-worker-main-comparison.json'),JSON.stringify(report,null,2));
 console.log('PASS S39 worker/main real browser scene comparison across '+report.cases.length+' representative positions');
})().catch(e=>{console.error(e);process.exitCode=1;});
