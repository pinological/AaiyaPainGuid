'use client';

import { useStore } from '@/lib/store';
import type { UserProfile } from '@/lib/types';
import { formatHeight } from '@/lib/units';
import { useT } from '@/lib/useT';
import { Icon } from './Icons';

// Shows the profile used to tailor advice; tapping it reopens the dialog. Falls back to the sample profile.
export function ProfileChip({ fallback }: { fallback: UserProfile }) {
  const { t } = useT();
  const profile = useStore((s) => s.profile);
  const set = useStore((s) => s.set);
  const p = profile ?? fallback;
  const gender = p.gender === 'female' ? t('genderFemale') : p.gender === 'male' ? t('genderMale') : '';
  const parts = [`${p.age} ${t('unitYears')}`, `${Math.round(p.weight_kg)} kg`, formatHeight(p.height_cm), gender].filter(Boolean);
  return (
    <button type="button" className="profile" onClick={() => set({ profileOpen: true })} aria-label={t('chipAria', { details: parts.join(', ') })}>
      <span>{parts.join(' · ')}</span>
      {!profile && <em>{t('sample')}</em>}
      <Icon name="edit" size={16} />
    </button>
  );
}
