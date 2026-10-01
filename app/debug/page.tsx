'use client';

// Milestone 1: confirm GLTFLoader keeps the authored names in userData.name.
import { useEffect, useState } from 'react';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

interface Row {
  name: string;
  userDataName: unknown;
  rawName: unknown;
}

export default function Debug() {
  const [rows, setRows] = useState<Row[]>([]);
  const [meshCount, setMeshCount] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.setDRACOLoader(new DRACOLoader().setDecoderPath('/draco/'));
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      '/model/body.glb',
      (gltf) => {
        const all: Row[] = [];
        gltf.scene.traverse((o) => {
          if ((o as { isMesh?: boolean }).isMesh) all.push({ name: o.name, userDataName: o.userData.name, rawName: o.userData.raw_name });
        });
        setMeshCount(all.length);
        // prefer meshes whose name got mangled, those are the interesting ones
        const odd = all.filter((r) => typeof r.userDataName === 'string' && r.userDataName !== r.name);
        setRows([...odd, ...all].slice(0, 10));
      },
      undefined,
      (e) => setError(String(e)),
    );
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: 'monospace' }}>
      <h1>Name check</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <p>{meshCount === null ? 'Loading…' : `${meshCount} meshes`}</p>
      <table cellPadding={6}>
        <thead>
          <tr>
            <th align="left">object.name (sanitized)</th>
            <th align="left">userData.name (identity)</th>
            <th align="left">userData.raw_name</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.name}</td>
              <td style={{ color: r.userDataName ? 'green' : 'crimson' }}>{String(r.userDataName ?? 'MISSING')}</td>
              <td>{String(r.rawName ?? '-')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Pass when userData.name shows the exact Blender names, including .l/.r and parentheses.</p>
    </main>
  );
}
