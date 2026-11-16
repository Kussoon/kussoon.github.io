#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=x=>fs.readFileSync(path.join(__dirname,'..',x),'utf8');
const c=read('v2/nishinomiya-town-study-c.html');
const v3=read('v2/nishinomiya-town-svg-master-v3-20261116-pilot.html');
const v4=read('v2/nishinomiya-town-svg-master-v4-20261116-pilot.html');
for(const m of v4.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
function four(s){const m=s.match(/READINGS=(\{[^;]+\}), LABEL_OFFSETS=(\{[^;]+\}), MULTI_LABELS=(\{[^;]+\}), EXTRA_LABELS=(\{[^;]+\});/);assert(m);return m.slice(1).map(JSON.parse)}
assert.deepEqual(four(v4),four(v3));
assert.deepEqual(four(v4),four(c));
assert.equal(Object.keys(four(v4)[0]).length,321);
const quiz=s=>s.slice(s.indexOf('function shuffleQuiz('),s.indexOf('KussoonTownSvgCore.loadTownData'));
assert.equal(quiz(v4),quiz(v3),'V4 quiz logic changed');
assert(v4.includes("anchorMode='leaflet'"));
assert(v4.includes('directLinkFontOffset=0'));
assert(v4.includes('cTargetZoom-cInitialZoom-Math.log2(targetScale/initialK)'));
assert(v4.includes('Math.pow(2,cTargetZoom)/projection.scale()'));
assert(v4.includes('function focusTown('));
assert(v4.includes('wheelArmed=false'));
assert(v4.includes('zoom.filter('));
console.log('PASS: SVG V4 all JavaScript parses, 321 C label dictionaries identical, V3 quiz unchanged, C geographic focus and font correction present.');
