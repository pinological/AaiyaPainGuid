import { NextResponse } from 'next/server';
import { z } from 'zod';
import { IndexEmptyError, locate } from '@/lib/locate';

export const runtime = 'nodejs';
export const maxDuration = 20;

const Body = z.object({ transcript: z.string().trim().min(1).max(300) });

const fail = (status: number, message: string) => NextResponse.json({ status: 'error', message }, { status });

export async function POST(req: Request) {
  let transcript: string;
  try {
    transcript = Body.parse(await req.json()).transcript;
  } catch {
    return fail(400, 'Bad request.');
  }
  try {
    return NextResponse.json(await locate(transcript));
  } catch (e) {
    if (e instanceof IndexEmptyError) return fail(503, e.message);
    console.error('[locate]', e);
    return fail(502, 'Could not work out the body part right now. Try again or click the model.');
  }
}
