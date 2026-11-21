const assert = require('node:assert/strict');
const { detect } = require('../v2/common/js/coaster-loop-detector.js');

function circle(cx, cy, radius, { samples = 180, offsetX = 0, offsetY = 0, start = -Math.PI / 2 } = {}) {
  return Array.from({ length: samples + 1 }, (_, i) => {
    const t = i / samples, angle = start + t * Math.PI * 2, drift = t * t * (3 - 2 * t);
    return { x: cx + radius * Math.cos(angle) + offsetX * drift, y: cy + radius * Math.sin(angle) + offsetY * drift };
  });
}
function line(a, b, count = 80) {
  return Array.from({ length: count + 1 }, (_, i) => ({ x: a.x + (b.x - a.x) * i / count, y: a.y + (b.y - a.y) * i / count }));
}
function join(...parts) { return parts.flatMap((part, i) => i ? part.slice(1) : part); }
function detected(points) { return detect(points).loops; }

const cases = [];
function check(name, fn) { fn(); cases.push(name); }
check('大きな正円は縦ループになる', () => assert.equal(detected(circle(150, 150, 42)).length, 1));
check('入口と出口が離れたバネ状ループを認識する', () => {
  const loop = detected(circle(150, 150, 42, { offsetX: 15, offsetY: 4 }));
  assert.equal(loop.length, 1); assert.ok(loop[0].gap > 5); assert.ok(loop[0].r >= 24);
});
check('最小半径を下回る丸はループにしない', () => assert.equal(detected(circle(150, 150, 20)).length, 0));
check('下限以上の小さめループは認識する', () => assert.equal(detected(circle(150, 150, 27)).length, 1));
check('楕円寄りの丸もループ候補として扱う', () => {
  const oval = Array.from({ length: 181 }, (_, i) => { const a = -Math.PI / 2 + i / 180 * Math.PI * 2; return { x: 150 + 42 * Math.cos(a), y: 150 + 34 * Math.sin(a) }; });
  assert.equal(detected(oval).length, 1);
});
check('手描きの軽いゆらぎを含む円を認識する', () => {
  const jitter = Array.from({ length: 241 }, (_, i) => { const a = -Math.PI / 2 + i / 240 * Math.PI * 2, r = 42 + 1.2 * Math.sin(i * .71); return { x: 150 + r * Math.cos(a), y: 150 + r * Math.sin(a) }; });
  assert.equal(detected(jitter).length, 1);
});
check('山形はループに誤認しない', () => assert.equal(detected(join(line({ x: 10, y: 240 }, { x: 150, y: 80 }), line({ x: 150, y: 80 }, { x: 290, y: 240 }))).length, 0));
check('水平Uターンは縦ループに誤認しない', () => {
  const turn = Array.from({ length: 101 }, (_, i) => { const a = Math.PI * i / 100; return { x: 280 + 55 * Math.cos(a), y: 400 + 55 * Math.sin(a) }; });
  assert.equal(detected(join(line({ x: 20, y: 400 }, { x: 280, y: 400 }), turn, line({ x: 225, y: 400 }, { x: 780, y: 400 }))).length, 0);
});
check('連続した2ループを別々に認識する', () => {
  const a = circle(100, 120, 40), b = circle(300, 160, 40);
  const course = join(line({ x: 20, y: 120 }, a[0]), a, line(a.at(-1), b[0]), b, line(b.at(-1), { x: 380, y: 160 }));
  assert.equal(detected(course).length, 2);
});
for (const name of cases) console.log(`PASS ${name}`);
console.log(`${cases.length} loop-detection cases passed.`);
