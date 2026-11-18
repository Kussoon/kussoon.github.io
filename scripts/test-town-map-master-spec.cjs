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
// The new user-approved 1.3 UI is a nationwide rule. Historical V34 must
// remain unchanged until the dedicated comparison and adoption process.
const acceptedSlider=read('v2/takarazuka-town-svg-zoom-slider-rail-20261119-pilot.html');
const zoomModule=read('v2/common/js/town-svg-zoom-slider.js');
assert.match(spec,/版：\*\*1\.3\*\*/);
assert.match(spec,/白い内側・薄いグレーの枠線/);
assert.match(spec,/地図用の旧＋／−ボタンを再導入しない/);
assert.match(acceptedSlider,/id="zoomSlider"/);
assert.doesNotMatch(acceptedSlider,/id="zoomIn"/);
assert.doesNotMatch(acceptedSlider,/id="zoomOut"/);
assert.match(acceptedSlider,/\.zoom-slider-visual-track/);
assert.match(acceptedSlider,/background:#ffffff;border:1px solid #b4bcc2/);
assert.match(acceptedSlider,/\.zoom-slider-visual-thumb/);
assert.match(acceptedSlider,/width:21px;height:27px/);
assert.match(zoomModule,/zoom\.on\('zoom\.townZoomSlider',sync\)/);
console.log('PASS TOWNMAP-SSOT-001: master spec, work instructions and adopted V34 control invariants');
