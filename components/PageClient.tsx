'use client';

import { useProgress } from '@react-three/drei';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { setLanguage } from '@/lib/actions';
import { LANGS, isLang } from '@/lib/i18n';
import { stopSpeaking, unlockAudio } from '@/lib/speak';
import { useStore } from '@/lib/store';
import { THEMES, applyTheme, readTheme } from '@/lib/theme';
import type { UserProfile } from '@/lib/types';
import { useT } from '@/lib/useT';
import { AiStatus } from './AiStatus';
import { ChatPanel } from './ChatPanel';
import { Icon, Logo } from './Icons';
import { InfoCard } from './InfoCard';
import { ProfileChip } from './ProfileChip';
import { ProfileDialog, useProfileBoot } from './ProfileDialog';
import { VoiceButton } from './VoiceButton';

const BodyScene = dynamic(() => import('./BodyScene'), { ssr: false });

// Full-screen splash from the very first paint (it is server-rendered) until the model, the fonts and the first
// drawn frame are all ready. Nothing of the app shows before that, so there is no half-loaded flicker.
function Splash() {
  const { progress } = useProgress();
  const { t } = useT();
  const ready = useStore((s) => s.ready);
  const bodyInfo = useStore((s) => s.bodyInfo); // set once the model is parsed and registered
  const set = useStore((s) => s.set);
  const [fonts, setFonts] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let off = false;
    const timeout = new Promise((r) => setTimeout(r, 3000)); // never wait forever for a font
    void Promise.race([document.fonts?.ready ?? Promise.resolve(), timeout]).then(() => !off && setFonts(true));
    const failsafe = setTimeout(() => set({ ready: true }), 45_000); // e.g. the model failed to load: show the app anyway
    return () => {
      off = true;
      clearTimeout(failsafe);
    };
  }, [set]);

  // Two animation frames after the model is in: the canvas has compiled its shaders and drawn the body.
  useEffect(() => {
    if (!bodyInfo || !fonts || ready) return;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => set({ ready: true }));
    });
    return () => cancelAnimationFrame(raf);
  }, [bodyInfo, fonts, ready, set]);

  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => setGone(true), 500); // after the fade-out
    return () => clearTimeout(id);
  }, [ready]);

  if (gone) return null;
  const pct = ready ? 100 : Math.min(99, Math.round(progress));
  return (
    <div className={`loading${ready ? ' done' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t('loadingTitle')}>
      <Logo />
      <p>{t('brand')}</p>
      <div className="load-track">
        <div className="load-fill" style={{ width: `${pct}%` }} />
      </div>
      <small>{t('loadingNote', { pct })}</small>
    </div>
  );
}

const THEME_ICON = { system: 'monitor', light: 'sun', dark: 'moon' } as const;
const THEME_LABEL = { system: 'themeSystem', light: 'themeLight', dark: 'themeDark' } as const;

function ThemeButton() {
  const { t } = useT();
  const theme = useStore((s) => s.theme);
  const set = useStore((s) => s.set);

  // Pick up the saved choice (the boot script in <head> already applied it to the page)
  useEffect(() => {
    set({ theme: readTheme() });
  }, [set]);
  const cycle = () => {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    applyTheme(next);
    set({ theme: next });
  };
  const mode = t(THEME_LABEL[theme]);
  return (
    <button type="button" onClick={cycle} title={t('toolThemeTitle', { mode })} aria-label={t('toolThemeTitle', { mode })}>
      <Icon name={THEME_ICON[theme]} size={18} />
      <span>{mode}</span>
    </button>
  );
}

function Tools() {
  const { t, lang } = useT();
  const focusMode = useStore((s) => s.focusMode);
  const clips = useStore((s) => s.clips);
  const activeClip = useStore((s) => s.activeClip);
  const ttsOn = useStore((s) => s.ttsOn);
  const set = useStore((s) => s.set);

  // Remember the voice-replies choice (storage can be blocked, so it's best effort)
  useEffect(() => {
    try {
      if (localStorage.getItem('mirror.tts') === 'off') set({ ttsOn: false });
    } catch {}
  }, [set]);
  const toggleTts = () => {
    if (ttsOn) stopSpeaking();
    set({ ttsOn: !ttsOn });
    try {
      localStorage.setItem('mirror.tts', ttsOn ? 'off' : 'on');
    } catch {}
  };

  return (
    <div className="tools" role="toolbar" aria-label={t('toolsAria')}>
      <label className="lang-select" title={t('toolLanguage')}>
        <Icon name="globe" size={18} />
        <span className="sr-only">{t('toolLanguage')}</span>
        <select value={lang} onChange={(e) => isLang(e.target.value) && setLanguage(e.target.value)} aria-label={t('toolLanguage')}>
          {LANGS.map((l) => (
            <option key={l.code} value={l.code} lang={l.code}>
              {l.native}
            </option>
          ))}
        </select>
      </label>
      <ThemeButton />
      <button type="button" aria-pressed={ttsOn} onClick={toggleTts} title={t('toolVoiceTitle')}>
        <Icon name={ttsOn ? 'speaker' : 'speakerOff'} size={18} />
        <span>{t('toolVoice')}</span>
      </button>
      <button type="button" onClick={() => useStore.getState().resetView?.()} title={t('toolResetTitle')}>
        <Icon name="reset" size={18} />
        <span>{t('toolReset')}</span>
      </button>
      <button type="button" aria-pressed={focusMode} onClick={() => set({ focusMode: !focusMode })} title={t('toolFocusTitle')}>
        <Icon name="focus" size={18} />
        <span>{t('toolFocus')}</span>
      </button>
      {clips.length > 0 && (
        <select value={activeClip ?? ''} onChange={(e) => set({ activeClip: e.target.value || null })} aria-label="Animation">
          <option value="">-</option>
          {clips.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function SheetTabs() {
  const { t } = useT();
  const tab = useStore((s) => s.sheetTab);
  const hasCard = useStore((s) => !!s.card);
  const set = useStore((s) => s.set);
  const Tab = ({ id, icon, label, dot }: { id: 'chat' | 'details'; icon: 'chat' | 'details'; label: string; dot?: boolean }) => (
    <button type="button" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`pane-${id}`} className={tab === id ? 'on' : ''} onClick={() => set({ sheetTab: id })}>
      <Icon name={icon} size={18} />
      {label}
      {dot && tab !== id && <i className="dot" aria-label="new" />}
    </button>
  );
  return (
    <div className="tabs" role="tablist" aria-label={t('panelsAria')}>
      <Tab id="chat" icon="chat" label={t('tabChat')} />
      <Tab id="details" icon="details" label={t('tabDetails')} dot={hasCard} />
    </div>
  );
}

export function PageClient({ user }: { user: UserProfile }) {
  const tab = useStore((s) => s.sheetTab);
  const { t, lang } = useT();
  useProfileBoot();

  // The page language drives fonts, line height, hyphenation and screen-reader pronunciation.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Unlock audio on this device's first touch so answers that arrive later can play (required on phones/tablets).
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const ready = useStore((s) => s.ready);
  return (
    <>
    <Splash />
    {/* inert: nothing can be focused or tapped behind the splash screen */}
    <div className="app" data-tab={tab} inert={!ready}>
      <main className="stage" id="main">
        <BodyScene />
        <h1 className="brand">
          <Logo />
          {t('brand')}
        </h1>
        <Tools />
        <AiStatus />
      </main>

      <div className="sheet">
        <SheetTabs />
        <div className="pane chat-pane" id="pane-chat" role="tabpanel" aria-labelledby="tab-chat">
          <ChatPanel />
          <div className="dock">
            <VoiceButton />
          </div>
        </div>
        <aside className="pane panel" id="pane-details" role="tabpanel" aria-labelledby="tab-details" aria-label={t('tabDetails')}>
          <ProfileChip fallback={user} />
          <InfoCard />
        </aside>
      </div>

      <footer className="disclaimer">{t('footer')}</footer>
      <ProfileDialog />
    </div>
    </>
  );
}
