const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const { spawn } = require('node:child_process');
const server = spawn('python3', ['-m', 'http.server', '8768', '--bind', '127.0.0.1'], { stdio: 'ignore' });
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
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try {
        const response = await fetch('http://127.0.0.1:8768/v2/one-stroke-coaster-3d-v95.html');
        const ok = response.ok;
        await response.arrayBuffer();
        if (ok) { ready = true; break; }
      } catch {}
      await wait(200);
    }
    if (!ready) throw new Error('Local HTTP server did not start');
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
      await page.goto('http://127.0.0.1:8768/v2/one-stroke-coaster-3d-v95.html?debugLoops=1&debugRailFrame=1');
      await page.evaluate(() => {
        window.__hudText=[];
        const original=CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){
          window.__hudText.push({text,x,y});
          return original.call(this,text,x,y,...rest);
        };
      });
      const box = await page.locator('#canvas').boundingBox(), points = test.draw(box);
      await page.mouse.move(points[0][0], points[0][1]); await page.mouse.down();
      for (let i = 1; i < points.length; i++) await page.mouse.move(points[i][0], points[i][1]);
      await page.mouse.up();
      await page.locator('#go').click(); await wait(100);
      const rail = await page.evaluate(() => {
        const finish = window.__coasterRailFinish(), rows = [];
        for (let s = 0; s <= finish; s += .35) rows.push(window.__coasterRailFrameAt(s));
        return rows;
      });
      for (let i = 0; i < rail.length; i++) {
        const g = rail[i];
        if (![g.gauge,g.orthogonality,g.left.x,g.left.y,g.left.z,g.rightRail.x,g.rightRail.y,g.rightRail.z].every(Number.isFinite)) throw new Error(`${test.name}: non-finite rail frame at ${i}`);
        if (Math.abs(g.gauge - 1.89) > .015) throw new Error(`${test.name}: rail gauge drift ${g.gauge}`);
        if (Math.abs(g.orthogonality) > .03) throw new Error(`${test.name}: rail frame is not perpendicular to centerline ${g.orthogonality}`);
        if (i && g.right.x*rail[i-1].right.x + g.right.y*rail[i-1].right.y + g.right.z*rail[i-1].right.z < .90) throw new Error(`${test.name}: abrupt rail-frame twist at ${i}`);
      }
      const generationStatus=await page.locator('#status').innerText();
      await page.waitForTimeout(3300);
      const hud=await page.evaluate(()=>window.__hudText);
      if(hud.some(x=>/mph/.test(x.text))) throw new Error('mph remains');
      if(!hud.some(x=>/km\/h/.test(x.text))) throw new Error('missing km/h');
      if(!hud.some(x=>/^\\d+%$/.test(x.text)&&x.x>200&&x.x<600&&x.y<65)) throw new Error('missing centered progress');
      const status = await page.locator('#status').innerText();
      if (test.loops !== generationStatus.includes('縦ループ')) {
        const diagnostic = await page.evaluate(() => window.__coasterLoopDetectionDebug);
        throw new Error(`${test.name}: unexpected loop result: ${status}; detection=${JSON.stringify(diagnostic)}`);
      }
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
