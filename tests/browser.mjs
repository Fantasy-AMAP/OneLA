import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {channel:'chrome'})});
const context = await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
const page = await context.newPage();
const errors=[], failed=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
const checks=[];
const qaDir = process.env.QA_OUTPUT_DIR || '.cache/qa';
await mkdir(qaDir, {recursive:true});
try {
await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173/',{waitUntil:'networkidle'});
const urls=await page.locator('[src], [poster], link[href], a[href]').evaluateAll(nodes=>[...new Set(nodes.flatMap(n=>['src','poster','href'].map(k=>n.getAttribute(k))).filter(x=>x && !x.startsWith('#') && !x.startsWith('http')))]);
for(const url of urls){const r=await context.request.head(new URL(url,page.url()).href);assert.equal(r.status(),200,url);}
checks.push(`All ${urls.length} local resources return HTTP 200`);
const range=await context.request.get(new URL('assets/game.mp4',page.url()).href,{headers:{Range:'bytes=0-99'}});assert.equal(range.status(),206);assert.equal((await range.body()).length,100);checks.push('Video byte-range seeking supported');
await page.locator('[data-step="1"]').click();assert.match(await page.locator('#center-title').innerText(),/MLP/);assert.equal(await page.locator('.command-input').isVisible(),true);
await page.locator('[data-step="1"]').press('ArrowRight');assert.match(await page.locator('#center-title').innerText(),/world model/);assert.equal(await page.locator('.process-dit').isVisible(),true);
await page.locator('[data-step="2"]').press('Home');checks.push('Method tabs and keyboard navigation work');
for(const key of ['navigation','driving','robotics','game']) {await page.locator(`[data-world="${key}"]`).click();await page.waitForFunction(()=>document.querySelector('#world-video').readyState>=2);assert.match(await page.locator('#world-video').getAttribute('src'),new RegExp(key));}
await page.locator('#world-video').evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('#world-video').currentTime>.1);await page.locator('#world-video').evaluate(v=>v.pause());checks.push('All four domain videos decode and selected video plays');
const cards = page.locator('[data-transfer]');
assert.equal(await cards.count(), 6);
for (let i = 0; i < 6; i++) {
  const card = cards.nth(i), id = await card.getAttribute('data-transfer');
  await card.locator('.pair-play').click();
  await page.waitForFunction(id => [...document.querySelector(`[data-transfer="${id}"]`).querySelectorAll('video')].every(v => !v.paused && v.currentTime > .15), id);
  assert.equal(await card.locator('video').evaluateAll(v => Math.abs(v[0].currentTime-v[1].currentTime)<.2),true);
  await card.locator('.pair-play').click();
  assert.equal(await card.locator('video').evaluateAll(v => v.every(x=>x.paused)),true);
  await card.locator('.pair-seek').evaluate(input => { input.value = '1'; input.dispatchEvent(new Event('input',{bubbles:true})); });
  await page.waitForFunction(id => [...document.querySelector(`[data-transfer="${id}"]`).querySelectorAll('video')].every(v => Math.abs(v.currentTime-1)<.08), id);
  await card.locator('.pair-play').click();
  await page.waitForFunction(id => [...document.querySelector(`[data-transfer="${id}"]`).querySelectorAll('video')].every(v => v.currentTime>1.1 && !v.paused), id);
  await card.locator('.pair-play').click();
}
checks.push('Six unique transfer pairs decode, play, pause, seek together, and resume');
await cards.nth(0).locator('.pair-play').click();
await cards.nth(1).locator('.pair-play').click();
assert.equal(await cards.nth(0).locator('video').evaluateAll(v=>v.every(x=>x.paused)),true);
await cards.nth(1).locator('.pair-play').click();
checks.push('Starting a new pair pauses the previous pair');
const last = cards.nth(5);
await last.locator('.pair-seek').evaluate(input=>{input.value=String(Number(input.max)-.2);input.dispatchEvent(new Event('input',{bubbles:true}));});
await last.locator('.pair-play').click();
await page.waitForFunction(()=>document.querySelector('[data-transfer="case-06"] .pair-play').textContent.includes('Replay'));
await last.locator('.pair-play').click();
await page.waitForFunction(()=>{const v=document.querySelector('[data-transfer="case-06"] video');return !v.paused && v.currentTime<1;});
await last.locator('.pair-play').click();checks.push('Ended pairs replay from the beginning');
await page.locator('#copy-citation').click();assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/zhu2026onela/);checks.push('BibTeX clipboard copy works');
await page.locator('details summary').click();assert.equal(await page.locator('details').getAttribute('open'),'');checks.push('Abstract disclosure works');
await page.locator('#film video').evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('#film video').currentTime>.1);assert.equal(await page.locator('#film video').evaluate(v=>v.textTracks.length),1);await page.locator('#film video').evaluate(v=>v.pause());checks.push('Overview film decodes and English caption track loads');
await page.locator('details summary').click();
for(const width of [1440,768,390,320]) {await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Overflow at ${width}`);}
checks.push('No horizontal page overflow at 1440, 768, 390, and 320 px');
await page.emulateMedia({reducedMotion:'reduce'});await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('video[data-auto]').evaluateAll(v=>v.every(x=>x.paused)),true);checks.push('Reduced-motion preference disables preview autoplay');
await page.addStyleTag({content:'html{scroll-behavior:auto!important}'});await page.evaluate(()=>window.scrollTo(0,0));
await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${qaDir}/mobile-top.png`});await page.screenshot({path:`${qaDir}/mobile-full.png`,fullPage:true});
await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${qaDir}/desktop-top.png`});await page.screenshot({path:`${qaDir}/desktop-full.png`,fullPage:true});
await page.locator('#action-transfer').screenshot({path:`${qaDir}/transfers-desktop.png`});
await page.setViewportSize({width:390,height:844});await page.locator('#action-transfer').screenshot({path:`${qaDir}/transfers-mobile.png`});await page.setViewportSize({width:1440,height:1000});
await page.locator('#idea').screenshot({path:`${qaDir}/idea.png`});
await page.locator('#method').screenshot({path:`${qaDir}/method.png`});
assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);checks.push('No browser JavaScript errors or failed HTTP requests');
await writeFile(`${qaDir}/report.json`,JSON.stringify({status:'passed',checks,errors,failed},null,2));console.log(JSON.stringify({status:'passed',checks},null,2));
} finally {await browser.close();}
