import * as CANNON from 'cannon-es';

export function slerpCannon(qa: CANNON.Quaternion, qb: CANNON.Quaternion, t: number, result: CANNON.Quaternion): void {
  const ax = qa.x, ay = qa.y, az = qa.z, aw = qa.w;
  let bx = qb.x, by = qb.y, bz = qb.z, bw = qb.w;
  let cosH = ax * bx + ay * by + az * bz + aw * bw;
  if (cosH < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; cosH = -cosH; }
  if (cosH >= 1.0) { result.set(ax, ay, az, aw); return; }
  const half = Math.acos(cosH), sinH = Math.sqrt(1 - cosH * cosH);
  if (Math.abs(sinH) < 0.001) {
    result.set(ax * 0.5 + bx * 0.5, ay * 0.5 + by * 0.5, az * 0.5 + bz * 0.5, aw * 0.5 + bw * 0.5);
  } else {
    const rA = Math.sin((1 - t) * half) / sinH, rB = Math.sin(t * half) / sinH;
    result.set(ax * rA + bx * rB, ay * rA + by * rB, az * rA + bz * rB, aw * rA + bw * rB);
  }
  result.normalize();
}
