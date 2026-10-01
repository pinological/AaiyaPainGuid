import './_env';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cardKey } from '../lib/cardKey';
import type { Card } from '../lib/cardSchema';
import { generateCard } from '../lib/explain';
import type { Part } from '../lib/partName';
import type { UserProfile } from '../lib/types';

// Explains every part once per base (left/right share a card) for data/user.json.
// Resumable: keys already in cards.cache.json are skipped. Run it the night before.
const CONCURRENCY = 4;
const read = <T>(p: string) => JSON.parse(readFileSync(resolve(process.cwd(), p), 'utf8')) as T;
const OUT = resolve(process.cwd(), 'data/cards.cache.json');

const user = read<UserProfile>('data/user.json');
const { parts } = read<{ parts: Part[] }>('data/parts.generated.json');
const cache = read<Record<string, Card>>('data/cards.cache.json');

const byBase = new Map<string, Part>();
for (const p of parts) if (!byBase.has(p.base)) byBase.set(p.base, p);

const todo = [...byBase.values()].filter((p) => !cache[cardKey(p.base, user)]);
console.log(`${byBase.size} bases, ${byBase.size - todo.length} cached, ${todo.length} to generate`);

const save = () => writeFileSync(OUT, JSON.stringify(cache) + '\n');
process.on('SIGINT', () => {
  save();
  console.log('\nsaved, bye');
  process.exit(0);
});

let done = 0;
const failed: string[] = [];
async function worker() {
  for (let p = todo.shift(); p; p = todo.shift()) {
    try {
      cache[cardKey(p.base, user)] = await generateCard({ display: p.display, side: null }, user, false); // cheapest route, nobody is waiting
    } catch (e) {
      failed.push(p.display);
      console.warn(`fail: ${p.display}: ${(e as Error).message.slice(0, 120)}`);
    }
    if (++done % 10 === 0) {
      save();
      console.log(`${done} done`);
    }
  }
}

Promise.all(Array.from({ length: CONCURRENCY }, worker)).then(() => {
  save();
  console.log(`finished. ${failed.length} failed${failed.length ? ' (re-run to retry)' : ''}`);
});
