// In-memory card cache, seeded from data/cards.cache.json (written by `npm run warm`).
// Live results stay in memory only: Vercel's filesystem is read-only.
import warm from '../data/cards.cache.json';
import type { Card } from './cardSchema';

const mem = new Map<string, Card>(Object.entries(warm as Record<string, Card>));

export const cacheGet = (key: string) => mem.get(key);
export const cacheSet = (key: string, card: Card) => {
  mem.set(key, card);
  if (mem.size > 3000) mem.delete(mem.keys().next().value as string); // many visitors, many profiles: stay bounded
};
