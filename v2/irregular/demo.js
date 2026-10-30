/* Kussoon V2: test-only comparison of two geometry-only label anchors. */
(()=>{
 'use strict';
 const E=window.KussoonLabelEngine,R=window.KussoonReadableLabels;
 const NS='http://www.w3.org/2000/svg';
 const $=id=>document.getElementById(id);
 const cases=new Map();
 function make(name,rings){
   const m={name,rings,box:E.bbox(rings),centroid:E.centroid(rings),polylabel:E.polylabel(rings)};
   cases.set(name,m);return m;
 }
 function crescent(){
   const outer=[],inner=[];
   for(let i=0;i<=50;i++){
     const a=(45+270*i/50)*Math.PI/180;
     outer.push([150+135*Math.cos(a),150+135*Math.sin(a)]);
   }
   for(let i=50;i>=0;i--){
     const a=(45+270*i/50)*Math.PI/180;
     inner.push([150+85*Math.cos(a),150+85*Math.sin(a)]);
   }
   make('三日月形',[[...outer,...inner]]);
 }
 function addSynthetic(){
   crescent();
   make('U字形',[[[0,0],[40,0],[40,140],[150,140],[150,0],[190,0],[190,200],[0,200]]]);
   make('鉤形',[[[0,0],[30,0],[30,170],[190,170],[190,200],[0,200]]]);
   make('鹿児島県風',[
     [[50,10],[140,10],[190,50],[210,100],[185,140],[165,180],[190,250],[185,310],[160,365],[140,315],[125,225],[100,185],[50,200],[20,130],[25,55]],
     [[250,280],[275,280],[285,300],[266,320],[245,315]]
   ]);
   make('穴あき',[
     [[0,0],[200,0],[200,200],[0,200]],
     [[70,70],[70,130],[130,130],[130,70]]
   ]);
   make('本体と小島',[
     [[0,0],[650,0],[650,10],[0,10]],
     [[700,40],[750,40],[750,90],[700,90]]
   ]);
 }
 function node(tag,attributes={}){
   const n=document.createElementNS(NS,tag);
   for(const [k,v] of Object.entries(attributes))n.setAttribute(k,String(v));
   return n;
 }
 function draw(){
   const m=cases.get($('shape').value);
   if(!m)return;
   const svg=$('map'),mode=$('comparison').value,box=m.box;
   const span=Math.max(box.w,box.h),pad=Math.max(12,span*.07);
   svg.setAttribute('viewBox',[
     box.minX-pad,box.minY-pad,box.w+2*pad,box.h+2*pad
   ].join(' '));
   const path=node('path',{class:'region',d:m.rings.map(r=>
     'M'+r.map(([x,y])=>x.toFixed(2)+','+y.toFixed(2)).join('L')+'Z').join('')});
   const old=R.safeInteriorCenter(m,E),updated=R.universalInteriorAnchor(m,E);
   const radius=span*.012,stroke=radius*.2;
   svg.replaceChildren(path);
   if(mode==='both'){
     const line=node('line',{class:'guide',x1:old[0],y1:old[1],x2:updated[0],y2:updated[1]});
     svg.append(line);
   }
   if(mode!=='new')svg.append(node('circle',{class:'marker-old',cx:old[0],cy:old[1],r:radius,'stroke-width':stroke}));
   if(mode!=='old')svg.append(node('circle',{class:'marker-new',cx:updated[0],cy:updated[1],r:radius*.85,'stroke-width':stroke}));
   const clearance=p=>E.signedDist(p[0],p[1],m.rings);
   const shift=Math.hypot(old[0]-updated[0],old[1]-updated[1]);
   $('metrics').textContent=m.name+'：'+m.rings.length+'つの境界リング。従来の境界余裕 '+
     clearance(old).toFixed(1)+'、新しい境界余裕 '+clearance(updated).toFixed(1)+
     '（試験用地図座標）。中心位置の移動量 '+shift.toFixed(1)+'。' +
     (shift<.05?'自然な中心を維持しています。':'複雑な形のため別の内部位置を選びました。');
 }
 $('shape').addEventListener('change',draw);
 $('comparison').addEventListener('change',draw);
 addSynthetic();
 fetch('../tests/fixtures/nishinomiya-irregular.json')
   .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
   .then(data=>{
     if(!Array.isArray(data.examples))throw new Error('不正な形状データ');
     for(const item of data.examples)make(item.name,item.rings);
     draw();
   })
   .catch(error=>{
     $('metrics').textContent='実データの読み込みに失敗しました：'+error.message+
       '。架空の形での比較は可能です。';
     $('shape').value='三日月形';
     draw();
   });
})();