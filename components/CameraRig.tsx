'use client';

import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { entryBox, partRegistry } from '@/lib/registry';
import { useStore } from '@/lib/store';

// Registers flyTo(raw) / resetView() in the store. Renders nothing.
export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const bodyInfo = useStore((s) => s.bodyInfo);

  useEffect(() => {
    if (!bodyInfo || !controls) return;
    const bodyCenter = new THREE.Vector3(...bodyInfo.center);
    const h = bodyInfo.size[1];

    // Everything scales off the body height so the rig works whatever units the model uses.
    camera.near = h / 1000;
    camera.far = h * 60;
    camera.updateProjectionMatrix();
    controls.minDistance = h * 0.04;
    controls.maxDistance = h * 4;

    // Fit the whole body in view (height and width, whatever the canvas aspect), with room for the voice dock.
    const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const fitH = (h * 1.3) / (2 * halfTan);
    const fitW = (bodyInfo.size[0] * 1.2) / (2 * halfTan * camera.aspect);
    const homeDist = Math.max(fitH, fitW);
    controls.maxDistance = Math.max(h * 4, homeDist * 1.5);
    const home = {
      pos: bodyCenter.clone().add(new THREE.Vector3(0, h * 0.03, homeDist)), // glTF +Z is the front
      target: bodyCenter.clone().add(new THREE.Vector3(0, -h * 0.04, 0)),
    };
    camera.position.copy(home.pos);
    controls.target.copy(home.target);
    controls.update();

    // The heavy model can drop frames on weak GPUs; without this GSAP slows animations down instead of skipping ahead.
    gsap.ticker.lagSmoothing(0);
    const raycaster = new THREE.Raycaster();
    let tl: gsap.core.Timeline | null = null;
    const fly = (pos: THREE.Vector3, target: THREE.Vector3) => {
      tl?.kill();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        camera.position.copy(pos);
        controls.target.copy(target);
        controls.enabled = true;
        controls.update();
        return;
      }
      controls.enabled = false;
      tl = gsap.timeline({
        defaults: { duration: 1.1, ease: 'power3.inOut' },
        onUpdate: () => controls.update(),
        onComplete: () => {
          controls.enabled = true;
        },
      });
      tl.to(camera.position, { x: pos.x, y: pos.y, z: pos.z }, 0).to(controls.target, { x: target.x, y: target.y, z: target.z }, 0);
    };

    const flyTo = (raw: string) => {
      const entry = partRegistry.get(raw);
      if (!entry) return;
      const box = entryBox(entry);
      if (box.isEmpty()) return;
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Approach from whichever side (front or back) has fewer other muscles between the camera and the part,
      // so the popliteus is framed from behind and the biceps from the front. Ties go to the front. A slight
      // lateral angle keeps limbs from looking flat.
      const others = [...partRegistry.values()].filter((e) => e !== entry).flatMap((e) => e.meshes);
      const lateral = (center.x - bodyCenter.x) * 0.35;
      const approach = (sign: number) => new THREE.Vector3(lateral, 0, sign).normalize();
      const blockers = (sign: number) => {
        const from = center.clone().addScaledVector(approach(sign), h * 1.5);
        raycaster.set(from, center.clone().sub(from).normalize());
        raycaster.far = from.distanceTo(center);
        return raycaster.intersectObjects(others, false).length;
      };
      const dir = approach(blockers(-1) < blockers(1) ? -1 : 1);

      const fov = THREE.MathUtils.degToRad(camera.fov);
      const fit = (Math.max(size.x, size.y, size.z) / (2 * Math.tan(fov / 2))) * 2.2;
      const distance = THREE.MathUtils.clamp(fit, h * 0.12, h * 2.5);
      const pos = center.clone().addScaledVector(dir, distance).add(new THREE.Vector3(0, size.y * 0.2, 0));
      fly(pos, center);
    };

    useStore.getState().set({ flyTo, resetView: () => fly(home.pos, home.target) });
    return () => {
      tl?.kill();
      controls.enabled = true;
      useStore.getState().set({ flyTo: null, resetView: null });
    };
  }, [bodyInfo, controls, camera]);

  return null;
}
