'use client';

import { useEffect, useRef } from 'react';
import { locateAndSelect } from '@/lib/actions';
import { speakSequence, stopSpeaking } from '@/lib/speak';
import { useStore } from '@/lib/store';
import type { ChatMessage } from '@/lib/types';
import { useT } from '@/lib/useT';
import { Icon } from './Icons';
import { JevConfidence } from './JevConfidence';

function Typing({ label }: { label: string }) {
  return (
    <p className="typing" role="status">
      {label}
      <span className="dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </p>
  );
}

function ResultBubble({ m }: { m: ChatMessage }) {
  const speaking = useStore((s) => s.speaking);
  const set = useStore((s) => s.set);
  const { t, name, side } = useT();
  const r = m.result!;
  // The note shows the moment it arrives (before the card is done); clicks show the card's one-line summary.
  const answer = r.note ?? (r.loading ? undefined : r.summary);
  const voiceParts = r.note && r.speech?.note ? [r.speech.note, r.speech.relief] : [r.speech?.card];
  const hasVoice = voiceParts.some(Boolean);
  const sideLabel = side(r.side);
  return (
    <div className="bubble ai">
      <p className="r-title">
        {name(r.raw)}
        {sideLabel && <span> · {sideLabel}</span>}
      </p>
      {r.decision && <JevConfidence decision={r.decision} msgId={m.id} />}
      {r.notices.map((n) => (
        <p className="mini-notice" key={n}>
          {n}
        </p>
      ))}
      {answer && <p className="answer">{answer}</p>}
      {r.loading && <Typing label={t('dsWriting')} />}
      {!r.loading && r.relief && <p className="relief">{r.relief}</p>}
      {!r.loading && (
        <div className="bubble-actions">
          {hasVoice && (
            <button type="button" className="text-btn" onClick={() => (speaking ? stopSpeaking() : speakSequence(voiceParts))}>
              <Icon name={speaking ? 'stop' : 'speaker'} size={16} />
              {speaking ? t('stop') : t('hear')}
            </button>
          )}
          <button type="button" className="text-btn only-sheet" onClick={() => set({ sheetTab: 'details' })}>
            {t('fullDetails')}
            <Icon name="arrow" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export function ChatPanel() {
  const messages = useStore((s) => s.messages);
  const listening = useStore((s) => s.listening);
  const liveTranscript = useStore((s) => s.liveTranscript);
  const speakingText = useStore((s) => s.speakingText);
  const voiceLoading = useStore((s) => s.voiceLoading);
  const endRef = useRef<HTMLDivElement>(null);
  const { t } = useT();
  const suggestions = [t('sugg1'), t('sugg2'), t('sugg3')];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, listening, liveTranscript, speakingText]);

  return (
    <section className="chat" aria-label={t('tabChat')}>
      <div className="chat-log" role="log" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 && (
          <div className="bubble ai">
            <p className="answer">{t('greeting')}</p>
            <div className="chips">
              {suggestions.map((s) => (
                <button type="button" key={s} onClick={() => void locateAndSelect(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) =>
          m.role === 'user' ? (
            <div className="bubble user" key={m.id}>
              {m.via === 'voice' && <Icon name="mic" size={14} />}
              {m.text}
            </div>
          ) : m.result ? (
            <ResultBubble m={m} key={m.id} />
          ) : (
            <div className={`bubble ai${m.error ? ' error' : ''}`} key={m.id} role={m.error ? 'alert' : undefined}>
              {m.pending ? <Typing label={m.text ?? '…'} /> : <p className="answer">{m.text}</p>}
            </div>
          ),
        )}
        {/* Your voice as text, live, while the mic is open */}
        {listening && (
          <div className="bubble user live">
            <Icon name="mic" size={14} />
            {liveTranscript || t('listening')}
          </div>
        )}
        {/* The spoken reply as text, while it plays */}
        {speakingText && (
          <div className="bubble ai speaking">
            {voiceLoading && <Typing label={t('voicePreparing')} />}
            <p className="caption">
              {!voiceLoading && (
                <span className="wave" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              )}
              {speakingText}
            </p>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </section>
  );
}
