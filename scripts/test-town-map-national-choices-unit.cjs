'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const content=fs.readFileSync('v2/common/js/town-svg-quiz-choices.js','utf8');
const context={};context.globalThis=context;vm.runInNewContext(content,context);
const api=context.KussoonTownSvgQuizChoices;
const towns=['A','B','C','D','E'];
const regions=new Map([['A','north'],['B','north'],['C','south'],['D','south'],['E','west']]);
const adjacency=new Map([['A',new Set(['B','C'])]]);
const base={townNames:towns,scopeNames:towns,adjacency,primaryRegion:regions,distance:name=>towns.indexOf(name),shuffle:a=>a};
assert.deepEqual([...api.select('A',base)],['A','B','C','D']);
// A and D share an additional community in data: the callback can promote D
// without adding a city-name branch. Without a callback, old ordering persists.
const sameRegion=(n,target)=>n===target||n==='D'||n==='E';
assert.deepEqual([...api.select('A',{...base,sameRegion})],['A','B','C','D']);
assert.deepEqual([...api.select('A',{...base,adjacency:new Map(),sameRegion})],['A','D','E','B']);
assert.deepEqual([...api.select('A',{...base,adjacency:new Map()})],['A','B','C','D']);
assert.ok(content.includes('sameRegion')&&content.includes('primaryRegion'));
console.log('PASS NATIONAL_CHOICE_SELECTION backward-compatible primaryRegion and optional shared-region membership');
