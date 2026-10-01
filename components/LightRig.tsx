'use client';

// Lighting values tuned in the Leva panel and baked in below.
// To tune again: uncomment the Leva block at the bottom of this file and the <Leva /> panel in BodyScene.tsx,
// swap the static <LightRig> for <LightRigTunable>, then use "Copy values" and paste the JSON back in here.

const HEMI = { skyColor: '#ffffff', groundColor: '#b9b2a5', intensity: 3.55 };
const KEY = { color: '#ffffff', intensity: 5.35, position: [-1.9, 4.3, 3.1] as const };
const BACK = { color: '#ffffff', intensity: 1.55, position: [1.7, 2.4, -2.2] as const };
// Render exposure stays at three's default of 1.

export function LightRig() {
  return (
    <>
      <hemisphereLight args={[HEMI.skyColor, HEMI.groundColor, HEMI.intensity]} />
      <directionalLight color={KEY.color} intensity={KEY.intensity} position={[...KEY.position]} />
      <directionalLight color={BACK.color} intensity={BACK.intensity} position={[...BACK.position]} />
    </>
  );
}

/* --- Leva tuning version (commented out) ---------------------------------------------------------------

import { useThree } from '@react-three/fiber';
import { button, useControls } from 'leva';
import { useEffect, useRef } from 'react';

export function LightRigTunable() {
  const gl = useThree((s) => s.gl);
  const latest = useRef<Record<string, unknown>>({});

  const hemi = useControls('Hemisphere light', {
    skyColor: HEMI.skyColor,
    groundColor: HEMI.groundColor,
    intensity: { value: HEMI.intensity, min: 0, max: 5, step: 0.05 },
  });
  const key = useControls('Key light', {
    color: KEY.color,
    intensity: { value: KEY.intensity, min: 0, max: 10, step: 0.05 },
    x: { value: KEY.position[0], min: -10, max: 10, step: 0.1 },
    y: { value: KEY.position[1], min: -10, max: 10, step: 0.1 },
    z: { value: KEY.position[2], min: -10, max: 10, step: 0.1 },
  });
  const fill = useControls('Back / rim light', {
    color: BACK.color,
    intensity: { value: BACK.intensity, min: 0, max: 10, step: 0.05 },
    x: { value: BACK.position[0], min: -10, max: 10, step: 0.1 },
    y: { value: BACK.position[1], min: -10, max: 10, step: 0.1 },
    z: { value: BACK.position[2], min: -10, max: 10, step: 0.1 },
  });
  const render = useControls('Render', {
    exposure: { value: 1, min: 0.1, max: 3, step: 0.05 },
  });

  latest.current = { hemisphere: hemi, key, back: fill, render };
  useControls('Export', {
    'Copy values': button(() => void navigator.clipboard?.writeText(JSON.stringify(latest.current, null, 2))),
  });

  useEffect(() => {
    gl.toneMappingExposure = render.exposure;
  }, [gl, render.exposure]);

  return (
    <>
      <hemisphereLight args={[hemi.skyColor, hemi.groundColor, hemi.intensity]} />
      <directionalLight color={key.color} intensity={key.intensity} position={[key.x, key.y, key.z]} />
      <directionalLight color={fill.color} intensity={fill.intensity} position={[fill.x, fill.y, fill.z]} />
    </>
  );
}

-------------------------------------------------------------------------------------------------------- */
