#!/usr/bin/env node
'use strict';
// Smoke guard for the frozen town-map contract. This is not a substitute
// for Playwright glyph and quiz parity tests.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const spec=read('v2/docs/town-map/TOWN_MAP_MASTER_SPEC.md');
const guidance=read('AGENTS.md');
const html=read('v2/nishinomiya-town-svg-master-v34-20261117-pilot.html');
assert.match(spec,/TOWNMAP-SSOT-001/);
for(const n of ['01','02','03','04','05','06','07','08','10','11','12','13','14','15','16','20','21','22','23','24','25','30','31','32','33','34','35','40','41','42','43','44'])assert.ok(spec.includes('R-TOWN-'+n),'missing rule R-TOWN-'+n);
assert.match(guidance,/v2\/docs\/town-map\/TOWN_MAP_MASTER_SPEC\.md/);
assert.match(guidance,/Town-map spec: TOWNMAP-SSOT-001/);
for(const id of ['quizOne','quizTwo','quizPanel','quizResults','quizFeedback','communityOptions','reading','size','fullscreen','zoomIn','zoomOut','larger','smaller','reset','status'])assert.match(html,new RegExp('id="'+id+'"'),'missing UI '+id);
assert.match(html,/expectedTownCount:321,expectedRegionCount:26/);
assert.match(html,/const COMMUNITY_READINGS=/);
assert.match(html,/MULTI_LABELS=/);
assert.match(html,/EXTRA_LABELS=/);
assert.match(html,/LABEL_OFFSETS=/);
assert.match(html,/function townTspanScreenRect\(/);
assert.match(html,/document\.createRange\(\)/);
assert.match(html,/if\(!readingOn\)\s*\{/);
assert.match(html,/function startQuiz\(mode,forcedNames\)\{/);
assert.match(html,/\$\('status'\)\.textContent='クイズ'\+mode\+'を実施中です。'/);
assert.match(html,/function stopQuiz\(returnToMap\)/);
assert.match(html,/function quizChoiceAnswer\(/);
assert.match(html,/function quizMapAnswer\(/);
assert.match(html,/function finishQuiz\(quitEarly=false\)/);
assert.match(html,/noindex,nofollow/);
assert.match(html,/nishinomiya-uekoto-community\.topojson/);
assert.match(html,/town-svg-quiz-state\.js/);
// The user-approved v1.4 slider UI is the single nationwide rule. Historical V34 must
// remain unchanged until the dedicated comparison and adoption process.
const acceptedSlider=read('v2/nishinomiya-town-svg-single-rail-20261119-pilot.html');
const takarazukaPointer=read('v2/takarazuka-town-svg-pointer-slider-20261119-pilot.html');
const communityState=read('v2/common/js/town-svg-community-state.js');
const zoomModule=read('v2/common/js/town-svg-zoom-slider-drag.js');
assert.match(spec,/版：\*\*1\.5\*\*/);
// v1.5 changes new shared label cardinality, NOT the historical V34 gate.
assert.match(spec,/1町名1ラベル/);
assert.match(spec,/321町名・321ラベル/);
assert.match(spec,/旧V34の不変回帰ゲート/);
assert.match(spec,/旧V34の324件/);
assert.match(spec,/同一問題の回答中に限り/);
assert.match(spec,/白い内側・薄いグレーの枠線/);
assert.match(spec,/独立した＋ボタン/);
assert.match(spec,/学習地域の選択も解除した自治体全体表示/);
assert.match(spec,/文字倍率変更後も表示を変えず/);
assert.match(acceptedSlider,/id="zoomSlider"/);
assert.doesNotMatch(acceptedSlider,/id="zoomIn"/);
assert.doesNotMatch(acceptedSlider,/id="zoomOut"/);
assert.match(acceptedSlider,/\.zoom-slider-visual-track/);
assert.match(acceptedSlider,/background:#ffffff;border:1px solid #b4bcc2/);
assert.match(acceptedSlider,/\.zoom-slider-visual-thumb/);
assert.match(acceptedSlider,/width:21px;height:27px/);
assert.match(zoomModule,/zoom\.on\('zoom\.townPointerSlider',sync\)/);
assert.match(zoomModule,/setPointerCapture/);
assert.match(acceptedSlider,/id="zoomPlus"/);
assert.match(acceptedSlider,/id="zoomMinus"/);
assert.doesNotMatch(acceptedSlider,/id="reset"/);
assert.match(takarazukaPointer,/id="zoomPlus"/);
assert.match(takarazukaPointer,/id="zoomMinus"/);
assert.doesNotMatch(takarazukaPointer,/id="reset"/);
assert.match(communityState,/if\(reset\)reset\.textContent/);
console.log('PASS TOWNMAP-SSOT-001: master spec, work instructions and adopted V34 control invariants');
