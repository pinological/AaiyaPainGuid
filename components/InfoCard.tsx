'use client';

import { selectPart } from '@/lib/actions';
import type { Key } from '@/lib/i18n';
import { speakSequence, stopSpeaking } from '@/lib/speak';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/useT';
import { Icon } from './Icons';

const STRUCTURE: Record<string, Key> = {
  muscle: 'stMuscle',
  'muscle part': 'stMusclePart',
  bursa: 'stBursa',
  fascia: 'stFascia',
  other: 'stOther',
};

function Skeleton({ label, slow }: { label: string; slow?: boolean }) {
  const { t } = useT();
  return (
    <div className="skeleton" aria-busy="true">
      <p className="status-line">{label}</p>
      <div className="bar w60" />
      <div className="bar" />
      <div className="bar w80" />
      <div className="bar w40" />
      <div className="bar" />
      {slow && <p className="muted">{t('slow')}</p>}
    </div>
  );
}

export function InfoCard() {
  const { status, card, note, message, slow, jev, selectedRaw, speaking } = useStore();
  const { t, name, side } = useT();

  // the YouTube search follows the UI language ("エクササイズ", "व्यायाम"...)
  const youtube = (n: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${n} ${t('exerciseWord')}`)}`;

  if (status === 'locating') return <Skeleton label={t('findingLine')} />;
  if (status === 'explaining' && !card) {
    return <Skeleton label={selectedRaw ? t('explainingName', { name: name(selectedRaw) }) : t('explaining')} slow={slow} />;
  }
  if (status === 'error') return <p className="notice error" role="alert">{message}</p>;
  if (!card) {
    return (
      <div className="placeholder">
        <h2>{t('phTitle')}</h2>
        <p>{message ?? t('phBody')}</p>
        <ol className="steps">
          <li>
            <span className="step-icon"><Icon name="pointer" size={18} /></span>
            {t('phStep1')}
          </li>
          <li>
            <span className="step-icon"><Icon name="edit" size={18} /></span>
            {t('phStep2')}
          </li>
          <li>
            <span className="step-icon"><Icon name="mic" size={18} /></span>
            {t('phStep3')}
          </li>
        </ol>
      </div>
    );
  }

  const { part, card: c } = card;
  const sideLabel = side(part.side);
  return (
    <article className="card">
      <header>
        <p className="eyebrow">
          {t(STRUCTURE[c.structure_type] ?? 'stOther')}
          {sideLabel && ` · ${t('sideWord', { side: sideLabel })}`}
          {jev != null && <span className="badge">Jev {Math.round(jev * 100)}%</span>}
        </p>
        <h2>{c.title}</h2>
        <p className="model-name">{part.display}</p>
      </header>
      {message && <p className="notice">{message}</p>}
      {note ?? card.note ? (
        <p className="note">
          <strong>{t('aboutDescribed')}</strong> {note?.note ?? card.note}{' '}
          <button type="button" className="text-btn" onClick={() => speakSequence(note ? [note.speech, card.speech.relief] : [card.speech.note])}>
            <Icon name="speaker" size={16} />
            {t('hear')}
          </button>
        </p>
      ) : (
        status === 'explaining' && <p className="note working">{t('tailoring')}</p>
      )}
      <p className="summary">{c.summary}</p>
      <button type="button" className="text-btn" onClick={() => (speaking ? stopSpeaking() : speakSequence([card.speech.card]))}>
        <Icon name={speaking ? 'stop' : 'speaker'} size={16} />
        {speaking ? t('stop') : t('readAloud')}
      </button>

      <section>
        <h3>{t('secWhat')}</h3>
        <ul>{c.what_it_does.map((x) => <li key={x}>{x}</li>)}</ul>
      </section>
      <section>
        <h3>{t('secWhy')}</h3>
        <ul>{c.why_it_might_hurt.map((x) => <li key={x}>{x}</li>)}</ul>
      </section>
      <section>
        <h3>{t('secExercises')}</h3>
        {c.exercises.map((x) => (
          <div className="exercise" key={x.name}>
            <h4>
              {x.name}{' '}
              <a href={youtube(x.name)} target="_blank" rel="noreferrer">
                {t('watch')}
              </a>
            </h4>
            <p>{x.how}</p>
            {x.dose && <p className="dose">{x.dose}</p>}
            {x.caution && <p className="muted">{t('careful', { text: x.caution })}</p>}
          </div>
        ))}
      </section>
      <section className="flags">
        <h3>{t('secFlags')}</h3>
        <ul>{c.red_flags.map((x) => <li key={x}>{x}</li>)}</ul>
      </section>
      {c.related.length > 0 && (
        <section>
          <h3>{t('secNearby')}</h3>
          <div className="chips">
            {c.related.map((r) => (
              <button type="button" key={r.raw} onClick={() => void selectPart(r.raw)}>
                {name(r.raw)}
              </button>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
