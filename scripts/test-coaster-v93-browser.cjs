const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const { spawn } = require('node:child_process');
const server = spawn('python3', ['-m', 'http.server', '8767', '--bind', '127.0.0.1'], { stdio: 'ignore' });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function pathCircle(cx, cy, radius, { samples = 180, offsetX = 0 } = {}) {
  return Array.from({ length: samples + 1 }, (_, i) => {
    const t = i / samples, a = -Math.PI / 2 + t * Math.PI * 2, drift = t * t * (3 - 2 * t);
    return [cx + radius * Math.cos(a) + offsetX * drift, cy + radius * Math.sin(a)];
  });
}
function pathLine(a, b, samples = 100) {
  return Array.from({ length: samples + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / samples, a[1] + (b[1] - a[1]) * i / samples]);
}
function join(...paths) { return paths.flatMap((path, i) => i ? path.slice(1) : path); }

(async () => {
  let browser;
  try {
    for (let i = 0; i < 30; i++) {
      try { if ((await fetch('http://127.0.0.1:8767/v2/one-stroke-coaster-3d-v93.html')).ok) break; } catch {}
      await wait(200);
    }
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const cases = [
      { name: 'spring loop', draw: box => pathCircle(box.x + box.width * .45, box.y + box.height * .5, 42, { offsetX: 15 }), loops: true },
      { name: 'small circle', draw: box => join(pathLine([box.x + 20, box.y + box.height * .5], [box.x + 60, box.y + box.height * .5]), pathCircle(box.x + 80, box.y + box.height * .5, 20)), loops: false },
      { name: 'hill', draw: box => join(pathLine([box.x + 20, box.y + box.height * .75], [box.x + box.width * .5, box.y + box.height * .25]), pathLine([box.x + box.width * .5, box.y + box.height * .25], [box.x + box.width - 20, box.y + box.height * .75])), loops: false },
      { name: 'horizontal U', draw: box => join(pathLine([box.x + 20, box.y + box.height * .5], [box.x + box.width * .35, box.y + box.height * .5]), Array.from({ length: 100 }, (_, i) => { const a = Math.PI * i / 99; return [box.x + box.width * .35 + 55 * Math.cos(a), box.y + box.height * .5 + 55 * Math.sin(a)]; }), pathLine([box.x + box.width * .35 - 55, box.y + box.height * .5], [box.x + box.width - 20, box.y + box.height * .5])), loops: false },
    ];
    for (const test of cases) {
      const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://127.0.0.1:8767/v2/one-stroke-coaster-3d-v93.html');
      const box = await page.locator('#canvas').boundingBox(), points = test.draw(box);
      await page.mouse.move(points[0][0], points[0][1]); await page.mouse.down();
      for (let i = 1; i < points.length; i++) await page.mouse.move(points[i][0], points[i][1]);
      await page.mouse.up();
      await page.locator('#go').click(); await wait(100);
      const status = await page.locator('#status').innerText();
      if (test.loops !== status.includes('縦ループ')) throw new Error(`${test.name}: unexpected loop result: ${status}`);
      if (errors.length) throw new Error(`${test.name}: page errors: ${errors.join('; ')}`);
      console.log(`PASS browser ${test.name}: ${status}`);
      await page.close();
    }
  } catch (error) {
    console.error(error.stack || error); process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
})();
