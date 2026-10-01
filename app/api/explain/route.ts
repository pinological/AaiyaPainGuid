import { NextResponse } from 'next/server';
import { z } from 'zod';
import { finalizeCard, getCard } from '@/lib/cards';
import { getPartByRaw } from '@/lib/parts';
import { ProfileSchema, toProfile } from '@/lib/profile';
import { composeSpeech, makeSpeech, reliefText } from '@/lib/speech';
import type { ExplainResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

const Body = z.object({
  raw: z.string().min(1).max(200),
  transcript: z.string().max(300).optional(),
  profile: ProfileSchema.optional(), // the visitor's own profile; the demo user is used when absent
  lang: z.enum(['en', 'ne', 'ja']).default('en'), // language of the card, the note and the spoken text
  skipNote: z.boolean().optional(), // the browser fetches the note from /api/note in parallel, so don't write it twice
});

const fail = (status: number, message: string) => NextResponse.json({ status: 'error', message }, { status });

const STOP = { en: '.', ne: '।', ja: '。' } as const;

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return fail(400, 'Bad request.');
  }
  const { lang } = body;

  // The server re-resolves the name from its own index: the client can't inject a "part name".
  const part = getPartByRaw(body.raw);
  if (!part) return fail(404, 'Unknown part. Re-run `npm run index` after exporting the model.');

  try {
    const { card, cached, note } = await getCard(
      part,
      body.skipNote ? null : body.transcript?.trim() || null,
      body.profile ? toProfile(body.profile) : undefined,
      lang,
    );
    const final = finalizeCard(card, part.side, part.base, lang);
    // Every spoken answer ends with a short summary of the exercises to try for relief.
    const relief = reliefText(final.exercises, lang);
    const end = STOP[lang];
    const sentence = (s: string) => s.replace(/[.。।\s]+$/, '') + end;
    const lead = [final.title, final.summary, ...final.what_it_does.slice(0, 2)].map(sentence).join(' ');
    const res: ExplainResponse = {
      part: { raw: part.raw, display: part.display, side: part.side },
      card: final,
      cached,
      note,
      relief,
      speech: {
        card: composeSpeech(lead, relief, lang),
        note: note ? composeSpeech(note, relief, lang) : undefined,
        relief: relief ? makeSpeech(relief, lang) : undefined,
      },
    };
    return NextResponse.json(res);
  } catch (e) {
    console.error('[explain]', e);
    return fail(502, 'The explanation service is unavailable right now. Please try again.');
  }
}
