'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {adjacency,codes,pairs}=require('./fixtures/prefecture-adjacencies.cjs');

const source=fs.readFileSync(path.join(__dirname,'../progressive-preview/prefecture-colors.js'),'utf8');
const window={};
vm.runInNewContext(source,{window});
const colors=window.KussoonV2PrefectureColors;
assert(colors,'palette script exports the shared colour API');
assert.deepEqual(Object.keys(colors.colorByPrefecture).sort(),codes,'fixed colour table has exactly 47 prefectures');
assert.equal(new Set(Object.values(colors.colorByPrefecture)).size,8,'the existing eight pastel colours remain in use');
for(const code of codes){
 assert(colors.palette.includes(colors.colorByPrefecture[code]),'prefecture '+code+' uses a palette colour');
 assert.equal(colors.color(code),colors.colorByPrefecture[code],'two-digit lookup '+code);
 assert.equal(colors.color(code+'110'),colors.colorByPrefecture[code],'five-digit municipality lookup '+code);
}
assert.equal(colors.color('00'),null);
assert.equal(colors.color('48'),null);
assert.equal(colors.color(''),null);

let degreeSum=0;
for(const [code,neighbors] of Object.entries(adjacency)){
 degreeSum+=neighbors.length;
 assert.equal(new Set(neighbors).size,neighbors.length,'no duplicate neighbors for '+code);
 assert(!neighbors.includes(code),'prefecture is not its own neighbor');
 for(const neighbor of neighbors){
  assert(codes.includes(neighbor),'neighbor code is valid: '+code+' / '+neighbor);
  assert(adjacency[neighbor].includes(code),'adjacency is symmetric: '+code+' / '+neighbor);
  assert.notEqual(colors.color(code),colors.color(neighbor),
   'adjacent prefectures use different colors: '+code+' / '+neighbor);
 }
}
assert.equal(degreeSum/2,pairs.length,'pair list represents the symmetric adjacency table once');
assert.equal(pairs.length,88,'complete adjacent-boundary pair list');
for(const neighbor of ['26','27','31','33'])
 assert.notEqual(colors.color('28'),colors.color(neighbor),'Hyogo differs from adjacent '+neighbor);
// Distance in CIELAB (D65/sRGB), not mere hexadecimal inequality. Keep
// similar blue/lavender/green shades apart on actual boundaries.
function lab(hex){
 const srgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
 const [r,g,b]=srgb.map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
 const [x,y,z]=[(r*.4124564+g*.3575761+b*.1804375)/.95047,(r*.2126729+g*.7151522+b*.0721750),(r*.0193339+g*.1191920+b*.9503041)/1.08883];
 const cv=v=>v>(6/29)**3?Math.cbrt(v):v/(3*(6/29)**2)+4/29;
 const [fx,fy,fz]=[x,y,z].map(cv);
 return [116*fy-16,500*(fx-fy),200*(fy-fz)];
}
function delta(a,b){
 const v=lab(colors.color(a)),w=lab(colors.color(b));
 return Math.hypot(...v.map((x,i)=>x-w[i]));
}
for(const [a,b] of pairs)
 assert(delta(a,b)>=20,'adjacent-prefecture colours are too similar: '+a+'/'+b+' deltaE76='+delta(a,b).toFixed(1));
for(const [a,b] of [['28','36'],['25','29'],['33','37'],['34','38']])
 assert(delta(a,b)>=30,'nearby cross-sea / inland pair needs greater visual separation: '+a+'/'+b);
const visualProximityPairs=[
 ['28','36'], // Hyogo / Tokushima
 ['33','37'], // Okayama / Kagawa
 ['34','38'], // Hiroshima / Ehime
 ['25','29'], // Shiga / Nara
 ['35','40'],['35','41'],['35','42'],['35','45'],
 ['40','41'],['40','42'],['40','43'],['40','45'],
 ['41','43'],['42','43'],['42','45'],['43','45']
];
for(const [a,b] of visualProximityPairs)
 assert.notEqual(colors.color(a),colors.color(b),
  'nearby prefectures should not merge visually: '+a+'/'+b);
const kyushuWest=['35','41','42','45'];
assert.equal(new Set(kyushuWest.map(code=>colors.color(code))).size,kyushuWest.length,
 'Yamaguchi, Saga, Nagasaki and Miyazaki use four distinct colours');
assert.equal(colors.color('28'),'#f1d5a5','preserve agreed Hyogo golden beige');
const page=fs.readFileSync(path.join(__dirname,'../../maps/national-municipalities.html'),'utf8');
assert(page.includes('body.map-screen-mode .map-screen-title,#mapFrame:fullscreen .map-screen-title{background:#153d57;color:#fff'),
 'Fullscreen status has solid high-contrast navy background');
assert(page.includes('body.map-screen-mode #mapFullscreen,#mapFrame:fullscreen #mapFullscreen{background:#153d57;color:#fff'),
 'Fullscreen return control has solid high-contrast navy background');
assert(page.includes('@keyframes kussoon-fullscreen-controls-pulse')&&page.includes('0%,74.999%')&&page.includes('75%,100%'),
 'Fullscreen controls alternate 0.75s lit and 0.25s unlit');
assert(page.includes('animation:kussoon-fullscreen-controls-pulse 1s steps(1,end) infinite'),
 'Fullscreen status and return share the same continuous 1-second pulse');
assert(page.includes('@media(prefers-reduced-motion:reduce)')&&page.includes('#mapFullscreen{animation:none}'),
 'Reduced motion disables fullscreen pulse');
console.log('PASS fixed prefecture palette: 47 perceptually separated assignments, 8 colours, '+pairs.length+' adjacent pairs');
