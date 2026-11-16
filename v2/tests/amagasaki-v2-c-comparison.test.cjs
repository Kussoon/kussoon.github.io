#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../amagasaki-town-v2-c-comparison-20261116.html'),'utf8');
const paths=[...html.matchAll(/<path class="town" data-name="([^"]+)" d="/g)].map(m=>m[1]);
assert.equal(paths.length,140,'Amagasaki: preserve 140 SVG town paths');
assert.equal(new Set(paths).size,140,'town path names must remain unique');
for(const id of ['plus','minus','larger','smaller','size','reset','reading','fullscreen','quiz1','quiz2','quitQuiz','quizNext','quizChoices'])assert.match(html,new RegExp('id="'+id+'"'),'missing '+id);
assert.match(html,/noindex,nofollow/);
assert.match(html,/2026\/11\/16 14:46:21（JST）/);
assert.match(html,/matches\.slice\(0,35\)/);
assert.match(html,/body\.town-quiz-mode \.town-label\{display:none\}/);
assert.match(html,/function renderLabels\(/);
assert.match(html,/fontPct=Math\.min\(200,fontPct\+25\)/);
assert.match(html,/fontPct=Math\.max\(75,fontPct-25\)/);
assert.match(html,/\.full\{position:absolute;top:6px;right:6px;z-index:6;width:49px/);
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
for(const script of scripts)new Function(script);
console.log('Amagasaki V2 comparison static contracts PASS (140 towns; buttons; quizzes; date; JS syntax).');
