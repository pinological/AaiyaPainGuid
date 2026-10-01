'use client';

import { chooseAlternative } from '@/lib/actions';
import type { JevDecision } from '@/lib/types';
import { useT } from '@/lib/useT';

// Visualizes one Jev decision inside a chat bubble: its confidence, the probability it gave each candidate,
// and a one-tap override.
export function JevConfidence({ decision, msgId }: { decision: JevDecision; msgId: number }) {
  const { t, name } = useT();
  const { confidence, lowConfidence, alternatives, chosenRaw, bodyProb } = decision;
  const pct = (p: number) => `${Math.round(p * 100)}%`;
  const rows = alternatives.slice(0, 4);
  const maxP = Math.max(...rows.map((r) => r.p), 0.01); // scale bars to the leader so small gaps stay readable

  return (
    <div className={`jev${lowConfidence ? ' unsure' : ''}`} aria-label={t('jevAria')}>
      <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(confidence * 100)} aria-label={t('jevConfidence')}>
        <div className="meter-label">
          <span>{t('jevConfidence')}</span>
          <strong>
            {pct(confidence)}
            <em> {lowConfidence ? t('jevUnsure') : t('jevSure')}</em>
          </strong>
        </div>
        <div className="track">
          <div className="fill" style={{ width: pct(confidence) }} />
          <i className="tick" title={t('jevTick')} />
        </div>
      </div>

      <ul className="rows">
        {rows.map((r) => {
          const chosen = r.raw === chosenRaw;
          const content = (
            <>
              <span className="name">
                {name(r.raw)}
                {chosen && <small>{t('jevPick')}</small>}
              </span>
              <span className="bar">
                <span style={{ width: `${(r.p / maxP) * 100}%` }} />
              </span>
              <span className="val">{pct(r.p)}</span>
            </>
          );
          return (
            <li key={r.raw} className={chosen ? 'chosen' : ''}>
              {chosen ? (
                <div className="row">{content}</div>
              ) : (
                <button type="button" className="row" onClick={() => chooseAlternative(msgId, r.raw)} title={t('jevUse')}>
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="foot">{t('jevFoot', { pct: pct(bodyProb) })}</p>
    </div>
  );
}
