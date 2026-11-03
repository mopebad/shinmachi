import * as THREE from 'three';
import type { District } from '../types';
import { businessOpen } from '../simulation/WorldRules';

export class StreetAtmosphere {
  private readonly steam: THREE.InstancedMesh;
  private readonly silhouettes: THREE.InstancedMesh;
  private readonly object = new THREE.Object3D();
  private readonly sources: THREE.Vector3[];
  private readonly opacity: THREE.InstancedBufferAttribute;
  private seconds = 0;
  private readonly shops: District['shopfronts'];
  constructor(scene: THREE.Scene, district: District, sources?: THREE.Vector3[]) {
    this.sources = sources ?? [new THREE.Vector3(-11, 3.2, -22.8), new THREE.Vector3(13, 3.2, -22.8)];
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; const c = canvas.getContext('2d')!;
    const gradient = c.createRadialGradient(32, 32, 1, 32, 32, 32); gradient.addColorStop(0, 'rgba(208,216,217,.22)'); gradient.addColorStop(.4, 'rgba(208,216,217,.09)'); gradient.addColorStop(1, 'rgba(208,216,217,0)'); c.fillStyle = gradient; c.fillRect(0, 0, 64, 64);
    const geometry = new THREE.PlaneGeometry(1, 1), capacity = this.sources.length * 24;
    this.opacity = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1); geometry.setAttribute('aOpacity', this.opacity);
    const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: new THREE.CanvasTexture(canvas) } }]),
      vertexShader: `attribute float aOpacity; varying vec2 vUv; varying float vAlpha; varying vec3 vTint;
        #include <fog_pars_vertex>
        void main(){vUv=uv;vAlpha=aOpacity;vTint=instanceColor;vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying float vAlpha; varying vec3 vTint;
        #include <fog_pars_fragment>
        void main(){vec4 sampleColor=texture2D(map,vUv);gl_FragColor=vec4(vTint,sampleColor.a*vAlpha);
        #include <fog_fragment>
        }`,
    });
    this.steam = new THREE.InstancedMesh(geometry, material, capacity);
    for (let i = 0; i < capacity; i++) this.steam.setColorAt(i, new THREE.Color(i < 24 ? 0xd6bea3 : 0xb9c1bd));
    this.shops = district.shopfronts.filter(s => s.business === 'restaurant' || s.business === 'cafe' || s.business === 'convenience');
    this.silhouettes = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.5, .6, 3, 8), new THREE.MeshStandardMaterial({ color: 0x4c5149, roughness: .95 }), this.shops.length * 4);
    for (const mesh of [this.steam, this.silhouettes]) { mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; scene.add(mesh); }
    this.steam.name = 'Kitchen exhaust steam'; this.silhouettes.name = 'Shop staff and seated patrons';
  }
  update(dt: number, hour: number, camera: THREE.Camera): void {
    this.seconds += dt; let count = 0;
    if (businessOpen('restaurant', hour)) this.sources.forEach(source => {
      for (let i = 0; i < 24; i++) {
        const age = (this.seconds * .13 + i / 24) % 1, spread = .16 + age * 1.25;
        this.object.position.set(source.x + Math.sin(i * 4.5 + this.seconds * .35) * age * .22 + age * .72, source.y + age * 2.65, source.z + Math.cos(i * 2.3 + this.seconds * .17) * age * .3);
        this.opacity.setX(count, Math.sin(age * Math.PI) ** .7 * .85);
        this.object.quaternion.copy(camera.quaternion); this.object.scale.set(spread, spread * 1.3, 1); this.object.updateMatrix(); this.steam.setMatrixAt(count++, this.object.matrix);
      }
    });
    this.steam.count = count; this.steam.instanceMatrix.needsUpdate = true; this.opacity.needsUpdate = true;
    count = 0;
    for (const [i, s] of this.shops.entries()) {
      if (!businessOpen(s.business, hour)) continue;
      const cs = Math.cos(s.rotation), sn = Math.sin(s.rotation);
      const part = (lx: number, y: number, z: number, sx: number, sy: number, sz: number) => {
        this.object.position.set(s.x + lx * cs + z * sn, y, s.z + z * cs - lx * sn); this.object.rotation.set(0, s.rotation, 0); this.object.scale.set(sx, sy, sz); this.object.updateMatrix(); this.silhouettes.setMatrixAt(count++, this.object.matrix);
      };
      // Staff stay behind their counters; seated patrons remain within the actual room.
      const sway = Math.sin(this.seconds * .9 + i * 1.7) * .07;
      part(-s.width * .23 + sway, 1.27, -2.65, .31, .36, .23); part(-s.width * .23 + sway, 1.74, -2.65, .21, .15, .2);
      if (s.business !== 'convenience' && i % 2 === 0) { part(-s.width * .12, 1.25, -.95, .29, .29, .22); part(-s.width * .12, 1.65, -.95, .2, .14, .19); }
    }
    this.silhouettes.count = count; this.silhouettes.instanceMatrix.needsUpdate = true;
  }
}
