import * as THREE from 'three';

type SurfaceKind = 'concrete' | 'tile' | 'asphalt' | 'metal' | 'paving' | 'wood';
interface SurfaceSet { map: THREE.CanvasTexture; bump: THREE.CanvasTexture; roughness: THREE.CanvasTexture }
const cache = new Map<SurfaceKind, SurfaceSet>();
const SIZE = 512;
const hash = (x: number, y: number, seed: number) => { let h = Math.imul(x ^ seed, 374761393) ^ Math.imul(y, 668265263); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967295; };
function noise(x: number, y: number, size: number, seed: number): number {
  const ix = Math.floor(x / size), iy = Math.floor(y / size), n = SIZE / size;
  let fx = x / size - ix, fy = y / size - iy; fx *= fx * (3 - 2 * fx); fy *= fy * (3 - 2 * fy);
  const a = hash(ix % n, iy % n, seed), b = hash((ix + 1) % n, iy % n, seed), c = hash(ix % n, (iy + 1) % n, seed), d = hash((ix + 1) % n, (iy + 1) % n, seed);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
function canvas(size: number): HTMLCanvasElement { const c = document.createElement('canvas'); c.width = c.height = size; return c; }

/** Tiled colour, relief and roughness use the same deterministic surface coordinates. */
export function surfaceTextures(kind: SurfaceKind): SurfaceSet {
  const old = cache.get(kind); if (old) return old;
  const sources = [canvas(SIZE), canvas(SIZE), canvas(SIZE)], contexts = sources.map(c => c.getContext('2d')!), data = contexts.map(c => c.createImageData(SIZE, SIZE));
  const bases: Record<SurfaceKind, number[]> = { concrete: [204, 202, 194], tile: [208, 207, 197], asphalt: [77, 81, 82], metal: [193, 196, 193], paving: [179, 177, 166], wood: [163, 139, 108] };
  const seed = Object.keys(bases).indexOf(kind) * 193 + 2471, base = bases[kind];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4, grain = hash(x, y, seed), broad = noise(x, y, 128, seed + 3) - .5, medium = noise(x, y, 16, seed + 17) - .5;
    let variation = (grain - .5) * 12 + broad * 25 + medium * 12, height = 171 + (grain - .5) * 25, rough = 228 + (grain - .5) * 20;
    if (kind === 'asphalt') { const stone = hash(x >> 1, y >> 1, seed + 1); variation = (grain - .5) * 18 + broad * 17 + (stone > .85 ? 14 : 0); height = 140 + grain * 40 + stone * 20; rough = 210 + stone * 28; }
    if (kind === 'tile' || kind === 'paving') { const w = kind === 'tile' ? 64 : 128, h = w / 2, xx = x + Math.floor(y / h) % 2 * w / 2, ex = xx % w, ey = y % h; variation += (hash(Math.floor(xx / w), Math.floor(y / h), seed) - .5) * 17; if (Math.min(ex, w - ex, ey, h - ey) < 2) { variation -= 40; height = 90; rough = 246; } }
    if (kind === 'metal') { variation = broad * 17 + (grain - .5) * 4 + Math.sin(y * 2.7) * 2; height = 170 + Math.sin(y * 2.7) * 4; rough = 170 + medium * 32; }
    if (kind === 'wood') { const ring = Math.sin(x * .32 + noise(x, y, 64, seed) * 12); variation = ring * 9 + broad * 28 + medium * 10; height = 170 + ring * 10; if (x % 128 < 2) { variation -= 35; height -= 30; } }
    if (kind === 'concrete') { variation -= Math.max(0, noise(x, y * .0625, 16, seed + 37) - .54) * 38; if (grain < .024) { variation -= 20; height -= 30; } }
    for (let channel = 0; channel < 3; channel++) { data[0].data[i + channel] = base[channel] + variation; data[1].data[i + channel] = height; data[2].data[i + channel] = rough; } data.forEach(d => { d.data[i + 3] = 255; });
  }
  contexts.forEach((c, i) => c.putImageData(data[i], 0, 0));
  if (kind === 'asphalt' || kind === 'concrete') for (let j = 0; j < 7; j++) {
    const x = hash(j, 7, seed) * SIZE, y = hash(j, 8, seed) * SIZE;
    for (const ox of [-SIZE, 0, SIZE]) for (const oy of [-SIZE, 0, SIZE]) {
      const c = contexts[0]; c.strokeStyle = 'rgba(20,24,23,.24)'; c.lineWidth = .8; c.beginPath(); c.moveTo(x + ox, y + oy);
      for (let k = 1; k < 6; k++) c.lineTo(x + ox + k * 7 + hash(j, k, seed) * 12, y + oy + k * 8 + hash(k, j, seed) * 10); c.stroke();
      if (j < 2) { c.fillStyle = 'rgba(25,28,28,.1)'; c.fillRect(x + ox, y + oy, 52 + j * 31, 62); }
    }
  }
  const textures = sources.map((c, i) => { const t = new THREE.CanvasTexture(c); t.colorSpace = i === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; });
  const result = { map: textures[0], bump: textures[1], roughness: textures[2] }; cache.set(kind, result); return result;
}

export function createSignAtlas(names: string[][]): THREE.CanvasTexture {
  const source = canvas(2048); source.width = 4096; const c = source.getContext('2d')!;
  names.forEach(([title, subtitle, bg, fg], index) => { for (let variant = 0; variant < 4; variant++) {
    const slot = index + variant * 32, x = slot % 16 * 256, y = Math.floor(slot / 16) * 256;
    c.save(); c.translate(x, y); c.fillStyle = '#252b29'; c.fillRect(0, 0, 256, 256); c.fillStyle = bg; c.fillRect(6, 6, 244, 244);
    const light = c.createLinearGradient(0, 0, 0, 256); light.addColorStop(0, 'rgba(250,248,229,.12)'); light.addColorStop(.45, 'rgba(250,248,229,.02)'); light.addColorStop(1, 'rgba(0,8,12,.2)'); c.fillStyle = light; c.fillRect(8, 8, 240, 240);
    c.strokeStyle = 'rgba(20,27,25,.4)'; c.lineWidth = 3; c.strokeRect(10, 10, 236, 236); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (variant >= 2) { const chars = Array.from(title.replace(/\s/g, '')), spacing = Math.min(45, 194 / chars.length); c.font = `700 ${Math.min(36, spacing * .81)}px "Yu Gothic", Meiryo, sans-serif`; chars.forEach((ch, i) => { c.save(); c.translate(128, 128 - (chars.length - 1) * spacing / 2 + i * spacing); c.scale(variant === 3 ? 4.5 : 2.5, 1); c.fillText(ch, 0, 0); c.restore(); }); }
    else if (variant === 1) { const chars = Array.from(title.replace(/\s/g, '')), split = chars.length > 4 ? Math.ceil(chars.length / 2) : chars.length; c.font = `700 ${Math.min(58, 214 / split)}px "Yu Gothic",Meiryo,sans-serif`; c.fillText(chars.slice(0, split).join(''), 128, chars.length > 4 ? 89 : 116, 220); if (chars.length > 4) c.fillText(chars.slice(split).join(''), 128, 150, 220); c.font = '500 12px Arial,sans-serif'; c.fillText(subtitle, 128, 216, 210); }
    else { c.save(); c.translate(128, 116); c.scale(1, variant === 0 ? 5.3 : 1); c.font = `700 ${Math.min(31, 218 / Array.from(title).length)}px "Yu Gothic", Meiryo, sans-serif`; c.fillText(title, 0, 0, 218); c.restore(); c.save(); c.translate(128, 217); c.scale(1, variant === 0 ? 2.6 : 1); c.font = '500 11px Arial,sans-serif'; c.fillText(subtitle, 0, 0, 206); c.restore(); }
    for (let i = 0; i < 350; i++) { c.fillStyle = i % 2 ? 'rgba(255,250,232,.035)' : 'rgba(5,12,8,.04)'; c.fillRect(12 + hash(i, 4, index) * 232, 12 + hash(i, 7, index) * 232, 1, 2); }
    for (const xx of [12, 244]) for (const yy of [12, 244]) { c.fillStyle = '#4c5046'; c.beginPath(); c.arc(xx, yy, 1.6, 0, Math.PI * 2); c.fill(); } c.restore();
  } });
  const t = new THREE.CanvasTexture(source); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
