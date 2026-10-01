// Server only. The API key never leaves route handlers / scripts.
const BASE = 'https://openrouter.ai/api';

export class OpenRouterError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function key(): string {
  const k = process.env.OPENROUTER_API_KEY;
  if (!k) throw new Error('OPENROUTER_API_KEY is not set (see .env.local.example)');
  return k;
}

async function post(path: string, body: unknown, timeoutMs: number): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/json',
      'X-Title': 'Aaiya Pain Guide',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
}

// ---------- DeepSeek (chat completions) ----------
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOpts {
  temperature?: number;
  timeoutMs?: number;
  maxTokens?: number; // hard cap on output tokens (and cost)
  /** Route to the fastest provider. Measured: ~4 s vs 27-44 s for a card, at roughly 9x the price. Use for live requests only. */
  fast?: boolean;
}

async function chat(messages: ChatMessage[], opts: ChatOpts, json: boolean): Promise<string> {
  const payload: Record<string, unknown> = {
    model: process.env.DEEPSEEK_MODEL ?? 'deepseek/deepseek-v4-flash',
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 1000,
    reasoning: { enabled: false }, // thinking tokens roughly double the cost and latency for this task
    messages,
  };
  if (json) payload.response_format = { type: 'json_object' };
  if (opts.fast) payload.provider = { sort: 'throughput' };
  const timeout = opts.timeoutMs ?? 25_000;
  let res = await post('/v1/chat/completions', payload, timeout);
  if (res.status === 400 || res.status === 422) {
    // a routed provider rejected response_format / reasoning: rely on the prompt + parser
    delete payload.response_format;
    delete payload.reasoning;
    res = await post('/v1/chat/completions', payload, timeout);
  }
  if (!res.ok) throw new OpenRouterError(res.status, `chat completions ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
  };
  const u = body.usage;
  if (u) console.log(`[deepseek] ${u.prompt_tokens}+${u.completion_tokens} tokens, $${(u.cost ?? 0).toFixed(5)}`);
  const text = body.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty completion');
  return text;
}

export const chatJson = (messages: ChatMessage[], opts: ChatOpts = {}) => chat(messages, opts, true);
export const chatText = (messages: ChatMessage[], opts: ChatOpts = {}) => chat(messages, opts, false);

// ---------- Jev (Decisions API) ----------
// Response shape per https://openrouter.ai/docs/guides/community/jev-tutorial
export interface ChoiceAnswer {
  type: 'choice';
  choice: string;
  confidence: number; // how concentrated the distribution is
  probabilities: Record<string, number>;
}
export interface NoulAnswer {
  type: 'noul';
  noul: number; // probability of "true"
}
export type Answer = ChoiceAnswer | NoulAnswer;

export interface Question {
  type: 'choice' | 'noul';
  instructions: string;
  criteria: Record<string, string>;
}

export async function decide(
  state: Record<string, unknown>,
  questions: Record<string, Question>,
  timeoutMs = 8_000,
): Promise<Record<string, Answer>> {
  const res = await post(
    '/alpha/decisions',
    { model: process.env.JEV_MODEL ?? 'typesafe/jev-1.13', state, questions },
    timeoutMs,
  );
  if (!res.ok) throw new OpenRouterError(res.status, `decisions ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { answers?: Record<string, Answer> };
  if (!json.answers) throw new Error('Decisions response has no "answers"');
  if (process.env.DEBUG_JEV) console.log('[jev]', JSON.stringify(json.answers).slice(0, 2000));
  return json.answers;
}
