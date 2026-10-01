// Client-side map of raw part name -> the meshes that make it up (filled by BodyModel).
import * as THREE from 'three';
import type { Part } from './partName';

export interface PartEntry {
  raw: string;
  part: Part;
  meshes: THREE.Mesh[];
  mats: THREE.Material[];
}

export const partRegistry = new Map<string, PartEntry>();

export function entryBox(entry: PartEntry): THREE.Box3 {
  const box = new THREE.Box3();
  for (const m of entry.meshes) box.expandByObject(m);
  return box;
}
