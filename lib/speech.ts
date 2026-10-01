// Server only. ElevenLabs text to speech.
// The browser can't ask for arbitrary text to be spoken: every speakable string is signed here (HMAC, together with
// its language) when the server produces it, and /api/tts only synthesizes text whose signature matches.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { RELIEF, type Lang } from './i18n';

export interface Speech {
  text: string;
  lang: Lang;
  sig?: string; // absent when no ElevenLabs key is configured: the client falls back to the browser voice
}

const MAX_CHARS = 500; // also a hard credit cap per request
const secret = () => process.env.ELEVENLABS_API_KEY;
const hmac = (lang: Lang, text: string, key: string) => createHmac('sha256', key).update(`${lang}\n${text}`).digest('hex');

export function makeSpeech(raw: string, lang: Lang = 'en'): Speech {
  const text = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
  const key = secret();
  return key ? { text, lang, sig: hmac(lang, text, key) } : { text, lang };
}

export function verifySpeech(text: string, lang: Lang, sig: string): boolean {
  const key = secret();
  if (!key) return false;
  const a = Buffer.from(hmac(lang, text, key));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** "For relief, try standing quad stretch: hold 20 to 30 seconds. Then ... Stop if pain increases." Built from the card, no extra model call. */
export function reliefText(exercises: { name: string; dose: string }[], lang: Lang = 'en'): string {
  const R = RELIEF[lang];
  const say = (s: string) =>
    s
      .replace(/(\d)\s*[-–—〜~]\s*(\d)/g, `$1${R.range}$2`) // 20-30 -> "20 to 30" / "20 देखि 30" / "20から30"
      .replace(/[–—]/g, ', ')
      .replace(/\s+/g, ' ')
      .replace(/[.;\s。।]+$/, '')
      .trim();
  const parts = exercises.slice(0, 2).map((e) => {
    const name = lang === 'en' ? say(e.name).toLowerCase() : say(e.name);
    let dose = say(e.dose);
    if (dose.length > 70) dose = dose.slice(0, Math.max(dose.lastIndexOf(' ', 70), 40)).replace(/[,\s]+$/, ''); // cut at a word
    if (lang === 'en' && dose) dose = dose.charAt(0).toLowerCase() + dose.slice(1);
    return dose ? `${name}: ${dose}` : name;
  });
  return parts.length ? R.open(parts[0], parts[1]) : '';
}

/** Lead text + a tail that must always be spoken (the relief summary). The lead is trimmed to fit MAX_CHARS. */
export function composeSpeech(lead: string, tail: string, lang: Lang = 'en'): Speech {
  const t = tail.trim();
  let l = lead.replace(/\s+/g, ' ').trim();
  const budget = MAX_CHARS - (t ? t.length + 1 : 0);
  if (l.length > budget) {
    const cut = l.slice(0, budget);
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '), cut.lastIndexOf('。'), cut.lastIndexOf('।'));
    l = end > 40 ? cut.slice(0, end + 1) : cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : budget) + (lang === 'ja' ? '。' : '.');
  }
  return makeSpeech(t ? `${l} ${t}` : l, lang);
}

// Identical text is only ever paid for once per server process.
const audioCache = new Map<string, Buffer>();

export type AudioSource = { cached: Buffer } | { stream: ReadableStream<Uint8Array> };

// Flash is fastest and cheapest, but it cannot speak Nepali: that needs eleven_v3.
const modelFor = (lang: Lang) =>
  lang === 'ne' ? (process.env.ELEVENLABS_MODEL_NE ?? 'eleven_v3') : (process.env.ELEVENLABS_MODEL ?? 'eleven_flash_v2_5');

/**
 * Opens the audio as a STREAM, so the browser starts playing after ~0.3 s (English, Japanese) or ~1.5 s (Nepali)
 * instead of waiting for the whole file. Measured: Nepali needs ~12 s to generate 11 s of audio, so it plays almost
 * without gaps. A copy of the stream is collected and cached, so replays are instant and free.
 * ELEVENLABS_NE_FAST=1 reads Nepali with the flash model in Hindi mode (about 1 s, but with a Hindi accent).
 */
export async function openAudio(text: string, lang: Lang, sig: string): Promise<AudioSource> {
  const hit = audioCache.get(sig);
  if (hit) return { cached: hit };

  const voice = process.env.ELEVENLABS_VOICE_ID ?? 'Xb7hH8MSUJpSbSDYk0k2';
  const fastNe = lang === 'ne' && process.env.ELEVENLABS_NE_FAST === '1';
  const body: Record<string, unknown> = { text, model_id: fastNe ? 'eleven_flash_v2_5' : modelFor(lang) };
  if (lang !== 'en') body.language_code = fastNe ? 'hi' : lang;

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': secret() ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok || !res.body) throw new Error(`elevenlabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  console.log(`[tts] ${lang} ${text.length} chars (${fastNe ? 'flash/hi' : modelFor(lang)}) streaming`);

  const [toClient, toCache] = res.body.tee();
  void (async () => {
    const parts: Uint8Array[] = [];
    const reader = toCache.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
      }
      audioCache.set(sig, Buffer.concat(parts));
      if (audioCache.size > 100) audioCache.delete(audioCache.keys().next().value as string);
    } catch {
      /* the stream broke: nothing half-finished gets cached */
    }
  })();
  return { stream: toClient };
}
