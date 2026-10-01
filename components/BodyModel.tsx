'use client';

import { Bvh, Html, useAnimations, useGLTF } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { selectPart } from '@/lib/actions';
import { isExcluded } from '@/lib/config';
import { translate } from '@/lib/i18n';
import { localName } from '@/lib/partNames';
import { parsePart, rawNameOf } from '@/lib/partName';
import { partRegistry } from '@/lib/registry';
import { useStore } from '@/lib/store';

useGLTF.setDecoderPath('/draco/'); // copied from three by scripts/copy-draco.mjs, works offline

const HIGHLIGHT = '#ff5a3c';
const isMesh = (o: THREE.Object3D): o is THREE.Mesh => (o as THREE.Mesh).isMesh === true;

/** The node carrying the authored name (GLTFLoader keeps it in userData.name; object.name is sanitized). */
function namedAncestor(o: THREE.Object3D | null): THREE.Object3D | null {
  for (; o; o = o.parent) {
    const v = o.userData?.raw_name ?? o.userData?.name;
    if (typeof v === 'string' && v) return o;
  }
  return null;
}

const materialsOf = (m: THREE.Mesh) => (Array.isArray(m.material) ? m.material : [m.material]);

export function BodyModel() {
  const { scene, animations } = useGLTF('/model/body.glb');
  const selectedRaw = useStore((s) => s.selectedRaw);
  const related = useStore((s) => s.relatedRaws);
  const focus = useStore((s) => s.focusMode);
  const activeClip = useStore((s) => s.activeClip);
  const aiWorking = useStore((s) => s.status === 'explaining');
  const speaking = useStore((s) => s.speaking && !s.voiceLoading); // blink only while sound is actually playing
  // The exercise summary is the segment that contains the card's relief text (alone, or at the end of the read-aloud card)
  const exercising = useStore((s) => {
    const relief = s.card?.relief?.replace(/\s+/g, ' ').trim();
    return s.speaking && !s.voiceLoading && !!relief && !!s.speakingText?.includes(relief);
  });
  const [hover, setHover] = useState<{ raw: string; point: THREE.Vector3 } | null>(null);
  const applied = useRef(new Map<string, { glow: number; opacity: number; pulse: false | 'work' | 'speak' | 'group' }>());

  // Register parts, clone materials (the model shares one), and report the whole-body box.
  // (An effect, declared before the glow effect, so the registry is filled first and the store isn't set during render.)
  useEffect(() => {
    partRegistry.clear();
    applied.current.clear();
    scene.updateMatrixWorld(true);
    scene.traverse((obj) => {
      if (!isMesh(obj)) return;
      const root = namedAncestor(obj);
      const raw = root ? rawNameOf(root.userData, root.name) : obj.name;
      if (!raw) return;
      if (isExcluded(raw)) {
        obj.raycast = () => {}; // visible but never picked: clicks pass through
        return;
      }
      if (!obj.userData.cloned) {
        obj.material = Array.isArray(obj.material) ? obj.material.map((m) => m.clone()) : obj.material.clone();
        obj.userData.cloned = true;
      }
      const mats = materialsOf(obj);
      for (const m of mats) {
        const mat = m as THREE.MeshStandardMaterial;
        if (mat.emissive) {
          mat.emissive.set(HIGHLIGHT);
          mat.emissiveIntensity = 0;
        }
      }
      obj.userData.partRaw = raw;
      let entry = partRegistry.get(raw);
      if (!entry) partRegistry.set(raw, (entry = { raw, part: parsePart(raw), meshes: [], mats: [] }));
      entry.meshes.push(obj);
      entry.mats.push(...mats);
    });
    const box = new THREE.Box3().setFromObject(scene);
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    useStore.getState().set({ bodyInfo: { center: [c.x, c.y, c.z], size: [s.x, s.y, s.z] } });
  }, [scene]);

  // Selected / related glow, hover tint and focus-mode dimming.
  useEffect(() => {
    const relSet = new Set(related);
    partRegistry.forEach((entry, raw) => {
      const isSel = raw === selectedRaw;
      const isRel = relSet.has(raw);
      const glow = isSel ? 0.8 : isRel ? 0.3 : raw === hover?.raw ? 0.22 : 0;
      const opacity = focus && !isSel && !isRel ? 0.3 : 1;
      // While the AI is writing the card the selected part breathes; while the voice is speaking it blinks
      // faster and brighter. It settles when both are done.
      // While the exercises are being suggested (the relief summary), the whole muscle group blinks with it.
      const pulse = isSel ? (speaking ? 'speak' : aiWorking ? 'work' : false) : isRel && exercising ? 'group' : false;
      const prev = applied.current.get(raw);
      if (prev && prev.glow === glow && prev.opacity === opacity && prev.pulse === pulse) return;
      applied.current.set(raw, { glow, opacity, pulse });
      for (const m of entry.mats) {
        const mat = m as THREE.MeshStandardMaterial;
        if (opacity < 1 && !mat.transparent) {
          mat.transparent = true;
          mat.depthWrite = false;
          mat.needsUpdate = true;
        }
        if (pulse) {
          const speak = pulse === 'speak' || pulse === 'group'; // same beat, the group a little softer
          gsap.fromTo(
            mat,
            { emissiveIntensity: speak ? 0.05 : 0.2 },
            { emissiveIntensity: pulse === 'group' ? 1.1 : speak ? 1.8 : 1, duration: speak ? 0.32 : 0.55, ease: 'sine.inOut', yoyo: true, repeat: -1, overwrite: 'auto' },
          );
          continue;
        }
        gsap.to(mat, {
          emissiveIntensity: glow,
          opacity,
          duration: 0.35,
          overwrite: 'auto',
          onComplete: () => {
            if (opacity === 1 && mat.transparent) {
              mat.transparent = false;
              mat.depthWrite = true;
              mat.needsUpdate = true;
            }
          },
        });
      }
    });
  }, [selectedRaw, related, focus, hover, aiWorking, speaking, exercising]);

  // Baked clips (stretch): expose names to the panel, play the chosen one.
  const { actions, names } = useAnimations(animations, scene);
  useEffect(() => {
    useStore.getState().set({ clips: names });
  }, [names]);
  useEffect(() => {
    Object.values(actions).forEach((a) => a?.fadeOut(0.2));
    if (activeClip) actions[activeClip]?.reset().fadeIn(0.2).play();
  }, [activeClip, actions]);

  const rawOf = (o: THREE.Object3D) => o.userData.partRaw as string | undefined;

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return; // it was an orbit drag, not a click
    const raw = rawOf(e.object);
    if (!raw) return;
    e.stopPropagation(); // front-most hit only
    void selectPart(raw);
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const raw = rawOf(e.object);
    if (!raw) return;
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    setHover((h) => (h?.raw === raw ? h : { raw, point: e.point.clone() }));
  };
  const onOut = (e: ThreeEvent<PointerEvent>) => {
    const raw = rawOf(e.object);
    setHover((h) => (h && h.raw === raw ? null : h));
    document.body.style.cursor = '';
  };

  const lang = useStore((s) => s.lang);
  const tSide = (s: 'left' | 'right') => translate(lang, s === 'left' ? 'sideLeft' : 'sideRight');
  const tip = hover && partRegistry.get(hover.raw)?.part;

  return (
    <>
      <Bvh firstHitOnly>
        <primitive object={scene} onClick={onClick} onPointerMove={onMove} onPointerOut={onOut} />
      </Bvh>
      {hover && tip && (
        <Html position={hover.point} style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
          <div className="tooltip">
            {localName(tip.raw, lang)}
            {tip.side !== 'center' && <span> · {tSide(tip.side)}</span>}
          </div>
        </Html>
      )}
    </>
  );
}
