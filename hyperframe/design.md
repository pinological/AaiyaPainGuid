# Aaiya Pain Guide — video design

Brand truth is the app itself (app/globals.css): calm anatomy-atlas look, dark theme, one coral accent.

## Palette
- bg `#151412` (warm near-black) · panel `#1c1a17` · surface `#26231f` · line `#3a3630`
- ink `#f1ede4` · muted `#b2aa9c`
- accent `#ff7a59` (coral) · accent-soft `#3a2219` · paper `#efeae0` (used for light callouts)
- muscle red `#c4301f` only inside screenshots / anatomy art

## Type
- Statements: **Fraunces** (variable 300-900), the app's own display face. Nepali: Noto Sans Devanagari.
- Data / labels / pipeline: **JetBrains Mono** (bundled by HyperFrames).
- Video sizes: headlines 96-150px, body 40-52px, mono labels 26-32px.

## Motion
- GSAP, 0.45-0.9s, expo/power3/back eases, staggers, line draws, count-ups, camera-style push-ins on screenshots.
- Ambient: slow coral glow breathing, drifting ghost words, scanline-free, no gradients on the full background.

## Do / Don't
- Do keep text in safe zones (x 60-960, y 200-1560). Do show the real UI in most scenes.
- Don't claim DeepSeek searches the web. Don't present mocked card text as clinical advice.
