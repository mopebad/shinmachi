import * as THREE from 'three';
import { Bounds, District, Doorway, Shopfront } from '../types';
import { BuildingKit, BuildingSpec, Archetype } from './BuildingKit';
import { CityBatch } from './CityBatch';
import { Materials, random } from './Materials';
import { stationDetails } from './StationDetails';
import { addRailwayDetails } from './RailwayDetails';
import { signBusiness } from '../simulation/WorldRules';
import { STATION } from './StationLayout';
import { onHeroStreet, heroStreetFamily, heroRoadDetails } from './HeroStreet';
import { buildRailDistrict } from './RailDistrict';
import { railPierObstacles } from './RailDistrictLayout';
import {neighborhoodBuilding,neighborhoodParcel,neighborhoodFootprint,fitNeighborhoodParcel,NEIGHBORHOODS} from '../Neighborhoods';
import {YOTO_VENUE,yotoParcelDepth} from './YotoVenueLayout';

/** Metre-scale compact district. Each frontage uses the same local +Z kit convention. */
export class NeighborhoodGenerator {
  constructor(private readonly seed = 8412) {}
  generate(): District {
    const b = new CityBatch(), m = new Materials(), rng = random(this.seed);
    const kit = new BuildingKit(b, m, rng,this.seed), colliders: Bounds[] = [], doors: Doorway[] = [], lamps: THREE.Vector3[] = [], shopfronts: Shopfront[] = [],parcels:object[]=[];
    let buildings = 0, heroStoreBuilt = false, heroIndex = 0;
    const heroFrontages: object[] = [],occupied:Bounds[]=[];
    const add = (s: BuildingSpec, main = false) => {
      // Select one existing main-street convenience branch without drawing RNG or moving any parcel/threshold.
      if (!heroStoreBuilt && main && s.kind === 'convenience' && s.x > 0 && s.z > 20.5) { s.heroStore = true; heroStoreBuilt = true; }
      if (main && onHeroStreet(s)) { s.heroStreet = heroIndex++; heroFrontages.push({ ...s, family: heroStreetFamily(s) }); }
      const rendered=fitNeighborhoodParcel(neighborhoodParcel(s),occupied);kit.build(s,rendered);if(rendered.renderable)buildings++;
      const corners = [[-s.width / 2 - .15, .1], [s.width / 2 + .95, -s.depth]].map(([x, z]) => new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), s.rotation).add(new THREE.Vector3(s.x, 0, s.z)));
      const originalFootprint={ minX: Math.min(corners[0].x, corners[1].x), maxX: Math.max(corners[0].x, corners[1].x), minZ: Math.min(corners[0].z, corners[1].z), maxZ: Math.max(corners[0].z, corners[1].z) };
      let footprint=originalFootprint;
      if(rendered.railAdjusted||rendered.cornerAdjusted||rendered.parcelAdjusted)footprint=neighborhoodFootprint(rendered);
      if(rendered.renderable)colliders.push(footprint);
      if(rendered.renderable)occupied.push(neighborhoodBuilding(s,this.seed).replace?neighborhoodFootprint(rendered):originalFootprint);
      parcels.push({...s,rendered,identity:neighborhoodBuilding(rendered,this.seed),originalFootprint,footprint});
      const business = s.kind === 'apartment' ? 'residential' : s.kind === 'office' ? 'office' : s.kind === 'convenience' ? 'convenience' : signBusiness(s.shop);
      if(rendered.renderable)shopfronts.push({ x: rendered.x, z: rendered.z, rotation: rendered.rotation, width: rendered.width, business });
      if (main) {
        const point = new THREE.Vector3(s.width * .2, 0, .48).applyAxisAngle(THREE.Object3D.DEFAULT_UP, s.rotation);
        doors.push({ x: s.x + point.x, z: s.z + point.z, sidewalkX: s.x < 0 ? -4.55 : 4.55, business });
      }
    };
    this.roads(b, m); heroRoadDetails(b, m);
    for (const side of [-1, 1]) for (const [start, end] of [[-51, -28.5], [-21.5, 4], [20.5, 61]]) {
      // Reserve a genuine forecourt for the station instead of overlapping the shop row.
      let cursor = side > 0 && start === -51 ? -35 : start;
      while (cursor < end - 3.8) {
        const width = Math.min(4.6 + rng() * 3.1, end - cursor - .35);let depth = 9 + rng() * 4;
        const choice = Math.floor(rng() * 9);
        const kind: Archetype = choice < 3 ? 'izakaya' : choice < 5 ? 'retail' : choice < 7 ? 'apartment' : choice === 7 ? 'office' : 'convenience';
        const floors = kind === 'izakaya' ? 3 + Math.floor(rng() * 2) : kind === 'office' ? 6 + Math.floor(rng() * 3) : 3 + Math.floor(rng() * 4);
        const x = side * (6.25 + (kind === 'apartment' ? .7 : rng() * .3)), palette = Math.floor(rng() * 8), value = Math.floor(rng() * 16);
        const choices = kind === 'izakaya' ? [0, 1, 5, 9, 14] : [2, 6, 7, 8, 10, 11, 13, 20, 22];
        // Keep the authored basement shaft clear on alternate seeds without shuffling later RNG draws.
        const sourceDepth=depth;if(side>0)depth=yotoParcelDepth(x,cursor+width/2,width,depth);
        add({ x, z: cursor + width / 2, rotation: -side * Math.PI / 2, width, depth, floors, kind, palette, shop: choices[value % choices.length],...(depth<sourceDepth?{rngDepth:sourceDepth}:{}) }, true);
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
    b.origin(); this.streetProps(b, m, lamps, rng, colliders); this.railway(b, m, colliders); addRailwayDetails(b, m);
    const railDistrict = buildRailDistrict(m, this.seed, colliders);
    colliders.push(...railDistrict.colliders);
    const station = stationDetails(b, m), playerColliders = [...colliders];
    colliders.push(...station.spatial.npcReservation);
    // Only actual ground structure augments the existing flat navigation obstacles. Upper guards are height-aware.
    colliders.push(...station.spatial.boxes.filter(box=>box.collision&&box.minY<.3).map(({minX,maxX,minZ,maxZ})=>({minX,maxX,minZ,maxZ})));
    const group = b.finish(m.signs); group.add(station.group, railDistrict.group); group.name = `Shinmachi · seed ${this.seed}`;
    group.userData.heroFrontages = heroFrontages;
    group.userData.railDistrict = railDistrict.group.userData.railDistrict;
    group.userData.neighborhoods={definitions:NEIGHBORHOODS,parcels,seed:this.seed};
    return { group, colliders, playerColliders, station: station.spatial, doors, shopfronts, lamps, materials: { signs: m.signs, windows: m.windows, warmWindows: m.warmWindows, lamps: m.lamps, shop: m.shop, lantern: m.lantern, businesses: m.businesses }, stats: { buildings:buildings+railDistrict.buildings, instances: b.instances+railDistrict.instances } };
  }
  private roads(b: CityBatch, m: Materials): void {
    // Actual opening through the ground slab for the authored basement stair, not stairs inside asphalt.
    const cut=YOTO_VENUE.slabOpening;
    for(const [x0,x1,z0,z1]of [[-75,cut.minX,-75,75],[cut.maxX,75,-75,75],[cut.minX,cut.maxX,-75,cut.minZ],[cut.minX,cut.maxX,cut.maxZ,75]])
      b.b(m.asphalt,(x0+x1)/2,-.12,(z0+z1)/2,x1-x0,.2,z1-z0);
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
    for (const [x, z] of [[24, -40.4], [28, 58], [-26, 34]]) this.tree(b, m, x, z, rng);
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
  private railway(b: CityBatch, m: Materials, colliders: Bounds[]): void {
    b.b(m.facades[1], 0, 6.2, -57, 142, .9, 6.5);
    b.b(m.cream, 0, 7, -60.15, 142, 1.2, .24);
    // The south parapet stops at the platform; it no longer cuts across the stair access.
    for(const [a,c] of [[-71,STATION.platformMinX],[STATION.platformMaxX,71]]) b.b(m.cream,(a+c)/2,7,-53.85,c-a,1.2,.24);
    for (const pier of railPierObstacles()) {
      const x=(pier.minX+pier.maxX)/2;b.section(pier.id);
      b.b(m.facades[1], x, 3, -57, 1.2, 6, 2.6);
      // Caps carry both edge girders and the road portal beams, rather than ending inside them.
      b.b(m.facades[1], x, 5.5, -57, 3.8, .8, 5.3);
      b.b(m.cream,x,.12,-57,pier.maxX-pier.minX,.24,pier.maxZ-pier.minZ);
      colliders.push({minX:pier.minX,maxX:pier.maxX,minZ:pier.minZ,maxZ:pier.maxZ});
    }
    b.section();
    for (const z of [-57.75, -56.25]) b.b(m.metal, 0, 6.93, z, 142, .18, .09);
    for (let x = -70; x < 70; x += .8) b.b(m.wood, x, 6.8, -57, .18, .15, 2.3);
    for (let x = -60; x < 70; x += 15) {
      for (const z of [-59.3, -54.7]) b.b(m.metal, x, 9.1, z, .08, 5, .08); b.b(m.metal, x, 11.5, -57, .09, .09, 4.8);
      if (x < 60) b.cable(new THREE.Vector3(x, 10.8, -57), new THREE.Vector3(x + 15, 10.8, -57), .3);
    }
    b.sign(23, 0, 6.13, -53.65, 6.2, .65);
  }
}
