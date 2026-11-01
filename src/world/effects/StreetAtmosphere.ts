import * as THREE from 'three';
import type { District } from '../types';
import { businessOpen } from '../simulation/WorldRules';

export class StreetAtmosphere {
  private readonly steam: THREE.InstancedMesh;
  private readonly silhouettes: THREE.InstancedMesh;
  private readonly object = new THREE.Object3D();
  private readonly sources = [new THREE.Vector3(-11, 3.2, -22.8), new THREE.Vector3(13, 3.2, -22.8)];
  private seconds = 0;
  private readonly shops: District['shopfronts'];
  constructor(scene: THREE.Scene, district: District) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; const c = canvas.getContext('2d')!;
    const gradient = c.createRadialGradient(32, 32, 1, 32, 32, 32); gradient.addColorStop(0, 'rgba(208,216,217,.09)'); gradient.addColorStop(.4, 'rgba(208,216,217,.04)'); gradient.addColorStop(1, 'rgba(208,216,217,0)'); c.fillStyle = gradient; c.fillRect(0, 0, 64, 64);
    this.steam = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, side: THREE.DoubleSide }), 48);
    this.shops = district.shopfronts.filter(s => s.business === 'restaurant' || s.business === 'cafe' || s.business === 'convenience');
    this.silhouettes = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.5, .6, 3, 8), new THREE.MeshStandardMaterial({ color: 0x4c5149, roughness: .95 }), this.shops.length * 4);
    for (const mesh of [this.steam, this.silhouettes]) { mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; scene.add(mesh); }
    this.steam.name = 'Kitchen exhaust steam'; this.silhouettes.name = 'Shop staff and seated patrons';
  }
  update(dt: number, hour: number, camera: THREE.Camera): void {
    this.seconds += dt; let count = 0;
    if (businessOpen('restaurant', hour)) this.sources.forEach(source => {
      for (let i = 0; i < 24; i++) {
        const age = (this.seconds * .16 + i / 24) % 1, spread = .22 + age * .9;
        this.object.position.copy(source).add(new THREE.Vector3(Math.sin(i * 4.5 + this.seconds * .4) * age * .35 + age * .7, age * 2.8, Math.cos(i * 2.3) * age * .3));
        this.object.quaternion.copy(camera.quaternion); this.object.scale.set(spread, spread * 1.3, 1); this.object.updateMatrix(); this.steam.setMatrixAt(count++, this.object.matrix);
      }
    });
    this.steam.count = count; this.steam.instanceMatrix.needsUpdate = true;
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
