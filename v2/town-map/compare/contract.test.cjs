#!/usr/bin/env node
'use strict';
// Static safety contract for the isolated Kawanishi A/B pilot.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=__dirname;
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const js=fs.readFileSync(path.join(dir,'kawanishi-label-ab.js'),'utf8');
const original=fs.readFileSync(path.join(dir,'../../common/js/town-map-engine.js'),'utf8');
new vm.Script(js,{filename:'kawanishi-label-ab.js'});
assert.match(html,/<meta name="robots" content="noindex,follow">/);
assert.match(html,/<base href="\/v2\/town-map\/">/);
assert.match(html,/labelMode=A/);assert.match(html,/labelMode=B/);
assert.match(html,/compare\/kawanishi-label-ab\.js/);
assert.ok(!html.includes('src="../common/js/town-map-engine.js'), 'comparison must not load main engine');
assert.match(js,/labelMode==='A'&&zoom>=2/);
assert.match(js,/shrink:labelMode==='B'/);
assert.match(js,/font=labelMode==='B'\?12:16/);
assert.match(js,/labelStats\.textContent/);
assert.match(js,/KussoonV2TownMap=Object\.freeze/);
assert.ok(original.includes('const layout=zoom>=2'), 'original baseline should still be the main-version policy');
assert.ok(original.includes("shrink:false"), 'main engine must remain unchanged during A/B');
console.log('kawanishi-label-ab-contract: PASS (static only, no browser verification)');