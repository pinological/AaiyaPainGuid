// Cache + in-flight de-duplication around generateCard, plus the final shape sent to the client.
import { cacheGet, cacheSet } from './cache';
import { cardKey } from './cardKey';
import type { Card, FinalCard } from './cardSchema';
import { generateCard, generateNote } from './explain';
import { RED_FLAGS, type Lang } from './i18n';
import { findRelated } from './parts';
import { parsePart, type Part } from './partName';
import type { Side, UserProfile } from './types';
import { demoUser } from './user';

const inflight = new Map<string, Promise<Card>>();

async function baseCard(part: Part, user: UserProfile, lang: Lang): Promise<{ card: Card; cached: boolean }> {
  // per profile and per language: a different age/weight/height/gender or language is a different card
  const key = cardKey(part.base, user, lang);
  const hit = cacheGet(key);
  if (hit) return { card: hit, cached: true };

  let p = inflight.get(key);
  if (!p) {
    p = generateCard({ display: part.display, side: null, lang }, user, true)
      .then((c) => {
        cacheSet(key, c);
        return c;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return { card: await p, cached: false };
}

/**
 * The full card is always the shared, cached one (left/right share it). Searches add a short
 * note tied to what the user said: ~60 output tokens instead of regenerating a ~650-token card.
 */
export async function getCard(part: Part, transcript: string | null, user: UserProfile = demoUser, lang: Lang = 'en') {
  const note = transcript
    ? generateNote({ display: part.display, side: part.side, transcript, lang }, user).catch(() => undefined)
    : Promise.resolve(undefined);
  const [base, n] = await Promise.all([baseCard(part, user, lang), note]); // in parallel: the note never waits for the card
  return { ...base, note: n };
}

export function finalizeCard(card: Card, side: Side, selfBase: string, lang: Lang = 'en'): FinalCard {
  const related = findRelated(card.related, side, selfBase).map((raw) => ({ raw, display: parsePart(raw).display }));
  const seen = new Set<string>();
  const red_flags = [...card.red_flags, ...RED_FLAGS[lang]]
    .filter((f) => {
      const k = f.toLowerCase();
      return seen.has(k) ? false : (seen.add(k), true);
    })
    .slice(0, 7);
  return { ...card, related, red_flags };
}
