import * as THREE from 'three';
import { CommuterRail } from './CommuterRail';
import { HumanPresentation } from './HumanPresentation';
import { VehiclePresentation } from './VehiclePresentation';
import type { District } from '../types';
import { CitySimulation, VEHICLE_PROFILES } from './CitySimulation';
import { CROSSINGS, dayState } from './WorldRules';
import type { Axis } from './WorldRules';
import { StationNavigationDebug } from './StationNavigationDebug';

/** Instanced presentation only. All movement and permissions come from the tested model. */
export class CityActivity {
  readonly group = new THREE.Group();
  readonly simulation: CitySimulation;
  private readonly object = new THREE.Object3D(); private readonly tint = new THREE.Color();
  readonly people: HumanPresentation;
  readonly vehicles: VehiclePresentation;
  private readonly rail: CommuterRail;
  private stationDebug?: StationNavigationDebug;
  private readonly beams: THREE.SpotLight[] = [];
  private readonly contacts: THREE.InstancedMesh;
  private readonly signalMaterials: Record<Axis, THREE.MeshStandardMaterial[]> = { NS: [], EW: [] };
  private readonly pedestrianMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(scene: THREE.Scene, district: District) {
    scene.add(this.group); this.group.name = 'Living street presentation';
    this.simulation = new CitySimulation({ bounds: district.colliders, doors: district.doors, station: district.station });
    this.people = new HumanPresentation(this.group);
    this.vehicles = new VehiclePresentation(this.group);
    this.rail = new CommuterRail(scene);
    this.contacts = this.pool(new THREE.CircleGeometry(.5, 16), new THREE.MeshBasicMaterial({ color: 0x06090a, transparent: true, opacity: .18, depthWrite: false }), 110);
    for (let i = 0; i < 3; i++) { const light = new THREE.SpotLight(0xffe3bd, 0, 24, .5, .65, 2); scene.add(light, light.target); this.beams.push(light); }
    this.signals(); this.update(0, 17.25);
    if(import.meta.env.DEV&&new URLSearchParams(location.search).get('stationDebug')==='1')this.setStationDebug(true);
  }
  setStationDebug(visible:boolean):void{
    if(!import.meta.env.DEV||!this.simulation.navigation.station)return;
    if(!this.stationDebug&&visible)this.stationDebug=new StationNavigationDebug(this.simulation,this.group);
    if(this.stationDebug){this.stationDebug.group.visible=visible;this.stationDebug.update(this.simulation);}
  }
  get stats() { return this.simulation.stats; }
  get pedestrianGreen(): boolean { return this.simulation.signals.walk; }
  private pool(geometry: THREE.BufferGeometry, material: THREE.Material, capacity: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity); mesh.count = 0; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.receiveShadow = true; this.group.add(mesh); return mesh;
  }
  private put(mesh: THREE.InstancedMesh, x: number, y: number, z: number, w: number, h: number, d: number, color = 0xffffff, yaw = 0, rx = 0, rz = 0): void {
    const index = mesh.count++; this.object.position.set(x, y, z); this.object.scale.set(w, h, d); this.object.rotation.set(rx, yaw, rz, 'YXZ'); this.object.updateMatrix(); mesh.setMatrixAt(index, this.object.matrix); mesh.setColorAt(index, this.tint.setHex(color));
  }
  update(dt: number, hour: number, listener?: THREE.Vector3, hourRate = 0): void {
    this.simulation.update(dt, hour, listener, hourRate);
    hour = this.simulation.hour;
    const pools = [this.contacts];
    pools.forEach(p => { p.count = 0; }); this.people.update(this.simulation, listener); this.vehicles.update(this.simulation,listener); this.drawVehicles(); this.rail.update(this.simulation.train.snapshot, hour);
    this.stationDebug?.update(this.simulation);
    pools.forEach(p => { p.instanceMatrix.needsUpdate = true; if (p.instanceColor) p.instanceColor.needsUpdate = true; });
    const night = dayState(hour).night;
    const nearby = this.simulation.vehicles.filter(c => c.active).sort((a, b) => Math.hypot(a.x - (listener?.x ?? 0), a.z - (listener?.z ?? 0)) - Math.hypot(b.x - (listener?.x ?? 0), b.z - (listener?.z ?? 0)));
    this.beams.forEach((light, i) => { const c = nearby[i]; light.intensity = c ? night * 20 : 0; if (c) { const front = VEHICLE_PROFILES[c.kind].length / 2; light.position.set(c.x + Math.sin(c.yaw) * front, .72, c.z + Math.cos(c.yaw) * front); light.target.position.set(c.x + Math.sin(c.yaw) * (front + 10), .05, c.z + Math.cos(c.yaw) * (front + 10)); } });
    for (const axis of ['NS', 'EW'] as const) this.signalMaterials[axis].forEach((m, i) => { const active = this.simulation.signals[axis === 'NS' ? 'ns' : 'ew'] === ['red', 'amber', 'green'][i]; m.color.setHex(active ? [0xf44335, 0xf1bf46, 0x39cda5][i] : 0x172321); m.emissiveIntensity = active ? 3 : 0; });
    this.pedestrianMaterials.forEach((m, i) => { const s = this.simulation.signals, green = s.walk || (s.clearance && Math.floor(this.simulation.clock * 3) % 2 === 0); m.emissiveIntensity = (i === 1 ? green : !s.walk && !s.clearance) ? 2.5 : .015; });
  }
  private drawVehicles(): void {
    for (const c of this.simulation.vehicles) {
      if (!c.active) continue;
      const p = VEHICLE_PROFILES[c.kind];
      this.put(this.contacts, c.x, .035, c.z, p.bodyWidth + .22, p.length + .22, 1, 0xffffff, c.yaw, -Math.PI / 2);
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
