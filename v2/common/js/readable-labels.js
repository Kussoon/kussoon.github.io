/* Reusable Kussoon V2 label presentation experiment: reading layers and vertical nudges.
 * Pure geometry/text layout helpers; no network requests or DOM dependencies.
 */
(function (global) {
  'use strict';
  function normalizeReading(value) {
    return String(value||'').normalize('NFKC').toLowerCase()
      .replace(/[ァ-ヶ]/gu,ch=>String.fromCharCode(ch.charCodeAt(0)-0x60))
      .replace(/[\s　]+/gu,'');
  }
  function validateReadings(models,records) {
    if(!records||typeof records!=='object')throw new Error('読み仮名データがありません');
    const expected=new Set(models.map(m=>m.name));
    const keys=Object.keys(records);
    if(keys.length!==models.length||new Set(keys).size!==keys.length)throw new Error('読み仮名件数が一致しません');
    for(const m of models){
      if(!Object.prototype.hasOwnProperty.call(records,m.name)||
        !/^[ぁ-ゖー]+$/u.test(records[m.name]))throw new Error('読み仮名未確認: '+m.name);
    }
    for(const k of keys)if(!expected.has(k))throw new Error('読み仮名対象外: '+k);
    return true;
  }
  function rect(x,y,w,h){return {x1:x-w/2,y1:y-h/2,x2:x+w/2,y2:y+h/2};}
  function overlapArea(a,b){
    return Math.max(0,Math.min(a.x2,b.x2)-Math.max(a.x1,b.x1))*
      Math.max(0,Math.min(a.y2,b.y2)-Math.max(a.y1,b.y1));
  }
  function sampleFit(box,rings,engine) {
    const xs=[box.x1,(box.x1+box.x2)/2,box.x2];
    const ys=[box.y1,(box.y1+box.y2)/2,box.y2];
    let count=0;
    for(const x of xs)for(const y of ys)if(engine.isInside(x,y,rings))count++;
    return count;
  }
  function labelSpec(name,reading,style,size,measure) {
    if(!['kanji','both','kana'].includes(style))throw new Error('表示方式が不正です');
    if(!reading)throw new Error('読み仮名がありません: '+name);
    const rubySize=size*.58, strokePad=size*.24;
    const primary=style==='kana'?reading:name;
    const width=style==='both'
      ?Math.max(measure(name,size),measure(reading,rubySize))
      :measure(primary,size);
    // Reserve outline/halo, and the full ruby line in the collision bounds.
    const height=style==='both'?size*1.17+rubySize*1.34:size*1.26;
    return {name,reading,style,primary,size,rubySize,
      width:width+strokePad,height:height+strokePad};
  }
  function planVerticalNudges(models,seeds,readings,style,size,measure,engine,options={}) {
    validateReadings(models,readings);
    const shift=options.shift || 'vertical';
    if(!['none','vertical'].includes(shift))throw new Error('上下調整の方式が不正です');
    const pinned=Number.isInteger(options.pinned)?options.pinned:null;
    const specs=models.map(m=>labelSpec(m.name,readings[m.name],style,size,measure));
    const orders=models.map((m,i)=>({i,area:m.box.w*m.box.h}))
      // Smaller town first so a narrow area isn't always displaced by a large one.
      .sort((a,b)=>(b.i===pinned)-(a.i===pinned) || a.area-b.area || a.i-b.i);
    const laid=new Array(models.length),committed=[];
    const steps=shift==='none'?[0]:[0,-.5,.5,-1,1,-1.5,1.5];
    for(const {i} of orders) {
      const [sx,sy]=seeds[i],spec=specs[i],m=models[i];
      let best=null;
      for(const step of steps) {
        const x=sx,y=sy+step*size;
        if(step!==0 && !engine.isInside(x,y,m.rings))continue;
        const box=rect(x,y,spec.width,spec.height);
        const overlap=committed.reduce((sum,j)=>sum+overlapArea(box,laid[j].box),0);
        const fit=sampleFit(box,m.rings,engine);
        // Preserve the initial anchor where it doesn't compete with others.
        const cost=overlap/(size*size)*180+(9-fit)*.85+Math.abs(step)*.18;
        const candidate={...spec,x,y,box,fit,step,overlap,cost};
        if(!best || cost<best.cost-1e-8)best=candidate;
        if(step===0 && overlap<.01)break;
      }
      if(!best)throw new Error('町名の配置候補がありません: '+m.name);
      laid[i]=best;
      committed.push(i);
    }
    return laid;
  }
  function evaluateVisible(models,laid,shown,engine,view) {
    const all=shown.flatMap((s,i)=>s?[i]:[]);
    const inView=all.filter(i=>laid[i].x>=view.x&&laid[i].x<=view.x+view.w&&
      laid[i].y>=view.y&&laid[i].y<=view.y+view.h);
    let pairs=0,outside=0;
    for(let ai=0;ai<inView.length;ai++) {
      const i=inView[ai],label=laid[i];
      if(sampleFit(label.box,models[i].rings,engine)<9)outside++;
      for(let aj=0;aj<ai;aj++)if(overlapArea(label.box,laid[inView[aj]].box)>.01)pairs++;
    }
    return {shown:all.length,inView:inView.length,collisions:pairs,outside,
      moved:all.filter(i=>Math.abs(laid[i].step)>.01).length,
      total:models.length};
  }
  global.KussoonReadableLabels={normalizeReading,validateReadings,labelSpec,
    planVerticalNudges,evaluateVisible};
})(window);
