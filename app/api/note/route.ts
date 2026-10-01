import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateNote } from '@/lib/explain';
import { getPartByRaw } from '@/lib/parts';
import { ProfileSchema, toProfile } from '@/lib/profile';
import { makeSpeech } from '@/lib/speech';
import { demoUser } from '@/lib/user';
import type { NoteResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

// The two short spoken sentences for a search, on their own route so they do not wait for the (slower) full card.
const Body = z.object({
  raw: z.string().min(1).max(200),
  transcript: z.string().min(1).max(300),
  profile: ProfileSchema.optional(),
  lang: z.enum(['en', 'ne', 'ja']).default('en'),
});

const fail = (status: number, message: string) => NextResponse.json({ status: 'error', message }, { status });

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return fail(400, 'Bad request.');
  }
  const part = getPartByRaw(body.raw);
  if (!part) return fail(404, 'Unknown part.');
  try {
    const note = await generateNote(
      { display: part.display, side: part.side, transcript: body.transcript.trim(), lang: body.lang },
      body.profile ? toProfile(body.profile) : demoUser,
    );
    const res: NoteResponse = { note, speech: makeSpeech(note, body.lang) };
    return NextResponse.json(res);
  } catch (e) {
    console.error('[note]', e);
    return fail(502, 'Could not write the note right now.');
  }
}
