import * as THREE from 'three';
import { noiseTex, bumpTex, leatherTex, leatherBump } from './textures';
import { CUP_BR, CUP_TR, CUP_H } from './constants';

export function createCupVisual(): THREE.Group {
  const _leatherMap = leatherTex(512), _leatherBumpMap = leatherBump(512);
  const cupOuterMat = new THREE.MeshStandardMaterial({
    color: 0x111111, roughness: 0.85, metalness: 0.05, side: THREE.FrontSide,
    map: _leatherMap, bumpMap: _leatherBumpMap, bumpScale: 0.04,
  });
  const cupInnerMat = new THREE.MeshStandardMaterial({
    color: 0x111111, roughness: 0.85, metalness: 0.05, side: THREE.BackSide,
    map: _leatherMap, bumpMap: _leatherBumpMap, bumpScale: 0.04,
  });
  const cupBottomMat = new THREE.MeshStandardMaterial({
    color: 0xaa2222, roughness: 0.8, metalness: 0.05,
    map: noiseTex('#882222', 256, 12), bumpMap: bumpTex(256, 25), bumpScale: 0.015,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4a843, roughness: 0.2, metalness: 0.85,
  });

  const cupGroup = new THREE.Group();
  const cupOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(CUP_TR, CUP_BR, CUP_H, 48, 1, true), cupOuterMat,
  );
  cupOuter.castShadow = true;
  cupOuter.position.y = CUP_H / 2;
  cupGroup.add(cupOuter);

  const cupInner = new THREE.Mesh(
    new THREE.CylinderGeometry(CUP_TR - 0.08, CUP_BR - 0.08, CUP_H - 0.05, 48, 1, true), cupInnerMat,
  );
  cupInner.position.y = CUP_H / 2 + 0.025;
  cupGroup.add(cupInner);

  const cupBottomViz = new THREE.Mesh(new THREE.CircleGeometry(CUP_BR - 0.08, 48), cupBottomMat);
  cupBottomViz.rotation.x = -Math.PI / 2;
  cupBottomViz.position.y = 0.03;
  cupBottomViz.castShadow = true;
  cupGroup.add(cupBottomViz);

  const cupBottomExt = new THREE.Mesh(new THREE.CircleGeometry(CUP_BR, 48), cupOuterMat);
  cupBottomExt.rotation.x = Math.PI / 2;
  cupBottomExt.position.y = 0.01;
  cupBottomExt.castShadow = true;
  cupGroup.add(cupBottomExt);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(CUP_TR, 0.05, 12, 48), goldMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = CUP_H;
  cupGroup.add(rim);

  const band = new THREE.Mesh(new THREE.TorusGeometry((CUP_TR + CUP_BR) / 2 + 0.08, 0.02, 8, 48), goldMat);
  band.rotation.x = Math.PI / 2;
  band.position.y = CUP_H * 0.55;
  cupGroup.add(band);

  const baseRim = new THREE.Mesh(new THREE.TorusGeometry(CUP_BR + 0.02, 0.035, 8, 48), goldMat);
  baseRim.rotation.x = Math.PI / 2;
  baseRim.position.y = 0.02;
  cupGroup.add(baseRim);

  return cupGroup;
}
