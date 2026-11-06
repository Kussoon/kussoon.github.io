const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const labelSource = fs.readFileSync(
  path.join(__dirname, '../national/national-progressive-labels-trial-v321.js'),
  'utf8',
);
assert.match(labelSource, /const r=map\.getBoundingClientRect\(\),v=viewport\.view\(\)/);
assert.match(labelSource, /Math\.min\(width\/v\.w,height\/v\.h\)/,
  'screen font scale must follow the current SVG viewBox');
const densitySource = fs.readFileSync(
  path.join(__dirname, '../national/density-labels-trial.js'),
  'utf8',
);

function arrange(labelsMode) {
  const sandbox = {
    location: { search: labelsMode === 'baseline' ? '?labels=baseline' : '' },
    URLSearchParams,
  };
  sandbox.window = sandbox;
  vm.runInNewContext(densitySource, sandbox);
  const models = Array.from({ length: 8 }, (_, index) => ({
    id: String(index),
    code: '280' + String(index).padStart(2, '0'),
    prefectureCode: '28',
    box: { w: 80, h: 80 },
  }));
  const labels = Array.from({ length: models.length }, (_, index) => {
    const x = 60 + index * 4;
    const y = 60 + index * 3;
    const box = { x1: x - 12, x2: x + 12, y1: y - 8, y2: y + 8 };
    return { x, y, width: 24, height: 16, box };
  });
  const result = sandbox.KussoonDensityLabels.arrange(models, labels, {
    view: { x: 0, y: 0, w: 200, h: 200 },
    mode: 'adaptive',
    density: 'dense',
    selectedId: '',
    screenWidth: 200,
    screenHeight: 200,
    stableAnchors: true,
    zoom: 4,
  });
  return { models, labels, result };
}

function overlaps(a, b) {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}

const trial = arrange('no-overlap');
const shown = trial.result.labels.filter((_, index) => trial.result.visible[index]);
for (let first = 0; first < shown.length; first++) {
  for (let second = first + 1; second < shown.length; second++) {
    assert.equal(overlaps(shown[first].box, shown[second].box), false,
      'the default trial layout must not show overlapping labels');
  }
}
assert.ok(shown.length > 1, 'the trial must retain multiple labels in a dense view');

const baseline = arrange('baseline');
const baselineShown = baseline.result.labels.filter((_, index) => baseline.result.visible[index]);
let baselineOverlaps = 0;
for (let first = 0; first < baselineShown.length; first++) {
  for (let second = first + 1; second < baselineShown.length; second++) {
    if (overlaps(baselineShown[first].box, baselineShown[second].box)) baselineOverlaps++;
  }
}
assert.ok(baselineOverlaps > 0,
  'the comparison mode must reproduce overlap allowance in a zoomed dense view');

const trialHtml = fs.readFileSync(
  path.join(__dirname, '../../v2/national/label-zoom-trial-v321.html'),
  'utf8',
);
assert.match(trialHtml, /name="robots" content="noindex,nofollow"/);
assert.match(trialHtml, /density-labels-trial\.js/);
assert.match(trialHtml, /national-progressive-labels-trial-v321\.js/);
assert.match(labelSource, /if\(prefCode\)ms=ms\.filter\(m=>m\.prefectureCode===prefCode\)/, 'labels are scoped to the active prefecture');
console.log('PASS: no-overlap trial shows ' + shown.length + '/' + trial.models.length +
  ' labels; baseline overlaps ' + baselineOverlaps + ' pairs.');
