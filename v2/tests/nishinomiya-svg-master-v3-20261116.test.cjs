#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const old=read('nishinomiya-town-svg-master-v2-20261116-pilot.html');
const next=read('nishinomiya-town-svg-master-v3-20261116-pilot.html');
const normalized=s=>s.replaceAll("anchorMode='leaflet'","anchorMode='svg'")
 .replaceAll('第3比較版','第2比較版').replaceAll('C版ラベル座標整合','マスター仕様整合')
 .replaceAll('2026-11-16T20:37:08+09:00','2026-11-16T20:27:57+09:00')
 .replaceAll('更新：2026/11/16 20:37:08（JST）','更新：2026/11/16 20:27:57（JST）');
assert(old.includes("anchorMode='svg'")&&next.includes("anchorMode='leaflet'"),'C mode must be default in V3 only');
const parse=s=>s.match(/READINGS=(\{[^;]+\}), LABEL_OFFSETS=(\{[^;]+\}), MULTI_LABELS=(\{[^;]+\}), EXTRA_LABELS=(\{[^;]+\});/).slice(1).map(JSON.parse);
assert.deepEqual(parse(old),parse(next));
const quiz=s=>s.slice(s.indexOf('function shuffleQuiz('),s.indexOf('KussoonTownSvgCore.loadTownData'));
assert.equal(quiz(old),quiz(next),'quiz logic must not change');
assert(next.includes('.map-quiz-feedback:empty{display:none!important}'));
assert(next.includes('zoom.filter(event=>(event.type'));
assert(next.includes('noindex,nofollow'));
assert(next.includes('2026/11/16 20:37:08（JST）'));
for(const s of next.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(s[1]);
console.log('PASS SVG master V3 C-center initial default, original data and quizzes retained');
