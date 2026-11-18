'use strict';
const assert=require('node:assert/strict');
const {renderPaths}=require('../v2/common/js/town-svg-render.js');
const polygon='M1,1 L4,1 L4,4 Z';
const withHole='M0,0 L8,0 L8,8 Z M2,2 L3,2 L3,3 Z';
const records=[{name:'任意町',path:polygon},{name:'穴の町',path:withHole}];
const calls=[];let click;
const sel={
 data(items,key){assert.strictEqual(items,records);assert.deepEqual(items.map(key),['任意町','穴の町']);calls.push('data');return this},
 join(tag){assert.equal(tag,'path');calls.push('join');return this},
 attr(key,fn){const values=typeof fn==='function'?records.map(fn):[fn];calls.push([key,values]);return this},
 on(type,fn){assert.equal(type,'click');click=fn;return this}
};
const areas={selectAll(selector){assert.equal(selector,'path.town');return sel}};
let chosen=[];
renderPaths({areas,records,nameOf:x=>x.name,pathOf:x=>x.path,ariaLabel:x=>x.name+'（読み）',onSelect:name=>chosen.push(name)});
assert.deepEqual(calls,[ 'data','join',['class',['town']],['d',[polygon,withHole]],['data-name',['任意町','穴の町']],['aria-label',['任意町（読み）','穴の町（読み）']] ]);
let stopped=false;click({stopPropagation(){stopped=true}},records[1]);assert(stopped);assert.deepEqual(chosen,['穴の町']);
assert.equal(records[1].path,withHole,'SVG inner ring remains exact');
assert.throws(()=>renderPaths({areas,records,pathOf:x=>x.path,onSelect:()=>{}}),TypeError);
console.log('PASS NATIONAL_TOWN_SHARED_PATH_RENDER_CONTRACT');
