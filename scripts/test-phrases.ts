import './_env';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { locate } from '../lib/locate';

// Milestone 9: 16 of 20 should land sensibly, otherwise enable the region fallback (USE_REGIONS=1).
// "Sensibly" = the chosen part or any of Jev's top 3 contains one of the expected words.
const phrases = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/phrases.json'), 'utf8')) as {
  phrase: string;
  expect: string[] | null;
}[];

(async () => {
  let pass = 0;
  for (const { phrase, expect } of phrases) {
    const r = await locate(phrase);
    let ok: boolean;
    let detail: string;
    if (r.status === 'not_body') {
      ok = expect === null;
      detail = 'not_body';
    } else {
      // Jev's pick is what the app flies to, so that is what has to land (runner-ups count as a near miss only).
      const pickOk = !!expect && expect.some((w) => r.display.toLowerCase().includes(w));
      ok = pickOk;
      detail = `${r.lowConfidence ? 'unsure' : 'sure'} conf=${r.confidence.toFixed(2)} -> ${r.display} (${r.probability.toFixed(2)}) | ${r.alternatives
        .slice(1, 3)
        .map((c) => c.display)
        .join(' | ')}`;
    }
    if (ok) pass++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  "${phrase}"  ${detail}`);
  }
  console.log(`\n${pass}/${phrases.length} landed sensibly${pass < 16 ? ' (below 16: try USE_REGIONS=1)' : ''}`);
})();
