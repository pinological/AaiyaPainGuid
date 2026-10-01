import { z } from 'zod';
import { openAudio, verifySpeech } from '@/lib/speech';

export const runtime = 'nodejs';
export const maxDuration = 60;

const Query = z.object({
  text: z.string().min(1).max(500),
  lang: z.enum(['en', 'ne', 'ja']).default('en'),
  sig: z.string().min(10).max(128),
});

const fail = (status: number, message: string) => Response.json({ status: 'error', message }, { status });

// GET, so an <audio> element can use this URL as its source and start playing while the audio is still being generated.
export async function GET(req: Request) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return fail(400, 'Bad request.');
  const { text, lang, sig } = parsed.data;
  if (!verifySpeech(text, lang, sig)) return fail(403, 'This text was not issued by the server.');
  try {
    const src = await openAudio(text, lang, sig);
    const headers = { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' };
    return 'cached' in src
      ? new Response(new Uint8Array(src.cached), { headers: { ...headers, 'Content-Length': String(src.cached.length) } })
      : new Response(src.stream, { headers });
  } catch (e) {
    console.error('[tts]', e);
    return fail(502, 'Text to speech is unavailable right now.');
  }
}
