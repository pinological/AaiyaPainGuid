'use client';

import { useStore } from '@/lib/store';
import { useT } from '@/lib/useT';

// Shows which model is working: Jev picks the part (fast), DeepSeek writes the card.
export function AiStatus() {
  const status = useStore((s) => s.status);
  const hasCard = useStore((s) => !!s.card);
  const jev = useStore((s) => s.jev);
  const { t } = useT();
  if (status !== 'locating' && status !== 'explaining') return null;

  const locating = status === 'locating';
  return (
    <div className="ai-status" role="status">
      {jev != null && !locating && (
        <span className="step done">
          <i /> {t('jevFound', { pct: Math.round(jev * 100) })}
        </span>
      )}
      <span className="step live">
        <i /> {locating ? t('jevFinding') : hasCard ? t('dsNote') : t('dsCard')}
      </span>
    </div>
  );
}
