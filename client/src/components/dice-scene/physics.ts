import * as CANNON from 'cannon-es';
import {
  DICE_HALF, TABLE_HALF, RAIL_R,
  CUP_BR, CUP_TR, CUP_H,
  WALL_SEGS, WALL_RINGS, WALL_DEPTH,
} from './constants';

export interface PhysicsWorldResult {
  world: CANNON.World;
  diceBodies: CANNON.Body[];
  cupBody: CANNON.Body;
}

export function createPhysicsWorld(dicePositions: [number, number, number][]): PhysicsWorldResult {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = false;
  world.defaultContactMaterial.friction = 0.4;
  world.defaultContactMaterial.restitution = 0.2;

  const gndMat = new CANNON.Material('gnd');
  const gndBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane(), material: gndMat });
  gndBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(gndBody);

  const tw = TABLE_HALF + RAIL_R;
  const wallDefs: [number, number, number, number, number, number][] = [
    [0, 1.5, -tw, tw, 1.5, 0.3], [0, 1.5, tw, tw, 1.5, 0.3],
    [-tw, 1.5, 0, 0.3, 1.5, tw], [tw, 1.5, 0, 0.3, 1.5, tw],
  ];
  wallDefs.forEach(([x, y, z, hx, hy, hz]) => {
    const b = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Box(new CANNON.Vec3(hx, hy, hz)) });
    b.position.set(x, y, z);
    world.addBody(b);
  });

  const dMat = new CANNON.Material('dice');
  const diceBodies: CANNON.Body[] = [];
  for (let i = 0; i < 5; i++) {
    const b = new CANNON.Body({
      mass: 0.2,
      shape: new CANNON.Box(new CANNON.Vec3(DICE_HALF, DICE_HALF, DICE_HALF)),
      material: dMat, angularDamping: 0.4, linearDamping: 0.15,
    });
    b.position.set(...dicePositions[i]);
    world.addBody(b);
    diceBodies.push(b);
  }
  world.addContactMaterial(new CANNON.ContactMaterial(dMat, gndMat, { friction: 0.6, restitution: 0.15 }));
  world.addContactMaterial(new CANNON.ContactMaterial(dMat, dMat, { friction: 0.5, restitution: 0.5 }));

  // Cup physics compound body
  const cupPhysMat = new CANNON.Material('cup');
  const cupBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: cupPhysMat });

  for (let ring = 0; ring < WALL_RINGS; ring++) {
    const t = (ring + 0.5) / WALL_RINGS;
    const rR = CUP_BR + (CUP_TR - CUP_BR) * t;
    const rY = t * CUP_H;
    const rH = CUP_H / WALL_RINGS;
    for (let i = 0; i < WALL_SEGS; i++) {
      const a = (i / WALL_SEGS) * Math.PI * 2;
      const sW = (2 * Math.PI * rR) / WALL_SEGS * 1.8;
      const sh = new CANNON.Box(new CANNON.Vec3(sW / 2, rH / 2 + 0.12, WALL_DEPTH));
      const off = new CANNON.Vec3(Math.cos(a) * rR, rY, Math.sin(a) * rR);
      const q = new CANNON.Quaternion();
      q.setFromEuler(0, -a, 0);
      cupBody.addShape(sh, off, q);
    }
  }
  // Single cylinder floor — prevents dice from clipping through gaps
  const botR = CUP_BR + 0.1;
  const botH = 0.3;
  cupBody.addShape(
    new CANNON.Cylinder(botR, botR, botH, 16),
    new CANNON.Vec3(0, -botH / 2, 0),
  );
  world.addBody(cupBody);
  world.addContactMaterial(new CANNON.ContactMaterial(dMat, cupPhysMat, { friction: 0.5, restitution: 0.2 }));

  return { world, diceBodies, cupBody };
}
