(()=>{'use strict';
const W=850,H=480,BASE='/v2/data/national/2026-common/',NS='http://www.w3.org/2000/svg',renderer=window.KussoonV2MunicipalRenderer;
const places=[
 {key:'miyako',label:'沖縄県・宮古諸島',pref:'47',bounds:[124.48,24.55,125.55,25.12]},
 {key:'okinawa',label:'沖縄県・全域',pref:'47',bounds:[122.8,24.0,131.5,27.4]},
 {key:'amami',label:'鹿児島県・奄美諸島',pref:'46',bounds:[128.05,27.65,130.45,29.55]},
 {key:'goto',label:'長崎県・五島列島',pref:'42',bounds:[128.35,32.35,129.65,33.25]},
 {key:'hiroshima',label:'広島県・瀬戸内海',pref:'34',bounds:[132.25,33.55,133.45,34.55]},
 {key:'kagawa',label:'香川県・瀬戸内海',pref:'37',bounds:[133.45,33.85,134.45,34.55]},
 {key:'tokyo',label:'東京都・東京湾周辺',pref:'13',bounds:[139.52,35.25,140.04,35.82]},
 {key:'hyogo',label:'兵庫県・西宮周辺',pref:'28',bounds:[135.15,34.62,135.53,34.88]},
 {key:'hokkaido',label:'北海道・全域',pref:'01',bounds:[139.2,41.2,145.9,45.7]}
];
const names={'01':'北海道','13':'東京都','28':'兵庫県','34':'広島県','37':'香川県','42':'長崎県','46':'鹿児島県','47':'沖縄県'};
const $=id=>document.getElementById(id),select=$('place'),cards=$('comparison'),status=$('status'),contrast=$('contrast');
let state={place:null,bounds:null,scale:1,dx:0,dy:0},loaded=new Map(),drag=null;
for(const p of places){const o=document.createElement('option');o.value=p.key;o.textContent=p.label;select.append(o);}
select.value='miyako';
function el(name){return document.createElementNS(NS,name);}
function decodeArcs(topology){return topology.arcs.map(arc=>{let x=0,y=0;return arc.map(pt=>{if(topology.transform){x+=pt[0];y+=pt[1];return [x*topology.transform.scale[0]+topology.transform.translate[0],y*topology.transform.scale[1]+topology.transform.translate[1]];}return pt.slice();});});}
function arcIds(geometry){const result=[];function walk(x){if(typeof x==='number')result.push(x<0?~x:x);else if(Array.isArray(x))for(const y of x)walk(y);}walk(geometry.arcs);return result;}
function makeProject(bounds){const cos=Math.cos((bounds[1]+bounds[3])*Math.PI/360),spanX=Math.max((bounds[2]-bounds[0])*cos,.001),spanY=Math.max(bounds[3]-bounds[1],.001),s=Math.min((W-24)/spanX,(H-24)/spanY),cx=(bounds[0]+bounds[2])/2,cy=(bounds[1]+bounds[3])/2;return ([lon,lat])=>[W/2+(lon-cx)*cos*s,H/2-(lat-cy)*s];}
function polygonCoords(geometry,arcs){const ring=ids=>{const out=[];for(const id of ids){const segment=id<0?arcs[~id].slice().reverse():arcs[id];out.push(...(out.length?segment.slice(1):segment));}return out;};return geometry.type==='Polygon'?[geometry.arcs.map(ring)]:geometry.arcs.map(polygon=>polygon.map(ring));}
async function getTopology(pref){if(loaded.has(pref))return loaded.get(pref);const task=(async()=>{const m=await fetch(BASE+'national-2026-pilot/manifest.json');if(!m.ok)throw Error('2026年版地図の索引を取得できません');const manifest=await m.json(),entry=manifest.entries.find(e=>e.pref===pref);if(!entry)throw Error(pref+'の地図データがありません');const res=await fetch(BASE+entry.source);if(!res.ok)throw Error('地図データを取得できません: '+entry.source);return res.json();})();loaded.set(pref,task);return task;}
function updateTransforms(){const vw=W/state.scale,vh=H/state.scale,x=W/2-vw/2-state.dx,y=H/2-vh/2-state.dy;for(const svg of document.querySelectorAll('.map-card svg'))svg.setAttribute('viewBox',`${x} ${y} ${vw} ${vh}`);}
function installGestures(){for(const svg of document.querySelectorAll('.map-card svg')){svg.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,dx:state.dx,dy:state.dy};svg.setPointerCapture(e.pointerId);};svg.onpointermove=e=>{if(!drag)return;const r=svg.getBoundingClientRect();state.dx=drag.dx+(e.clientX-drag.x)*W/r.width;state.dy=drag.dy+(e.clientY-drag.y)*H/r.height;updateTransforms();};svg.onpointerup=svg.onpointercancel=()=>{drag=null;};svg.onwheel=e=>{e.preventDefault();zoom(e.deltaY<0?1.25:.8);};}}
function zoom(factor){state.scale=Math.min(12,Math.max(1,state.scale*factor));updateTransforms();}
function render(topology,place){const objects=topology.objects.municipalities.geometries,arcs=decodeArcs(topology),target=objects.filter(g=>String(g.properties.N03_001||'').trim()===place.pref),outside=objects.filter(g=>!target.includes(g));if(!target.length)throw Error(names[place.pref]+'の区域がデータ内で見つかりません');const used=new Map();for(let i=0;i<objects.length;i++)for(const id of new Set(arcIds(objects[i])))used.set(id,(used.get(id)||0)+1);const outer=[...used].filter(([,n])=>n===1).map(([id])=>id),shared=[...used].filter(([,n])=>n>1).map(([id])=>id),project=makeProject(place.bounds),regions=objects.map(g=>({code:String(g.properties.N03_007),name:g.properties.N03_004||'',polys:polygonCoords(g,arcs)}));
 cards.replaceChildren();for(const variant of ['existing','coast-only','all-dark']){const article=document.createElement('article');article.className='map-card '+variant;const heading=document.createElement('h2');heading.textContent=(variant==='existing'?'現行の表示':variant==='coast-only'?'改善候補A：海岸線のみ強調':'改善候補B：内部境界も濃色')+' — '+place.label;const desc=document.createElement('p');desc.textContent=variant==='existing'?'既存の淡色・白い共有境界線':variant==='coast-only'?'外周を濃色2.4px、内部境界を白1.1px':'外周を濃色2.4px、内部境界を濃色1.1px';const svg=el('svg');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',heading.textContent);const drawArcs=variant==='existing'?arcs:shared.map(i=>arcs[i]);renderer.render({map:svg,regions,arcs:drawArcs,project});for(const path of svg.querySelectorAll('path.land')){const code=path.dataset.code,isTarget=target.some(g=>String(g.properties.N03_007)===code);path.setAttribute('fill',variant==='existing'?(isTarget?'#d9dea5':'#cbd7db'):(isTarget?'#f2f0dd':'#d5dee2'));if(!isTarget)path.classList.add('outside');}if(variant!=='existing'){const coast=el('path');coast.setAttribute('d',renderer.pathFromArcs(outer.map(i=>arcs[i]),project));coast.setAttribute('class','coast-candidate');coast.setAttribute('pointer-events','none');svg.append(coast);}article.append(heading,desc,svg);cards.append(article);}
 state={...state,place,bounds:place.bounds,scale:1,dx:0,dy:0};installGestures();updateTransforms();$('comparison').setAttribute('aria-busy','false');status.textContent=`${place.label}：${target.length}区域を表示。地図をドラッグ・拡大して両案を比較できます。共有TopoJSONアーク ${shared.length}本／1区域だけが使う弧 ${outer.length}本。`;
}
async function choose(){const place=places.find(p=>p.key===select.value);$('comparison').setAttribute('aria-busy','true');status.textContent=place.label+'を読み込み中…';try{render(await getTopology(place.pref),place);}catch(error){console.error(error);status.textContent='読み込みエラー：'+error.message;$('comparison').setAttribute('aria-busy','false');}}
select.addEventListener('change',choose);$('zoomIn').onclick=()=>zoom(1.25);$('zoomOut').onclick=()=>zoom(.8);$('reset').onclick=()=>{state.scale=1;state.dx=state.dy=0;updateTransforms();};
function lum(hex){const c=hex.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];}function ratio(a,b){const x=lum(a),y=lum(b);return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2);}
contrast.textContent=`候補色コントラスト（相対輝度）：濃色輪郭／海 ${ratio('#486574','#d8ebf7')}:1、濃色輪郭／陸地 ${ratio('#486574','#f2f0dd')}:1。海と陸地の面色同士は ${ratio('#d8ebf7','#f2f0dd')}:1 のため、島の識別を面色だけに頼らず輪郭線を併用します。WCAG 2.2 SC 1.4.11の3:1は重要な図形境界の目安として確認します。`;
choose();
})();
