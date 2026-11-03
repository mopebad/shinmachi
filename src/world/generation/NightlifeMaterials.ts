import * as THREE from 'three';
import { worldTexture } from './Materials';

type Surface = 'brick' | 'plaster' | 'tile' | 'wood' | 'metal' | 'grille' | 'cloth';
const hash = (x: number, y: number, seed: number) => { let h = Math.imul(x ^ seed, 374761393) ^ Math.imul(y, 668265263); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967295; };
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texture(c: HTMLCanvasElement, color: boolean, repeat = true) { const t = new THREE.CanvasTexture(c); t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }

function surface(kind: Surface): THREE.MeshStandardMaterial {
  const colors: Record<Surface, number[]> = { brick: [83, 75, 63], plaster: [127, 122, 108], tile: [52, 62, 58], wood: [111, 79, 46], metal: [173, 179, 173], grille: [66, 73, 68], cloth: [131, 117, 90] };
  const seed = Object.keys(colors).indexOf(kind) * 137 + 1471, base = colors[kind], sources = [canvas(512), canvas(512), canvas(512)], contexts = sources.map(c => c.getContext('2d')!), images = contexts.map(c => c.createImageData(512, 512));
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const p = (y * 512 + x) * 4, grain = hash(x, y, seed) - .5, broad = hash(x >> 6, y >> 7, seed + 2) - .5;
    let v = grain * 14 + broad * 18, height = 170 + grain * 22, rough = 231 + grain * 17;
    if (kind === 'brick' || kind === 'tile') { const w = kind === 'brick' ? 128 : 64, h = kind === 'brick' ? 32 : 64, xx = x + (kind === 'brick' ? Math.floor(y / h) % 2 * w / 2 : 0); v += (hash(Math.floor(xx / w), Math.floor(y / h), seed) - .5) * 23; const edge = Math.min(xx % w, w - xx % w, y % h, h - y % h); if (edge < 2) { v -= 28; height = 95; rough = 249; } else if (kind === 'tile') { rough = 164 + grain * 15; height = 170 + grain * 6; } }
    if (kind === 'wood') { const stripe = Math.sin(x * .26 + Math.sin(y * .013) * 5); v = stripe * 9 + broad * 23 + grain * 6; height += stripe * 8; if (x % 128 < 2) { v -= 36; height -= 30; } }
    if (kind === 'metal') { v = broad * 15 + grain * 5 + Math.sin(y * 2.3) * 2; rough = 174 + grain * 16; }
    if (kind === 'grille') { if (y % 16 < 6) { v -= 39; height = 94; } else if (y % 16 < 8) { v += 22; height = 193; } rough = 190 + grain * 13; }
    if (kind === 'cloth') { v += (x % 2 + y % 2 - 1) * 3; height = 164 + (x % 2 + y % 2) * 11; rough = 247; }
    if (kind === 'plaster') { v -= Math.max(0, Math.sin(x * .03 + seed) * Math.sin(x * .12)) * 13; if (grain < -.475) { v -= 19; height -= 28; } }
    for (let i = 0; i < 3; i++) { images[0].data[p + i] = base[i] + v; images[1].data[p + i] = height; images[2].data[p + i] = rough; } images.forEach(d => { d.data[p + 3] = 255; });
  }
  contexts.forEach((c, i) => c.putImageData(images[i], 0, 0));
  if (kind === 'plaster' || kind === 'metal') for (let i = 0; i < 38; i++) { contexts[0].fillStyle = 'rgba(42,32,20,.12)'; contexts[0].fillRect(hash(i, 1, seed) * 512, hash(i, 2, seed) * 512, 1 + hash(i, 3, seed) * 2, 12 + hash(i, 4, seed) * 85); }
  const m = new THREE.MeshStandardMaterial({ map: texture(sources[0], true), bumpMap: texture(sources[1], false), roughnessMap: texture(sources[2], false), roughness: 1, bumpScale: kind === 'brick' ? .035 : .017, metalness: kind === 'metal' || kind === 'grille' ? .4 : 0 });
  worldTexture(m, .65); return m;
}
const THEMES: Record<string, string[]> = {
  theatre: ['夜灯劇場', '名画・深夜上映', 'YOTO THEATRE · 1958', '#651d16', '#efbc56'],
  izakaya: ['新町', '居酒屋', '炭火・小料理', '#30291e', '#ddc798'],
  ramen: ['拉麺', '鶏白湯', 'らーめん・餃子', '#c2b08b', '#64231a'],
  karaoke: ['カラオケ', '歌謡喫茶', '二階 受付', '#243b3d', '#c9d5c0'],
  coffee: ['珈琲', '喫茶 新月', 'COFFEE · OPEN LATE', '#293a30', '#d5c9a7'],
  bar: ['夜灯', 'BAR', '小さな夜の店', '#292b27', '#d4c1a0'],
};
function signTexture(theme: string, ratio: number): THREE.CanvasTexture {
  const c = canvas(Math.round(768 * Math.max(1, ratio)), Math.round(768 * Math.max(1, 1 / ratio))), p = c.getContext('2d')!, w = c.width, h = c.height;
  const font = '"Yu Mincho", "MS PMincho", serif';
  const text = (s: string, x: number, y: number, size: number, color: string, max = w * .85) => { p.font = `800 ${size}px ${font}`; p.fillStyle = color; p.textAlign = 'center'; p.textBaseline = 'middle'; p.save(); p.beginPath(); p.rect(w * .045, h * .025, w * .91, h * .95); p.clip(); p.fillText(s, x, y, max); p.restore(); };
  if (theme === 'menu') {
    p.fillStyle = '#c6baa0'; p.fillRect(0, 0, w, h); text('夜灯の献立', w / 2, h * .12, Math.min(w * .14, h * .08), '#672f25');
    const items = [['拉麺', '¥850'], ['味噌拉麺', '¥950'], ['焼餃子', '¥480'], ['炭火焼鳥', '¥550'], ['冷奴', '¥350'], ['生麦酒', '¥580'], ['夜の定食', '¥980']];
    items.forEach(([name, price], i) => { const y = h * (.28 + i * .085); p.font = `600 ${Math.min(w * .07, h * .035)}px "Yu Gothic",sans-serif`; p.fillStyle = '#393a2d'; p.textAlign = 'left'; p.fillText(name, w * .09, y); p.textAlign = 'right'; p.fillText(price, w * .91, y); });
  } else if (theme === 'posters' || theme === 'stickers') {
    p.fillStyle = '#41473c'; p.fillRect(0, 0, w, h);
    const titles = theme === 'posters' ? ['夜灯', '深夜上映', '新町寄席', '喫茶と音楽', '夕涼み', '小料理'] : ['私有地', '静かに', '営業時間', '夜間注意', '関係者専用', '防犯巡回'];
    titles.forEach((s, i) => { const x = w * (.05 + i % 2 * .47), y = h * (.04 + Math.floor(i / 2) * .32), ww = w * .43, hh = h * .29; p.fillStyle = i % 3 === 1 ? '#7c3528' : '#bfb496'; p.fillRect(x, y, ww, hh); if (theme === 'posters') { p.fillStyle = '#2c3b32'; p.beginPath(); p.arc(x + ww / 2, y + hh * .32, Math.min(ww, hh) * .17, 0, 7); p.fill(); } text(s, x + ww / 2, y + hh * .63, Math.min(ww / (s.length * 1.1), hh * .19), i % 3 === 1 ? '#dbc189' : '#30372b', ww * .9); });
  } else {
    const [title, kicker, footer, bg, ink] = THEMES[theme] ?? THEMES.bar;
    p.fillStyle = bg; p.fillRect(0, 0, w, h); p.strokeStyle = ink; p.lineWidth = Math.min(w, h) * .016; p.strokeRect(w * .045, h * .025, w * .91, h * .95);
    if (ratio < .78) { const chars = Array.from(title), size = Math.min(w * .62, h * .62 / Math.max(1, chars.length * 1.1)), step = size * 1.1; chars.forEach((ch, i) => text(ch, w / 2, h * .51 - (chars.length - 1) * step / 2 + i * step, size, ink)); text(kicker, w / 2, h * .115, Math.min(w / (Math.max(1, kicker.length) * 1.2), h * .045), ink); text(footer, w / 2, h * .91, w * .085, ink); }
    else { text(kicker, w / 2, h * .19, Math.min(h * .105, w * .075), ink); text(title, w / 2, h * .51, Math.min(h * .38, w * .82 / Math.max(1, title.length * 1.04)), ink); text(footer, w / 2, h * .84, h * .08, ink); }
  }
  const edge = p.createLinearGradient(0, 0, 0, h); edge.addColorStop(0, 'rgba(5,10,7,.17)'); edge.addColorStop(.2, 'rgba(255,230,160,.025)'); edge.addColorStop(1, 'rgba(5,8,5,.2)'); p.fillStyle = edge; p.fillRect(0, 0, w, h);
  for (let i = 0; i < 1700; i++) { p.fillStyle = i % 2 ? 'rgba(245,230,195,.04)' : 'rgba(8,14,8,.06)'; p.fillRect(hash(i, 2, 2701) * w, hash(i, 4, 2701) * h, 1.5, 2); }
  return texture(c, true, false);
}

export class NightlifeMaterials {
  readonly brick = surface('brick'); readonly plaster = surface('plaster'); readonly darkTile = surface('tile'); readonly wood = surface('wood'); readonly metal = surface('metal'); readonly grille = surface('grille'); readonly cloth = surface('cloth');
  readonly redPaint = new THREE.MeshStandardMaterial({ color: 0x8c3225, roughness: .62, metalness: .14 });
  readonly glass = new THREE.MeshStandardMaterial({ color: 0x536963, transparent: true, opacity: .18, roughness: .22, metalness: .18, depthWrite: false });
  readonly warmInterior = new THREE.MeshStandardMaterial({ color: 0x9f865a, emissive: 0xd1aa6b, roughness: .85 });
  readonly light = new THREE.MeshStandardMaterial({ color: 0xe4d0a2, emissive: 0xffdba4, roughness: .5 });
  readonly neonAmber = new THREE.MeshStandardMaterial({ color: 0xd69a46, emissive: 0xe9a453, roughness: .36 });
  readonly neonRed = new THREE.MeshStandardMaterial({ color: 0xa93926, emissive: 0xe84125, roughness: .37 });
  readonly neonCyan = new THREE.MeshStandardMaterial({ color: 0x719b95, emissive: 0x91c7bc, roughness: .38 });
  private readonly signs = new Map<string, THREE.MeshStandardMaterial>();
  private readonly emission: { material: THREE.MeshStandardMaterial; strength: number; closed: number }[] = [];
  private night = 1; private open = true;
  constructor() {
    this.cloth.side = THREE.DoubleSide; this.metal.color.setHex(0x737b70);
    for (const [material, strength, closed] of [[this.warmInterior, .35, .1], [this.light, 1.45, .4], [this.neonAmber, 1.65, .025], [this.neonRed, 1.15, .025], [this.neonCyan, .85, .025]] as const) this.emission.push({ material, strength, closed });
    this.setNight(1, true);
  }
  signMaterial(theme: string, ratio: number): THREE.MeshStandardMaterial {
    const r = Math.max(.25, Math.min(4, ratio)), key = `${theme}:${r.toFixed(3)}`, existing = this.signs.get(key); if (existing) return existing;
    const map = signTexture(theme, r), material = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, roughness: .72, metalness: .02 });
    const strength = ({ theatre: .62, izakaya: .46, ramen: .42, karaoke: .46, coffee: .34, bar: .4, menu: .015, posters: 0, stickers: 0 } as Record<string, number>)[theme] ?? .4;
    this.emission.push({ material, strength, closed: .025 }); this.signs.set(key, material); this.setNight(this.night, this.open); return material;
  }
  setNight(night: number, open: boolean): void { this.night = night; this.open = open; this.emission.forEach(({ material, strength, closed }) => { material.emissiveIntensity = strength * (.045 + night * .955) * (open ? 1 : closed); }); }
}
