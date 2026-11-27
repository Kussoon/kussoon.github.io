const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const origin = 'https://test.invalid/';
const mock = `
const initializeApp=()=>({}), getAuth=()=>({}), getFirestore=()=>({}), onAuthStateChanged=()=>{};
const GoogleAuthProvider=class{}, doc=(...a)=>a.slice(1).join('/'), collection=()=>'';
const getDoc=async()=>({exists:()=>false}), getDocs=async()=>({docs:[]}), getDocsFromServer=getDocs;
const serverTimestamp=()=>({seconds:1}), updateDoc=async()=>{}, setDoc=async()=>{}, writeBatch=()=>{};
const increment=x=>x, runTransaction=async()=>{}, signOut=async()=>{}, signInWithPopup=async()=>{};
`;
const start = `
approvedUid='synthetic'; authGeneration=1; refresh=()=>{}; resumeQuiz=async()=>{};
$('userPanel').hidden=false; $('approvedPanel').hidden=false; $('bank').hidden=false; $('bank').open=true;
$('questionArea').hidden=true; restoreDraft();
`;
const testHtml = html.replace(/<script type="module">([\s\S]*?)<\/script>/, (_, script) =>
  '<script>' + mock + script.replace(/^import .*$/mg, '') + start + '</script>');

async function checkEditor(browser, width, height) {
  const mobile = width < 600;
  const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  await page.route('**/*', route => route.request().url() === origin
    ? route.fulfill({ contentType: 'text/html', body: testHtml })
    : route.abort());
  await page.goto(origin);

  const input = page.locator('#importText');
  const cards = page.locator('#draftRows > div');
  const policy = page.locator('#duplicatePolicy');
  await input.fill('甲\tHello\t説明\t分類\n乙\tHello');
  await page.locator('#previewImport').click();
  assert.equal(await input.isVisible(), false);
  assert.equal(await cards.count(), 2);
  assert.equal(await cards.last().locator('[data-duplicate]').innerText(), '重複候補');
  await cards.first().getByLabel('日本語').fill('修正済み');
  await policy.selectOption('keep');
  await page.locator('#reopenPaste').click();
  assert.equal(await input.isVisible(), true);
  await page.reload();
  assert.equal(await input.isVisible(), false);
  assert.equal(await cards.first().getByLabel('日本語').inputValue(), '修正済み');
  assert.equal(await policy.inputValue(), 'keep');

  await page.locator('.lang[data-lang=fr]').click();
  assert.equal(await cards.count(), 0);
  await input.fill('こんにちは\tBonjour');
  await page.locator('#previewImport').click();
  assert.equal(await policy.inputValue(), 'skip');
  await page.locator('.lang[data-lang=en]').click();
  assert.equal(await cards.count(), 2);
  assert.equal(await policy.inputValue(), 'keep');
  await page.locator('#deleteDuplicates').click();
  assert.equal(await cards.count(), 1);
  await cards.getByRole('button', { name: '削除', exact: true }).click();
  assert.equal(await cards.count(), 0);
  assert.equal(await input.isVisible(), true);
  assert.equal(await input.inputValue(), '');
  await page.reload();
  assert.equal(await page.locator('#importEditor').isVisible(), false);

  await input.fill(Array.from({ length: 125 }, (_, i) => '日' + i + '\tExample ' + i).join('\n'));
  await page.locator('#previewImport').click();
  assert.equal(await cards.count(), 125);
  assert.equal(await policy.inputValue(), 'skip');
  await cards.nth(1).getByRole('checkbox').check();
  await cards.nth(2).getByRole('checkbox').check();
  await page.locator('#deleteSelected').click();
  assert.equal(await cards.count(), 123);
  assert.equal(await cards.nth(1).getByLabel('日本語').inputValue(), '日3');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('PASS Chromium ' + width + 'x' + height + ': edit, deletion, duplicate policy, EN/FR draft restore, 125 cards');
  await context.close();
}

(async () => {
  const binary = (await import(process.env.REVIEW_CHROMIUM || '@sparticuz/chromium')).default;
  const browser = await chromium.launch({
    executablePath: await binary.executablePath(),
    args: binary.args.filter(arg => arg !== '--single-process'),
    headless: true
  });
  try {
    for (const [width, height] of [[375, 900], [428, 926], [430, 900], [1280, 900]]) {
      await checkEditor(browser, width, height);
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
