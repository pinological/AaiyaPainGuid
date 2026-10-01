import './_env';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEPRIORITIZE_PATTERNS } from '../lib/config';
import { chatJson } from '../lib/openrouter';
import type { Part } from '../lib/partName';

// Fallback for spec 6.3: one DeepSeek labelling pass, written to data/regions.generated.json.
// Enable with USE_REGIONS=1 in .env.local.
const REGIONS = [
  'head', 'neck', 'shoulder', 'upper arm', 'elbow', 'forearm', 'wrist', 'hand', 'chest', 'upper back',
  'lower back', 'abdomen', 'pelvis', 'hip', 'thigh', 'knee', 'lower leg', 'ankle', 'foot', 'other',
];
const BATCH = 120;
const { parts } = JSON.parse(readFileSync(resolve(process.cwd(), 'data/parts.generated.json'), 'utf8')) as { parts: Part[] };
const bases = [...new Set(parts.filter((p) => !DEPRIORITIZE_PATTERNS.some((re) => re.test(p.display))).map((p) => p.base))].sort();

const regions: Record<string, string> = {};
async function label(batch: string[]) {
  const text = await chatJson(
    [
      {
        role: 'system',
        content: `Label each anatomical structure with the single body region where it mainly sits. Allowed regions: ${REGIONS.join(', ')}. Return ONLY a JSON object mapping each given name, exactly as written, to one allowed region.`,
      },
      { role: 'user', content: JSON.stringify(batch) },
    ],
    { temperature: 0, timeoutMs: 120_000, maxTokens: 4000 },
  );
  const obj = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as Record<string, string>;
  for (const name of batch) if (REGIONS.includes(obj[name])) regions[name] = obj[name];
}

const batches: string[][] = [];
for (let i = 0; i < bases.length; i += BATCH) batches.push(bases.slice(i, i + BATCH));
(async () => {
  for (const [i, b] of batches.entries()) {
    try {
      await label(b);
    } catch {
      await label(b); // one retry
    }
    console.log(`batch ${i + 1}/${batches.length}`);
  }
  writeFileSync(resolve(process.cwd(), 'data/regions.generated.json'), JSON.stringify({ regions }, null, 1) + '\n');
  console.log(`labelled ${Object.keys(regions).length}/${bases.length} parts`);
})();
