const { chromium, webkit } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const port = 8765;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
const baseline = [67.8, 74.1, 39.4, 60.1, 117.2];
const expectedLoops = [0, 0, 1, 2, 0];
const expectedNames = ['hills', 'zigzag', 'loop', 'doubleLoop', 'steep'];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  let failed = false;
  try {
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try { if ((await fetch(`http://127.0.0.1:${port}/v2/tests/coaster-geometry-regression-v90.html`)).ok) { ready = true; break; } } catch {}
      await sleep(250);
    }
    if (!ready) throw new Error('Local test server did not start');
    for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
      const browser = await engine.launch({ headless: true });
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      const response = await page.goto(`http://127.0.0.1:${port}/v2/tests/coaster-geometry-regression-v90.html`, { waitUntil: 'networkidle' });
      if (!response || !response.ok()) throw new Error(`${name}: page returned ${response && response.status()}`);
      await page.waitForFunction(() => document.querySelector('#results')?.textContent.trim().startsWith('['));
      const rows = await page.evaluate(() => JSON.parse(document.querySelector('#results').textContent));
      if (rows.length !== 5) throw new Error(`${name}: expected 5 cases, got ${rows.length}`);
      rows.forEach((row, i) => {
        if (row.name !== expectedNames[i]) throw new Error(`${name}: case ${i} is ${row.name}`);
        if (row.detectedLoops !== expectedLoops[i]) throw new Error(`${name}/${row.name}: loop count ${row.detectedLoops}`);
        if (!(row.maxTurnDeg < baseline[i])) throw new Error(`${name}/${row.name}: peak direction change ${row.maxTurnDeg}° did not improve on ${baseline[i]}°`);
        if (row.maxError > 1.2) throw new Error(`${name}/${row.name}: height error ${row.maxError}m exceeds 1.2m`);
        if (row.reversals !== 0) throw new Error(`${name}/${row.name}: found ${row.reversals} monotonic height reversals`);
      });
      const plotCount = await page.locator('#plots svg').count();
      if (plotCount !== 15) throw new Error(`${name}: expected 15 projection plots, got ${plotCount}`);
      if (pageErrors.length) throw new Error(`${name}: page errors: ${pageErrors.join('; ')}`);
      if (name === 'Chromium') {
        const image = path.join(root, 'v2/verification/coaster-v90/geometry-regression.png');
        fs.mkdirSync(path.dirname(image), { recursive: true });
        await page.screenshot({ path: image, fullPage: true });
      }
      console.log(`${name}: PASS`);
      for (const row of rows) console.log(`  ${row.name}: peak ${row.maxTurnDeg}° (baseline ${baseline[expectedNames.indexOf(row.name)]}°), >15° ${row.over15deg}, isolated ${row.isolatedSpikes}, height error ${row.maxError}m, loops ${row.detectedLoops}`);
      await browser.close();
    }
  } catch (error) {
    failed = true;
    console.error(error.stack || error);
  } finally {
    server.kill('SIGTERM');
  }
  if (failed) process.exitCode = 1;
})();
