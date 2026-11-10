#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('v2/verification/coastline-accessibility/index.html'),css=read('v2/verification/coastline-accessibility/trial.css'),js=read('v2/verification/coastline-accessibility/trial.js');
assert(html.includes('同じ2026年版行政区域データ・同じ縮尺'),'page must explain like-for-like comparison');
for(const color of ['#d8ebf7','#f2f0dd','#d5dee2','#486574','#eaf3f9','#d9dea5','#cbd7db'])assert(css.includes(color)||html.includes(color),'missing comparison color '+color);
assert(css.includes('vector-effect:non-scaling-stroke'),'boundary width must stay stable at zoom');
assert(css.includes('.land{stroke:none}'),'municipality polygon strokes are forbidden');
assert(html.includes('/v2/progressive-preview/municipality-renderer.js')&&js.includes('renderer.render({map:svg'),'trial must use the public progressive renderer');
assert(js.includes('n===1).map(([id])=>id),shared=')&&js.includes('n>1).map(([id])=>id),project='),'single-use and shared arcs must be separated');
assert(js.includes('drawArcs=variant===\'existing\'?arcs:shared.map(i=>arcs[i])'),'candidate internal boundary layer must use shared arcs only');
assert(js.includes('renderer.pathFromArcs(outer.map(i=>arcs[i]),project)'),'candidate coastline layer must use single-use arcs');
assert(css.includes('.all-dark .borders{stroke:#486574;stroke-width:1.1}'),'dark internal-boundary candidate is required for contrast comparison');
assert(js.includes("pref:'47'")&&js.includes("pref:'46'")&&js.includes("pref:'42'")&&js.includes("pref:'34'")&&js.includes("pref:'37'")&&js.includes("pref:'13'")&&js.includes("pref:'28'")&&js.includes("pref:'01'"),'representative prefectures are incomplete');
assert(js.includes('state.scale=Math.min(12,Math.max(1,state.scale*factor))'),'zoom limits must be bounded');
assert(js.includes('setPointerCapture')&&js.includes("querySelectorAll('.map-card svg')"),'dragging must work and synchronize across both maps');
const manifest=JSON.parse(read('v2/data/national/2026-common/national-2026-pilot/manifest.json'));
const expected=['47','46','42','34','37','13','28','01'];
for(const pref of expected){
 const entry=manifest.entries.find(e=>e.pref===pref);assert(entry,'missing manifest entry '+pref);
 const topo=JSON.parse(read('v2/data/national/2026-common/'+entry.source)),geoms=topo.objects.municipalities.geometries;
 assert(geoms.some(g=>String(g.properties.N03_001).trim()===pref),'missing target prefecture geometries '+pref);
 const count=new Map();
 for(const g of geoms){const used=new Set();(function walk(value){if(typeof value==='number')used.add(value<0?~value:value);else if(Array.isArray(value))for(const x of value)walk(x);})(g.arcs);for(const id of used)count.set(id,(count.get(id)||0)+1);}
 const single=[...count.values()].filter(n=>n===1).length,shared=[...count.values()].filter(n=>n>1).length;
 assert(single>0&&shared>0,`both outer and shared arcs must exist for ${pref}: outer=${single}, shared=${shared}`);
 assert.equal(single+shared,count.size,'each topological arc must be assigned to exactly one line class');
}
const renderer=read('v2/progressive-preview/municipality-renderer.js'),quizCss=read('v2/municipalities/shared/quiz.css'),national=read('maps/national-municipalities.html');
assert(renderer.includes('partitionArcs')&&renderer.includes("setAttribute('class','coastlines')"),'shared renderer must separate exterior arcs');
assert(quizCss.includes('background:#d8ebf7')&&quizCss.includes('.land{fill:#f2f0dd')&&quizCss.includes('.land.outside{fill:#d5dee2'),'quiz palette must use candidate A');
assert(quizCss.includes('.land.correct{fill:#8ed6a7}')&&quizCss.includes('.land.wrong{fill:#f0aaa0}')&&quizCss.includes('0%,49%{fill:#ffcd52}50%,100%{fill:#d9dea5}'),'quiz answer and pulse colors must remain unchanged');
assert(national.includes('coastArcs:current.coastArcs||[]')&&national.includes('KussoonV2MunicipalRenderer.partitionArcs(items,arcs)'),'official map must split arcs before drawing');
assert(read('v2/progressive-preview/progressive-geometry.js').includes('coastArcFlags'),'worker geometry must preserve the coast/internal classification');
function luminance(hex){const c=hex.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
assert(contrast('#486574','#d8ebf7')>=3&&contrast('#486574','#f2f0dd')>=3,'dark outline should meet 3:1 against adjacent fills');
assert(contrast('#d8ebf7','#f2f0dd')<3,'page must disclose that fill colors alone are not a sufficient boundary cue');
console.log('PASS: comparison page, candidate A arc split, retained answer colors, non-scaling strokes, and 8 representative TopoJSON datasets.');
