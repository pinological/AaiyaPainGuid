// Serve the Draco decoder locally so the model loads with Wi-Fi off.
import { cpSync, existsSync, mkdirSync } from 'node:fs';

const src = 'node_modules/three/examples/jsm/libs/draco/gltf';
if (existsSync(src)) {
  mkdirSync('public/draco', { recursive: true });
  cpSync(src, 'public/draco', { recursive: true });
}
