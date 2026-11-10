(()=>{'use strict';
const W=760,H=760,BASE='/v2/data/national/2026-common/',renderer=window.KussoonV2MunicipalRenderer;
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
const $=id=>document.getElementById(id),select=$('place'),status=$('status');
let state={scale:1,dx:0,dy:0},loaded=new Map(),drag=null;
for(const place of places){const option=document.createElement('option');option.value=place.key;option.textContent=place.label;select.append(option);}
select.value='miyako';
function decode(topology){return topology.arcs.map(arc=>{let x=0,y=0;return arc.map(point=>{if(topology.transform){x+=point[0];y+=point[1];return [x*topology.transform.scale[0]+topology.transform.translate[0],y*topology.transform.scale[1]+topology.transform.translate[1]];}return point.slice();});});}
function arcIds(geometry){const result=[];(function walk(value){if(typeof value==='number')result.push(value<0?~value:value);else if(Array.isArray(value))for(const child of value)walk(child);})(geometry.arcs);return result;}
function polygonCoords(geometry,arcs){const ring=ids=>{const out=[];for(const id of ids){const arc=id<0?arcs[~id].slice().reverse():arcs[id];out.push(...(out.length?arc.slice(1):arc));}return out;};return geometry.type==='Polygon'?[geometry.arcs.map(ring)]:geometry.arcs.map(poly=>poly.map(ring));}
function projectFor(bounds){const cos=Math.cos((bounds[1]+bounds[3])*Math.PI/360),spanX=Math.max((bounds[2]-bounds[0])*cos,.001),spanY=Math.max(bounds[3]-bounds[1],.001),scale=Math.min((W-32)/spanX,(H-32)/spanY),cx=(bounds[0]+bounds[2])/2,cy=(bounds[1]+bounds[3])/2;return ([lon,lat])=>[W/2+(lon-cx)*cos*scale,H/2-(lat-cy)*scale];}
async function topologyFor(pref){if(loaded.has(pref))return loaded.get(pref);const task=(async()=>{const manifestResponse=await fetch(BASE+'national-2026-pilot/manifest.json');if(!manifestResponse.ok)throw Error('2026年版地図の索引を取得できません');const manifest=await manifestResponse.json(),entry=manifest.entries.find(item=>item.pref===pref);if(!entry)throw Error('対象都道府県の地図データがありません');const response=await fetch(BASE+entry.source);if(!response.ok)throw Error('地図データを取得できません');return response.json();})();loaded.set(pref,task);return task;}
function syncView(){const width=W/state.scale,height=H/state.scale,x=W/2-width/2-state.dx,y=H/2-height/2-state.dy;for(const svg of document.querySelectorAll('.map-card svg'))svg.setAttribute('viewBox',x+' '+y+' '+width+' '+height);}
function attachGestures(){for(const svg of document.querySelectorAll('.map-card svg')){svg.onpointerdown=event=>{drag={x:event.clientX,y:event.clientY,dx:state.dx,dy:state.dy};svg.setPointerCapture(event.pointerId);};svg.onpointermove=event=>{if(!drag)return;const rect=svg.getBoundingClientRect();state.dx=drag.dx+(event.clientX-drag.x)*W/rect.width;state.dy=drag.dy+(event.clientY-drag.y)*H/rect.height;syncView();};svg.onpointerup=svg.onpointercancel=()=>{drag=null;};svg.onwheel=event=>{event.preventDefault();zoom(event.deltaY<0?1.25:.8);};}}
function zoom(factor){state.scale=Math.min(12,Math.max(1,state.scale*factor));syncView();}
function luminance(hex){const channels=hex.match(/[a-f0-9]{2}/gi).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];}
function ratio(a,b){const x=luminance(a),y=luminance(b);return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2);}
function render(topology,place){
 const geometries=topology.objects.municipalities.geometries,arcs=decode(topology),usage=new Uint8Array(arcs.length);
 for(const geometry of geometries){for(const id of new Set(arcIds(geometry)))if(usage[id]<2)usage[id]++;}
 const shared=[],outer=[];for(let i=0;i<usage.length;i++){if(usage[i]>1)shared.push(arcs[i]);else if(usage[i]===1)outer.push(arcs[i]);}
 const regions=geometries.map(geometry=>({code:String(geometry.properties.N03_007),name:String(geometry.properties.N03_004||''),polys:polygonCoords(geometry,arcs)})),project=projectFor(place.bounds);
 const fillTarget=geometry=>String(geometry.properties.N03_001||'').trim()===place.pref;
 for(const svg of [$('mapCurrent'),$('mapCandidate')]){
  renderer.render({map:svg,regions,arcs:shared,coastArcs:outer,project,hideTitles:true});
  for(const shape of svg.querySelectorAll('path.land'))shape.classList.toggle('outside',!fillTarget(geometries.find(geometry=>String(geometry.properties.N03_007)===shape.dataset.code)));
 }
 state={scale:1,dx:0,dy:0};syncView();
 status.textContent=place.label+'：同じ2026年版データ・同じ縮尺で表示中。共有境界 '+shared.length+'本、外周弧 '+outer.length+'本。';
 $('comparison').setAttribute('aria-busy','false');
}
async function choose(){const place=places.find(item=>item.key===select.value);$('comparison').setAttribute('aria-busy','true');status.textContent=place.label+'を読み込み中…';try{render(await topologyFor(place.pref),place);}catch(error){console.error(error);status.textContent='読み込みエラー：'+error.message;$('comparison').setAttribute('aria-busy','false');}}
select.addEventListener('change',choose);$('zoomIn').onclick=()=>zoom(1.25);$('zoomOut').onclick=()=>zoom(.8);$('reset').onclick=()=>{state={scale:1,dx:0,dy:0};syncView();};
for(const fill of ['#f2f0dd','#d5dee2','#d8ebf7'])$('contrast').append(document.createTextNode('候補線 #657b84 ／ '+fill+'：'+ratio('#657b84',fill)+' : 1　'));
$('contrast').append(document.createTextNode('現行白線／陸地 #f2f0dd：'+ratio('#ffffff','#f2f0dd')+' : 1。WCAG 2.2 SC 1.4.11の3:1を目安にしています。'));
choose();
})();