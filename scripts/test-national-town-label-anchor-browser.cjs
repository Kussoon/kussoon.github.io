'use strict';
// TOWNMAP-SSOT-001 R-TOWN-00/01/04/05/06/11/13/14/40/44
// Audit actual browser-rendered town label anchors without modifying UI.
// Overlap is intentionally NOT a failure: labels may overlap by design.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium,webkit}=require('playwright');
const cases=[
 {city:'nishinomiya',url:'/v2/nishinomiya-town-svg-master-v34-20261117-pilot.html',towns:321,labels:324},
 {city:'takarazuka',url:'/v2/takarazuka-town-svg-result-navigation-20261118-pilot.html',towns:125}
];
const screens=[['chromium-1280',chromium,1280,800],['webkit-390',webkit,390,844],['webkit-320',webkit,320,668]];
const output=process.env.TOWN_LABEL_AUDIT_DIR||'artifacts/national-town-label-anchors';
fs.mkdirSync(output,{recursive:true});
const reports=[];
(async()=>{
 for(const [screen,engine,width,height] of screens){
  const browser=await engine.launch({headless:true});
  try {
   for(const item of cases){
    const page=await browser.newPage({viewport:{width,height},isMobile:width<600,hasTouch:width<600,deviceScaleFactor:1});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try {
     await page.goto('http://127.0.0.1:8765'+item.url,{waitUntil:'domcontentloaded',timeout:60000});
     await page.waitForFunction(n=>(document.querySelector('#communityCount')?.textContent||'').includes(n+'町名'),item.towns,{timeout:60000});
     const data=await page.evaluate(()=>{
      const nodes=[...document.querySelectorAll('#labels g.label')];
      const paths=[...document.querySelectorAll('#areas path.town')];
      const byName=new Map(paths.map(el=>[el.__data__?.name||el.__data__?.properties?.S_NAME,el]));
      const svg=document.querySelector('#map');
      const frame=svg.getBoundingClientRect();
      const rows=[];
      for(const node of nodes){
       const d=node.__data__||{};
       const name=d.name||node.querySelector('.town-name')?.textContent||'';
       const p=d.anchor||d.point;
       const owner=byName.get(name);
       let filled=null;
       if(owner&&Array.isArray(p)&&p.length===2&&typeof owner.isPointInFill==='function'){
        const q=svg.createSVGPoint();q.x=p[0];q.y=p[1];
        try{filled=owner.isPointInFill(q);}catch(_){filled=null;}
       }
       const r=node.getBoundingClientRect();
       const visible=getComputedStyle(node).display!=='none';
       rows.push({name,anchorAvailable:!!p,anchorInsideOwner:filled,
        secondary:!!d.secondary,visible,
        rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom},
        outside:visible&&(r.right<=frame.left||r.left>=frame.right||r.bottom<=frame.top||r.top>=frame.bottom)});
      }
      const visible=rows.filter(r=>r.visible);
      let overlaps=0;const overlapNames=new Set();
      // Informational diagnostic only. O(n^2) is fine for <=324 labels.
      for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){
       const a=visible[i].rect,b=visible[j].rect;
       if(Math.min(a.right,b.right)>Math.max(a.left,b.left)+1 &&
          Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1){
        overlaps++;overlapNames.add(visible[i].name);overlapNames.add(visible[j].name);
       }
      }
      return {paths:paths.length,labels:rows.length,names:new Set(rows.map(r=>r.name)).size,
       visibleLabels:visible.length,visibleNames:new Set(visible.map(r=>r.name)).size,
       anchorAvailable:rows.filter(r=>r.anchorAvailable).length,
       checkedAnchors:rows.filter(r=>r.anchorInsideOwner!==null).length,
       outsideAnchors:rows.filter(r=>r.anchorInsideOwner===false).map(r=>r.name),
       outsideFrame:visible.filter(r=>r.outside).map(r=>r.name),
       secondaryLabels:rows.filter(r=>r.secondary).length,
       overlappingPairs:overlaps,overlappingNames:[...overlapNames].sort(),
       rows};
     });
     assert.equal(data.paths,item.towns,item.city+' source town path count');
     assert.equal(data.names,item.towns,item.city+' distinct town names');
     if(item.labels)assert.equal(data.labels,item.labels,item.city+' adopted full-city label count');
     if(item.city==='takarazuka'){
      assert.equal(data.checkedAnchors,data.labels,'all candidate anchors must be checked in the actual SVG');
      assert.deepEqual(data.outsideAnchors,[],'all candidate anchors must lie in their owning filled town');
      assert.equal(data.visibleNames,item.towns,'all towns must be represented by a visible label initially');
     }
     assert.deepEqual(errors,[],item.city+' uncaught browser errors');
     reports.push({city:item.city,screen,...data});
     console.log('PASS NATIONAL_TOWN_ANCHOR_AUDIT '+JSON.stringify({
      city:item.city,screen,paths:data.paths,labels:data.labels,visibleNames:data.visibleNames,
      checkedAnchors:data.checkedAnchors,outsideAnchors:data.outsideAnchors,
      overlappingPairs:data.overlappingPairs,overlappingTownNames:data.overlappingNames.length
     }));
    }finally{await page.close();}
   }
  }finally{await browser.close();}
 }
 fs.writeFileSync(path.join(output,'anchor-report.json'),JSON.stringify(reports,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
