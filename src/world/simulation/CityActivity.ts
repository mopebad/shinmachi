import * as THREE from 'three';
import { CommuterRail } from './CommuterRail';
import { HumanPresentation } from './HumanPresentation';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { District } from '../types';
import { CitySimulation, VEHICLE_PROFILES } from './CitySimulation';
import { CROSSINGS, dayState } from './WorldRules';
import type { Axis } from './WorldRules';

/** Instanced presentation only. All movement and permissions come from the tested model. */
export class CityActivity {
  readonly group = new THREE.Group();
  readonly simulation: CitySimulation;
  private readonly object = new THREE.Object3D(); private readonly tint = new THREE.Color();
  readonly people: HumanPresentation;
  private readonly body: THREE.InstancedMesh; private readonly glass: THREE.InstancedMesh; private readonly wheels: THREE.InstancedMesh;
  private readonly headlights: THREE.InstancedMesh; private readonly taillights: THREE.InstancedMesh; private readonly rail: CommuterRail;
  private readonly brakelights: THREE.InstancedMesh;
  private readonly beams: THREE.SpotLight[] = [];
  private readonly contacts: THREE.InstancedMesh;
  private readonly signalMaterials: Record<Axis, THREE.MeshStandardMaterial[]> = { NS: [], EW: [] };
  private readonly pedestrianMaterials: THREE.MeshStandardMaterial[] = [];
  private readonly headlightMaterial = new THREE.MeshStandardMaterial({ color: 0xffefc9, emissive: 0xffe6b3, emissiveIntensity: 1 });
  private readonly tailMaterial = new THREE.MeshStandardMaterial({ color: 0xaa3029, emissive: 0xe43725, emissiveIntensity: 1 });
  private readonly brakeMaterial = new THREE.MeshStandardMaterial({ color: 0xf6533a, emissive: 0xff3822, emissiveIntensity: 3 });

  constructor(scene: THREE.Scene, district: District) {
    scene.add(this.group); this.group.name = 'Living street presentation';
    this.simulation = new CitySimulation({ bounds: district.colliders, doors: district.doors });
    const paint = new THREE.MeshStandardMaterial({ roughness: .34, metalness: .28 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x4c6c78, roughness: .16, metalness: .6 });
    const box = new THREE.BoxGeometry(1, 1, 1), rounded = new RoundedBoxGeometry(1, 1, 1, 2, .08);
    this.people = new HumanPresentation(this.group);
    this.body = this.pool(rounded, paint, 20 * 12); this.glass = this.pool(box, glass, 20 * 8);
    this.wheels = this.pool(new THREE.CylinderGeometry(1, 1, 1, 16), new THREE.MeshStandardMaterial({ roughness: .92 }), 20 * 8);
    this.headlights = this.pool(box, this.headlightMaterial, 20 * 5); this.taillights = this.pool(box, this.tailMaterial, 20 * 4);
    this.brakelights = this.pool(box, this.brakeMaterial, 20 * 4);
    this.rail = new CommuterRail(scene);
    this.contacts = this.pool(new THREE.CircleGeometry(.5, 16), new THREE.MeshBasicMaterial({ color: 0x06090a, transparent: true, opacity: .18, depthWrite: false }), 110);
    for (let i = 0; i < 3; i++) { const light = new THREE.SpotLight(0xffe3bd, 0, 24, .5, .65, 2); scene.add(light, light.target); this.beams.push(light); }
    this.signals(); this.update(0, 17.25);
  }
  get stats() { return this.simulation.stats; }
  get pedestrianGreen(): boolean { return this.simulation.signals.walk; }
  private pool(geometry: THREE.BufferGeometry, material: THREE.Material, capacity: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity); mesh.count = 0; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.receiveShadow = true; this.group.add(mesh); return mesh;
  }
  private put(mesh: THREE.InstancedMesh, x: number, y: number, z: number, w: number, h: number, d: number, color = 0xffffff, yaw = 0, rx = 0, rz = 0): void {
    const index = mesh.count++; this.object.position.set(x, y, z); this.object.scale.set(w, h, d); this.object.rotation.set(rx, yaw, rz, 'YXZ'); this.object.updateMatrix(); mesh.setMatrixAt(index, this.object.matrix); mesh.setColorAt(index, this.tint.setHex(color));
  }
  update(dt: number, hour: number, listener?: THREE.Vector3): void {
    this.simulation.update(dt, hour, listener);
    const pools = [this.body, this.glass, this.wheels, this.headlights, this.taillights, this.brakelights, this.contacts];
    pools.forEach(p => { p.count = 0; }); this.people.update(this.simulation, listener); this.drawVehicles(); this.rail.update(this.simulation.trainX, hour);
    pools.forEach(p => { p.instanceMatrix.needsUpdate = true; if (p.instanceColor) p.instanceColor.needsUpdate = true; });
    const night = dayState(hour).night;
    this.headlightMaterial.emissiveIntensity = .4 + night * 3.2; this.tailMaterial.emissiveIntensity = .25 + night * .65; this.brakeMaterial.emissiveIntensity = 1.8 + night * 2;
    const nearby = this.simulation.vehicles.filter(c => c.active).sort((a, b) => Math.hypot(a.x - (listener?.x ?? 0), a.z - (listener?.z ?? 0)) - Math.hypot(b.x - (listener?.x ?? 0), b.z - (listener?.z ?? 0)));
    this.beams.forEach((light, i) => { const c = nearby[i]; light.intensity = c ? night * 35 : 0; if (c) { const front = VEHICLE_PROFILES[c.kind].length / 2; light.position.set(c.x + Math.sin(c.yaw) * front, .72, c.z + Math.cos(c.yaw) * front); light.target.position.set(c.x + Math.sin(c.yaw) * (front + 10), .05, c.z + Math.cos(c.yaw) * (front + 10)); } });
    for (const axis of ['NS', 'EW'] as const) this.signalMaterials[axis].forEach((m, i) => { const active = this.simulation.signals[axis === 'NS' ? 'ns' : 'ew'] === ['red', 'amber', 'green'][i]; m.color.setHex(active ? [0xf44335, 0xf1bf46, 0x39cda5][i] : 0x172321); m.emissiveIntensity = active ? 3 : 0; });
    this.pedestrianMaterials.forEach((m, i) => { const s = this.simulation.signals, green = s.walk || (s.clearance && Math.floor(this.simulation.clock * 3) % 2 === 0); m.emissiveIntensity = (i === 1 ? green : !s.walk && !s.clearance) ? 2.5 : .015; });
  }
  private drawVehicles(): void {
    for (const c of this.simulation.vehicles) {
      if (!c.active) continue;
      const { length: l, width: w, height: h } = VEHICLE_PROFILES[c.kind], cs = Math.cos(c.yaw), sn = Math.sin(c.yaw);
      const part = (mesh: THREE.InstancedMesh, lx: number, y: number, lz: number, sx: number, sy: number, sz: number, color: number, rz = 0) => this.put(mesh, c.x + lx * cs + lz * sn, y, c.z + lz * cs - lx * sn, sx, sy, sz, color, c.yaw, 0, rz);
      const boxy = c.kind === 'van' || c.kind === 'kei', truck = c.kind === 'truck';
      part(this.body, 0, .63, 0, w, .66, l, c.color);
      if (truck) {
        part(this.body, 0, h / 2 + .45, -.6, w, h - .6, l * .58, 0xc7c7bc);
        part(this.body, 0, 1.2, l * .29, w * .94, 1.3, l * .35, c.color);
        part(this.glass, 0, 1.45, l * .47, w * .83, .55, .025, 0xd5e3df);
      } else {
        part(this.glass, 0, (h + .8) / 2, -.1, w * .9, h - .75, boxy ? l * .77 : l * .53, 0xc2d0d0);
        part(this.body, 0, h, -.1, w * .94, .13, boxy ? l * .79 : l * .56, c.color);
        for (const side of [-1, 1]) { part(this.body, side * w * .455, (h + .8) / 2, -.16, .06, h - .72, .09, c.color); part(this.body, side * w * .53, 1.02, l * .18, .14, .1, .23, c.color); }
      }
      part(this.body, 0, .48, l / 2, w * .92, .16, .1, 0x343c3e);
      part(this.body, 0, .48, -l / 2, w * .92, .14, .1, 0x343c3e);
      for (const side of [-1, 1]) {
        part(this.headlights, side * w * .33, .73, l / 2 + .035, .3, .18, .03, 0xffffff);
        part(c.braking ? this.brakelights : this.taillights, side * w * .36, .72, -l / 2 - .03, .22, truck ? .2 : .16, .025, 0xffffff);
        for (const z of [-l * .3, l * .3]) { part(this.wheels, side * w * .48, .32, z, .29, .16, .29, 0x242a2c, Math.PI / 2); part(this.wheels, side * w * .535, .32, z, .17, .015, .17, 0x9aabae, Math.PI / 2); }
        part(this.body, side * w * .485, .82, -.15, .025, .035, .24, 0xaab5b4);
      }
      part(this.body, 0, .54, l / 2 + .06, .4, .18, .025, c.kind === 'kei' ? 0xcfae40 : 0xdadacc);
      if (c.kind === 'taxi') { part(this.headlights, 0, h + .15, -.05, .48, .18, .22, 0xf4d698); for (const side of [-1, 1]) part(this.body, side * w * .505, .82, 0, .025, .14, l * .65, 0x306859); }
      if (c.route.turn && !c.committed) part(this.headlights, -w * .5, .78, l * .38, .03, .12, .16, Math.floor(this.simulation.clock * 2) % 2 ? 0xffbd52 : 0x654b24);
      this.put(this.contacts, c.x, .035, c.z, w + .3, l + .4, 1, 0xffffff, c.yaw, -Math.PI / 2);
    }
  }
  private signals(): void {
    const pole = new THREE.MeshStandardMaterial({ color: 0x4c5958, metalness: .5, roughness: .6 }), housing = new THREE.MeshStandardMaterial({ color: 0x253235 });
    const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Group, x: number, y: number, z: number) => { const obj = new THREE.Mesh(geo, mat); obj.position.set(x, y, z); parent.add(obj); return obj; };
    for (const axis of ['NS', 'EW'] as const) for (const color of [0xf44335, 0xf1bf46, 0x39cda5]) this.signalMaterials[axis].push(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1 }));
    for (const [x, z, yaw, axis] of [[1.8, 5, Math.PI, 'NS'], [-1.8, 19, 0, 'NS'], [5.4, 14.2, Math.PI / 2, 'EW'], [-5.4, 9.8, -Math.PI / 2, 'EW']] as const) {
      const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = yaw; this.group.add(group);
      mesh(new THREE.CylinderGeometry(.055, .075, 5.5, 8), pole, group, -2.25, 2.75, 0);
      mesh(new THREE.BoxGeometry(2.4, .075, .075), pole, group, -1.15, 5.35, 0);
      mesh(new THREE.BoxGeometry(1.2, .46, .3), housing, group, 0, 5.1, 0);
      for (let i = 0; i < 3; i++) { const light = mesh(new THREE.SphereGeometry(.14, 12, 10), this.signalMaterials[axis][i], group, .36 - i * .36, 5.1, .17); light.scale.z = .3; mesh(new THREE.BoxGeometry(.28, .035, .24), housing, group, .36 - i * .36, 5.27, .23); }
    }
    for (let i = 0; i < 2; i++) {
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 96; const c = canvas.getContext('2d')!;
      c.fillStyle = '#ffffff'; c.strokeStyle = '#ffffff'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.arc(32, 17, 8, 0, 7); c.fill();
      c.beginPath(); c.moveTo(32, 31); c.lineTo(32, 59); c.moveTo(32, 36); c.lineTo(i ? 17 : 19, i ? 50 : 54); c.moveTo(32, 36); c.lineTo(i ? 49 : 45, i ? 28 : 54); c.moveTo(32, 57); c.lineTo(i ? 17 : 25, 82); c.moveTo(32, 57); c.lineTo(i ? 49 : 39, i ? 74 : 82); c.stroke();
      const texture = new THREE.CanvasTexture(canvas), color = i ? 0x50efad : 0xef5141;
      this.pedestrianMaterials.push(new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, color, emissive: color, transparent: true }));
    }
    for (const crossing of CROSSINGS) for (const [a, b] of [[crossing.a, crossing.b], [crossing.b, crossing.a]]) {
      const group = new THREE.Group(); group.position.set(a.x, 0, a.z); group.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); this.group.add(group);
      mesh(new THREE.CylinderGeometry(.035, .05, 3.1, 8), pole, group, .48, 1.55, 0);
      mesh(new THREE.BoxGeometry(.39, .85, .2), housing, group, .48, 2.6, 0);
      for (let i = 0; i < 2; i++) mesh(new THREE.PlaneGeometry(.24, .33), this.pedestrianMaterials[i], group, .48, 2.8 - i * .4, .11);
    }
  }
}
