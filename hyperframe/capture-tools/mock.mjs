import fs from 'node:fs';
const i18n = fs.readFileSync('D:/project/AaiyaPainGuid/lib/i18n.ts', 'utf8');
const flags = (lang) => { const start = i18n.indexOf('export const RED_FLAGS'); const sub = i18n.slice(start); const a = sub.indexOf(lang + ': ['); const b = sub.indexOf(']', a); return [...sub.slice(a, b).matchAll(/'([^']+)'/g)].map(x => x[1]); };
const R = 'Abductor_pollicis_longus.r';
const rel = (raws) => raws.map(r => ({ raw: r, display: r.replace(/\.[lr]$/, '').replace(/_/g, ' ') }));
export const decision = {
  status: 'ok', raw: R, display: 'Abductor pollicis longus', side: 'right', sideAssumed: false,
  confidence: 0.71, probability: 0.62, bodyProb: 0.98, lowConfidence: false,
  alternatives: [
    { raw: R, display: 'Abductor pollicis longus', side: 'right', p: 0.62 },
    { raw: 'Extensor_pollicis_brevis.r', display: 'Extensor pollicis brevis', side: 'right', p: 0.15 },
    { raw: 'Flexor_pollicis_longus.r', display: 'Flexor pollicis longus', side: 'right', p: 0.1 },
    { raw: 'Opponens_pollicis_muscle.r', display: 'Opponens pollicis muscle', side: 'right', p: 0.07 },
    { raw: 'Abductor_pollicis_brevis.r', display: 'Abductor pollicis brevis', side: 'right', p: 0.04 },
  ],
};
const sp = (text, lang) => ({ text, lang });
export const EN = {
  note: 'This muscle swings your thumb outward when you grip or swipe. Heavy phone or mouse use can overwork it, which fits a sore right thumb.',
  relief: 'To ease it, try a thumb tendon glide and a gentle thumb stretch.',
  card: {
    title: 'Abductor pollicis longus', structure_type: 'muscle',
    summary: 'A slender forearm muscle that pulls the thumb outward, helping you grip, pinch and swipe.',
    what_it_does: ['Moves the thumb away from the palm', 'Steadies the wrist while you pinch or grip'],
    why_it_might_hurt: ['Repetitive phone or mouse use overloads its tendon', 'Gripping or wringing with a bent wrist', 'A sudden jump in activity, like gaming or lifting'],
    exercises: [
      { name: 'Thumb Tendon Glide', how: 'Open your hand, then slowly bend the thumb across the palm and back.', dose: '10 slow reps, 2 times a day', caution: 'Stop if sharp pain appears.' },
      { name: 'Gentle Thumb Stretch', how: 'Tuck the thumb into a loose fist and tilt the wrist toward the little finger until you feel a mild pull.', dose: 'Hold 20 seconds, 3 times', caution: 'Keep it mild, never forced.' },
    ],
    red_flags: ['Pain that does not ease after two weeks', ...flags('en')].slice(0, 6),
    related: rel(['Extensor_pollicis_brevis.r', 'Flexor_pollicis_longus.r', 'Opponens_pollicis_muscle.r']),
  },
};
export const NE = {
  note: 'यो मांसपेशीले समात्दा र स्क्रोल गर्दा औंठालाई बाहिर तान्छ। फोन धेरै चलाउँदा यो थाक्न सक्छ, त्यसैले दाहिने औंठा दुख्न सक्छ।',
  relief: 'आराम पाउन औंठाको हल्का चाल र हल्का तान गरेर हेर्नुहोस्।',
  card: {
    title: 'औंठा बाहिर तान्ने लामो मांसपेशी', structure_type: 'muscle',
    summary: 'हातको तल्लो भागको पातलो मांसपेशीले औंठालाई बाहिर तान्छ, समात्न र चिमट्न मद्दत गर्छ।',
    what_it_does: ['औंठालाई हत्केलाबाट टाढा सार्छ', 'समात्दा नाडीलाई स्थिर राख्छ'],
    why_it_might_hurt: ['फोन वा माउस धेरै चलाउँदा थकान', 'नाडी बाङ्गो पारेर कडा समात्दा', 'अचानक धेरै काम गर्दा'],
    exercises: [
      { name: 'औंठाको हल्का चाल', how: 'हात खोलेर औंठालाई बिस्तारै हत्केलातिर झुकाउनुहोस् र फर्काउनुहोस्।', dose: '१० पटक, दिनमा २ पटक', caution: 'तीव्र दुखाइ भए रोक्नुहोस्।' },
      { name: 'औंठाको हल्का तान', how: 'औंठालाई हल्का मुठीभित्र राखी नाडीलाई कान्छी औंलातिर बिस्तारै झुकाउनुहोस्।', dose: '२० सेकेन्ड, ३ पटक', caution: 'हल्का तान मात्र, जबरजस्ती नगर्नुहोस्।' },
    ],
    red_flags: flags('ne').slice(0, 5),
    related: rel(['Extensor_pollicis_brevis.r', 'Flexor_pollicis_longus.r']),
  },
};
export function explainBody(d, lang) {
  return { part: { raw: R, display: 'Abductor pollicis longus', side: 'right' }, card: d.card, cached: false, relief: d.relief,
    speech: { card: sp(d.note, lang), relief: sp(d.relief, lang) } };
}
export const noteBody = (d, lang) => ({ note: d.note, speech: sp(d.note, lang) });
