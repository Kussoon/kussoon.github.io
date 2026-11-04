#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('v2/national/official-2026-nationwide-pilot.html','utf8');
assert(html.includes('.office-popup{position:absolute;left:8px;right:auto;bottom:8px;'));
assert(html.includes('@media(max-width:600px){\n .office-popup{left:8px;right:8px;bottom:230px;width:auto;max-height:calc(100% - 242px);min-width:0}'));
assert(html.includes('.popup-actions{grid-template-columns:repeat(3,minmax(0,1fr))}'));
assert(html.includes('class="map-toolbar"'));
assert(html.includes('id="officePopup"'));
assert(html.includes('id="popupClose"'));
assert(html.includes('KussoonOfficeDirectory.render(document,$(\'popupActions\'),result'));
assert(html.includes("viewport.zoomIn()"));
assert(html.includes("noindex,follow"));
console.log('PASS mobile popup CSS constrained to map, above toolbar; office links and existing controls preserved.');
