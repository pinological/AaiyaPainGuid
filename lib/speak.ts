// Client side playback: ElevenLabs audio streamed from /api/tts, with the browser voice as a fallback.
// Everything here runs in the browser that is showing the page, so a tablet plays through the tablet's speaker.
// Several segments can be queued (the short note first, the relief summary when the card arrives).
import { useStore } from './store';
import type { SpeechText } from './types';

// One long-lived <audio> element. iOS/Android only allow playback that was unlocked by a tap, and an unlocked
// element stays unlocked, so every later answer (which arrives seconds after the tap) plays through this one.
let player: HTMLAudioElement | null = null;
let unlocked = false;
let playId = 0; // latest session wins; a new session cancels the old one
let queue: SpeechText[] = [];
let active = false; // a session is currently playing or waiting for audio
let startTimer: ReturnType<typeof setTimeout> | null = null;
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
const VOICE_LANG = { en: 'en-US', ne: 'ne-NP', ja: 'ja-JP' } as const;
const START_TIMEOUT_MS = 40_000; // give up on a segment if no audio has begun by then

const { set } = useStore.getState();
const done = () => {
  active = false;
  set({ speaking: false, speakingText: null, voiceLoading: false });
};
const getPlayer = () => (player ??= new Audio());

/** Call from a tap/click handler (PageClient does this on the first touch). */
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  const a = getPlayer();
  a.src = SILENT_WAV;
  a.play().catch(() => (unlocked = false)); // not allowed yet: try again on the next tap
  try {
    window.speechSynthesis?.speak(new SpeechSynthesisUtterance('')); // same unlock for the browser voice fallback
  } catch {}
}

export function stopSpeaking() {
  playId++;
  queue = [];
  if (startTimer) clearTimeout(startTimer);
  startTimer = null;
  const a = player;
  if (a) {
    a.onplaying = a.onended = a.onerror = null;
    a.pause();
    a.removeAttribute('src'); // also cancels a download that is still streaming
    a.load();
  }
  window.speechSynthesis?.cancel();
  done();
}

function browserVoice(text: string, id: number, lang: SpeechText['lang'], next: () => void) {
  if (!window.speechSynthesis) return next();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = VOICE_LANG[lang]; // the browser voice may not exist for every language; it then stays silent
  u.onend = u.onerror = () => id === playId && next();
  window.speechSynthesis.speak(u);
}

function playSegment(speech: SpeechText, id: number) {
  // The chat shows this text as a caption; "preparing" stays on until the first audio actually plays.
  set({ speaking: true, speakingText: speech.text, voiceLoading: true });
  const next = () => {
    if (id !== playId) return;
    const following = queue.shift();
    if (following) playSegment(following, id);
    else done();
  };

  if (!speech.sig) return browserVoice(speech.text, id, speech.lang, next); // server voice not configured

  // The audio element streams the response: it starts playing as soon as the first bytes arrive.
  const a = getPlayer();
  a.onplaying = () => {
    if (id !== playId) return;
    if (startTimer) clearTimeout(startTimer);
    startTimer = null;
    set({ voiceLoading: false });
  };
  a.onended = next;
  a.onerror = () => id === playId && browserVoice(speech.text, id, speech.lang, next); // 403 / 502 / network / out of credits
  a.src = `/api/tts?${new URLSearchParams({ text: speech.text, lang: speech.lang, sig: speech.sig })}`;
  if (startTimer) clearTimeout(startTimer);
  startTimer = setTimeout(() => {
    if (id !== playId) return;
    a.onerror = null;
    a.pause();
    browserVoice(speech.text, id, speech.lang, next);
  }, START_TIMEOUT_MS);
  a.play().catch((e: unknown) => {
    if (id !== playId) return;
    // Autoplay was refused: don't fall back to another autoplay. The "Hear this" button plays it on a tap.
    if (e instanceof DOMException && e.name === 'NotAllowedError') stopSpeaking();
    // AbortError just means a newer play() replaced this one.
  });
}

/** Speak these segments one after another, replacing whatever is playing. */
export function speakSequence(parts: (SpeechText | undefined)[]) {
  const list = parts.filter((p): p is SpeechText => !!p?.text);
  if (!list.length) return;
  stopSpeaking();
  const id = playId;
  active = true;
  queue = list.slice(1);
  playSegment(list[0], id);
}

export const speak = (speech: SpeechText | undefined) => speakSequence([speech]);

/** Add a segment after the current one. If nothing is playing any more, it starts on its own. */
export function appendSpeech(speech: SpeechText | undefined) {
  if (!speech?.text) return;
  if (active) queue.push(speech);
  else speakSequence([speech]);
}
