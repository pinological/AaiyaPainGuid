import type { FinalCard } from './cardSchema';
import type { Lang } from './i18n';
import type { Part } from './partName';

export type Side = Part['side'];

export type Gender = 'female' | 'male' | 'other'; // 'other' also covers "prefer not to say"

export interface UserProfile {
  name: string;
  age: number;
  weight_kg: number;
  height_cm: number;
  gender: Gender;
}

export interface ExplainResponse {
  part: { raw: string; display: string; side: Side };
  card: FinalCard;
  cached: boolean;
  /** Search only: two short spoken-style sentences tying the card to what the user said. */
  note?: string;
  /** Spoken at the end of every answer: the exercises to try for relief. */
  relief: string;
  speech: {
    card: SpeechText; // descriptive read-aloud of the card (ends with the relief summary): played only when the user asks
    note?: SpeechText; // the short note + relief, when the server wrote the note itself
    relief?: SpeechText; // just the relief summary: spoken after the note (which arrives earlier, from /api/note)
  };
}

/** Answer of /api/note: the two spoken sentences tied to what the user said. */
export interface NoteResponse {
  note: string;
  speech: SpeechText;
}

export interface SpeechText {
  text: string;
  lang: Lang;
  sig?: string;
}

export interface Candidate {
  raw: string;
  display: string;
  side: Side;
  p: number; // Jev probability for this part
}

/** One line of the chat. User lines carry `text`; AI lines carry `text` (plain reply) or `result` (a found part). */
export interface ChatMessage {
  id: number;
  role: 'user' | 'ai';
  text?: string;
  via?: 'voice' | 'text'; // user lines: how it was entered (voice lines get a mic icon)
  pending?: boolean; // AI is still working: show the typing indicator with `text` as the status
  error?: boolean;
  result?: {
    raw: string;
    display: string;
    side: Side;
    transcript?: string;
    decision?: JevDecision; // present for searches, absent for clicks
    notices: string[];
    loading: boolean; // DeepSeek is still writing
    note?: string; // simple spoken-style answer (search)
    summary?: string; // one-line card summary (click)
    relief?: string; // exercise summary, also spoken at the end
    speech?: { card: SpeechText; note?: SpeechText; relief?: SpeechText };
  };
}

/** What Jev decided, kept for the confidence visualization. */
export interface JevDecision {
  chosenRaw: string;
  confidence: number; // how concentrated Jev's distribution is (0-1)
  probability: number; // probability of the chosen part
  bodyProb: number; // probability that the user described a body area
  lowConfidence: boolean;
  alternatives: Candidate[]; // top 5 by probability, chosen one included
}

export type LocateResult =
  | {
      status: 'ok';
      raw: string;
      display: string;
      side: Side;
      sideAssumed: boolean;
      confidence: number;
      probability: number;
      bodyProb: number;
      lowConfidence: boolean;
      alternatives: Candidate[];
    }
  | { status: 'not_body'; bodyProb: number };
