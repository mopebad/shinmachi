import * as THREE from 'three';
import { BUSINESSES } from '../simulation/WorldRules';
import type { Business } from '../simulation/WorldRules';
import { surfaceTextures } from './SurfaceTextures';
export { SHOP_NAMES } from './SignCatalog';

/** Reproducible local textures: no asset CDN, image downloads, or font service. */
export function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function surface(kind: 'concrete' | 'tile' | 'asphalt' | 'metal' | 'paving' | 'wood'): THREE.CanvasTexture { return surfaceTextures(kind).map; }


/** Per-instance world-space UVs keep tiles metre-sized on long roads and tall buildings. */
export function worldTexture(material: THREE.MeshStandardMaterial, scale = .5): void {
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
        vec2 surfaceUv;
        if(textureNormal.y > .5) surfaceUv = textureWorld.xz * ${scale.toFixed(3)};
        else if(textureNormal.x > .5) surfaceUv = textureWorld.zy * ${scale.toFixed(3)};
        else surfaceUv = textureWorld.xy * ${scale.toFixed(3)};
        vMapUv = surfaceUv;
        #ifdef USE_NORMALMAP
          vNormalMapUv = surfaceUv;
        #endif
        #ifdef USE_BUMPMAP
          vBumpMapUv = surfaceUv;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv = surfaceUv;
        #endif
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
  readonly asphalt = new THREE.MeshStandardMaterial({ color: 0xd4d7d9, map: surface('asphalt'), bumpMap: surfaceTextures('asphalt').bump, bumpScale: .018, roughnessMap: surfaceTextures('asphalt').roughness, roughness: .96 });
  readonly pavement = new THREE.MeshStandardMaterial({ color: 0xd6d5cb, map: surface('paving'), bumpMap: surfaceTextures('paving').bump, bumpScale: .028, roughnessMap: surfaceTextures('paving').roughness, roughness: 1 });
  readonly metal = new THREE.MeshStandardMaterial({ color: 0x555f61, metalness: .65, roughness: .5 });
  readonly dark = new THREE.MeshStandardMaterial({ color: 0x252d32, roughness: .7 });
  readonly cream = new THREE.MeshStandardMaterial({ color: 0xd9d3ba, map: this.concreteMap, roughness: .9 });
  readonly wood = new THREE.MeshStandardMaterial({ color: 0x78634e, map: surface('wood'), bumpMap: surfaceTextures('wood').bump, bumpScale: .025, roughness: .88 });
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
  readonly shopGlass = new THREE.MeshStandardMaterial({ color: 0xa9c4c7, transparent: true, opacity: .12, metalness: .25, roughness: .15, depthWrite: false });
  readonly businesses = Object.fromEntries(BUSINESSES.map(kind => [kind, {
    surface: new THREE.MeshStandardMaterial({ color: kind === 'convenience' ? 0xd9dfd5 : kind === 'residential' ? 0xb0b3a5 : 0xc4ab83, roughness: .83, emissive: kind === 'convenience' ? 0xd2eadc : 0xe8b974, emissiveIntensity: .2 }),
    light: new THREE.MeshStandardMaterial({ color: kind === 'convenience' ? 0xe8f6ed : 0xffd6a0, emissive: kind === 'convenience' ? 0xdfffe9 : 0xffc78a, emissiveIntensity: 1.5 }),
    window: new THREE.MeshStandardMaterial({ color: 0xb3ad96, roughness: .3, metalness: .12, emissive: kind === 'office' ? 0xc4d9dc : 0xe9bd81, emissiveIntensity: .15 }),
  }])) as Record<Business, { surface: THREE.MeshStandardMaterial; light: THREE.MeshStandardMaterial; window: THREE.MeshStandardMaterial }>;
  readonly signs: THREE.MeshStandardMaterial;
  readonly facades: THREE.MeshStandardMaterial[];
  constructor() {
    // Face atlases are generated after the kit records actual physical sign sizes.
    this.signs = new THREE.MeshStandardMaterial({ color: 0xc9c9c9, emissive: 0xffffff, emissiveIntensity: .4, roughness: .85 });
    this.signs.userData.openStates = { value: new Float32Array(6).fill(1) };
    this.signs.onBeforeCompile = shader => {
      shader.uniforms.uOpenStates = this.signs.userData.openStates;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float aBusiness; varying float vBusiness;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBusiness=aBusiness;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uOpenStates[6]; varying float vBusiness;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= uOpenStates[int(vBusiness + .5)];');
    };
    this.signs.customProgramCacheKey = () => 'scheduled-sign-atlas-v1';
    this.facades = [0xd7d0bb, 0x9b9890, 0xb2b4ab, 0x817773, 0x637477, 0xc2b4a0, 0xadb1af, 0x6f7375].map((color, i) => new THREE.MeshStandardMaterial({ color, map: i % 2 ? this.tileMap : this.concreteMap, bumpMap: surfaceTextures(i % 2 ? 'tile' : 'concrete').bump, bumpScale: .025, roughnessMap: surfaceTextures(i % 2 ? 'tile' : 'concrete').roughness, roughness: .98 }));
    for (const material of [...this.facades, this.pavement, this.cream, this.marking, this.wood]) worldTexture(material, .48);
    worldTexture(this.asphalt, .26);
  }
}
