#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('v2/national/official-2026-nationwide-pilot.html','utf8');
assert(html.includes('.office-popup{position:absolute;left:8px;right:auto;bottom:8px;'));
assert(html.includes('.office-popup{left:8px;right:108px;top:auto;bottom:8px;width:auto;height:min(var(--map-toolbar-height,190px),calc(100% - 16px));max-height:calc(100% - 16px);min-width:0;overflow:auto}'));
assert(html.includes("mapToolbar.offsetHeight+'px'"),'popup height must follow actual button-stack height');
assert(html.includes('new ResizeObserver(syncToolbarHeight).observe(mapToolbar)'),'height must track responsive toolbar changes');
assert(!html.includes('max-height:calc(100% - 242px)'),'short maps must not collapse popup height');
assert(html.includes('.map-toolbar{width:88px}'),'mobile toolbar width must fit reserved right strip');
assert(html.includes('.popup-actions{grid-template-columns:repeat(3,minmax(0,1fr))}'));
assert(html.includes('class="map-toolbar"'));
assert(html.includes('id="officePopup"'));
assert(html.includes('id="popupClose"'));
assert(html.includes('KussoonOfficeDirectory.render(document,$(\'popupActions\'),result'));
assert(html.includes("viewport.zoomIn()"));
assert(html.includes("noindex,follow"));
console.log('PASS mobile popup height matches map toolbar, with scrolling and preserved links.');
