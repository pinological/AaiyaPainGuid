// Server-side view of data/parts.generated.json (a build artifact of `npm run index`).
import generated from '../data/parts.generated.json';
import { DEPRIORITIZE_PATTERNS } from './config';
import type { Part } from './partName';
import type { Side } from './types';

const all = (generated as unknown as { parts: Part[] }).parts;

export interface PartGroup {
  base: string;
  display: string;
  left?: string;
  right?: string;
  center?: string;
}

const byRaw = new Map<string, Part>(all.map((p) => [p.raw, p]));
const groups = new Map<string, PartGroup>();
for (const p of all) {
  let g = groups.get(p.base);
  if (!g) groups.set(p.base, (g = { base: p.base, display: p.display }));
  g[p.side] = p.raw;
}

export const partCount = all.length;
export const getAllParts = () => all;
export const getPartByRaw = (raw: string) => byRaw.get(raw);
export const getGroups = () => [...groups.values()];

/** Raw name for a base on the wanted side, falling back to whatever exists. */
export function resolveRaw(base: string, side: 'left' | 'right'): string | undefined {
  const g = groups.get(base);
  return g && (g[side] ?? g.center ?? g.left ?? g.right);
}

export interface VoiceOption {
  key: string; // short stable key p0, p1... sent to Jev
  base: string;
  display: string;
}

// Left/right deduped by base, deprioritized structures dropped, sorted so keys stay stable between runs.
const voiceOptions: VoiceOption[] = getGroups()
  .filter((g) => !DEPRIORITIZE_PATTERNS.some((re) => re.test(g.display)))
  .sort((a, b) => a.base.localeCompare(b.base))
  .map((g, i) => ({ key: `p${i}`, base: g.base, display: g.display }));
const optionByKey = new Map(voiceOptions.map((o) => [o.key, o]));

export const getVoiceOptions = () => voiceOptions;
export const getVoiceOption = (key: string) => optionByKey.get(key);

// --- resolving the model's "related" names against the index ---
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\bmuscles?\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const normToBase = new Map(getGroups().map((g) => [norm(g.base), g.base]));

function matchBase(name: string): string | undefined {
  const n = norm(name);
  if (!n) return undefined;
  const exact = normToBase.get(n);
  if (exact) return exact;
  if (n.length < 5) return undefined;
  let best: string | undefined;
  for (const [k, base] of normToBase) {
    if (k.includes(n) && (!best || base.length < best.length)) best = base;
  }
  return best;
}

/** Plain names from the model -> raw names that really exist. Unmatched names are dropped. */
export function findRelated(names: string[], side: Side, selfBase: string): string[] {
  const want = side === 'right' ? 'right' : 'left';
  const out: string[] = [];
  for (const name of names) {
    const base = matchBase(name);
    if (!base || base === selfBase) continue;
    const raw = resolveRaw(base, side === 'center' ? want : side);
    if (raw && !out.includes(raw)) out.push(raw);
  }
  return out;
}
