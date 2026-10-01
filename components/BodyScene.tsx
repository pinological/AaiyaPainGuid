'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
// import { Leva } from 'leva'; // lighting tuning panel, see LightRig.tsx
import { Suspense } from 'react';
import { BodyModel } from './BodyModel';
import { CameraRig } from './CameraRig';
import { LightRig } from './LightRig';

export default function BodyScene() {
  // Leva panel (commented out). To re-enable: uncomment this block, the import above and the <Leva /> below,
  // add useEffect/useState to the react import, and use LightRigTunable in LightRig.tsx.
  // const [showPanel, setShowPanel] = useState(false);
  // useEffect(() => {
  //   setShowPanel(process.env.NODE_ENV !== 'production' || new URLSearchParams(location.search).has('leva'));
  // }, []);

  return (
    <>
      <Canvas dpr={[1, 2]} camera={{ fov: 35, position: [0, 1, 3], near: 0.01, far: 100 }} gl={{ antialias: true }}>
        {/* No <Environment>: it fetches an HDR from a CDN and would break offline demos. */}
        <LightRig />
        <Suspense fallback={null}>
          <BodyModel />
        </Suspense>
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
        <CameraRig />
      </Canvas>
      {/* <Leva hidden={!showPanel} collapsed titleBar={{ title: 'Lighting', position: { x: -440, y: 56 } }} /> */}
    </>
  );
}
