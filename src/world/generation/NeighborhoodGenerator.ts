import * as THREE from 'three';
import { Bounds, District, Doorway, Shopfront } from '../types';
import { BuildingKit, BuildingSpec, Archetype } from './BuildingKit';
import { CityBatch } from './CityBatch';
import { Materials, random } from './Materials';
import { stationDetails } from './StationDetails';
import { addRailwayDetails } from './RailwayDetails';
import { signBusiness } from '../simulation/WorldRules';

/** Metre-scale compact district. Each frontage uses the same local +Z kit convention. */
export class NeighborhoodGenerator {
  constructor(private readonly seed = 8412) {}
  generate(): District {
    const b = new CityBatch(), m = new Materials(), rng = random(this.seed);
    const kit = new BuildingKit(b, m, rng), colliders: Bounds[] = [], doors: Doorway[] = [], lamps: THREE.Vector3[] = [], shopfronts: Shopfront[] = [];
    let buildings = 0;
    const add = (s: BuildingSpec, main = false) => {
      kit.build(s); buildings++;
      const corners = [[-s.width / 2 - .15, .1], [s.width / 2 + .95, -s.depth]].map(([x, z]) => new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), s.rotation).add(new THREE.Vector3(s.x, 0, s.z)));
      colliders.push({ minX: Math.min(corners[0].x, corners[1].x), maxX: Math.max(corners[0].x, corners[1].x), minZ: Math.min(corners[0].z, corners[1].z), maxZ: Math.max(corners[0].z, corners[1].z) });
      const business = s.kind === 'apartment' ? 'residential' : s.kind === 'office' ? 'office' : s.kind === 'convenience' ? 'convenience' : signBusiness(s.shop);
      shopfronts.push({ x: s.x, z: s.z, rotation: s.rotation, width: s.width, business });
      if (main) {
        const point = new THREE.Vector3(s.width * .2, 0, .48).applyAxisAngle(THREE.Object3D.DEFAULT_UP, s.rotation);
        doors.push({ x: s.x + point.x, z: s.z + point.z, sidewalkX: s.x < 0 ? -4.55 : 4.55, business });
      }
    };
    this.roads(b, m);
    for (const side of [-1, 1]) for (const [start, end] of [[-51, -28.5], [-21.5, 4], [20.5, 61]]) {
      // Reserve a genuine forecourt for the station instead of overlapping the shop row.
      let cursor = side > 0 && start === -51 ? -35 : start;
      while (cursor < end - 3.8) {
        const width = Math.min(4.6 + rng() * 3.1, end - cursor - .35), depth = 9 + rng() * 4;
        const choice = Math.floor(rng() * 9);
        const kind: Archetype = choice < 3 ? 'izakaya' : choice < 5 ? 'retail' : choice < 7 ? 'apartment' : choice === 7 ? 'office' : 'convenience';
        const floors = kind === 'izakaya' ? 3 + Math.floor(rng() * 2) : kind === 'office' ? 6 + Math.floor(rng() * 3) : 3 + Math.floor(rng() * 4);
        const x = side * (6.25 + (kind === 'apartment' ? .7 : rng() * .3)), palette = Math.floor(rng() * 8), value = Math.floor(rng() * 16);
        const choices = kind === 'izakaya' ? [0, 1, 5, 9, 14] : [2, 6, 7, 8, 10, 11, 13, 20, 22];
        add({ x, z: cursor + width / 2, rotation: -side * Math.PI / 2, width, depth, floors, kind, palette, shop: choices[value % choices.length] }, true);
        cursor += width + .45 + rng() * .65;
      }
    }
    for (const side of [-1, 1]) for (const z of [-42, -33, -16, -6, 29, 40, 51]) {
      if (side === -1 && z === -42) continue; // Keep the station forecourt clear of the rear apartment wall.
      add({ x: 30 + side * 3.8, z: z + rng(), rotation: -side * Math.PI / 2, width: 6.8 + rng(), depth: side < 0 ? 5.6 : 9, floors: 2 + Math.floor(rng() * 3), kind: 'apartment', palette: Math.floor(rng() * 4), shop: 10 });
    }
    for (const side of [-1, 1]) for (const x of [-48, -38, -28, 43, 53]) {
      add({ x, z: 12 + side * 7.6, rotation: side > 0 ? Math.PI : 0, width: 7.4, depth: 9, floors: 4 + Math.floor(rng() * 4), kind: x === 43 ? 'convenience' : 'office', palette: Math.floor(rng() * 8), shop: x === 43 ? 12 : 15 });
    }
    for (let i = 0; i < 12; i++) {
      const x = i < 6 ? -35 - rng() * 23 : 47 + rng() * 16, z = -61 + rng() * 115;
      if (Math.abs(z - 12) < 16) continue;
      add({ x, z, rotation: i < 6 ? Math.PI / 2 : -Math.PI / 2, width: 9 + rng() * 4, depth: 8 + rng() * 7, floors: 7 + Math.floor(rng() * 9), kind: 'office', palette: 4 + i % 4, shop: 15 });
    }
    b.origin(); this.streetProps(b, m, lamps, rng, colliders); this.railway(b, m, colliders); addRailwayDetails(b, m); this.alley(b, m);
    const station = stationDetails(b, m);
    const group = b.finish(m.signs); group.add(station); group.name = `Shinmachi · seed ${this.seed}`;
    return { group, colliders, doors, shopfronts, lamps, materials: { signs: m.signs, windows: m.windows, warmWindows: m.warmWindows, lamps: m.lamps, shop: m.shop, lantern: m.lantern, businesses: m.businesses }, stats: { buildings, instances: b.instances } };
  }
  private roads(b: CityBatch, m: Materials): void {
    b.b(m.asphalt, 0, -.12, 0, 150, .2, 150);
    for (const [a, c] of [[-67, 6.7], [17.3, 67]]) for (const side of [-1, 1]) {
      b.b(m.pavement, side * 4.8, .025, (a + c) / 2, 1.9, .18, c - a);
      b.b(m.cream, side * 3.8, .045, (a + c) / 2, .17, .23, c - a);
      b.b(m.yellow, side * 5.1, .126, (a + c) / 2, .24, .012, c - a);
      for (let z = a + 2; z < c; z += 5) {
        b.b(m.dark, side * 3.65, .005, z, .3, .014, .58);
        for (let j = -2; j <= 2; j++) b.b(m.metal, side * 3.65 + j * .055, .016, z, .018, .01, .52);
      }
    }
    for (const side of [-1, 1]) for (const [a, c] of [[-68, -6], [6, 68]]) {
      b.b(m.pavement, (a + c) / 2, .025, 12 + side * 6, c - a, .18, 1.8);
      b.b(m.cream, (a + c) / 2, .04, 12 + side * 5.05, c - a, .2, .18);
    }
    b.b(m.asphalt, 0, .003, -25, 100, .018, 4.2); b.b(m.asphalt, 30, .003, 0, 4.6, .018, 126);
    for (const side of [-1, 1]) b.b(m.cream, 30 + side * 2.12, .019, 0, .09, .015, 126);
    for (let z = -64; z < 66; z += 5.5) {
      if (z > 3 && z < 25) continue;
      b.b(m.marking, 0, .007, z, .09, .018, 2.8);
      for (const side of [-1, 1]) b.b(m.marking, side * 3.4, .009, z, .08, .018, 5.5);
    }
    for (let x = -65; x < 66; x += 6) if (Math.abs(x) > 8) b.b(m.yellow, x, .012, 12, 3.3, .018, .1);
    for (const z of [2.6, 21.4]) for (let x = -3.25; x < 3.5; x += .85) b.b(m.marking, x, .02, z, .45, .022, 2.45);
    for (const x of [-7.8, 7.8]) for (let z = 7.4; z < 17; z += 1.05) b.b(m.marking, x, .02, z, 2.2, .022, .55);
    b.b(m.marking, -1.8, .024, 24.1, 3.1, .022, .28); b.b(m.marking, 1.8, .024, -.3, 3.1, .022, .28);
    b.b(m.marking, 10.2, .024, 14.2, .28, .022, 4); b.b(m.marking, -10.2, .024, 9.8, .28, .022, 4);
    b.b(m.asphalt, 44, .01, -35, 12, .03, 17);
    for (let i = 0; i < 5; i++) { b.b(m.marking, 38.4 + i * 2.5, .035, -35, .1, .02, 5); b.b(m.cream, 39.5 + i * 2.5, .14, -37, 1.4, .2, .25); }
    b.b(m.windows, 48, .95, -29, .8, 1.9, .55); b.sign(18, 48, 2.5, -28.7, 2.1, 1.2);
    for (const z of [-43, -14, 32, 53]) {
      b.part('cylinder', m.metal, -.7, .014, z, .39, .025, .39);
      for (let i = -2; i <= 2; i++) b.b(m.dark, -.7 + i * .1, .03, z, .025, .01, .57);
      b.b(m.dark, 1.6, .003, z - 4, 1.1, .013, 1.8);
    }
  }
  private streetProps(b: CityBatch, m: Materials, lamps: THREE.Vector3[], rng: () => number, colliders: Bounds[]): void {
    const block = (x: number, z: number, w: number, d: number) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    for (const side of [-1, 1]) {
      const poleX = side * 5.5;
      for (let z = -49; z <= 61; z += 18) {
        if (z > 5 && z < 20) continue;
        block(poleX, z, .27, .27);
        b.part('cylinder', m.facades[1], poleX, 4.1, z, .12, 8.2, .12); b.b(m.dark, poleX, 7.35, z, 1.6, .12, .12);
        b.part('cylinder', m.metal, poleX + .3, 6.65, z, .28, .7, .28);
        for (const dx of [-.6, 0, .6]) {
          b.part('cylinder', m.cream, poleX + dx, 7.55, z, .07, .3, .07);
          if (z < 59) b.cable(new THREE.Vector3(poleX + dx, 7.7, z), new THREE.Vector3(poleX + dx, 7.7, z + 18), .8);
        }
        b.cable(new THREE.Vector3(poleX, 6.8, z), new THREE.Vector3(side * 7, 5.8, z + 5), .35);
        b.b(m.metal, side * 4.75, 5.6, z, 1.5, .065, .06); b.b(m.dark, side * 4.05, 5.52, z, .5, .18, .25); b.b(m.lamps, side * 4.05, 5.42, z, .42, .035, .2);
        lamps.push(new THREE.Vector3(side * 4.05, 5.25, z)); b.b(m.yellow, poleX, 1, z, .27, .65, .27);
        for (let j = 0; j < 3; j++) b.b(m.dark, poleX, .79 + j * .2, z + .145, .27, .08, .02);
      }
    }
    for (const side of [-1, 1]) for (const z of [-44, -35, -14, -4, 31, 43, 54]) {
      for (const dz of [-1.2, 1.2]) b.part('cylinder', m.white, side * 3.95, .64, z + dz, .04, 1.1, .04);
      for (const y of [.45, .94]) b.b(m.white, side * 3.95, y, z, .055, .055, 2.4);
      block(side * 3.95, z, .09, 2.5);
    }
    for (const side of [-1, 1]) for (const z of [19.4, 23.4, .5, 4.6]) {
      b.part('cylinder', m.dark, side * 4.05, .48, z, .075, .85, .075); b.part('cylinder', m.white, side * 4.05, .72, z, .078, .1, .078);
    }
    for (const [x, z, r] of [[-5.7, 36, Math.PI / 2], [5.8, -16, -Math.PI / 2], [-5.8, -35, Math.PI / 2], [32.8, 41, -Math.PI / 2]]) { b.origin(x, z, r); this.vending(b, m); b.origin(); block(x, z, .66, 1.08); }
    for (const side of [-1, 1]) for (const z of [-38, -31, -10, 28, 35, 50]) { b.origin(side * 5.6, z, side * .15); this.bicycle(b, m); b.origin(); block(side * 5.6, z, .5, 1.65); }
    for (const z of [-42, -14, 32, 49]) {
      b.b(m.wood, -5.3, .34, z + 1, .55, .65, .7);
      block(-5.3, z + 1, .58, .75);
      for (let i = 0; i < 13; i++) b.part('sphere', m.green, -5.3 + (rng() - .5) * .6, .7 + rng() * .65, z + 1 + (rng() - .5) * .7, .14 + rng() * .12, .2, .14);
    }
    b.b(m.metal, 32.6, .65, -9, .9, 1.2, 2.7);
    for (let i = 0; i < 6; i++) { b.part('sphere', m.white, 32.5, .4, -10 + i * .37, .3, .35, .26); b.b(m.dark, 32.5, .76, -10 + i * .37, .07, .1, .07); }
    for (let y = .2; y < 1.3; y += .15) b.b(m.dark, 32.1, y, -9, .025, .02, 2.7);
    for (let z = -10.3; z < -7.6; z += .16) b.b(m.dark, 32.1, .7, z, .025, 1.2, .02);
    b.b(m.cream, 33, 1, 30, .6, 2, 1.8);
    for (let i = 0; i < 6; i++) b.b(m.metal, 32.68, .25 + i % 3 * .55, 29.6 + Math.floor(i / 3) * .8, .03, .5, .72);
    b.part('cylinder', m.red, 5.4, 1.9, -23, .04, 3.8, .04); b.part('cylinder', m.red, 5.4, 3.5, -23, .4, .08, .4, Math.PI / 2); b.part('cylinder', m.windows, 5.4, 3.5, -22.95, .34, .025, .34, Math.PI / 2);
    b.part('cylinder', m.metal, -5.3, 1.8, 24.5, .035, 3.6, .035); b.sign(31, -5.3, 3.25, 24.54, 1.5, .45); b.sign(19, 31.8, 1.7, -49, 1.7, .65);
    b.part('cylinder', m.metal, 32, 1.45, 19.5, .035, 2.9, .035);
    b.part('triangle', m.white, 32, 2.65, 19.5, .86, .86, 1);
    b.part('triangle', m.red, 32, 2.65, 19.51, .76, .76, 1);
    b.sign(17, 32, 2.7, 19.52, .4, .18);
    b.b(m.marking, 30, .026, 19.5, 3.8, .02, .22);
    // Maintenance cones guard the gutter repair; delivery scooters occupy the residential edge.
    for (const z of [-8, -6.5]) {
      b.b(m.dark, 3.25, .045, z, .4, .07, .4);
      b.part('cylinder', m.red, 3.25, .28, z, .14, .42, .14);
      b.part('cylinder', m.white, 3.25, .34, z, .145, .1, .145);
    }
    for (const z of [34, 36]) {
      b.b(m.dark, 32.6, .48, z, .44, .3, 1.3); b.b(m.white, 32.6, .62, z - .3, .5, .55, .7);
      b.b(m.dark, 32.6, .9, z - .3, .4, .08, .6); b.b(m.white, 32.6, .8, z + .47, .43, .6, .16);
      for (const dz of [-.57, .57]) b.part('cylinder', m.dark, 32.6, .25, z + dz, .22, .12, .22, 0, 0, Math.PI / 2);
      b.b(m.metal, 32.6, 1.15, z + .5, .6, .035, .035); b.b(m.lamps, 32.6, .94, z + .58, .2, .15, .035);
      block(32.6, z, .55, 1.6);
    }
    for (const [x, z] of [[24, -48], [28, 58], [-26, 34]]) this.tree(b, m, x, z, rng);
    for (let i = 0; i < 4; i++) {
      const x = 39.6 + i * 2.5, z = -35;
      b.b(i % 2 ? m.white : m.facades[4], x, .65, z, 1.55, .7, 3.1); b.b(m.windows, x, 1.2, z + .15, 1.4, .6, 1.8); b.b(i % 2 ? m.white : m.facades[4], x, 1.55, z + .15, 1.5, .12, 1.9);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.part('cylinder', m.dark, x + sx * .73, .35, z + sz, .28, .14, .28, 0, 0, Math.PI / 2);
      b.b(m.lamps, x, .68, z + 1.57, 1.15, .16, .03);
    }
  }
  private vending(b: CityBatch, m: Materials): void {
    b.b(m.red, 0, .98, 0, 1.05, 1.9, .62); b.b(m.dark, -.08, 1.22, .33, .8, 1.15, .025); b.b(m.shop, -.13, 1.25, .35, .66, 1.01, .02);
    for (let y = 0; y < 3; y++) for (let x = 0; x < 5; x++) {
      b.part('cylinder', [m.white, m.green, m.yellow, m.windows][(x + y) % 4], -.38 + x * .13, 1.57 - y * .29, .4, .045, .19, .045); b.b(m.lamps, -.38 + x * .13, 1.44 - y * .29, .41, .07, .025, .018);
    }
    b.b(m.dark, -.1, .36, .33, .7, .22, .06); b.b(m.metal, .38, .78, .34, .12, .4, .04); b.b(m.lamps, 0, 1.91, .32, .85, .09, .02);
    b.b(m.cream, .91, .58, .03, .43, 1.1, .47); b.part('cylinder', m.dark, .91, 1.15, .03, .12, .02, .12);
  }
  private bicycle(b: CityBatch, m: Materials): void {
    for (const z of [-.58, .58]) { b.part('torus', m.dark, 0, .44, z, .34, .34, .34, 0, Math.PI / 2); for (let a = 0; a < 6; a++) b.rod(m.metal, new THREE.Vector3(0, .44, z), new THREE.Vector3(0, .44 + Math.sin(a * Math.PI / 3) * .32, z + Math.cos(a * Math.PI / 3) * .32), .009); }
    for (const [ay, az, by, bz] of [[.44, -.58, .87, -.1], [.87, -.1, .44, .15], [.44, .15, .44, -.58], [.44, .15, .95, .4], [.95, .4, .87, -.1], [.95, .4, .44, .58]]) b.rod(m.metal, new THREE.Vector3(0, ay, az), new THREE.Vector3(0, by, bz), .023);
    b.b(m.dark, 0, 1.02, -.15, .19, .06, .27); b.b(m.metal, 0, 1.15, .45, .42, .025, .035); b.b(m.metal, 0, 1.03, .76, .33, .28, .28); b.b(m.dark, 0, 1.18, .76, .26, .02, .22);
  }
  private tree(b: CityBatch, m: Materials, x: number, z: number, rng: () => number): void {
    b.b(m.cream, x, .23, z, 2.2, .35, 2.2); b.b(m.dark, x, .42, z, 1.9, .05, 1.9); b.rod(m.wood, new THREE.Vector3(x, .4, z), new THREE.Vector3(x + .17, 3.6, z), .13);
    for (let i = 0; i < 20; i++) {
      const dx = (rng() - .5) * 2.6, dz = (rng() - .5) * 2.6, y = 2.5 + rng() * 1.8;
      b.rod(m.wood, new THREE.Vector3(x, 2, z), new THREE.Vector3(x + dx, y, z + dz), .025);
      b.part('sphere', m.green, x + dx, y, z + dz, .4 + rng() * .4, .45 + rng() * .35, .4 + rng() * .4, 0, 0, 0, [0xa6b780, 0x789f76, 0x9aa581][i % 3]);
    }
  }
  private alley(b: CityBatch, m: Materials): void {
    for (let x = -19; x < 23; x += 2.5) {
      const y = 3.35 - Math.sin((x + 19) / 42 * Math.PI) * .4;
      b.part('sphere', m.lantern, x, y, -25, .18, .27, .18);
      for (const dy of [-.24, .24]) b.b(m.dark, x, y + dy, -25, .15, .035, .15);
      for (const dy of [-.12, 0, .12]) b.part('torus', m.red, x, y + dy, -25, .17, .17, .17, Math.PI / 2);
    }
    b.cable(new THREE.Vector3(-20, 3.7, -25), new THREE.Vector3(24, 3.7, -25), .5); b.sign(23, -4.6, 4.1, -24.3, 2.5, .65, Math.PI / 2);
    for (const x of [-15, -11, 13, 18]) { b.b(m.cream, x, .6, -22.9, .8, 1.2, .55); for (let i = 0; i < 6; i++) b.b(m.metal, x, .3 + i * .11, -23.2, .64, .035, .025); b.b(m.wood, x + 1, .3, -22.9, .55, .6, .5); }
    for (const x of [-11, 13]) { b.part('cylinder', m.metal, x, 2.35, -22.8, .11, 1.6, .11); b.b(m.metal, x, 3.1, -22.8, .42, .09, .38); }
    // Human-scale alley bars: recessed entrances, wood battens, noren, menu boards.
    for (const side of [-1, 1]) for (const x of [-17, -12, 11, 16, 21]) {
      b.origin(x, -25 + side * 2.65, side > 0 ? Math.PI : 0);
      b.b(m.wood, 0, 1.4, -.12, 3.5, 2.8, .35);
      b.b(m.shop, -.45, 1.3, .08, 1.8, 1.7, .04);
      b.b(m.windows, 1, 1.15, .09, .65, 2.2, .04);
      for (let i = 0; i < 9; i++) b.b(m.wood, -1.4 + i * .21, 1.3, .16, .035, 1.85, .07);
      b.b(m.dark, 0, 2.65, .12, 3.5, .55, .3); b.sign(x % 2 ? 5 : 9, 0, 2.65, .29, 3.3, .48);
      for (let i = 0; i < 3; i++) b.b(m.green, .7 + i * .22, 2, .22, .2, .5, .035);
      b.b(m.metal, 0, 2.4, .4, 3.6, .08, .9);
      b.b(m.lantern, -1.45, 1.9, .62, .28, .48, .28);
      b.sign(30, -1.45, 1.9, .77, .23, .39);
      b.b(m.wood, .2, .5, .7, .45, .95, .07); b.sign(9, .2, .55, .75, .38, .65);
      b.origin();
    }
  }
  private railway(b: CityBatch, m: Materials, colliders: Bounds[]): void {
    b.b(m.facades[1], 0, 6.2, -57, 142, .9, 6.5);
    for (const z of [-60.15, -53.85]) b.b(m.cream, 0, 7, z, 142, 1.2, .24);
    for (let x = -65; x <= 65; x += 16) {
      if (Math.abs(x) < 5) continue;
      b.b(m.facades[1], x, 3, -57, 1.2, 6, 2.6); b.b(m.facades[1], x, 5.5, -57, 3.8, .8, 3.8); colliders.push({ minX: x - .7, maxX: x + .7, minZ: -58.4, maxZ: -55.6 });
    }
    for (const z of [-57.75, -56.25]) b.b(m.metal, 0, 6.93, z, 142, .18, .09);
    for (let x = -70; x < 70; x += .8) b.b(m.wood, x, 6.8, -57, .18, .15, 2.3);
    for (let x = -60; x < 70; x += 15) {
      for (const z of [-59.3, -54.7]) b.b(m.metal, x, 9.1, z, .08, 5, .08); b.b(m.metal, x, 11.5, -57, .09, .09, 4.8);
      if (x < 60) b.cable(new THREE.Vector3(x, 10.8, -57), new THREE.Vector3(x + 15, 10.8, -57), .3);
    }
    for (const x of [13.1, 24.9]) b.b(m.facades[0], x, 2.2, -51.7, .25, 4.4, 4.2);
    b.b(m.businesses.convenience.surface, 19, 2.2, -53.7, 12, 4.4, .18);
    b.b(m.pavement, 16, .025, -43, 18, .18, 12.5);
    b.b(m.yellow, 16, .126, -46.2, 17, .012, .3);
    for (const x of [14.2, 23.8]) b.b(m.facades[2], x, 2, -49, .65, 4, 1.5);
    b.b(m.metal, 19, 4.35, -49.4, 13.4, .3, 5.7); b.b(m.green, 19, 3.55, -46.48, 12.8, .95, .16); b.sign(16, 19, 3.55, -46.38, 8.2, .84); b.b(m.lamps, 19, 4.12, -47.8, 11, .04, .2);
    for (const x of [16.5, 18, 19.5, 21]) { b.b(m.metal, x, .65, -48.8, .38, 1.15, 1.5); b.b(m.windows, x + .3, .75, -48.7, .3, .45, .04); }
    for (const x of [15, 22.5]) {
      b.b(m.green, x, 1, -49.4, .9, 1.8, .16); b.b(m.windows, x, 1.35, -49.29, .65, .5, .02); b.b(m.yellow, x, .9, -49.28, .45, .15, .02);
      b.sign(16, x, 2.4, -49.28, 1.1, .55);
    }
    for (const x of [16, 18.5, 21]) b.b(m.lamps, x, 3.95, -48.4, 1.9, .025, .13);
    for (let x = 14; x < 24; x += 1.1) b.b(m.yellow, x, .13, -47, .5, .02, .55);
    for (const x of [10, 23]) { b.b(m.wood, x, .6, -42, 2, .14, .5); b.b(m.wood, x, .95, -42.2, 2, .6, .1); for (const dx of [-.7, .7]) b.b(m.metal, x + dx, .3, -42, .08, .6, .4); }
    colliders.push({ minX: 12.9, maxX: 25.1, minZ: -54, maxZ: -49.5 }); b.sign(23, 0, 6.13, -53.65, 6.2, .65);
  }
}
