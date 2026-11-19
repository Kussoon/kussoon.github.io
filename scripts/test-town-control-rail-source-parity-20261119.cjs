'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const old=[
 read('v2/nishinomiya-town-svg-single-rail-20261119-pilot.html'),
 read('v2/takarazuka-town-svg-pointer-slider-20261119-pilot.html')
];
const pages=[
 read('v2/nishinomiya-town-svg-control-rail-20261119-pilot.html'),
 read('v2/takarazuka-town-svg-control-rail-20261119-pilot.html')
];
const cssOld=html=>html.slice(html.indexOf('.map-right-rail{'),html.indexOf('</style>',html.indexOf('.map-right-rail{')));
const markupOld=html=>html.slice(html.indexOf('<div class="map-right-rail"'),html.indexOf('</section>',html.indexOf('<div class="map-right-rail"'))).trim();
const sharedCSS=read('v2/common/css/town-svg-control-rail.css');
const sharedJS=read('v2/common/js/town-svg-control-rail.js');
const match=sharedJS.match(/const html=("(?:\\.|[^"\\])*");/);
assert(match,'shared DOM source must be a single constant');
const sharedMarkup=JSON.parse(match[1]);
assert.equal(cssOld(old[0]),cssOld(old[1]),'old city right rail CSS must match exactly');
assert(sharedCSS.endsWith(cssOld(old[0])),'shared stylesheet must retain the entire approved CSS');
assert.equal(markupOld(old[0]),markupOld(old[1]),'old city DOM must match exactly');
assert.equal(sharedMarkup,markupOld(old[0]),'shared markup must preserve approved DOM');
for(const [i,page] of pages.entries()){
 assert(!page.includes('<div class="map-right-rail"'),'new city page must not duplicate rail DOM');
 assert(!page.includes('.map-right-rail{'),'new city page must not duplicate rail CSS');
 assert(page.includes('/v2/common/css/town-svg-control-rail.css'),'must use national stylesheet');
 assert(page.includes("KussoonTownSvgControlRail.mount("),'must use shared DOM');
 assert(!page.includes("$('fullscreen').onclick="),'fullscreen cannot be defined in city implementation');
 assert(!page.includes("$('smaller').onclick="),'text buttons cannot be defined in city implementation');
}
const cityJS=read('v2/common/js/town-map-result-navigation-takarazuka-control-rail-20261119-pilot.js');
assert(cityJS.includes('KussoonTownSvgControlRail.bind('));
assert(!cityJS.includes("$('fullscreen').onclick="));
assert(!cityJS.includes("$('smaller').onclick="));
const api=require('../v2/common/js/town-svg-control-rail.js');
assert.deepEqual(Object.keys(api).sort(),['bind','mount']);
console.log('PASS NATIONAL_RAIL_SOURCE_PARITY: HTML/CSS byte equality and shared binder adoption in 2 cities');
