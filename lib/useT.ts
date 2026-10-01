'use client';

import { useCallback } from 'react';
import { translate, type Key, type Lang } from './i18n';
import { localName } from './partNames';
import { useStore } from './store';

export type T = (key: Key, vars?: Record<string, string | number>) => string;

/** Translator bound to the current language; components re-render when the language changes. */
export function useT(): { t: T; lang: Lang; name: (raw: string) => string; side: (s: 'left' | 'right' | 'center') => string } {
  const lang = useStore((s) => s.lang);
  const t = useCallback<T>((key, vars) => translate(lang, key, vars), [lang]);
  const name = useCallback((raw: string) => localName(raw, lang), [lang]);
  const side = useCallback((s: 'left' | 'right' | 'center') => (s === 'center' ? '' : translate(lang, s === 'left' ? 'sideLeft' : 'sideRight')), [lang]);
  return { t, lang, name, side };
}

/** Same, for code outside React (actions). */
export const tNow: T = (key, vars) => translate(useStore.getState().lang, key, vars);
export const nameNow = (raw: string) => localName(raw, useStore.getState().lang);
export const sideNow = (s: 'left' | 'right' | 'center') => (s === 'center' ? '' : tNow(s === 'left' ? 'sideLeft' : 'sideRight'));
