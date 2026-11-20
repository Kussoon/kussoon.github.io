const { chromium, webkit } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const port = 8765;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
const baseline = { hills: 67.8, zigzag: 74.1, loop: 39.4, doubleLoop: 60.1, steep: 117.2 };
const expectedLoops = { tangentLoop: 1, reverseLoop: 1, ovalLoop: 1, compactLoop: 1, jitteredLoop: 1, hills: 0, zigzag: 0, loop: 1, doubleLoop: 2, steep: 0 };
const expectedNames = Object.keys(expectedLoops);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  let failed = false;
  try {
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try { if ((await fetch(`http://127.0.0.1:${port}/v2/tests/coaster-geometry-regression-v92.html`)).ok) { ready = true; break; } } catch {}
      await sleep(250);
    }
    if (!ready) throw new Error('Local test server did not start');
    for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
      const browser = await engine.launch({ headless: true, ...(name === 'Chromium' && process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}), ...(process.env.PLAYWRIGHT_NO_SANDBOX === '1' ? { args: ['--no-sandbox'] } : {}) });
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      const response = await page.goto(`http://127.0.0.1:${port}/v2/tests/coaster-geometry-regression-v92.html`, { waitUntil: 'networkidle' });
      if (!response || !response.ok()) throw new Error(`${name}: page returned ${response && response.status()}`);
      await page.waitForFunction(() => document.querySelector('#results')?.textContent.trim().startsWith('['));
      const rows = await page.evaluate(() => JSON.parse(document.querySelector('#results').textContent));
      if (rows.length !== 10) throw new Error(`${name}: expected 10 cases, got ${rows.length}`);
      rows.forEach((row, i) => {
        if (row.name !== expectedNames[i]) throw new Error(`${name}: case ${i} is ${row.name}`);
        if (row.detectedLoops !== expectedLoops[row.name]) throw new Error(`${name}/${row.name}: loop count ${row.detectedLoops}`);
        if (baseline[row.name] !== undefined && !(row.maxTurnDeg < baseline[row.name])) throw new Error(`${name}/${row.name}: peak direction change ${row.maxTurnDeg}° did not improve on v89 ${baseline[row.name]}°`);
        if (row.maxOpenError > 1.2) throw new Error(`${name}/${row.name}: open-section height error ${row.maxOpenError}m exceeds 1.2m`);
        if (row.maxError > 3.5) throw new Error(`${name}/${row.name}: full-profile height adjustment ${row.maxError}m exceeds 3.5m`);
        if (row.maxLoopRadialError > 0.01) throw new Error(`${name}/${row.name}: loop radial error ${row.maxLoopRadialError}m`);
        if (row.maxLoopSweepRatio > 1.08) throw new Error(`${name}/${row.name}: loop sweeps ${row.maxLoopSweepRatio} revolutions`);
        if (row.reversals !== 0) throw new Error(`${name}/${row.name}: found ${row.reversals} monotonic height reversals`);
      });
      const plotCount = await page.locator('#plots svg').count();
      if (plotCount !== 38) throw new Error(`${name}: expected 38 projection plots, got ${plotCount}`);
      if (pageErrors.length) throw new Error(`${name}: page errors: ${pageErrors.join('; ')}`);
      if (name === 'Chromium') {
        const image = path.join(root, 'v2/verification/coaster-v92/geometry-regression.png');
        fs.mkdirSync(path.dirname(image), { recursive: true });
        await page.screenshot({ path: image, fullPage: true });
      }
      console.log(`${name}: PASS`);
      for (const row of rows) console.log(`  ${row.name}: peak ${row.maxTurnDeg}°, >15° ${row.over15deg}, isolated ${row.isolatedSpikes}, height error ${row.maxError}m (open ${row.maxOpenError}m), loop radial error ${row.maxLoopRadialError}m, loop sweep ${row.maxLoopSweepRatio}, loops ${row.detectedLoops}`);
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
