import './_env';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chatJson } from '../lib/openrouter';
import type { Part } from '../lib/partName';

// One-off DeepSeek pass: localized names for every anatomical part -> data/partnames.<lang>.json (keyed by `base`).
// The app falls back to the English name for anything missing. Re-run after re-exporting the model.
const LANGS = {
  ne: {
    name: 'Nepali (Devanagari script)',
    guide:
      'Use the standard anatomical term taught in Nepali medical education where one exists. Otherwise use the common Nepali word, or transliterate the English/Latin term into Devanagari. Keep left/right/head/part words natural.',
    script: /[ऀ-ॿ]/,
  },
  ja: {
    name: 'Japanese',
    guide:
      'Use the standard anatomical terms from Japanese anatomy textbooks (for example 大胸筋, 上腕二頭筋, 滑液包). Use katakana only when no standard term exists.',
    script: /[぀-ヿ一-鿿]/,
  },
} as const;
type Lang = keyof typeof LANGS;

const BATCH = 70;
const { parts } = JSON.parse(readFileSync(resolve(process.cwd(), 'data/parts.generated.json'), 'utf8')) as { parts: Part[] };
const byBase = new Map<string, string>(); // base -> display
for (const p of parts) if (!byBase.has(p.base)) byBase.set(p.base, p.display);

async function translateBatch(lang: Lang, displays: string[]): Promise<Record<string, string>> {
  const L = LANGS[lang];
  const text = await chatJson(
    [
      {
        role: 'system',
        content: `Translate English anatomical structure names into ${L.name}. ${L.guide} Return ONLY a JSON object that maps each given English name, exactly as written, to its ${L.name} translation (a short string, no explanations, no English).`,
      },
      { role: 'user', content: JSON.stringify(displays) },
    ],
    { temperature: 0, timeoutMs: 120_000, maxTokens: 6000 },
  );
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as Record<string, string>;
}

async function run(lang: Lang) {
  const out: Record<string, string> = {};
  const todo = [...byBase.entries()];
  for (let pass = 0; pass < 2 && todo.length; pass++) {
    const pending = todo.splice(0, todo.length);
    const batches: [string, string][][] = [];
    for (let i = 0; i < pending.length; i += BATCH) batches.push(pending.slice(i, i + BATCH));
    for (const [i, b] of batches.entries()) {
      try {
        const map = await translateBatch(lang, b.map(([, d]) => d));
        for (const [base, display] of b) {
          const t = map[display]?.trim();
          if (t && LANGS[lang].script.test(t)) out[base] = t;
          else todo.push([base, display]); // retry once
        }
      } catch (e) {
        console.warn(`${lang} batch ${i + 1} failed: ${(e as Error).message.slice(0, 100)}`);
        todo.push(...b);
      }
      console.log(`${lang} pass ${pass + 1} batch ${i + 1}/${batches.length}`);
    }
  }
  writeFileSync(resolve(process.cwd(), `data/partnames.${lang}.json`), JSON.stringify(out, null, 1) + '\n');
  console.log(`${lang}: ${Object.keys(out).length}/${byBase.size} translated`);
}

Promise.all((Object.keys(LANGS) as Lang[]).map(run));
