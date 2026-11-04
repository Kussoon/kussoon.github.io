'use strict';
// Guard accepted V2 national-map contracts across future boundary/data rewrites.
// This is a static regression guard, not a browser-performance or border geometry test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, 'density.html'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, 'density-app.js'), 'utf8');
const centers = fs.readFileSync(path.join(__dirname, 'centered-labels.js'), 'utf8');
const reference = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/national/office-reference-points.json'), 'utf8'));

function check(pattern, source, explanation) {
  assert.match(source, pattern, explanation);
}
check(/<select\s+id="reading"[\s\S]*?<option\s+value="off"\s+selected>/, html,
  'Reading must default to OFF, including in a fresh browser session');
check(/id="reading-toggle"[^>]*aria-pressed="false"[^>]*>よみがな OFF<\/button>/, html,
  'National reading control must visibly start OFF');
check(/const\s+maxZoom\s*=\s*state\.area==='japan'\?768\s*:/, app,
  'Nationwide zoom cap must stay 768');
check(/if\(compact\)return Math\.min\(13\s*,/, app,
  'Nationwide labels must remain capped at 13 screen pixels');
check(/if\(area==='japan'\)\s*\{\s*\/\/ Apply the accepted 5C rule once[\s\S]*?M\.officeComponent5\(m\)/, app,
  'National labels must use established office-aware 5C anchors');
check(/models\.forEach\(m=>labelAnchorCache\.set\(m\.id,office5Centers\.get\(m\.id\)\)\)/, app,
  'National 5C anchors must be cached once for zoom and pan');
check(/function\s+officeComponent5\s*\(/, centers,
  'The office-aware placement helper must remain available');
// These two points are intentional, not complete nationwide office coordinates.
assert.ok(reference.points['27362'], 'Tajiri mainland office reference point must exist');
assert.ok(reference.points['28110'], 'Kobe Chuo ward office reference point must exist');
check(/\.national-map-mode \.land,\.national-map-mode \.land\.selected,\.national-map-mode \.land\.focused\{stroke:none\}/,
  html, 'Nationwide municipality fill paths must never gain duplicated strokes');
check(/const\s+mesh=window\.topojson\.mesh\(topo,object,\(a,b\)=>a!==b\)/, app,
  'Current prefecture-local internal borders must not be replaced with per-polygon strokes');
console.log('PASS V2 national contracts: reading OFF, compact labels, zoom 768, fixed 5C, office points, single local strokes');
