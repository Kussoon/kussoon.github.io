'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const script=fs.readFileSync(path.join(root,'v2/municipalities/shared/quiz-app.js'),'utf8');
assert(script.includes("key:'all',name:'全域',reading:'ぜんいき'"),'Shared UI exposes a prefecture-wide option');
assert(script.includes("new Set(config.regions.flatMap(region=>region.codes))"),'Prefecture-wide option uses the verified region code union');
assert(script.includes("fitMap(current,selectedRange==='all')"),'Prefecture-wide quiz fits the prefecture from start and on reset');
assert(script.includes("regions.some(r=>r.key===wanted)?wanted:regions[0].key"),'Existing first-region default and URL-driven choice stay intact');
assert(script.includes("session=Core.start(order)"),'Questions use the selected region, including full prefecture');
assert(script.includes("proximity.options(item,current)"),'Four choices refer to selected set');
const targets=['tokushima','hyogo','nara','shiga','osaka','kyoto','wakayama','tottori','shimane','okayama','hiroshima','yamaguchi'];
for(const pref of targets){
 const config=JSON.parse(fs.readFileSync(path.join(root,'v2/municipalities',pref,'regions.json'),'utf8'));
 const codes=config.regions.flatMap(region=>region.codes);
 const all=[...new Set(codes)];
 assert.equal(all.length,config.expectedAreaCount,pref+' whole-prefecture quiz must include every area');
 assert(codes.length===all.length,pref+' no code duplication');
 assert(config.regions.every(region=>region.key!=='all'),pref+' synthetic selection must not pollute source data');
}
console.log('All-prefecture quiz shared option: 10 pref configs and UI contracts PASS');
