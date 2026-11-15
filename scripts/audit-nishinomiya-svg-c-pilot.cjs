#!/usr/bin/env node
'use strict';
// Guardrails for the Nishinomiya SVG comparison (PR #470 C-BASELINE 1.0).
// Static checks are not a replacement for viewport screenshots or iPhone Safari.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const svg=fs.readFileSync(path.join(root,'v2/nishinomiya-town-svg-c-render-pilot.html'),'utf8');
const c=fs.readFileSync(path.join(root,'v2/nishinomiya-town-study-c.html'),'utf8');
const base=fs.readFileSync(path.join(root,'v2/docs/town-map/NISHINOMIYA_V2_C_BASELINE.md'),'utf8');
function requireMatch(text,pattern,label){assert.match(text,pattern,label);}
const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'duplicate SVG pilot HTML ids');
const refs=[...svg.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
const absent=[...new Set(refs)].filter(id=>!ids.includes(id));
assert.deepEqual(absent,[],'DOM references must have a matching element');
const cReadings=c.match(/const READINGS=(\{[^;]+\}), LABEL_OFFSETS=/);
const svgReadings=svg.match(/const READINGS=(\{[^;]+\}), LABEL_OFFSETS=/);
assert.ok(cReadings&&svgReadings,'town readings dictionaries are present');
assert.deepEqual(JSON.parse(svgReadings[1]),JSON.parse(cReadings[1]),'SVG readings must equal C baseline');
const cOffsets=c.match(/LABEL_OFFSETS=(\{[^;]+\}), MULTI_LABELS=(\{[^;]+\}), EXTRA_LABELS=(\{[^;]+\});/);
const svgOffsets=svg.match(/LABEL_OFFSETS=(\{[^;]+\}), MULTI_LABELS=(\{[^;]+\}), EXTRA_LABELS=(\{[^;]+\});/);
assert.ok(cOffsets&&svgOffsets,'C and SVG label overrides are present');
for(let i=1;i<=3;i++)assert.deepEqual(JSON.parse(svgOffsets[i]),JSON.parse(cOffsets[i]),'label override mismatch at index '+i);
for(const [selector,label] of [
 [/new URLSearchParams\(location.search\)\.get\('town'\)/,'town direct link'],
 [/id="hierarchyReturn"/,'geography return'],
 [/function focusTown\(/,'town focus'],
 [/function initCommunityData\(/,'community'],
 [/function choiceCandidates\(/,'adjacent quiz choices'],
 [/function quizMapAnswer\(/,'quiz 1'],
 [/function quizChoiceAnswer\(/,'quiz 2'],
 [/function finishQuiz\(/,'quiz completion'],
 [/function stopQuiz\(/,'quiz cleanup'],
 [/500\)/,'half-second flash'],
 [/\(-\.48\*fs\)/,'zoom-safe reading line'],
 [/nishinomiya-uekoto-community\.topojson/,'Uekoto boundary'],
 [/岡田山/,'Okadayama exception'],
 [/noindex,nofollow/,'pilot remains noindex']
 ])requireMatch(svg,selector,label);
requireMatch(base,/C-BASELINE 1\.0/,'formal baseline document');
const rule=fs.readFileSync(path.join(root,'v2/docs/town-map/TOWN_COMMUNITY_ORDER_01.md'),'utf8');
requireMatch(rule,/TOWN-COMMUNITY-ORDER-01/,'nationwide community sorting rule');
requireMatch(svg,/communityNames\.sort\(\(a,b\)=>kanaCollator\.compare\(COMMUNITY_READINGS\[a\],COMMUNITY_READINGS\[b\]\)/,'kana sorting implemented');
requireMatch(svg,/for\(const co of \['',\.\.\.communityNames\]\)/,'all-area button first');
const matchReadings=svg.match(/const COMMUNITY_READINGS=(\{[^;]+\});/);
assert.ok(matchReadings,'community readings present');
const readings=JSON.parse(matchReadings[1].replaceAll("'",'"'));
assert.equal(Object.keys(readings).length,26,'26 confirmed readings');
const comparator=new Intl.Collator('ja',{usage:'sort',sensitivity:'base',numeric:false});
const ordered=Object.keys(readings).sort((a,b)=>comparator.compare(readings[a],readings[b])||comparator.compare(a,b));
assert.equal(new Set(ordered).size,26,'unique communities');
for(let i=1;i<ordered.length;i++)assert.ok(comparator.compare(readings[ordered[i-1]],readings[ordered[i]])<=0,'readings sorted');
assert.equal(ordered[0],'芦原','first community');
assert.equal(ordered[ordered.length-1],'用海','last community');
console.log('Nishinomiya SVG pilot static regression checks passed.');
