'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const quiz = fs.readFileSync(path.join(root, 'shared/quiz-app.js'), 'utf8');
assert.match(quiz, /if\(region\.reading\)\{const rt=document\.createElement\('rt'\);rt\.textContent=region\.reading;ruby\.append\(rt\);\}/);
assert.match(quiz, /ruby\.textContent=region\.name/);
for (const [pref, count, areas] of [['osaka', 8, 72], ['kyoto', 8, 36]]) {
  const dir = path.join(root, pref);
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'regions.json'), 'utf8'));
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.equal(cfg.regions.length, count, pref + ' region count');
  assert.equal(cfg.regions.flatMap(region => region.codes).length, areas, pref + ' area count');
  assert.equal(new Set(cfg.regions.map(region => region.key)).size, count, pref + ' unique region keys');
  for (const region of cfg.regions) {
    assert.ok(region.name && typeof region.reading === 'string' && /^[ぁ-ゖー]+$/.test(region.reading), pref + ' reading: ' + region.key);
  }
  assert.match(html, /if\(r\.reading\)ruby\.append\(make\('rt',r\.reading\)\)/, pref + ' region ruby');
  assert.match(html, /b\.append\(ruby,count\)/, pref + ' region name and count');
}
console.log('Osaka/Kyoto region readings and both selection UI paths: OK');
