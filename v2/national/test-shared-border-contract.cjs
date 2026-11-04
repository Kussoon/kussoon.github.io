'use strict';
// Preserve PR #131 (single-stroke) and PR #187 (nationwide shared-topology).
// This guards audited artifacts and integration boundaries, not visual proof.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const json = name => JSON.parse(read(name));
const shared = json('v2/data/national/2026-common/national-shared-border-pilot/manifest.json');
const nationwide = json('v2/data/national/2026-common/national-2026-pilot/manifest.json');
const catalog = json('v2/data/national/catalog.json');
const density = read('v2/national/density-app.js');
const html = read('v2/national/density.html');
const renderer = read('v2/shared/municipality-renderer.js');
const builder = read('v2/tools/shared-topology/build.mjs');

assert.equal(shared.schemaVersion, 1);
assert.equal(shared.prefectureCount, 47, 'shared border topology must cover all 47 prefectures');
assert.equal(shared.regionCount, 1905, '2026 shared topology coverage changed: reconcile municipal codes before replacing national map');
assert.equal(shared.checkedPairs, 22, 'cross-prefecture shared-border audit must cover 22 known pairs');
assert.equal(shared.allExpectedPairsHaveSharedArcs, true);
assert.equal(shared.pairs.length, 22);
const pairs = new Set();
for (const p of shared.pairs) {
  assert.match(p.pair, /^\d{2}-\d{2}$/);
  assert(!pairs.has(p.pair), 'duplicate border pair: '+p.pair);
  pairs.add(p.pair);
  assert.equal(p.exactSharedCoordinates, true, 'seam must have identical coordinates: '+p.pair);
  assert(Number.isInteger(p.commonArcCount) && p.commonArcCount > 0, 'no shared arcs: '+p.pair);
  assert.equal(p.commonArcIDs.length, p.commonArcCount, 'arc audit mismatch: '+p.pair);
  assert.equal(new Set(p.commonArcIDs).size, p.commonArcCount, 'repeated arc IDs: '+p.pair);
  assert(p.commonArcIDs.every(n => Number.isInteger(n) && n >= 0), 'invalid arc ID: '+p.pair);
}
assert.equal(nationwide.prefectureCount, 47);
assert.equal(nationwide.municipalityCount, 1905);
assert.equal(nationwide.entries.length, 47);
assert.equal(new Set(nationwide.entries.map(x => x.pref)).size, 47);
assert.equal(nationwide.entries.reduce((n,x)=>n+x.regions,0), 1905);

assert.match(builder, /ONE nationwide GeoJSON/, 'PR #187 single-topology build rationale must remain');
assert.match(builder, /sharedPrefectureArcCounts:\s*cross/, 'shared-arc validation must be written to manifest');
assert.match(builder, /No shared arc between Osaka and Nara/, 'known problematic seam must fail closed');
assert.match(builder, /makeTopology\(/, 'topology must be generated nationally');
assert.match(renderer, /Shared TopoJSON arcs are drawn/, 'PR #131 shared renderer contract missing');
assert.match(renderer, /const borders=element\('path'\)/, 'single border layer missing');
assert.match(renderer, /fragment\.append\(borders\)/, 'border layer must be appended once');
assert.match(renderer, /borders\.setAttribute\('pointer-events','none'\)/, 'border must not block selection');

assert.equal(catalog.geometry.asOf, '2021-01-01');
// The current page still intentionally uses 2021 data and 1902 region units.
// This must not silently become a mixed 2021/2026 dataset.
assert.match(density, /japan:\{title:'全国47都道府県',expected:\{municipality:1747,ward:1902\}\}/);
assert.match(density, /fetch\('\.\.\/data\/national\/2021\/'\+code\+'\.topojson'\)/);
assert.match(html, /境界線は2021年1月時点/, 'data provenance must be visible');
// Existing national page must not quietly claim solved nationwide seams.
// When switching to the PR #187 data, update this guard and revalidate
// official codes, office directory, fixed 5C anchors and loading speed.
console.log('PASS PR #131/#187 border contracts: 47 prefectures, 22 exact shared seams, 1905 experimental 2026 regions; production remains 2021/1902');
