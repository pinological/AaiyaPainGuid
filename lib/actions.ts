// Client-side flows: click -> explain, chat/voice -> locate -> explain. Every step is mirrored into the chat.
// All user-facing text goes through tNow(), so it follows the selected language.
import { detectLang, type Lang } from './i18n';
import { parsePart } from './partName';
import { appendSpeech, speak, stopSpeaking } from './speak';
import { useStore } from './store';
import type { ChatMessage, ExplainResponse, JevDecision, LocateResult, NoteResponse } from './types';
import { nameNow, sideNow, tNow } from './useT';

let reqId = 0; // latest request wins; stale responses are dropped
const clientCache = new Map<string, ExplainResponse>();

const { set, addMessage, updateMessage } = useStore.getState();

async function postJson<T>(url: string, body: unknown, timeoutMs: number): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[api]', url, res.status, (data as { message?: string }).message);
    throw new Error('api');
  }
  return data as T;
}

// Server messages are English developer text; the user always sees a message in their own language.
const errorText = (e: unknown) =>
  e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError') ? tNow('errTimeout') : tNow('errGeneric');

/** Cards are tailored to the profile and the language, so a change must not reuse what this tab already fetched. */
export const clearCardCache = () => clientCache.clear();

type Result = NonNullable<ChatMessage['result']>;
const patchResult = (id: number, patch: Partial<Result>) =>
  updateMessage(id, (m) => (m.result ? { ...m, result: { ...m.result, ...patch } } : m));
const failMessage = (id: number, text: string) =>
  updateMessage(id, (m) => ({ ...m, pending: false, error: true, text, result: undefined }));

const explainBody = (raw: string, transcript?: string) => ({
  raw,
  transcript,
  profile: useStore.getState().profile ?? undefined, // the visitor's own profile, if they gave one
  lang: useStore.getState().lang,
});

export async function selectPart(
  raw: string,
  opts: { transcript?: string; decision?: JevDecision; notices?: string[]; msgId?: number } = {},
) {
  const id = ++reqId;
  stopSpeaking();
  const part = parsePart(raw);
  const search = !!opts.transcript;

  // The chat line for this pick: Jev's search result (created by the caller) or a fresh one for a click.
  let msgId = opts.msgId;
  if (msgId === undefined) {
    set({ sheetTab: 'details' }); // tapping the model on a phone/tablet shows the full card
    const side = sideNow(part.side);
    addMessage({ role: 'user', text: tNow('selected', { name: nameNow(raw) + (side ? ` (${side})` : '') }) });
    msgId = addMessage({ role: 'ai', result: { raw, display: part.display, side: part.side, notices: [], loading: true } });
  }
  const mid = msgId;

  set({
    selectedRaw: raw,
    relatedRaws: [],
    message: null,
    note: null,
    slow: false,
    jev: opts.decision?.probability ?? null,
  });
  useStore.getState().flyTo?.(raw); // camera moves before the explanation arrives

  const known = clientCache.get(raw); // the shared card, never the per-request note
  if (known && !search) {
    set({ card: known, status: 'done', relatedRaws: known.card.related.map((r) => r.raw) });
    patchResult(mid, { loading: false, summary: known.card.summary, relief: known.relief, speech: known.speech });
    return;
  }
  // Search for a part we already have: show the card now, the short note follows.
  set(
    known
      ? { card: known, status: 'explaining', relatedRaws: known.card.related.map((r) => r.raw) }
      : { card: null, status: 'explaining' },
  );
  const slowTimer = setTimeout(() => id === reqId && set({ slow: true }), 10_000);
  try {
    // A search needs two things: the short spoken note (about 1.5 s) and the full card (4 to 15 s, it varies).
    // They are fetched in parallel and the note is spoken the moment it arrives, without waiting for the card.
    let noteSpeech: NoteResponse['speech'] | undefined;
    const notePromise = search
      ? postJson<NoteResponse>('/api/note', explainBody(raw, opts.transcript), 25_000)
          .then((n) => {
            if (id !== reqId) return;
            noteSpeech = n.speech;
            set({ note: n });
            patchResult(mid, { note: n.note });
            if (useStore.getState().ttsOn) speak(n.speech);
          })
          .catch(() => {}) // the card still arrives and is spoken instead
      : Promise.resolve();
    const cardPromise = known
      ? Promise.resolve(known)
      : postJson<ExplainResponse>('/api/explain', { ...explainBody(raw, opts.transcript), skipNote: search }, 40_000);

    const data = await cardPromise;
    if (id !== reqId) return;
    if (data !== known) clientCache.set(raw, { ...data, note: undefined, speech: { card: data.speech.card, relief: data.speech.relief } });
    set({ card: data, relatedRaws: data.card.related.map((r) => r.raw), ...(search ? {} : { status: 'done' as const }) });
    await notePromise;
    if (id !== reqId) return;
    set({ status: 'done' });
    patchResult(mid, {
      loading: false,
      summary: data.card.summary,
      relief: data.relief,
      speech: { card: data.speech.card, note: noteSpeech, relief: data.speech.relief },
    });
    // Clicks never auto-play. A search already spoke its note; the relief summary follows it (or the whole card if no note).
    if (search && useStore.getState().ttsOn) {
      if (noteSpeech) appendSpeech(data.speech.relief);
      else speak(data.speech.card);
    }
  } catch (e) {
    if (id === reqId) {
      set({ status: 'error', message: errorText(e) });
      failMessage(mid, errorText(e));
    }
  } finally {
    clearTimeout(slowTimer);
  }
}

export async function locateAndSelect(transcript: string, via: 'text' | 'voice' = 'text') {
  const text = transcript.trim();
  if (!text) return;
  // Language detection: text written in Devanagari or Japanese switches the app to that language first,
  // so the answer, the voice and the UI all match what the person just wrote.
  const detected = detectLang(text);
  if (detected && detected !== useStore.getState().lang) setLanguage(detected, { refresh: false });
  const id = ++reqId;
  stopSpeaking();
  addMessage({ role: 'user', text, via });
  const aiId = addMessage({ role: 'ai', pending: true, text: tNow('jevFinding') });
  set({ status: 'locating', transcript: text, message: null, card: null, slow: false });
  try {
    const r = await postJson<LocateResult>('/api/locate', { transcript: text }, 15_000);
    if (id !== reqId) return;
    if (r.status === 'not_body') {
      const reply = tNow('notBody');
      set({ status: 'idle', selectedRaw: null, relatedRaws: [], message: reply });
      updateMessage(aiId, (m) => ({ ...m, pending: false, text: reply }));
      return;
    }
    // Jev decides: fly to its pick even when it's unsure. The bubble shows its runner-ups so the user can override.
    const decision: JevDecision = {
      chosenRaw: r.raw,
      confidence: r.confidence,
      probability: r.probability,
      bodyProb: r.bodyProb,
      lowConfidence: r.lowConfidence,
      alternatives: r.alternatives,
    };
    const notices = [
      r.sideAssumed ? tNow('sideAssumed', { side: sideNow(r.side) }) : '',
      r.lowConfidence ? tNow('unsure') : '',
    ].filter(Boolean);
    updateMessage(aiId, (m) => ({
      ...m,
      pending: false,
      text: undefined,
      result: { raw: r.raw, display: r.display, side: r.side, transcript: text, decision, notices, loading: true },
    }));
    await selectPart(r.raw, { transcript: text, decision, notices, msgId: aiId });
  } catch (e) {
    if (id === reqId) {
      set({ status: 'error', message: errorText(e) });
      failMessage(aiId, errorText(e));
    }
  }
}

/** The user taps one of Jev's runner-up guesses inside a chat bubble. */
export function chooseAlternative(msgId: number, raw: string) {
  const msg = useStore.getState().messages.find((m) => m.id === msgId);
  const decision = msg?.result?.decision;
  const alt = decision?.alternatives.find((a) => a.raw === raw);
  if (!msg?.result || !decision || !alt) return;
  addMessage({ role: 'user', text: tNow('tryInstead', { name: nameNow(raw) }) });
  const aiId = addMessage({
    role: 'ai',
    result: {
      raw,
      display: alt.display,
      side: alt.side,
      transcript: msg.result.transcript,
      decision: { ...decision, chosenRaw: raw, probability: alt.p },
      notices: [],
      loading: true,
    },
  });
  void selectPart(raw, {
    transcript: msg.result.transcript,
    decision: { ...decision, chosenRaw: raw, probability: alt.p },
    msgId: aiId,
  });
}

/** Re-fetch the card for the current selection (language or profile changed). No new chat lines. */
async function refreshCard(raw: string) {
  const id = ++reqId;
  set({ status: 'explaining', card: null, slow: false });
  try {
    const data = await postJson<ExplainResponse>('/api/explain', explainBody(raw), 40_000);
    if (id !== reqId) return;
    clientCache.set(raw, { ...data, note: undefined, speech: { card: data.speech.card } });
    set({ card: data, status: 'done', relatedRaws: data.card.related.map((r) => r.raw) });
  } catch (e) {
    if (id === reqId) set({ status: 'error', message: errorText(e) });
  }
}

/** Switch the language of the whole app: UI text, AI answers, voice recognition and spoken replies. */
export function setLanguage(lang: Lang, opts: { refresh?: boolean } = {}) {
  if (lang === useStore.getState().lang) return;
  stopSpeaking();
  set({ lang });
  try {
    localStorage.setItem('mirror.lang', lang);
  } catch {}
  clearCardCache();
  const { profileOpen, selectedRaw } = useStore.getState();
  if (!profileOpen) addMessage({ role: 'ai', text: tNow('langChanged') });
  if (selectedRaw && opts.refresh !== false) void refreshCard(selectedRaw); // the open card is now in the old language
}
