import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CAM_DUR, CAM_TARGETS, S } from './constants';

export function createCameraController(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
  let animating = false;
  const from = { p: new THREE.Vector3(), l: new THREE.Vector3() };
  const to = { p: new THREE.Vector3(), l: new THREE.Vector3() };
  let startTime = 0;
  const _center = new THREE.Vector3();

  function animateTo(stateKey: string) {
    const t = CAM_TARGETS[stateKey];
    if (!t) return;
    from.p.copy(camera.position);
    from.l.copy(controls.target);
    to.p.set(...t.p);
    to.l.set(...t.l);
    startTime = performance.now();
    animating = true;
  }

  function update(currentState: string, diceMeshes: THREE.Mesh[]) {
    if (animating) {
      const el = performance.now() - startTime;
      let t = Math.min(el / CAM_DUR, 1);
      t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      camera.position.lerpVectors(from.p, to.p, t);
      controls.target.lerpVectors(from.l, to.l, t);
      if (t >= 1) animating = false;
    }
    if (currentState === S.SETTLE && !animating) {
      _center.set(0, 0, 0);
      diceMeshes.forEach(m => _center.add(m.position));
      _center.divideScalar(5);
      controls.target.lerp(_center, 0.05);
    }
  }

  return { animateTo, update, isAnimating: () => animating };
}
