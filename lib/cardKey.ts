import { createHash } from 'node:crypto';
import type { Lang } from './i18n';
import type { UserProfile } from './types';

export function profileHash(u: UserProfile): string {
  const s = JSON.stringify([u.age, u.weight_kg, u.height_cm, u.gender]);
  return createHash('sha1').update(s).digest('hex').slice(0, 8);
}

/** Left/right share one card, so the key is the side-less base. English keys stay as they were (warm cache). */
export const cardKey = (base: string, u: UserProfile, lang: Lang = 'en') =>
  `${base}:${profileHash(u)}${lang === 'en' ? '' : `:${lang}`}`;
