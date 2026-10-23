---
workflow: general-video
flow: automation
storyboard: no
message: "Say where it hurts. Aaiya Pain Guide finds the muscle and shows you what to do."
destination: tiktok-reels-linkedin
aspect: 1080x1920
language: en
audience: office workers, LinkedIn network
length: 90s
angle: product demo + how-it-works explainer
---

## Intent

Showcase of Aaiya Pain Guide, the People's Choice Award winner. A 1.5 minute vertical
video (TikTok / Instagram Reels / LinkedIn) that shows the real app UI and explains the pipeline: speak (English /
Nepali / Japanese) -> Jev (typesafe/jev-1.13 Decisions API) picks the muscle -> DeepSeek writes the card ->
gentle exercises. Informative and polished, GSAP motion, infographics.

## Assets

- assets/captures/*.png — real app screenshots (Chrome headless, 430x932 @2.5x, dark theme)
- assets/audio/vo-01..09.wav — Kokoro (af_heart) narration, one file per scene
- assets/fonts — Fraunces + Noto Sans Devanagari, copied from the app's own build output

## Customizations

- Look matches the app: warm near-black, one coral accent, Fraunces serif voice + JetBrains Mono data voice.
- Scene length is driven by real voice duration.

## Notes

- Fact-checked against the code: DeepSeek writes the card from the part name + profile (it does NOT browse the web).
- The OpenRouter key in .env.local had expired when captured, so Jev / DeepSeek responses in the captured UI are
  mocked in the app's own response schema (see capture-tools/mock.mjs). Re-capture with a live key for 100% real output.
- Safe zones: keep text inside x 60-960 and y 200-1560 (TikTok / Reels UI).
