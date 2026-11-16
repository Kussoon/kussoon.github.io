#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const old=read('nishinomiya-town-svg-core-pilot.html');
const next=read('nishinomiya-town-svg-compact-controls-20261116-pilot.html');
function extract(s){return s.match(/<script>\s*\(\(\)=>\{'use strict';[\s\S]*?KussoonTownSvgCore\.loadTownData[\s\S]*?<\/script>/)?.[0]}
const oldCode=extract(old),newCode=extract(next);
assert(oldCode&&newCode,'Original SVG controller present');
for(const name of ['LABEL_OFFSETS','MULTI_LABELS','EXTRA_LABELS','READINGS','quizMapAnswer','quizChoiceAnswer','buildAdjacency','initCommunityData','KussoonTownSvgCore.loadTownData']){
 assert(oldCode.includes(name)&&newCode.includes(name),'source controller feature changed: '+name);
}
assert.equal(next.includes('https://unpkg.com/leaflet'),false,'SVG comparison cannot fall back to Leaflet');
assert(next.includes('https://unpkg.com/d3@7/dist/d3.min.js'));
const controls=next.split('<div class="controls" aria-label="地図操作">')[1]?.split('</div></section>')[0];
assert(controls,'right controls missing');
const names=[...controls.matchAll(/id="(zoomIn|zoomOut|larger|smaller|size|reset|reading|anchorMode)"/g)].map(m=>m[1]);
assert.deepEqual(names,['zoomIn','zoomOut','larger','smaller','size','reset','reading','anchorMode']);
assert(controls.includes('id="anchorMode"')&&controls.includes('hidden tabindex="-1" aria-hidden="true"'));
assert(controls.includes('<span>文字</span><span>＋</span>')&&controls.includes('<span>文字</span><span>−</span>'));
assert(controls.includes('文字\n100\n％')&&controls.includes('市の\n全体')&&controls.includes('よみ\nがな\nOFF'));
assert(next.includes("communityChoice?'区域\\n全体':'市の\\n全体'"));
assert(next.includes("'文字\\n'+fontPct+'\\n％'"));
assert(next.includes("'よみ\\nがな\\n'+(readingOn?'ON':'OFF')"));
assert(next.includes('width:49px;')&&next.includes('.controls{right:6px;bottom:6px;top:auto;'));
assert(next.includes("ctx.measureText(v).width"));
assert(next.includes('2026/11/16 17:22:07（JST）'));
for(const m of next.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
console.log('PASS: SVG 321 town controls follow PR507; C label exceptions and quiz functions preserved; JS syntax valid.');
