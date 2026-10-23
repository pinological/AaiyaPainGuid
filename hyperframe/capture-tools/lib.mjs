import puppeteer from 'puppeteer-core';
import { decision, EN, NE, explainBody, noteBody } from './mock.mjs';
export const exe = 'C:/Users/peter/.cache/hyperframes/chrome/chrome-headless-shell/win64-152.0.7977.30/chrome-headless-shell-win64/chrome-headless-shell.exe';
export const out = '../assets/captures/';
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export async function open({ theme = 'dark', lang = 'en', mock = true, w = 430, h = 932, dpr = 2.5, hideDev = true } = {}) {
  const D = lang === 'ne' ? NE : EN;
  const browser = await puppeteer.launch({ executablePath: exe, headless: 'shell', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: dpr, isMobile: w < 800, hasTouch: w < 800 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
  await page.evaluateOnNewDocument((lang) => {
    localStorage.setItem('mirror.profile', JSON.stringify({ age: 28, weight_kg: 68, height_cm: 170, gender: 'male' }));
    localStorage.setItem('mirror.tts', 'off'); localStorage.setItem('mirror.lang', lang);
    const st = document.createElement('style');
    st.textContent = 'nextjs-portal,[data-nextjs-toast],[data-next-badge-root]{display:none!important}';
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(st));
  }, lang);
  await page.setRequestInterception(true);
  const json = (r, body, delay) => sleep(delay).then(() => r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }));
  page.on('request', (r) => {
    const u = r.url();
    if (mock && u.endsWith('/api/locate')) return void json(r, decision, 2200);
    if (mock && u.endsWith('/api/note')) return void json(r, noteBody(D, lang), 1500);
    if (mock && u.endsWith('/api/explain')) return void json(r, explainBody(D, lang), 4200);
    r.continue();
  });
  await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.querySelector('.loading'), { timeout: 120000 });
  await sleep(2500);
  return { browser, page };
}
export const ask = async (page, phrase) => {
  await page.focus('input[type=text], input:not([type])');
  await page.keyboard.type(phrase, { delay: 70 });
  await sleep(300);
};
