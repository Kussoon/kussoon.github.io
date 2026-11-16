'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const sandbox={};sandbox.globalThis=sandbox;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../v2/common/js/town-svg-quiz-choices.js'),'utf8'),sandbox);
const select=sandbox.KussoonTownSvgQuizChoices.select;
const towns=['A','B','C','D','E','F','G','H'];
const adjacency=new Map([['A',new Set(['B','C','D'])]]);
const region=new Map([['A','north'],['B','north'],['C','south'],['D','north'],
 ['E','north'],['F','south'],['G','north'],['H','south']]);
const distance=name=>({B:4,C:1,D:2,E:0.5,F:0.2,G:3,H:1}[name]??0);
function test(scope,expected){
 const result=select('A',{townNames:towns,scopeNames:scope,adjacency,primaryRegion:region,
 distance,shuffle:a=>a});
 assert.equal(JSON.stringify(result),JSON.stringify(expected));
}
test(['A','B','C','D','E','F','G','H'],['A','D','B','C']);
const noNeighbor=new Map();const result=select('A',{townNames:towns,scopeNames:['A','E','F','H'],
 adjacency:noNeighbor,primaryRegion:region,distance,shuffle:a=>a});
assert.equal(JSON.stringify(result),JSON.stringify(['A','E','F','H']));
assert.throws(()=>select('UNKNOWN',{townNames:towns,scopeNames:[],adjacency,primaryRegion:region,distance,shuffle:a=>a}));
assert.throws(()=>select('A',{townNames:towns,scopeNames:[],adjacency,primaryRegion:region,distance:null,shuffle:a=>a}));
console.log('PASS TOWN_SVG_QUIZ_CHOICES: priority adjacent+same region, adjacent+other, scoped, fallback, malformed target');
