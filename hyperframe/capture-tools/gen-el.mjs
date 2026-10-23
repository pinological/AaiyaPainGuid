import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync('D:/project/AaiyaPainGuid/.env.local', 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#') && l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const key = env.ELEVENLABS_API_KEY, voice = env.ELEVENLABS_VOICE_ID;
const out = '../assets/audio/el/';
const scenes = {
  '01': 'Your thumb hurts. You google it, and get ten scary answers. What if you could just say where it hurts, and get a real plan?',
  '02': "Meet Aaiya Pain Guide. It listens to your pain, finds the muscle, and shows you what to do. It won the People's Choice Award.",
  '03': 'Here is how it works. One: you speak, in English, Nepali, or even Japanese. Two: Jev, a decision model, works out which muscle you mean. Three: DeepSeek writes a short, friendly guide for that exact muscle.',
  '04': 'Say it like you would tell a friend. My right thumb is hurting. The app checks that it is about your body, picks the side, and finds the muscle. Then the camera flies straight there, a smooth G S A P animation on a real three D anatomy model.',
  '05': 'Jev does not just guess. In a single call, it answers three questions. Is this about your body? Left or right? And which muscle? You even see its confidence for every candidate, and can correct it with one tap.',
  '06': 'Then DeepSeek explains that muscle in plain language. What it does. Why it might hurt. Two gentle exercises, with reps. And warning signs that mean it is time to see a doctor. It even adapts to your age, height and weight.',
  '07': "Speak in Nepali, and the whole app follows. The screen, the answer, and the voice that reads it back to you. Let's listen.",
  '08': 'It is built to teach, not to diagnose. No medications, clear red flags every time, and your details are saved only in your own browser.',
  '09': 'Aaiya Pain Guide. Say where it hurts. Move better today.',
};
const ids = Object.keys(scenes);
for (const id of ids) {
  if (process.env.ONLY && process.env.ONLY !== id) continue;
  const i = ids.indexOf(id);
  const body = { text: scenes[id], model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: 1.08 } };
  if (i > 0) body.previous_text = scenes[ids[i - 1]];
  if (i < ids.length - 1) body.next_text = scenes[ids[i + 1]];
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, { method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) { console.log(id, 'FAILED', r.status, JSON.stringify(j).slice(0, 200)); process.exit(1); }
  fs.writeFileSync(`${out}el-${id}.mp3`, Buffer.from(j.audio_base64, 'base64'));
  // word timings from character alignment
  const ch = j.alignment.characters, st = j.alignment.character_start_times_seconds, en = j.alignment.character_end_times_seconds;
  const words = []; let cur = null;
  ch.forEach((c, k) => { if (/\s/.test(c)) { cur = null; return; } if (!cur) { cur = { w: '', s: st[k], e: en[k] }; words.push(cur); } cur.w += c; cur.e = en[k]; });
  fs.writeFileSync(`${out}el-${id}.json`, JSON.stringify(words));
  console.log(id, 'ok', words.length, 'words, ends', en.at(-1).toFixed(2));
}
// the app's own voice: note + relief, exactly the texts the app speaks (English: flash model, Nepali: eleven_v3)
const app = {
  'en-note': ['This muscle swings your thumb outward when you grip or swipe. Heavy phone or mouse use can overwork it, which fits a sore right thumb.', env.ELEVENLABS_MODEL ?? 'eleven_flash_v2_5'],
  'en-relief': ['For relief, try thumb tendon glide: 10 slow reps, 2 times a day. Then gentle thumb stretch: hold 20 seconds, 3 times. Stop if pain increases.', env.ELEVENLABS_MODEL ?? 'eleven_flash_v2_5'],
  'ne-note': ['यो मांसपेशीले समात्दा र स्क्रोल गर्दा औंठालाई बाहिर तान्छ। फोन धेरै चलाउँदा यो थाक्न सक्छ, त्यसैले दाहिने औंठा दुख्न सक्छ।', env.ELEVENLABS_MODEL_NE ?? 'eleven_v3'],
  'ne-relief': ['आराम पाउन यो प्रयास गर्नुहोस्: औंठाको हल्का चाल: १० पटक, दिनमा २ पटक। त्यसपछि औंठाको हल्का तान: २० सेकेन्ड, ३ पटक। दुखाइ बढे रोक्नुहोस्।', env.ELEVENLABS_MODEL_NE ?? 'eleven_v3'],
};
for (const [name, [text, model]] of Object.entries(app)) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify({ text, model_id: model }) });
  if (!r.ok) { console.log('app', name, 'FAILED', r.status, (await r.text()).slice(0, 200)); continue; }
  fs.writeFileSync(`${out}app-${name}.mp3`, Buffer.from(await r.arrayBuffer()));
  console.log('app', name, 'ok', model);
}
