import * as THREE from 'three';
import { Doorway } from '../types';
import { random } from '../generation/Materials';

interface Walker { x: number; z: number; route: THREE.Vector2[]; target: number; speed: number; phase: number; crossing: boolean; waiting: number; visiting: boolean; shirt: number; skin: number }
interface Car { z: number; side: number; speed: number; color: number }

/** Small, deterministic lane/waypoint simulation; rendering is decoupled through instance pools. */
export class CityActivity {
  readonly group = new THREE.Group();
  private readonly walkers: Walker[] = []; private readonly cars: Car[] = [];
  private readonly object = new THREE.Object3D(); private readonly color = new THREE.Color();
  private readonly people: THREE.InstancedMesh; private readonly heads: THREE.InstancedMesh;
  private readonly hair: THREE.InstancedMesh;
  private readonly carParts: THREE.InstancedMesh; private readonly train: THREE.InstancedMesh;
  private readonly signalMaterial: THREE.MeshStandardMaterial[] = [];
  private clock = 8; private peopleCount = 0; private carCount = 0;
  private readonly box = new THREE.BoxGeometry(1, 1, 1);
  constructor(scene: THREE.Scene, doors: Doorway[]) {
    this.group.name = 'City activity'; scene.add(this.group);
    const mat = new THREE.MeshStandardMaterial({ roughness: .72 });
    this.people = new THREE.InstancedMesh(this.box, mat, 80 * 8);
    this.heads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), mat, 80);
    this.hair = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), mat, 80);
    this.carParts = new THREE.InstancedMesh(this.box, new THREE.MeshStandardMaterial({ roughness: .38, metalness: .3 }), 12 * 20);
    this.train = new THREE.InstancedMesh(this.box, new THREE.MeshStandardMaterial({ roughness: .4, metalness: .45, emissive: 0x334a35, emissiveIntensity: .12 }), 320);
    for (const mesh of [this.people, this.heads, this.hair, this.carParts, this.train]) { mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = true; this.group.add(mesh); }
    const rng = random(7719), shirts = [0x243641, 0xeadfca, 0x656c6d, 0x353341, 0xa68679, 0x284d52, 0x879b91, 0xb1a79b];
    for (let i = 0; i < 80; i++) {
      const side = i % 2 ? 1 : -1, x = side * (4.65 + rng() * .35);
      let route: THREE.Vector2[];
      const v = (px: number, pz: number) => new THREE.Vector2(px, pz);
      if (i % 4 === 0) route = [v(x, 51), v(x, 21.4), v(-x, 21.4), v(-x, -47), v(-x, 21.4), v(x, 21.4)];
      else {
        const north = i % 3 === 0, start = north ? -47 : 25, end = north ? -1 : 59;
        const available = doors.filter(d => Math.sign(d.sidewalkX) === side && d.z > start && d.z < end);
        const door = available[Math.floor(rng() * available.length)];
        route = [v(x, start), v(x, end)];
        if (door && i % 3 === 1) route = [v(x, start), v(x, door.z), v(door.x, door.z), v(x, door.z), v(x, end)];
      }
      if (i % 10 === 9) route = [v(4.8, -46), v(18, -46), v(18, -48), v(18, -46), v(4.8, -46)];
      const target = 1, p = route[0].clone().lerp(route[1], rng());
      // Never initially spawn a walker in the roadway.
      this.walkers.push({ x: p.x, z: p.y, route, target, speed: .9 + rng() * .45, phase: rng() * 7, crossing: false, waiting: 0, visiting: false, shirt: shirts[i % shirts.length], skin: [0xc39779, 0xd4af8d, 0xb99176][i % 3] });
    }
    for (let i = 0; i < 12; i++) this.cars.push({ z: -61 + Math.floor(i / 2) * 21, side: i % 2 ? 1 : -1, speed: 0, color: [0xe8e3d8, 0x263842, 0x9eaaa7, 0x7d3732, 0xdacb9b, 0x3a4a5a][i % 6] });
    this.signals(); this.update(0, 17.25);
  }
  get stats() { return { pedestrians: this.peopleCount, vehicles: this.carCount }; }
  get pedestrianGreen(): boolean { const phase = this.clock % 52; return phase >= 31 && phase < 40; }
  private get carsGreen(): boolean { return this.clock % 52 < 26; }
  private instance(mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, w: number, h: number, d: number, color: number, yaw = 0, rx = 0): void {
    this.object.position.set(x, y, z); this.object.scale.set(w, h, d); this.object.rotation.set(rx, yaw, 0); this.object.updateMatrix(); mesh.setMatrixAt(index, this.object.matrix); mesh.setColorAt(index, this.color.setHex(color));
  }
  update(dt: number, hour: number): void {
    this.clock += dt;
    const rush = Math.exp(-(((hour - 8) / 2) ** 2)) + Math.exp(-(((hour - 18.5) / 3) ** 2));
    const late = hour < 5 ? .27 : hour > 23 ? .5 : .75;
    this.peopleCount = Math.min(80, Math.floor(38 * late + 35 * rush)); this.carCount = Math.min(12, Math.floor(6 * late + 5 * rush));
    this.updateWalkers(dt); this.updateCars(dt); this.updateTrain();
    const phase = this.clock % 52;
    this.signalMaterial.forEach((m, i) => { const on = i === 0 ? phase >= 29 : i === 1 ? phase >= 26 && phase < 29 : i === 2 ? phase < 26 : i === 3 ? !this.pedestrianGreen : this.pedestrianGreen; m.emissiveIntensity = on ? 2.5 : .02; m.color.setScalar(on ? 1 : .1); });
  }
  private updateWalkers(dt: number): void {
    let part = 0;
    for (let i = 0; i < this.peopleCount; i++) {
      const p = this.walkers[i], goal = p.route[p.target];
      const dx = goal.x - p.x, dz = goal.y - p.z, distance = Math.hypot(dx, dz);
      const isCrossingSegment = Math.sign(goal.x) !== Math.sign(p.x) && Math.abs(goal.y - 21.4) < .1;
      let walking = false, hidden = false;
      if (p.waiting > 0) { p.waiting -= dt; hidden = true; }
      else if (distance < .07) {
        p.x = goal.x; p.z = goal.y; p.crossing = false;
        // Enter doorway, pause out of view, then return to the footway.
        if (Math.abs(goal.x) > 5.5 && !p.visiting) { p.waiting = 2.5 + i % 4; p.visiting = true; }
        else { p.target = (p.target + 1) % p.route.length; p.visiting = false; }
      } else if (!isCrossingSegment || p.crossing || this.pedestrianGreen) {
        if (isCrossingSegment) p.crossing = true;
        const step = Math.min(distance, p.speed * dt); p.x += dx / distance * step; p.z += dz / distance * step; p.phase += step * 7; walking = true;
      }
      const yaw = Math.atan2(dx, dz), y = hidden ? -10 : .13;
      const bob = walking ? Math.abs(Math.sin(p.phase)) * .025 : 0, swing = walking ? Math.sin(p.phase) * .48 : 0;
      this.instance(this.people, part++, p.x, y + 1.07 + bob, p.z, .35, .53, .21, p.shirt, yaw);
      this.instance(this.people, part++, p.x, y + .78, p.z, .31, .13, .22, 0x343c41, yaw);
      for (const side of [-1, 1]) {
        const ox = Math.cos(yaw) * side;
        const oz = -Math.sin(yaw) * side;
        this.instance(this.people, part++, p.x + ox * .1, y + .42, p.z + oz * .1, .12, .65, .14, 0x2d343d, yaw, side * swing);
        this.instance(this.people, part++, p.x + ox * .255, y + 1.02, p.z + oz * .255, .105, .48, .12, p.shirt, yaw, -side * swing * .7);
        this.instance(this.people, part++, p.x + ox * .1, y + .095, p.z + oz * .1 + .03, .14, .12, .25, 0x242a2b, yaw);
      }
      this.instance(this.heads, i, p.x, y + 1.49 + bob, p.z, .125, .165, .12, p.skin, yaw);
      this.instance(this.hair, i, p.x, y + 1.58 + bob, p.z - .024, .13, .1, .125, i % 5 ? 0x292725 : 0x6b5140, yaw);
    }
    this.people.count = part; this.heads.count = this.hair.count = this.peopleCount;
    for (const mesh of [this.people, this.heads, this.hair]) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
  }
  private updateCars(dt: number): void {
    let part = 0;
    for (let i = 0; i < this.carCount; i++) {
      const c = this.cars[i], direction = -c.side, stop = direction < 0 ? 26.2 : 16.6;
      const toStop = (stop - c.z) * direction;
      let target = 6.2;
      if (!this.carsGreen && toStop > -.1 && toStop < 16) target = Math.min(target, Math.sqrt(Math.max(0, toStop) * 4));
      for (let j = 0; j < this.carCount; j++) if (i !== j && this.cars[j].side === c.side) {
        const gap = (this.cars[j].z - c.z) * direction - 4.4;
        if (gap > -1 && gap < 16) target = Math.min(target, Math.max(0, gap * .9));
      }
      c.speed = THREE.MathUtils.damp(c.speed, target, target < c.speed ? 7 : 1.8, dt);
      let move = c.speed * dt;
      if (!this.carsGreen && toStop >= 0) move = Math.min(move, toStop);
      c.z += direction * move;
      if (c.z > 70) c.z = -70; if (c.z < -70) c.z = 70;
      const x = c.side * 1.8, z = c.z, yaw = direction < 0 ? Math.PI : 0;
      const add = (lx: number, y: number, lz: number, w: number, h: number, d: number, color: number) => { this.instance(this.carParts, part++, x + lx * direction, y, z + lz * direction, w, h, d, color, yaw); };
      add(0, .65, 0, 1.55, .67, 3.25, c.color); add(0, 1.19, -.15, 1.38, .6, 1.8, 0x354b56); add(0, 1.52, -.15, 1.47, .12, 1.9, c.color);
      for (const side of [-1, 1]) { add(side * .76, .34, -1.02, .16, .52, .5, 0x20282b); add(side * .76, .34, 1.02, .16, .52, .5, 0x20282b); add(side * .48, .74, 1.64, .34, .2, .035, 0xffedb7); add(side * .48, .74, -1.64, .32, .18, .03, c.speed < 1 ? 0xfb4431 : 0x8c3027); add(side * .72, 1.15, -.15, .06, .64, .09, c.color); }
      add(0, .48, 1.66, .42, .2, .025, 0xe8d290); add(0, .62, 1.67, .5, .1, .025, 0x303637);
    }
    this.carParts.count = part; this.carParts.instanceMatrix.needsUpdate = true; if (this.carParts.instanceColor) this.carParts.instanceColor.needsUpdate = true;
  }
  private updateTrain(): void {
    // A short commuter set passes every ~29 seconds; gaps leave the station sightline clear.
    const lead = (this.clock * 10 % 290) - 120;
    let part = 0;
    for (let car = 0; car < 3; car++) {
      const x = lead - car * 13.5;
      const add = (lx: number, y: number, z: number, w: number, h: number, d: number, color: number) => this.instance(this.train, part++, x + lx, y, -57 + z, w, h, d, color);
      add(0, 8.25, 0, 12.8, 2.1, 2.65, 0xbfc6c3); add(0, 9.37, 0, 12.7, .2, 2.7, 0x697575);
      for (const side of [-1, 1]) {
        add(0, 7.85, side * 1.34, 12.7, .33, .025, 0x5c946b);
        for (let j = -5; j <= 5; j += 1.25) add(j, 8.58, side * 1.35, .83, .83, .03, j % 2 ? 0x374b50 : 0x718c83);
        for (const j of [-3.4, 3.4]) { add(j, 8.15, side * 1.37, .95, 1.8, .025, 0x8d9c99); add(j, 8.6, side * 1.39, .65, .64, .025, 0x304950); }
      }
      add(0, 9.65, 0, 2.2, .38, 1.3, 0x737d78);
    }
    this.train.count = part; this.train.instanceMatrix.needsUpdate = true; if (this.train.instanceColor) this.train.instanceColor.needsUpdate = true;
  }
  private signals(): void {
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x414e50, metalness: .5, roughness: .6 });
    const housing = new THREE.MeshStandardMaterial({ color: 0x283637 });
    for (const color of [0xe9382e, 0xeec044, 0x36cba6, 0xf04c3d, 0x41d4ae]) this.signalMaterial.push(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1 }));
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.055, .075, 5.7, 8), poleMaterial); pole.position.set(side * 4.1, 2.85, 21.4); this.group.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(2, .09, .09), poleMaterial); arm.position.set(side * 3.1, 5.5, 21.4); this.group.add(arm);
      const caseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, .48, .35), housing); caseMesh.position.set(side * 2.25, 5.15, 21.4); this.group.add(caseMesh);
      for (let i = 0; i < 3; i++) {
        const light = new THREE.Mesh(new THREE.SphereGeometry(.145, 10, 8), this.signalMaterial[i]); light.scale.z = .3; light.position.set(side * 2.25 + (i - 1) * .35, 5.15, 21.4 + side * .19); this.group.add(light);
      }
      const pedestrian = new THREE.Mesh(new THREE.BoxGeometry(.21, .8, .43), housing); pedestrian.position.set(side * 4.13, 2.65, 21.4); this.group.add(pedestrian);
      for (let i = 0; i < 2; i++) { const light = new THREE.Mesh(new THREE.BoxGeometry(.02, .24, .25), this.signalMaterial[3 + i]); light.position.set(side * 4.13 - side * .12, 2.85 - i * .4, 21.4); this.group.add(light); }
    }
  }
}
