import * as THREE from 'three';

export function noiseTex(base: string, sz: number, amt: number, rep?: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = sz;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, sz, sz);
  const d = ctx.getImageData(0, 0, sz, sz);
  for (let i = 0; i < d.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amt;
    d.data[i] = Math.max(0, Math.min(255, d.data[i] + n));
    d.data[i + 1] = Math.max(0, Math.min(255, d.data[i + 1] + n));
    d.data[i + 2] = Math.max(0, Math.min(255, d.data[i + 2] + n));
  }
  ctx.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }
  return t;
}

export function bumpTex(sz: number, amt: number, rep?: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = sz;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, sz, sz);
  const d = ctx.getImageData(0, 0, sz, sz);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * amt;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
  }
  ctx.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }
  return t;
}

export function leatherTex(sz: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = sz;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0e0e0e';
  ctx.fillRect(0, 0, sz, sz);
  const d = ctx.getImageData(0, 0, sz, sz);
  for (let i = 0; i < d.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    d.data[i] = Math.max(0, Math.min(255, d.data[i] + n));
    d.data[i + 1] = Math.max(0, Math.min(255, d.data[i + 1] + n));
    d.data[i + 2] = Math.max(0, Math.min(255, d.data[i + 2] + n));
  }
  ctx.putImageData(d, 0, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * sz, y = Math.random() * sz, r = 0.5 + Math.random() * 1.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

export function leatherBump(sz: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = sz;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, sz, sz);
  const d = ctx.getImageData(0, 0, sz, sz);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 60;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
  }
  ctx.putImageData(d, 0, 0);
  ctx.fillStyle = 'rgba(100,100,100,0.3)';
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * sz, y = Math.random() * sz, r = 1 + Math.random() * 3;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

export function pipTex(val: number): THREE.CanvasTexture {
  const s = 256, c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(0, 0, s, s);
  const r = s * 0.08, cx = s / 2, cy = s / 2, o = s * 0.25;
  const P: Record<number, number[][]> = {
    1: [[cx, cy]],
    2: [[cx - o, cy - o], [cx + o, cy + o]],
    3: [[cx - o, cy - o], [cx, cy], [cx + o, cy + o]],
    4: [[cx - o, cy - o], [cx + o, cy - o], [cx - o, cy + o], [cx + o, cy + o]],
    5: [[cx - o, cy - o], [cx + o, cy - o], [cx, cy], [cx - o, cy + o], [cx + o, cy + o]],
    6: [[cx - o, cy - o], [cx + o, cy - o], [cx - o, cy], [cx + o, cy], [cx - o, cy + o], [cx + o, cy + o]],
  };
  ctx.fillStyle = '#1a1a1a';
  (P[val] || []).forEach(([px, py]) => {
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  });
  return new THREE.CanvasTexture(c);
}
