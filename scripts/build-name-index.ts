import './_env';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isExcluded } from '../lib/config';
import { parsePart, type Part } from '../lib/partName';

// Reads the raw node names straight from the GLB's JSON chunk: no decoding and no
// sanitizing, so it also works for Draco/Meshopt files. (Same names GLTFLoader keeps in userData.name.)
const SRC = 'public/model/body.glb';
const OUT = 'data/parts.generated.json';

const buf = readFileSync(resolve(process.cwd(), SRC));
if (buf.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${SRC} is not a binary glTF (.glb)`);
const jsonLen = buf.readUInt32LE(12);
if (buf.toString('ascii', 16, 20) !== 'JSON') throw new Error('First GLB chunk is not JSON');
const gltf = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen)) as {
  nodes?: { name?: string; mesh?: number; extras?: { raw_name?: string } }[];
};

const seen = new Set<string>();
const parts: Part[] = [];
let excluded = 0;
let duplicates = 0;
let empty = 0;
let meshNodes = 0;

for (const node of gltf.nodes ?? []) {
  if (node.mesh === undefined) continue;
  meshNodes++;
  const raw = node.extras?.raw_name ?? node.name;
  if (!raw) {
    empty++;
    continue;
  }
  if (isExcluded(raw)) {
    excluded++;
    continue;
  }
  if (seen.has(raw)) {
    duplicates++;
    console.warn(`warn: duplicate raw name "${raw}"`);
    continue;
  }
  seen.add(raw);
  const part = parsePart(raw);
  if (!part.display) {
    console.warn(`warn: "${raw}" parses to an empty display name`);
    continue;
  }
  parts.push(part);
}

writeFileSync(
  resolve(process.cwd(), OUT),
  JSON.stringify({ generatedFrom: SRC, count: parts.length, parts }, null, 1) + '\n',
);

const bases = new Set(parts.map((p) => p.base)).size;
console.log(
  `${meshNodes} mesh nodes -> ${parts.length} parts (${bases} unique left/right-merged) | excluded ${excluded}, duplicates ${duplicates}, unnamed ${empty}`,
);
console.log(`wrote ${OUT}`);
