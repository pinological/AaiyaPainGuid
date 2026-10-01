'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { locateAndSelect } from '@/lib/actions';
import { LANGS } from '@/lib/i18n';
import { stopSpeaking } from '@/lib/speak';
import { useStore } from '@/lib/store';
import { tNow, useT } from '@/lib/useT';
import { Icon } from './Icons';

// Auto-stop. The browser's own end-of-speech detection is unreliable on some devices (it can keep listening in silence),
// so we also watch for it ourselves: new words keep pushing the timer back, silence lets it run out.
const SILENCE_MS = 1200; // stop this long after the last word. Raise it if people get cut off mid-pause.
const FINAL_GRACE_MS = 300; // stop this soon after the browser marks the phrase as final
const NO_SPEECH_MS = 7000; // give up if nothing at all is heard after tapping
const MAX_LISTEN_MS = 25000; // hard cap on one recording
const ABORT_AFTER_MS = 1200; // if stop() does not end the session, force it

/* eslint-disable @typescript-eslint/no-explicit-any */
export function VoiceButton() {
  const { t, lang } = useT();
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [insecure, setInsecure] = useState(false); // mic blocked: page isn't HTTPS or localhost
  const [help, setHelp] = useState<null | 'insecure' | 'unsupported'>(null);
  const [origin, setOrigin] = useState('');
  const recRef = useRef<any>(null);
  const liveRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // silence / no-speech timer
  const capRef = useRef<ReturnType<typeof setTimeout> | null>(null); // maximum length timer
  const status = useStore((s) => s.status);

  useEffect(() => {
    const w = window as any;
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    // Browsers only give the mic to HTTPS pages and localhost. Over http://192.168.x.x (e.g. a tablet on Wi-Fi) it is blocked.
    setInsecure(!window.isSecureContext);
    setOrigin(window.location.origin);
  }, []);

  const blocked = insecure || !supported;

  const send = useCallback((value: string, via: 'text' | 'voice') => {
    const v = value.trim();
    if (!v) return;
    setText('');
    void locateAndSelect(v, via);
  }, []);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    rec.stop(); // ends the session and delivers the final words
    setTimeout(() => recRef.current === rec && rec.abort(), ABORT_AFTER_MS); // some browsers ignore stop(): force it
  }, []);

  // Tap to talk. continuous=false makes the browser end the session by itself once you stop speaking,
  // then onend sends whatever was heard.
  const start = useCallback(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR || recRef.current) return;
    stopSpeaking(); // don't let the spoken answer feed back into the mic
    const rec = new SR();
    rec.lang = LANGS.find((l) => l.code === useStore.getState().lang)?.stt ?? 'en-US'; // en-US, ne-NP or ja-JP
    rec.interimResults = true;
    rec.continuous = false;
    liveRef.current = '';
    const clear = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (capRef.current) clearTimeout(capRef.current);
      timerRef.current = capRef.current = null;
    };
    const arm = (ms: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(stop, ms);
    };
    rec.onresult = (e: any) => {
      let s = '';
      for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
      liveRef.current = s.trim();
      setText(liveRef.current);
      useStore.getState().set({ liveTranscript: liveRef.current }); // words appear live in the chat
      // every new word restarts the silence timer; a final result stops almost at once
      arm(e.results[e.results.length - 1]?.isFinal ? FINAL_GRACE_MS : SILENCE_MS);
    };
    rec.onspeechend = () => arm(FINAL_GRACE_MS); // the engine itself noticed you stopped
    rec.onnomatch = () => arm(FINAL_GRACE_MS);
    rec.onerror = (e: any) => {
      if (e.error && e.error !== 'no-speech' && e.error !== 'aborted') {
        useStore.getState().set({ status: 'error', message: tNow('micError') });
        useStore.getState().addMessage({ role: 'ai', error: true, text: tNow('micError') });
      }
    };
    rec.onend = () => {
      clear();
      recRef.current = null;
      setListening(false);
      useStore.getState().set({ listening: false, liveTranscript: '' });
      send(liveRef.current, 'voice');
    };
    recRef.current = rec;
    setListening(true);
    useStore.getState().set({ listening: true, liveTranscript: '' });
    arm(NO_SPEECH_MS);
    capRef.current = setTimeout(stop, MAX_LISTEN_MS);
    rec.start();
  }, [send, stop]);

  const toggle = useCallback(() => {
    if (blocked) return setHelp((h) => (h ? null : insecure ? 'insecure' : 'unsupported')); // explain instead of failing silently
    if (recRef.current) stop();
    else start();
  }, [blocked, insecure, start, stop]);

  // Space = tap to talk (unless typing)
  useEffect(() => {
    const typing = (el: EventTarget | null) => el instanceof HTMLElement && /^(INPUT|TEXTAREA|BUTTON)$/.test(el.tagName);
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || typing(e.target)) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [toggle]);

  const busy = status === 'locating' || status === 'explaining';
  const line = blocked
    ? t('micBlockedLine')
    : listening
      ? t('listeningLine')
      : status === 'locating'
        ? t('findingLine')
        : status === 'explaining'
          ? t('explainingLine')
          : '';

  return (
    <div className="voice">
      {/* Always visible. When the page can't use the mic, tapping it explains why and what to do. */}
      <button
        type="button"
        className={`mic${listening ? ' live' : ''}${blocked ? ' blocked' : ''}`}
        onClick={toggle}
        aria-pressed={listening}
        aria-label={listening ? t('stopListening') : t('speakAria')}
        aria-describedby={blocked ? 'mic-hint' : undefined}
      >
        <Icon name="mic" size={20} />
        <span className="mic-label">{listening ? t('listening') : t('tapToSpeak')}</span>
      </button>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text, 'text');
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={blocked ? t('placeholderNoMic') : t('placeholder')}
          aria-label={t('describeAria')}
          enterKeyHint="send"
          autoComplete="off"
          maxLength={300}
        />
        <button type="submit" className="send" disabled={busy || !text.trim()} aria-label={t('send')}>
          <Icon name="send" size={20} />
          <span className="send-label">{t('send')}</span>
        </button>
      </form>

      {help && (
        <div className="mic-help" role="region" aria-label={t('micBlockedTitle')}>
          <strong>{t('micBlockedTitle')}</strong>
          {help === 'insecure' ? (
            <>
              <p>{t('micHelpInsecure')}</p>
              <code>{origin}</code>
              <p>{t('micHelpFlag')}</p>
              <p>{t('micHelpType')}</p>
            </>
          ) : (
            <p>{t('micHelpUnsupported')}</p>
          )}
          <button type="button" className="text-btn" onClick={() => setHelp(null)}>
            {t('gotIt')}
          </button>
        </div>
      )}

      <p className="status-line" id="mic-hint" aria-live="polite">
        {line}
      </p>
    </div>
  );
}
