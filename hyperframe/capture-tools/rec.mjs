// Real-time screen recording of the live site (hardware GPU), with the API answers mocked in the app's own schema.
// usage: node rec.mjs <en|ne> <outName>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { decision, EN, NE, explainBody, noteBody } from './mock.mjs';
const exe = 'C:/Users/peter/.cache/hyperframes/chrome/chrome-headless-shell/win64-152.0.7977.30/chrome-headless-shell-win64/chrome-headless-shell.exe';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const [lang = 'en', name = 'rec-en'] = process.argv.slice(2);
const D = lang === 'ne' ? NE : EN;
const phrase = lang === 'ne' ? 'मेरो दाहिने हातको औंठा दुखिरहेको छ' : 'my right thumb is hurting';
const audioDir = '../assets/audio/el/';
const log = [];
const browser = await puppeteer.launch({ executablePath: exe, headless: 'shell', args: ['--ignore-gpu-blocklist', '--enable-webgl', '--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
const speakOn = lang === 'ne';
await page.evaluateOnNewDocument((speakOn) => {
  localStorage.setItem('mirror.profile', JSON.stringify({ age: 28, weight_kg: 68, height_cm: 170, gender: 'male' }));
  localStorage.setItem('mirror.tts', speakOn ? 'on' : 'off');
  localStorage.setItem('mirror.lang', 'en');
  const st = document.createElement('style');
  st.textContent = 'nextjs-portal,[data-nextjs-toast],[data-next-badge-root]{display:none!important}';
  document.addEventListener('DOMContentLoaded', () => document.head.appendChild(st));
  window.__ev = [];
  document.addEventListener('DOMContentLoaded', () => {
    // log when audio starts / ends (relative to page time)
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { this.addEventListener('playing', () => window.__ev.push(['playing', performance.now()]), { once: true }); this.addEventListener('ended', () => window.__ev.push(['ended', performance.now()]), { once: true }); return orig.apply(this, arguments); };
  });
}, speakOn);
const T = lang === 'ne' ? { locate: 2600, note: 1200, explain: 4200 } : { locate: 4500, note: 1500, explain: 4200 };
const sig = 'mocksignature0123456789';
await page.setRequestInterception(true);
const json = (r, body, delay) => sleep(delay).then(() => r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }));
page.on('request', (r) => {
  const u = r.url();
  if (u.endsWith('/api/locate')) return void json(r, decision, T.locate);
  if (u.endsWith('/api/note')) { const b = noteBody(D, lang); b.speech.sig = sig; return void json(r, b, T.note); }
  if (u.endsWith('/api/explain')) return void json(r, explainBody(D, lang), T.explain);
  if (u.includes('/api/tts')) { const f = `${audioDir}app-${lang}-note.mp3`; return void r.respond({ status: 200, contentType: 'audio/mpeg', body: fs.readFileSync(f) }); }
  r.continue();
});
await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !document.querySelector('.loading'), { timeout: 120000 });
await sleep(2500);
const rec = await page.screencast({ path: `../assets/video/${name}.webm` });
const pt0 = await page.evaluate(() => performance.now());
const t0 = Date.now(); const at = async (ms) => { await sleep(Math.max(0, ms - (Date.now() - t0))); };
const stamp = (n) => log.push([n, (Date.now() - t0) / 1000]);
if (lang === 'en') {
  // idle 2.3s, type 2.3-4.0, enter 4.3 (flight lands ~ +4.5s), orbit-drag the 3D model near the end
  await at(1900); await page.focus('input[type=text], input:not([type])'); await page.keyboard.type(phrase, { delay: 22 }); stamp('typed');
  await at(4400); await page.keyboard.press('Enter'); stamp('enter');
  await at(13800);
  const box = { x: 700, y: 450 };
  await page.mouse.move(box.x, box.y); await page.mouse.down();
  for (let i = 0; i <= 30; i++) { await page.mouse.move(box.x + i * 7, box.y + Math.sin(i / 6) * 10); await sleep(33); }
  await page.mouse.up(); stamp('orbit');
  await at(17600);
} else {
  // switch the UI to Nepali (select), then type in Nepali; voice reply starts when the note lands
  await at(800); await page.select('.lang-select select', 'ne'); stamp('lang');
  await at(3000); await page.focus('input[type=text], input:not([type])'); await page.keyboard.type(phrase, { delay: 22 }); stamp('typed');
  await at(5000); await page.keyboard.press('Enter'); stamp('enter');
  await at(18600);
}
await rec.stop();
const ev = await page.evaluate(() => window.__ev);
console.log(JSON.stringify({ log, ev }));
fs.writeFileSync(`${name}.json`, JSON.stringify({ log, ev, pt0 }));
await browser.close();
