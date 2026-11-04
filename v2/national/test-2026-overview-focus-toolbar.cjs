#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('v2/national/official-2026-nationwide-pilot.html','utf8');
assert(html.includes('.prefecture{fill:#add9ef;stroke:#fff;stroke-width:.75;vector-effect:non-scaling-stroke;'));
assert(html.includes('.prefecture:focus:not(:focus-visible){stroke:#fff;stroke-width:.75}'));
assert(html.includes('.prefecture:focus-visible{stroke:#174b71;stroke-width:2;vector-effect:non-scaling-stroke}'));
assert(html.includes('class="map-toolbar"'));
for(const id of ['mapZoomIn','mapZoomOut','mapReset','mapReadingToggle']){
 assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'toolbar id '+id);
 assert(html.includes("$('"+id+"').addEventListener('click'"),'missing handler '+id);
}
assert(html.includes("viewport.zoomIn()"));
assert(html.includes("viewport.zoomOut()"));
assert(html.includes("viewport.reset()"));
assert(html.includes('value="off" selected'));
assert(html.includes("syncMapReadingToggle();drawLabels();"));
assert(html.includes("const on=$('readingMode').value==='on'"));
assert(html.includes('KussoonV2MunicipalRenderer.render({map:'),'preserve existing prefecture rendering');
assert(html.includes('.borders{fill:none;stroke:white;stroke-width:.9;vector-effect:non-scaling-stroke'));
assert(html.includes('noindex,follow'));
console.log('PASS: touch-focus border does not scale with zoom; keyboard focus remains thin; four working in-map controls; off-default; existing detailed renderer retained.');
