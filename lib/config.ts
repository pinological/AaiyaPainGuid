// Tested against the raw node name (underscores, not spaces, in Muscle.glb) and the display name.
export const EXCLUDE_PATTERNS = [/^Skin/i, /label/i]; // never clickable
// Clickable, but not offered to voice mode. Jev accepts at most 255 choices per question, and
// Muscle.glb has 272 once bursae/septa/fascia are gone, so tendons, sheaths and ligaments go too (250).
export const DEPRIORITIZE_PATTERNS = [/bursa/i, /septum/i, /fascia/i, /tendon/i, /ligament/i];

export const isExcluded = (raw: string) => EXCLUDE_PATTERNS.some((re) => re.test(raw));

// Optional: link baked GLB animation clips to parts, keyed by display name (stretch goal).
export const CLIP_BY_PART: Record<string, string> = {};

// The always-included red flags live in lib/i18n.ts (RED_FLAGS), one list per language.
