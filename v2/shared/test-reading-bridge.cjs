#!/usr/bin/env node
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('v2/shared/reading-bridge.js','utf8'),ctx);
const bridge=ctx.window.KussoonV2ReadingBridge;
const real=JSON.parse(fs.readFileSync('v2/data/national/municipality-readings.json','utf8'));
assert(real.meta.count>=500,'expected existing stored reading catalog');
assert.equal(bridge.verify({code:'28204',name:'西宮市'},real.items['28204'])?.reading,'にしのみやし');
assert.equal(bridge.verify({code:'28110',name:'中央区'},real.items['28110'])?.reading,'こうべしちゅうおうく');
assert.equal(bridge.verify({code:'28110',name:'中央区'},real.items['28110'])?.parts.length,2);
assert.equal(bridge.verify({code:'28110',name:'中央区'},{name:'別の市中央区',reading:'べつのし ちゅうおうく'})?.reading,'べつのしちゅうおうく'); // Full source names are still code-keyed; no inference from geography.
assert.equal(bridge.verify({code:'28204',name:'芦屋市'},real.items['28204']),null,'mismatching official name must not be attached');
assert.equal(bridge.verify({code:'22131',name:'中央区'},real.items['22131']),null,'renamed wards must not borrow old readings');
const attached=bridge.attach([{code:'28204',name:'西宮市'},{code:'28206',name:'芦屋市'},{code:'99999',name:'不明市'},{code:'28204',name:'架空市'}],real);
assert.equal(attached.stats.total,4);
assert.equal(attached.stats.matched,2);
assert.equal(attached.stats.missing,1);
assert.equal(attached.stats.mismatched,1);
assert.equal(attached.regions[2].reading,'');
console.log('PASS existing CC0 reading catalog, strict matching and no guessed readings');
