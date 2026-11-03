import * as THREE from 'three';
import { CityBatch } from './CityBatch';
import { NightlifeMaterials } from './NightlifeMaterials';
import { NightlifeAssets, type AssetPlacement, type NightlifeAsset } from './NightlifeAssets';
import type { District } from '../types';
import { businessOpen, dayState } from '../simulation/WorldRules';

interface Frontage { x: number; side: number; width: number; height: number; theme: string; skin: 'brick' | 'plaster' | 'darkTile' }
const FRONTAGES: Frontage[] = [
  { x: -17.2, side: -1, width: 4.6, height: 11.2, theme: 'ramen', skin: 'brick' },
  { x: -12.3, side: -1, width: 4.6, height: 15.1, theme: 'izakaya', skin: 'plaster' },
  { x: -7.6, side: -1, width: 3.8, height: 12.8, theme: 'theatre', skin: 'darkTile' },
  { x: -17, side: 1, width: 4.7, height: 13.5, theme: 'bar', skin: 'plaster' },
  { x: -11.8, side: 1, width: 4.9, height: 10.1, theme: 'coffee', skin: 'darkTile' },
  { x: -7.4, side: 1, width: 3.5, height: 16.2, theme: 'karaoke', skin: 'brick' },
  { x: 8.3, side: -1, width: 3.5, height: 12.2, theme: 'bar', skin: 'brick' },
  { x: 12.9, side: -1, width: 5.1, height: 16.1, theme: 'ramen', skin: 'plaster' },
  { x: 18.5, side: -1, width: 5.4, height: 11.5, theme: 'izakaya', skin: 'darkTile' },
  { x: 8.3, side: 1, width: 3.5, height: 15.2, theme: 'coffee', skin: 'plaster' },
  { x: 13.1, side: 1, width: 5.4, height: 10.8, theme: 'izakaya', skin: 'brick' },
  { x: 19, side: 1, width: 5.7, height: 14.3, theme: 'karaoke', skin: 'darkTile' },
];

/** Authored street layer fitted to the existing alley, with a clear pedestrian corridor. */
export class NightlifeStreet {
  readonly group = new THREE.Group();
  readonly materials = new NightlifeMaterials();
  readonly assets: NightlifeAssets;
  readonly exhausts: THREE.Vector3[] = [];
  readonly ready: Promise<void>;
  private readonly lights: { light: THREE.PointLight; power: number }[] = [];
  constructor(scene: THREE.Scene, district: District) {
    const b = new CityBatch(), m = this.materials, placements: AssetPlacement[] = [];
    this.group.name = 'Yoto nightlife street / authored facades and services';
    const putAsset = (asset: NightlifeAsset, x: number, y: number, z: number, yaw: number, scale: number) => placements.push({ asset, position: new THREE.Vector3(x, y, z), yaw, scale });
    for (const [index, s] of FRONTAGES.entries()) {
      const z = -25 + s.side * 2.55, yaw = s.side > 0 ? Math.PI : 0, w = s.width, h = s.height, facade = m[s.skin];
      const world = (x: number, y: number, zz: number) => new THREE.Vector3(x, y, zz).applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw).add(new THREE.Vector3(s.x, 0, z));
      b.origin(s.x, z, yaw);
      // A building skin with different floor spacing, setbacks and upper-floor construction.
      b.b(facade, 0, (h + 3.3) / 2, -.75, w, h - 3.3, 1.5);
      b.b(m.wood, 0, 1.5, -2.8, w, 3, .18); b.b(m.wood, 0, .17, -1.1, w, .2, 3.7);
      b.b(m.wood, 0, 2.8, -1.3, w, .18, 3);
      for (const x of [-w / 2 + .08, w / 2 - .08]) b.b(facade, x, 1.6, -1.35, .16, 3.2, 3);
      for (let floor = 0; floor < Math.floor((h - 3.8) / 2.8); floor++) {
        const y = 4.8 + floor * (index % 3 === 0 ? 2.65 : 2.9), columns = index % 3 === 1 ? 3 : 2;
        for (let col = 0; col < columns; col++) {
          const x = (col + .5) * (w - .6) / columns - (w - .6) / 2, ww = (w - .7) / columns - .14;
          b.b(m.metal, x, y, .04, ww + .12, 1.58, .2); b.b(index % 3 === 1 && floor === 1 ? m.warmInterior : m.grille, x, y, .15, ww, 1.4, .025);
          b.b(m.metal, x, y, .18, .035, 1.45, .045);
          if (index % 2) for (let blind = 0; blind < 5; blind++) b.b(m.wood, x, y - .5 + blind * .22, .21, ww, .025, .035);
        }
        b.b(m.metal, 0, y - 1.15, .16, w + .12, .09, .38);
        if (floor === 0 && index % 3 === 0) { b.b(m.metal, 0, y - .85, .65, w, .14, 1.2); b.b(m.metal, 0, y + .05, 1.13, w, .045, .045); for (let x = -w / 2; x < w / 2; x += .3) b.b(m.metal, x, y - .3, 1.13, .025, .7, .025); }
      }
      b.b(m.metal, 0, h + .12, -.65, w + .3, .16, 1.9);
      b.b(m.grille, w * .2, h + .55, -.8, 1.2, .9, .7);
      // Exposed conduit, rust-prone joints, junction boxes and drain elbow.
      b.part('cylinder', m.metal, w / 2 - .22, h / 2, .25, .04, h, .04);
      for (const y of [1.4, 2.3, 5.3, 8.2]) b.b(m.redPaint, w / 2 - .22, y, .25, .11, .055, .11);
      b.b(m.grille, w / 2 - .6, 1.08, .23, .45, .6, .19);
      b.rod(m.metal, new THREE.Vector3(w / 2 - .3, 2.4, .25), new THREE.Vector3(w / 2 - .9, 2.8, .25), .018);
      // Glass and timber divide a genuinely furnished shallow restaurant room.
      b.b(m.glass, -.4, 1.35, .075, w - 1.1, 2.15, .025);
      for (let j = 0; j < 7; j++) b.b(m.wood, -w / 2 + .25 + j * (w - .5) / 6, 1.35, .15, .055, 2.45, .09);
      b.b(m.wood, 0, .42, .15, w - .15, .62, .1);
      b.b(m.wood, .85, 1.35, .16, .045, 2.4, .12); b.b(m.metal, .95, 1.16, .24, .025, .33, .065);
      for (let j = 0; j < 4; j++) b.part('box', m.cloth, .35 + j * .28, 2.1, .22, .255, .55 + j % 2 * .04, .025, .035 * (j - 1));
      // Each business has its own furniture plan rather than a recoloured counter.
      if (['ramen', 'izakaya', 'bar'].includes(s.theme)) {
        b.b(m.wood, -.35, .91, -1.65, w * .73, 1.13, .6); b.b(m.warmInterior, -.35, 1.51, -1.65, w * .76, .09, .76);
        for (let j = 0; j < 3; j++) {
          const x = -w * .29 + j * w * .21;
          b.part('cylinder', s.theme === 'ramen' ? m.redPaint : m.wood, x, .81, -.75, .22, .09, .22); b.part('cylinder', m.metal, x, .5, -.75, .035, .59, .035);
          b.part('sphere', m.warmInterior, x, 1.62, -1.55, .115, .048, .115); b.part('cylinder', m.metal, x + .13, 1.64, -1.65, .038, .13, .038);
          b.b(m.wood, x, 2.44, -1.7, .025, .32, .025); b.part('cylinder', m.metal, x, 2.27, -1.7, .19, .13, .19); b.part('cylinder', m.light, x, 2.19, -1.7, .13, .025, .13);
        }
        for (const y of [1.35, 1.86, 2.34]) { b.b(m.wood, -.25, y, -2.6, w * .73, .05, .25); for (let j = 0; j < 10; j++) { b.part('cylinder', j % 3 === 0 ? m.redPaint : m.glass, -w * .31 + j * w * .065, y + .17, -2.56, .048, .27, .048); b.part('cylinder', m.wood, -w * .31 + j * w * .065, y + .34, -2.56, .023, .07, .023); } }
        if (s.theme === 'ramen') { b.b(m.metal, -.6, 2.35, -2.25, 1.8, .25, .55); for (const x of [-1, -.6, -.2]) b.part('cylinder', m.metal, x, 1.42, -2.35, .19, .3, .19); }
        if (s.theme === 'izakaya') for (let j = 0; j < 13; j++) b.b(m.wood, -w * .4 + j * w * .06, 1.5, .2, .035, 2.1, .055);
      } else if (s.theme === 'coffee') {
        for (const x of [-w * .25, w * .23]) {
          b.part('cylinder', m.wood, x, .94, -1.15, .45, .09, .45); b.part('cylinder', m.metal, x, .6, -1.15, .04, .6, .04);
          for (const zz of [-.55, -1.8]) { b.b(m.wood, x, .61, zz, .42, .07, .42); b.b(m.wood, x, .95, zz + (zz < -1 ? -.17 : .17), .42, .65, .045); for (const dx of [-.16, .16]) b.b(m.metal, x + dx, .42, zz, .025, .4, .35); }
          b.part('cylinder', m.warmInterior, x, 1.06, -1.15, .065, .12, .065);
        }
        b.b(m.wood, 0, 1.05, -2.45, w * .8, 1.2, .48); b.b(m.metal, -.5, 1.76, -2.4, .65, .35, .34);
        for (let j = 0; j < 6; j++) b.part('cylinder', m.warmInterior, -.75 + j * .24, 1.72, -2.32, .055, .11, .055);
        this.sign(b, 'posters', w * .25, 2.05, -2.69, .9, .65);
      } else if (s.theme === 'theatre') {
        b.b(m.darkTile, 0, .3, -1.3, w - .3, .12, 2.8);
        for (const x of [-w * .32, w * .32]) { b.b(m.redPaint, x, 1.5, -2.42, .85, 2.55, .13); this.sign(b, 'posters', x, 1.55, -2.33, .66, 1.9); }
        b.b(m.wood, .35, 1.1, -1.15, 1.3, 1.4, .48); b.b(m.metal, .35, 1.84, -1.15, 1.4, .07, .55); b.b(m.glass, .35, 2.1, -1.15, 1.3, .47, .025);
        for (const x of [-.8, -.35, .1]) { b.part('cylinder', m.metal, x, .6, -.5, .025, .6, .025); b.part('sphere', m.redPaint, x, .9, -.5, .055, .055, .055); }
        b.b(m.light, 0, 2.58, -1.4, 1.6, .025, .12);
      } else {
        for (let step = 0; step < 13; step++) b.b(m.darkTile, -w * .25, .3 + step * .17, -.35 - step * .17, .8, .15, .18);
        b.rod(m.metal, new THREE.Vector3(-w * .25 + .44, 1.2, -.35), new THREE.Vector3(-w * .25 + .44, 3.25, -2.4), .025);
        b.b(m.redPaint, w * .2, 1.35, -2.5, w * .4, 2.2, .08); this.sign(b, 'karaoke', w * .2, 1.55, -2.43, .8, 1.6);
        b.b(m.wood, w * .24, .8, -.95, .85, 1, .4); b.b(m.neonCyan, w * .24, 1.36, -.95, .65, .025, .2);
      }
      this.sign(b, s.theme, 0, 3.04, .16, w - .25, .7);
      this.sign(b, 'menu', -w * .24, 1.93, -2.65, 1.2, .72);
      // Rain hood and individually aged shop signs; no identical striped awning row.
      b.part('box', index % 3 === 1 ? m.redPaint : m.metal, 0, 2.7, .45, w + .18, .075, 1.15, .11);
      if (index % 2 === 0) { b.b(m.wood, -w * .3, .62, .55, .52, 1.05, .08); this.sign(b, 'menu', -w * .3, .64, .605, .44, .87); }
      if (index < 6 || index % 2) {
        const p = world(-w * .32, 2.07, .55); putAsset('paper-lantern', p.x, p.y, p.z, yaw, .66);
        b.b(m.metal, -w * .32, 2.85, .27, .04, .06, .68);
      }
      if (index % 2 === 0) { const mountY = index % 3 === 0 ? 4.04 : 3.8, p = world(w * .29, mountY, .2); putAsset('ac-condenser', p.x, p.y, p.z, yaw, 1); b.b(m.metal, w * .29, mountY - .04, .3, .9, .06, .6); }
      if (index < 6 && index % 2 === 0) { const p = world(-w * .28, 4.05, .15); putAsset('twin-street-lamp', p.x, p.y, p.z, yaw, 1); }
      // Posters and decals occupy walls, not pedestrian circulation space.
      this.sign(b, 'posters', w * .34, 1.4, .22, .52, 1.5);
      if (index % 3 !== 0) this.sign(b, 'stickers', w * .34, .42, .23, .36, .45);
      if (s.theme !== 'theatre') this.blade(b, s.theme, w * .34, 5.8 + index % 3 * .38, .72, .9, 3.2, index % 2 ? m.neonCyan : m.neonAmber, false);
      else this.blade(b, 'theatre', -.15, 5.9, 1.12, 1.5, 6, m.neonAmber, true);
      if (index === 2 || index === 8) {
        b.part('cylinder', m.metal, -w * .38, 2.7, .27, .13, 1.6, .13); b.b(m.metal, -w * .38, 3.5, .27, .45, .1, .43);
        this.exhausts.push(world(-w * .38, 3.55, .27));
      }
      b.origin();
      // Collision and staff presentation share these exact facade positions.
      district.colliders.push({ minX: s.x - w / 2, maxX: s.x + w / 2, minZ: s.side < 0 ? z - 2.8 : z + .05, maxZ: s.side < 0 ? z - .05 : z + 2.8 });
      district.shopfronts.push({ x: s.x, z, rotation: yaw, width: w, business: 'restaurant' });
      const threshold = world(w * .23, 0, .87), approach = world(w * .23, 0, 2.55);
      district.doors.push({ x: threshold.x, z: threshold.z, sidewalkX: Math.sign(s.x) * 4.55, business: 'restaurant', area: 'alley', approachX: approach.x, approachZ: -25 });
    }
    // Coherent cable bundles connect wall risers and brackets at safe clearance heights.
    b.origin();
    for (const side of [-1, 1]) {
      for (let wire = 0; wire < 8; wire++) b.cable(new THREE.Vector3(-21, 6.7 + wire * .08, -25 + side * 2.25), new THREE.Vector3(24, 7.5 + wire * .09, -25 + side * 2.2), .7 + wire * .06);
      for (const x of [-18, -11, 11, 20]) { b.b(m.metal, x, 6.1, -25 + side * 2.45, .06, 1.1, .06); b.cable(new THREE.Vector3(x, 6.3, -25 + side * 2.45), new THREE.Vector3(x + 1.3, 4.5, -25 + side * 2.5), .18); }
    }
    for (let wire = 0; wire < 5; wire++) b.cable(new THREE.Vector3(-17.5 + wire * .18, 5.5 + wire * .08, -27.6), new THREE.Vector3(-10 + wire * .2, 5.2 + wire * .08, -22.4), .35);
    for (const x of [-21, -15, -9, 9, 15, 21]) for (const side of [-1, 1]) b.b(m.grille, x, .025, -25 + side * 1.98, .58, .028, .27);
    this.group.add(b.finish(m.signMaterial('bar', 1)));
    this.assets = new NightlifeAssets(placements); this.group.add(this.assets.group); this.ready = this.assets.ready;
    const practical = (x: number, y: number, z: number, color: number, power: number, radius: number) => { const light = new THREE.PointLight(color, 0, radius, 2); light.position.set(x, y, z); this.group.add(light); this.lights.push({ light, power }); };
    practical(-7.9, 4.4, -26.25, 0xff6630, 16, 7); practical(-16, 3.4, -23.3, 0xffbc74, 14, 7); practical(-12.2, 3.5, -26.7, 0xffcb91, 12, 6); practical(13.2, 3.4, -23.2, 0x9bcaca, 13, 8);
    scene.add(this.group);
  }
  private sign(b: CityBatch, theme: string, x: number, y: number, z: number, w: number, h: number, yaw = 0): void { b.b(this.materials.signMaterial(theme, w / h), x, y, z, w, h, .025, yaw); }
  private blade(b: CityBatch, theme: string, x: number, y: number, z: number, w: number, h: number, edge: THREE.Material, bulbs: boolean): void {
    const m = this.materials, yaw = -Math.PI / 2;
    b.b(m.metal, x, y, z, .25, h + .19, w + .18); this.sign(b, theme, x - .14, y, z, w, h, yaw); this.sign(b, theme, x + .14, y, z, w, h, -yaw);
    for (const dy of [-h * .38, h * .38]) b.b(m.metal, x, y + dy, z - .35, .13, .1, 1.25);
    const point = (u: number, v: number) => new THREE.Vector3(u, v, .16).applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw).add(new THREE.Vector3(x, y, z));
    if (bulbs) { for (const u of [-w / 2 - .05, w / 2 + .05]) for (let v = -h / 2; v <= h / 2; v += .17) { const p = point(u, v); b.part('sphere', edge, p.x, p.y, p.z, .035, .035, .035); } for (const v of [-h / 2 - .05, h / 2 + .05]) for (let u = -w / 2; u <= w / 2; u += .17) { const p = point(u, v); b.part('sphere', edge, p.x, p.y, p.z, .035, .035, .035); } }
    else { for (const u of [-w / 2 - .03, w / 2 + .03]) { const a = point(u, -h / 2), c = point(u, h / 2); b.rod(edge, a, c, .018); } }
  }
  update(hour: number): void { const night = dayState(hour).night, open = businessOpen('restaurant', hour); this.materials.setNight(night, open); this.assets.setLighting(night, open); this.lights.forEach(({ light, power }) => { light.intensity = power * night * (open ? 1 : .04); }); }
}
