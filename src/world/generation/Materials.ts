import * as THREE from 'three';

/** Reproducible local textures: no asset CDN, image downloads, or font service. */
export function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function surface(kind: 'concrete' | 'tile' | 'asphalt' | 'metal' | 'paving'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!; const rng = random(9831);
  c.fillStyle = kind === 'asphalt' ? '#888b8b' : '#d9d6d0'; c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 18000; i++) {
    const shade = Math.floor(90 + rng() * 160);
    c.fillStyle = `rgba(${shade},${shade},${shade},${kind === 'asphalt' ? .5 : .16})`;
    c.fillRect(rng() * 256, rng() * 256, 1 + rng() * 2, 1 + rng() * 2);
  }
  if (kind === 'tile' || kind === 'paving') {
    c.strokeStyle = kind === 'tile' ? '#a4a4a0' : '#929591'; c.lineWidth = kind === 'tile' ? 1 : 2;
    const step = kind === 'tile' ? 32 : 64;
    for (let y = 0; y <= 256; y += step) for (let x = -step; x <= 256; x += step) c.strokeRect(x + (y / step % 2) * step / 2, y, step, step);
  }
  if (kind === 'concrete') {
    c.strokeStyle = '#b3b3ad'; c.lineWidth = 1; c.strokeRect(1, 1, 254, 254);
    for (const x of [16, 240]) for (const y of [16, 240]) { c.fillStyle = '#aaa9a2'; c.beginPath(); c.arc(x, y, 2.2, 0, 7); c.fill(); }
    for (let i = 0; i < 35; i++) { c.fillStyle = 'rgba(85,80,70,.035)'; c.fillRect(rng() * 256, 0, rng() * 6, 256); }
  }
  if (kind === 'metal') { c.strokeStyle = '#9c9d99'; for (let y = 0; y < 256; y += 6) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); } }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(kind === 'asphalt' ? 18 : 3, kind === 'asphalt' ? 24 : 4); texture.anisotropy = 4;
  return texture;
}

export const SHOP_NAMES = [
  ['新町食堂', 'SHINMACHI DINING', '#e8d4a0', '#282820'], ['らーめん', 'RAMEN · OPEN LATE', '#c73e27', '#fff0ce'],
  ['喫茶 月光', 'COFFEE & KISSA', '#174c48', '#eddeb5'], ['まるや商店', 'FRESH FOOD MARKET', '#f5eee0', '#286649'],
  ['カラオケ', 'KARAOKE  3F', '#b2385b', '#fff4d1'], ['居酒屋 鳥吉', 'YAKITORI · SAKE', '#272a28', '#efc77c'],
  ['新町薬局', 'PHARMACY', '#eeeacb', '#31826d'], ['ゲーム館', 'GAME / ELECTRONICS', '#234a8b', '#f1f5eb'],
  ['東京カメラ', 'TOKYO CAMERA', '#c8352d', '#fff0dd'], ['蕎麦  田中', 'SOBA · SINCE 1968', '#ded7bc', '#293b32'],
  ['本と珈琲', 'BOOKS & COFFEE', '#394c44', '#efe2b7'], ['サクラ不動産', 'SAKURA REAL ESTATE', '#e5ded1', '#31649a'],
  ['青空マート', 'AOZORA MART  24H', '#f4f0df', '#147a66'], ['美容室 花', 'HAIR STUDIO  2F', '#ac666d', '#fff2da'],
  ['焼肉 牛亭', 'YAKINIKU  2F', '#6a2424', '#f5d399'], ['新町ビル', 'SHINMACHI BUILDING', '#233642', '#c8e0dc'],
  ['新町駅', 'SHINMACHI STATION', '#f0ede1', '#285e4a'], ['止まれ', 'STOP', '#b52e2d', '#fff4e1'],
  ['P  駐車場', 'PARKING  ¥300 / 30 MIN', '#173a5e', '#ffdc5c'], ['自転車置場', 'BICYCLE PARKING', '#e5e4d5', '#325b55'],
  ['お弁当', 'BENTO · TAKE AWAY', '#de8b30', '#fff2d9'], ['たこ焼', 'TAKOYAKI', '#d95031', '#ffedd0'],
  ['古書 新町堂', 'USED BOOKS', '#beaa7e', '#3b3328'], ['東口商店街', 'SHINMACHI SHOPPING STREET', '#214c4e', '#f5d49a'],
  ['らーめん', '', '#e3472e', '#fff1d0'], ['居酒屋', '', '#eac795', '#502a22'],
  ['カラオケ', '', '#c94972', '#fff5ec'], ['電気館', '', '#194683', '#e9ebcd'],
  ['焼肉', '', '#a93431', '#ffe5a8'], ['喫茶', '', '#34645d', '#eddec0'],
  ['営業中', 'OPEN', '#f2d0a3', '#b73e2d'], ['新町通り', 'SHINMACHI DORI', '#275b88', '#fff9e8'],
];

function signAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2048;
  const c = canvas.getContext('2d')!;
  SHOP_NAMES.forEach(([title, subtitle, bg, fg], i) => {
    const x = (i % 8) * 256, y = Math.floor(i / 8) * 256;
    c.fillStyle = bg; c.fillRect(x, y, 256, 256);
    c.strokeStyle = fg; c.lineWidth = 3; c.strokeRect(x + 8, y + 8, 240, 240);
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (i >= 24 && i <= 29) {
      const chars = Array.from(title); c.font = `bold ${Math.min(65, 210 / chars.length)}px "Yu Gothic", Meiryo, sans-serif`;
      chars.forEach((char, j) => { c.save(); c.translate(x + 128, y + 30 + (j + .5) * 196 / chars.length); c.scale(4, 1); c.fillText(char, 0, 0, 58); c.restore(); });
    } else {
      c.font = `bold ${title.length > 6 ? 23 : 28}px "Yu Gothic", Meiryo, sans-serif`;
      c.save(); c.translate(x + 128, y + 88); c.scale(1, 5.3); c.fillText(title, 0, 0, 228); c.restore();
      c.font = 'bold 12px sans-serif'; c.save(); c.translate(x + 128, y + 190); c.scale(1, 1.7); c.fillText(subtitle, 0, 0, 226); c.restore();
      c.fillRect(x + 22, y + 216, 212, 4);
      c.font = '11px sans-serif'; c.fillText(i === 16 ? 'JR   山手線  /  EAST EXIT' : 'SHINMACHI   •   東京', x + 128, y + 237);
    }
  });
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  return texture;
}

/** Per-instance world-space UVs keep tiles metre-sized on long roads and tall buildings. */
function worldTexture(material: THREE.MeshStandardMaterial, scale = .5): void {
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
      #ifdef USE_MAP
        vec4 textureWorld = vec4(position,1.0);
        vec3 textureNormal = normal;
        #ifdef USE_INSTANCING
          textureWorld = instanceMatrix * textureWorld;
          textureNormal = mat3(instanceMatrix) * textureNormal;
        #endif
        textureWorld = modelMatrix * textureWorld;
        textureNormal = abs(normalize(mat3(modelMatrix) * textureNormal));
        if(textureNormal.y > .5) vMapUv = textureWorld.xz * ${scale.toFixed(3)};
        else if(textureNormal.x > .5) vMapUv = textureWorld.zy * ${scale.toFixed(3)};
        else vMapUv = textureWorld.xy * ${scale.toFixed(3)};
      #endif`);
  };
  material.customProgramCacheKey = () => `world-uv-${scale}`;
}

function glassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d')!, gradient = c.createLinearGradient(0, 0, 105, 128);
  gradient.addColorStop(0, '#a5b8c0'); gradient.addColorStop(.4, '#8c9fa5'); gradient.addColorStop(.42, '#b8c5c6'); gradient.addColorStop(.48, '#94a6ac'); gradient.addColorStop(1, '#536e7c');
  c.fillStyle = gradient; c.fillRect(0, 0, 128, 128);
  c.fillStyle = '#6b7f88'; for (let i = 0; i < 6; i++) c.fillRect(10 + i * 22, 60 + i % 2 * 15, 7, 68);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

export class Materials {
  readonly concreteMap = surface('concrete'); readonly tileMap = surface('tile');
  readonly asphalt = new THREE.MeshStandardMaterial({ color: 0x454b50, map: surface('asphalt'), roughness: .86 });
  readonly pavement = new THREE.MeshStandardMaterial({ color: 0xb5b5a8, map: surface('paving'), roughness: .95 });
  readonly metal = new THREE.MeshStandardMaterial({ color: 0x555f61, metalness: .65, roughness: .5 });
  readonly dark = new THREE.MeshStandardMaterial({ color: 0x252d32, roughness: .7 });
  readonly cream = new THREE.MeshStandardMaterial({ color: 0xd9d3ba, map: this.concreteMap, roughness: .9 });
  readonly wood = new THREE.MeshStandardMaterial({ color: 0x654733, map: surface('metal'), roughness: .85 });
  readonly red = new THREE.MeshStandardMaterial({ color: 0xa93226, roughness: .65 });
  readonly green = new THREE.MeshStandardMaterial({ color: 0x226c55, roughness: .7 });
  readonly white = new THREE.MeshStandardMaterial({ color: 0xe0dfd4, roughness: .75 });
  readonly marking = new THREE.MeshStandardMaterial({ color: 0xe8e2c5, map: this.concreteMap, roughness: .85 });
  readonly yellow = new THREE.MeshStandardMaterial({ color: 0xd6ac49, roughness: .85 });
  readonly windows = new THREE.MeshStandardMaterial({ color: 0x718891, map: glassTexture(), metalness: .5, roughness: .22, emissive: 0x4b7885, emissiveIntensity: .2 });
  readonly warmWindows = new THREE.MeshStandardMaterial({ color: 0xb7af8b, roughness: .35, metalness: .15, emissive: 0xffd092, emissiveIntensity: .7 });
  readonly shop = new THREE.MeshStandardMaterial({ color: 0xd3b883, roughness: .5, emissive: 0xffc67d, emissiveIntensity: .5 });
  readonly lamps = new THREE.MeshStandardMaterial({ color: 0xffe8b7, roughness: .3, emissive: 0xffcb7c, emissiveIntensity: 3 });
  readonly lantern = new THREE.MeshStandardMaterial({ color: 0xdc6a3b, roughness: .8, emissive: 0xff722d, emissiveIntensity: .65 });
  readonly signs: THREE.MeshStandardMaterial;
  readonly facades: THREE.MeshStandardMaterial[];
  constructor() {
    const atlas = signAtlas();
    this.signs = new THREE.MeshStandardMaterial({ map: atlas, emissiveMap: atlas, emissive: 0xffffff, emissiveIntensity: .4, roughness: .55, side: THREE.DoubleSide });
    this.facades = [0xd7d0bb, 0x9b9890, 0xb2b4ab, 0x817773, 0x637477, 0xc2b4a0, 0xadb1af, 0x6f7375].map((color, i) => new THREE.MeshStandardMaterial({ color, map: i % 2 ? this.tileMap : this.concreteMap, roughness: .87 }));
    for (const material of [...this.facades, this.pavement, this.cream, this.marking, this.wood]) worldTexture(material, .48);
    worldTexture(this.asphalt, 1.8);
  }
}
