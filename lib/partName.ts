export interface Part {
  raw: string; // identity key, exactly as named in Blender / the GLB: "(Abdominal_part_of_pectoralis_major_muscle).l"
  display: string; // "Abdominal part of pectoralis major muscle"
  side: 'left' | 'right' | 'center';
  base: string; // side-less key for grouping: "abdominal part of pectoralis major muscle"
}

export function parsePart(raw: string): Part {
  let s = raw.trim();
  let side: Part['side'] = 'center';
  s = s.replace(/\.\d{3}$/, ''); // Blender duplicate suffix ".001"
  const m = s.match(/\.(l|r)$/i);
  if (m) {
    side = m[1].toLowerCase() === 'l' ? 'left' : 'right';
    s = s.slice(0, -2);
  }
  s = s.replace(/\.\d{3}$/, ''); // duplicate suffix written before the side marker
  s = s.replace(/^\((.*)\)$/, '$1'); // outer parentheses
  // The exporter writes spaces as underscores (Muscle.glb does), so undo that for display.
  const display = s.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  return { raw, display, side, base: display.toLowerCase() };
}

/** Raw node name as authored. GLTFLoader sanitizes `object.name`, so read userData instead. */
export function rawNameOf(userData: Record<string, unknown> | undefined, fallback: string): string {
  const v = userData?.raw_name ?? userData?.name;
  return typeof v === 'string' && v ? v : fallback;
}
