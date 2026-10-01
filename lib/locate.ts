// transcript -> part, using Jev (Decisions API) over the generated name index.
import regionsJson from '../data/regions.generated.json';
import { decide, type Answer, type ChoiceAnswer, type NoulAnswer, type Question } from './openrouter';
import { getVoiceOption, getVoiceOptions, resolveRaw, type VoiceOption } from './parts';
import { parsePart } from './partName';
import type { Candidate, LocateResult } from './types';

const regions = (regionsJson as { regions: Record<string, string> }).regions;

export class IndexEmptyError extends Error {}

const MAX_CHOICES = 255; // hard limit of the Decisions API ("Too many choices")

const isBody: Question = {
  type: 'noul',
  instructions: 'Is the user describing a place on their own body, such as pain, tightness or discomfort?',
  criteria: {
    true: 'The user describes a body location or a physical sensation in a body part.',
    false: 'The user talks about something unrelated to their body.',
  },
};
const sideQ: Question = {
  type: 'choice',
  instructions: 'Which side of their body does the user mean?',
  criteria: {
    left: 'The user says left.',
    right: 'The user says right.',
    unspecified: 'The user does not say which side, or it is a midline area.',
  },
};
const partQuestion = (pool: VoiceOption[]): Question => ({
  type: 'choice',
  instructions:
    'Which of these anatomical parts best matches where the user feels it? Prefer the muscle mainly responsible for the movement or area described.',
  criteria: Object.fromEntries(pool.map((o) => [o.key, o.display])),
});

function choice(a: Answer | undefined, name: string): ChoiceAnswer {
  if (!a || a.type !== 'choice') throw new Error(`Jev returned no choice answer for "${name}"`);
  return a;
}

export async function locate(transcript: string): Promise<LocateResult> {
  const options = getVoiceOptions();
  if (!options.length) throw new IndexEmptyError('Name index is empty. Run `npm run index`.');

  const state = { user_said: transcript };
  const haveRegions = Object.keys(regions).length > 0;
  if (options.length > MAX_CHOICES && !haveRegions) {
    throw new IndexEmptyError(
      `${options.length} voice options exceeds Jev's limit of ${MAX_CHOICES}. Add patterns to DEPRIORITIZE_PATTERNS or run \`npm run regions\`.`,
    );
  }
  const useRegions = haveRegions && (process.env.USE_REGIONS === '1' || options.length > MAX_CHOICES);

  let pool = options;
  let head: Record<string, Answer>;
  let partAnswer: ChoiceAnswer;

  if (useRegions) {
    // Two calls: pick the region first, then the part inside it.
    const names = [...new Set(options.map((o) => regions[o.base]).filter(Boolean))];
    head = await decide(state, {
      is_body: isBody,
      side: sideQ,
      region: {
        type: 'choice',
        instructions: 'Which body region does the user mean?',
        criteria: Object.fromEntries(names.map((n, i) => [`r${i}`, n])),
      },
    });
    if ((head.is_body as NoulAnswer).noul < 0.5) return { status: 'not_body', bodyProb: (head.is_body as NoulAnswer).noul };
    const region = names[Number(choice(head.region, 'region').choice.slice(1))];
    const inRegion = options.filter((o) => regions[o.base] === region);
    if (inRegion.length) pool = inRegion;
    const second = await decide(state, { part: partQuestion(pool) });
    partAnswer = choice(second.part, 'part');
  } else {
    head = await decide(state, { is_body: isBody, side: sideQ, part: partQuestion(pool) });
    if ((head.is_body as NoulAnswer).noul < 0.5) return { status: 'not_body', bodyProb: (head.is_body as NoulAnswer).noul };
    partAnswer = choice(head.part, 'part');
  }

  const sideChoice = choice(head.side, 'side').choice;
  const sideAssumed = sideChoice === 'unspecified';
  const side = sideChoice === 'left' ? 'left' : 'right'; // spec: unspecified -> right

  const candidate = (key: string, p: number): Candidate | null => {
    const opt = getVoiceOption(key);
    const raw = opt && resolveRaw(opt.base, side);
    if (!opt || !raw) return null;
    return { raw, display: opt.display, side: parsePart(raw).side, p };
  };

  // Jev always decides: the chosen part is used even when it is unsure. `lowConfidence` only changes the wording in
  // the UI, and `alternatives` (Jev's own probabilities) let the user override with one tap.
  const alternatives = Object.entries(partAnswer.probabilities ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([k, p]) => candidate(k, p))
    .filter((c): c is Candidate => !!c)
    .slice(0, 5);

  const best = candidate(partAnswer.choice, partAnswer.probabilities?.[partAnswer.choice] ?? partAnswer.confidence);
  if (!best) throw new Error(`Jev chose "${partAnswer.choice}", which is not in the name index`);
  const threshold = Number(process.env.JEV_CONFIDENCE_THRESHOLD ?? 0.5);
  return {
    status: 'ok',
    raw: best.raw,
    display: best.display,
    side: best.side,
    sideAssumed,
    confidence: partAnswer.confidence,
    probability: best.p,
    bodyProb: (head.is_body as NoulAnswer).noul,
    lowConfidence: partAnswer.confidence < threshold,
    alternatives,
  };
}
