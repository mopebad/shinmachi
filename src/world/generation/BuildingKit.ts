import * as THREE from 'three';
import { CityBatch } from './CityBatch';
import { Materials } from './Materials';

export type Archetype = 'izakaya' | 'retail' | 'apartment' | 'office' | 'convenience';
export interface BuildingSpec { x: number; z: number; rotation: number; width: number; depth: number; floors: number; kind: Archetype; palette: number; shop: number }

export class BuildingKit {
  constructor(private readonly b: CityBatch, private readonly m: Materials, private readonly rng: () => number) {}

  build(s: BuildingSpec): void {
    const { width: w, depth: d, floors, kind } = s, h = floors * 2.85 + .3;
    const b = this.b, m = this.m, facade = m.facades[s.palette % m.facades.length];
    b.origin(s.x, s.z, s.rotation);
    // Recessed retail level, upper masonry, projecting floor bands and a real roof silhouette.
    b.b(facade, 0, (h + 3) / 2, -d / 2, w, h - 3, d);
    b.b(m.dark, 0, 1.5, -d / 2 - .35, w - .15, 3, d - .7);
    b.b(m.pavement, 0, .14, -d / 2 + .2, w + .2, .28, d + .5);
    for (const x of [-w / 2 + .12, w / 2 - .12]) b.b(facade, x, 1.55, -.14, .25, 3.1, .65);
    for (let f = 1; f <= floors; f++) b.b(kind === 'office' ? m.metal : m.cream, 0, f * 2.85 + .15, -d / 2 + .04, w + .12, .16, d + .2);

    const columns = Math.max(2, Math.floor(w / 1.7));
    for (let floor = 1; floor < floors; floor++) {
      const fy = floor * 2.85 + 1.35;
      for (let col = 0; col < columns; col++) {
        const x = (col + .5) * (w - .7) / columns - (w - .7) / 2;
        this.window(x, fy, .04, (w - 1) / columns - .15, kind === 'office' ? 1.95 : 1.55, this.rng() < .32);
        if (kind !== 'office' && col === columns - 1) this.aircon(x + .12, fy - 1, .22);
      }
      if (kind === 'apartment') this.balcony(w, fy - .9, floor);
      if ((kind === 'retail' || kind === 'izakaya') && floor < 3) {
        b.b(m.dark, -w / 2 + .6, fy, .23, .73, 1.9, .25);
        b.sign((s.shop + floor + 1) % 16, -w / 2 + .6, fy, .37, .66, 1.7);
      }
    }
    // Side elevations are detailed too: alleys expose these, not only the street facade.
    for (const side of [-1, 1]) {
      for (let f = 1; f < floors; f++) for (let j = 0; j < Math.floor(d / 3.1); j++) {
        const z = -1.9 - j * 2.7;
        b.b(m.dark, side * (w / 2 + .01), f * 2.85 + 1.3, z, .09, 1.6, 1.1);
        b.b(this.rng() > .7 ? m.warmWindows : m.windows, side * (w / 2 + .065), f * 2.85 + 1.3, z, .04, 1.4, .95);
        b.b(m.metal, side * (w / 2 + .1), f * 2.85 + 1.3, z, .045, 1.43, .04);
      }
    }
    // Downpipes, conduit, utility cabinets and address plaque.
    b.part('cylinder', m.metal, w / 2 - .17, h / 2, .15, .045, h, .045);
    b.b(m.cream, w / 2 - .45, .78, .22, .4, .5, .18);
    for (let i = 0; i < 3; i++) b.b(m.metal, w / 2 - .45 + i * .09, 1.3, .13, .018, 1, .03);
    b.sign(31, w / 2 - .36, 2.15, .2, .45, .33);
    if (kind === 'office') {
      for (let i = 0; i <= columns; i++) b.b(m.metal, -w / 2 + i * w / columns, h / 2 + 1.5, .18, .09, h - 3, .16);
    }
    this.store(s);
    this.roof(w, d, h, kind);
    if (kind === 'apartment' || (s.palette % 3 === 0 && floors < 6)) this.stairs(w, d, floors);
    b.origin();
  }

  private window(x: number, y: number, z: number, w: number, h: number, lit: boolean): void {
    const b = this.b, m = this.m;
    b.b(m.dark, x, y, z, w + .13, h + .12, .13);
    b.b(lit ? m.warmWindows : m.windows, x, y, z + .08, w, h, .035);
    b.b(m.metal, x, y, z + .13, .035, h, .045);
    b.b(m.cream, x, y - h / 2 - .04, z + .17, w + .2, .1, .26);
    if (lit) { b.b(m.cream, x - w * .35, y, z + .105, w * .18, h, .018); b.b(m.cream, x + w * .35, y, z + .105, w * .18, h, .018); }
  }
  private aircon(x: number, y: number, z: number): void {
    const b = this.b, m = this.m;
    b.b(m.cream, x, y, z + .19, .69, .43, .38);
    b.part('cylinder', m.dark, x + .1, y, z + .395, .15, .018, .15, Math.PI / 2);
    for (let i = -2; i <= 2; i++) b.b(m.metal, x - .22, y + i * .06, z + .39, .13, .02, .01);
    b.b(m.metal, x, y - .26, z + .13, .8, .05, .48);
  }
  private balcony(w: number, y: number, floor: number): void {
    const b = this.b, m = this.m;
    b.b(m.cream, 0, y, .55, w - .2, .15, 1.3);
    b.b(m.metal, 0, y + .95, 1.13, w - .22, .06, .06);
    b.b(m.cream, 0, y + .3, 1.13, w - .22, .55, .1);
    for (let x = -w / 2 + .2; x < w / 2; x += .28) b.b(m.metal, x, y + .73, 1.13, .035, .45, .035);
    if (floor % 2) {
      b.b(m.metal, 0, y + 1.95, .7, w * .5, .035, .035);
      for (let i = 0; i < 3; i++) b.b(i % 2 ? m.white : m.windows, -.8 + i * .65, y + 1.6, .7, .4, .65, .035);
    } else { this.aircon(w / 2 - .65, y + .3, .35); }
  }
  private store(s: BuildingSpec): void {
    const b = this.b, m = this.m, w = s.width, shop = s.kind === 'convenience' ? 12 : s.shop;
    // Individual panes, door frames, handles, sill, counter, shelves and merchandise.
    b.b(m.shop, 0, 1.35, -.2, w - .6, 2.3, .08);
    b.b(m.dark, 0, .35, .06, w - .5, .5, .15);
    const panes = Math.max(3, Math.round(w / 1.15));
    for (let i = 0; i <= panes; i++) b.b(m.metal, -w / 2 + .3 + i * (w - .6) / panes, 1.4, .14, .055, 2.45, .08);
    b.b(m.metal, 0, 2.55, .1, w - .45, .08, .1);
    b.b(m.dark, w * .2, 1.23, -.04, .88, 2.25, .08);
    b.b(m.windows, w * .2, 1.3, .025, .78, 2.03, .025);
    b.b(m.cream, w * .2 - .28, 1.1, .14, .035, .4, .08);
    b.b(m.cream, -w * .18, .7, .02, w * .42, .12, .3);
    for (let shelf = 0; shelf < 3; shelf++) {
      b.b(m.wood, -w * .18, .8 + shelf * .42, -.01, w * .4, .045, .24);
      for (let j = 0; j < 9; j++) {
        const px = -w * .37 + j * w * .045, py = .94 + shelf * .42;
        if (j % 3) { b.part('cylinder', [m.red, m.green, m.white, m.yellow][(j + shelf) % 4], px, py, .06, .065, .22, .065); b.b(m.cream, px, py + .01, .13, .08, .06, .012); }
        else { b.b(m.white, px, py, .06, .15, .27, .12); b.b(m.red, px, py + .04, .13, .11, .035, .012); }
      }
    }
    b.b(m.dark, 0, 3.06, .18, w - .25, .94, .27);
    b.sign(shop, 0, 3.06, .325, w - .43, .78);
    if (s.kind === 'izakaya' || s.kind === 'retail') {
      for (let i = 0; i < 12; i++) b.part('box', i % 2 ? m.cream : (s.kind === 'izakaya' ? m.red : m.green), -w / 2 + .3 + (i + .5) * (w - .6) / 12, 2.62, .67, (w - .6) / 12, .08, 1.22, .15);
      b.b(s.kind === 'izakaya' ? m.red : m.green, 0, 2.46, 1.22, w - .6, .25, .06);
      if (s.kind === 'izakaya') {
        for (let i = 0; i < 4; i++) b.b(m.green, w * .2 - .4 + i * .23, 2.06, .24, .21, .65, .035);
        for (const x of [-w / 2 + .65, w / 2 - .65]) {
          b.part('sphere', m.red, x, 2, .9, .27, .43, .27);
          for (let j = 0; j < 5; j++) b.b(m.dark, x, 1.75 + j * .12, 1.14, .29, .018, .035);
          b.b(m.dark, x, 2.45, .9, .025, .35, .025);
        }
      }
    }
    if (s.kind === 'convenience') {
      for (let i = 0; i < 3; i++) b.b([m.green, m.white, m.windows][i], 0, 2.55 + i * .15, .32, w - .4, .15, .09);
      b.b(m.lamps, 0, 2.4, .35, w - 1, .035, .06);
    }
    if (s.kind !== 'apartment' && s.kind !== 'office') {
      const index = 24 + s.shop % 6;
      b.b(m.dark, w / 2 - .15, 5.5, .75, .77, 3.35, .28);
      b.sign(index, w / 2 - .15, 5.5, .9, .7, 3.2);
      // Projecting double-sided blade sign, seen down the street.
      b.b(m.metal, -w / 2 + .35, 4.5, .62, .07, .08, 1.5);
      b.b(m.dark, -w / 2 + .35, 4.15, 1.3, .17, 1.15, .85);
      b.sign(shop, -w / 2 + .45, 4.15, 1.3, .8, 1.05, Math.PI / 2);
      b.sign(shop, -w / 2 + .25, 4.15, 1.3, .8, 1.05, -Math.PI / 2);
    }
    // Menu easel and crates are part of the street-facing kit.
    b.part('box', m.wood, -w * .34, .55, .9, .55, 1, .09, -.12);
    b.sign(s.shop, -w * .34, .59, 1.01, .45, .7);
    if (s.kind === 'convenience' || s.shop === 3) for (let i = 0; i < 3; i++) {
      b.b(m.wood, -w / 2 + .6 + i * .5, .28, .75, .44, .4, .6);
      for (let j = 0; j < 4; j++) b.part('sphere', m.green, -w / 2 + .45 + i * .5 + j % 2 * .2, .52, .6 + Math.floor(j / 2) * .2, .12, .1, .12);
    }
  }
  private roof(w: number, d: number, h: number, kind: Archetype): void {
    const b = this.b, m = this.m;
    b.b(m.dark, 0, h + .08, -d / 2, w + .1, .16, d + .1);
    for (const z of [0, -d]) b.b(m.cream, 0, h + .3, z, w + .12, .5, .16);
    for (const x of [-w / 2, w / 2]) b.b(m.cream, x, h + .3, -d / 2, .14, .5, d);
    b.b(m.facades[1], w * .15, h + .85, -d + 2.2, w * .43, 1.7, 2.8);
    b.b(m.metal, w * .15, h + 1.75, -d + 2.2, w * .43 + .2, .15, 3);
    for (let i = 0; i < 2; i++) { b.b(m.cream, -w * .24, h + .4, -2 - i * 1.7, .9, .7, 1.15); b.part('cylinder', m.dark, -w * .24, h + .77, -2 - i * 1.7, .3, .04, .3); }
    if (kind === 'apartment' || this.rng() > .45) {
      for (const x of [-.55, .55]) for (const z of [-.55, .55]) b.b(m.metal, x, h + .55, -d / 2 + z, .07, 1.1, .07);
      b.part('cylinder', m.cream, 0, h + 1.7, -d / 2, .9, 1.3, .9);
      b.part('cylinder', m.metal, 0, h + 2.38, -d / 2, .95, .09, .95);
      for (const y of [h + 1.2, h + 2.1]) b.part('cylinder', m.metal, 0, y, -d / 2, .915, .04, .915);
    }
    b.part('cylinder', m.metal, -w * .35, h + 1.8, -d + 1, .025, 3.6, .025);
    for (let i = 0; i < 5; i++) b.b(m.metal, -w * .35, h + 2.1, -d + .3 + i * .32, 1.25 - i * .14, .026, .025);
  }
  private stairs(w: number, d: number, floors: number): void {
    const b = this.b, m = this.m, count = Math.min(3, floors - 1);
    for (let f = 0; f < count; f++) {
      for (let step = 0; step < 16; step++) b.b(m.metal, w / 2 + .48, .3 + f * 2.85 + step * .178, -1.3 - step * Math.min(d - 2, 4.5) / 16, .85, .07, .32);
      b.b(m.metal, w / 2 + .48, 3.08 + f * 2.85, -Math.min(d - 1, 5.8), .94, .1, 1.3);
      b.rod(m.metal, new THREE.Vector3(w / 2 + .9, 1.3 + f * 2.85, -1.3), new THREE.Vector3(w / 2 + .9, 4 + f * 2.85, -Math.min(d - 1, 5.8)), .025);
    }
  }
}
