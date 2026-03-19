import * as THREE from 'three';
import { noiseTex, bumpTex } from './textures';
import { TABLE_SIZE, TABLE_HALF, RAIL_R } from './constants';

export function createTable(): THREE.Group {
  const g = new THREE.Group();
  const felt = new THREE.Mesh(
    new THREE.PlaneGeometry(TABLE_SIZE, TABLE_SIZE),
    new THREE.MeshStandardMaterial({
      map: noiseTex('#2d5a27', 512, 15, 6),
      bumpMap: bumpTex(256, 40, 6),
      bumpScale: 0.02,
      roughness: 0.9,
    }),
  );
  felt.rotation.x = -Math.PI / 2;
  felt.receiveShadow = true;
  g.add(felt);

  const railMat = new THREE.MeshStandardMaterial({
    color: 0x3a1d0a, roughness: 0.4, metalness: 0.15,
    map: noiseTex('#2a1505', 256, 20, 6),
    bumpMap: bumpTex(256, 45, 6),
    bumpScale: 0.02,
  });
  const railGeo = new THREE.CapsuleGeometry(RAIL_R, TABLE_SIZE + RAIL_R * 2, 4, 16);

  [-(TABLE_HALF + RAIL_R), TABLE_HALF + RAIL_R].forEach(z => {
    const m = new THREE.Mesh(railGeo, railMat);
    m.rotation.z = Math.PI / 2;
    m.position.set(0, RAIL_R, z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  });
  [-(TABLE_HALF + RAIL_R), TABLE_HALF + RAIL_R].forEach(x => {
    const m = new THREE.Mesh(railGeo, railMat);
    m.rotation.x = Math.PI / 2;
    m.position.set(x, RAIL_R, 0);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  });

  return g;
}
