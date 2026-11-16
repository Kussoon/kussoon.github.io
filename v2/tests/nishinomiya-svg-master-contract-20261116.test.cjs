#!/usr/bin/env node
'use strict';
// Source-contract regression for the Nishinomiya SVG master specification.
// A passing static test is NOT a C-vs-SVG visual match or an iPhone Safari pass.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const spec=read('docs/town-map/NISHINOMIYA_SVG_MASTER_SPEC_20261116.md');
const c=read('nishinomiya-town-study-c.html');
const svg=read('nishinomiya-town-svg-compact-controls-20261116-pilot.html');
const core=read('common/js/town-svg-core.js');
function dict(file,key){const m=file.match(new RegExp('\\b'+key+'=(\\{[^;]+\\})[;,]'));assert(m,'Missing '+key);return JSON.parse(m[1]);}
for(const key of ['READINGS','LABEL_OFFSETS','MULTI_LABELS','EXTRA_LABELS']){
 assert.deepEqual(dict(svg,key),dict(c,key),'C/SVG '+key+' mismatch');
}
assert.equal(Object.keys(dict(svg,'READINGS')).length,321);
assert.equal(Object.keys(dict(svg,'LABEL_OFFSETS')).length,14);
assert.deepEqual(Object.keys(dict(svg,'MULTI_LABELS')).sort(),['塩瀬町名塩','山口町上山口'].sort());
assert.deepEqual(Object.keys(dict(svg,'EXTRA_LABELS')),['山口町下山口']);
assert(svg.includes("loadTownData({")&&svg.includes("},topojson,'town',321)"));
assert(core.includes('features.length!==expectedTownCount'));
assert(svg.includes("communityNames.length!==26")&&svg.includes("expected={'上ヶ原':4,'甲東':2}"));
assert(svg.includes('sortRegionsByReading'));
assert(svg.includes('setInterval(()=>{blinkOn=!blinkOn;display()},500)'));
assert(svg.includes('function quizMapAnswer(')&&svg.includes('function quizChoiceAnswer('));
assert(svg.includes('function focusTown(')&&svg.includes("URLSearchParams(location.search).get('town')"));
assert(svg.includes("anchorMode='svg'")&&svg.includes('path.centroid(f)'));
assert(core.includes(".on('dblclick.zoom',null)"));
assert(c.includes('map.scrollWheelZoom.enable()')&&c.includes('map.scrollWheelZoom.disable()'));
assert(!svg.includes('scrollWheelZoom.enable()'),'SVG must not accidentally contain Leaflet wheel logic');
const names=[...svg.split('<div class="controls" aria-label="地図操作">')[1].split('</div></section>')[0].matchAll(/id="(zoomIn|zoomOut|larger|smaller|size|reset|reading)"/g)].map(m=>m[1]);
assert.deepEqual(names,['zoomIn','zoomOut','larger','smaller','size','reset','reading']);
assert.match(svg,/\.controls\{right:6px;bottom:6px;top:auto;/);
assert.match(svg,/\.full\{position:absolute;top:6px;right:6px;z-index:4;box-sizing:border-box;width:49px;/);
assert(svg.includes('ctx.measureText(v).width'));
assert(svg.includes('noindex,nofollow')&&c.includes('index,follow'));
for(const id of ['N-DATA-01','N-LABEL-10','N-GESTURE-04','N-GESTURE-05','N-QUIZ-10','N-VERIFY','GAP-01','GAP-07','V09']){
 assert(spec.includes(id),'Master spec must trace '+id);
}
for(const m of svg.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
console.log('PASS: Nishinomiya master source-contracts; known gaps remain explicitly PENDING/MISMATCH, not silently accepted.');
