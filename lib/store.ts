import { create } from 'zustand';
import type { Lang } from './i18n';
import type { Theme } from './theme';
import type { ChatMessage, ExplainResponse, Gender, NoteResponse } from './types';

export interface Profile {
  age: number;
  weight_kg: number;
  height_cm: number;
  gender: Gender;
}

export type Status = 'idle' | 'locating' | 'explaining' | 'done' | 'error';

interface BodyInfo {
  center: [number, number, number];
  size: [number, number, number];
}

interface Store {
  selectedRaw: string | null;
  relatedRaws: string[];
  card: ExplainResponse | null;
  note: NoteResponse | null; // the short spoken note of the current search: arrives before the card
  status: Status;
  message: string | null;
  slow: boolean;
  jev: number | null; // probability of the part Jev picked (search only)
  transcript: string;
  messages: ChatMessage[];
  lang: Lang; // UI, AI answers, voice recognition and speech all follow this. Default English.
  profile: Profile | null; // the visitor's own details (this browser only); null = not asked yet / skipped
  profileOpen: boolean; // the onboarding / edit dialog
  ready: boolean; // model, fonts and first frame are done: the splash screen lifts and the app appears
  theme: Theme; // colour theme; 'system' (default) follows the device
  sheetTab: 'chat' | 'details'; // which panel the bottom/side sheet shows on phones and tablets
  focusMode: boolean;
  ttsOn: boolean; // speak search answers automatically
  speaking: boolean;
  speakingText: string | null; // what is being spoken right now, shown as a caption in the chat
  voiceLoading: boolean; // the audio is still being generated (Nepali takes ~15 s)
  listening: boolean; // mic is open
  liveTranscript: string; // words heard so far, shown live in the chat
  bodyInfo: BodyInfo | null;
  clips: string[];
  activeClip: string | null;
  flyTo: ((raw: string) => void) | null;
  resetView: (() => void) | null;
  set: (patch: Partial<Omit<Store, 'set' | 'addMessage' | 'updateMessage'>>) => void;
  addMessage: (m: Omit<ChatMessage, 'id'>) => number;
  updateMessage: (id: number, fn: (m: ChatMessage) => ChatMessage) => void;
}

let nextId = 1;
const MAX_MESSAGES = 40;

export const useStore = create<Store>((set) => ({
  selectedRaw: null,
  relatedRaws: [],
  card: null,
  note: null,
  status: 'idle',
  message: null,
  slow: false,
  jev: null,
  transcript: '',
  messages: [],
  lang: 'en',
  profile: null,
  profileOpen: false,
  ready: false,
  theme: 'system',
  sheetTab: 'chat',
  focusMode: false,
  ttsOn: true,
  speaking: false,
  speakingText: null,
  voiceLoading: false,
  listening: false,
  liveTranscript: '',
  bodyInfo: null,
  clips: [],
  activeClip: null,
  flyTo: null,
  resetView: null,
  set: (patch) => set(patch),
  addMessage: (m) => {
    const id = nextId++;
    set((s) => ({ messages: [...s.messages, { ...m, id }].slice(-MAX_MESSAGES) }));
    return id;
  },
  updateMessage: (id, fn) => set((s) => ({ messages: s.messages.map((m) => (m.id === id ? fn(m) : m)) })),
}));
