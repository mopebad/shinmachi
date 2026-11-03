import * as THREE from 'three';
import { CityBatch } from './CityBatch';
import { random } from './Materials';
import { skylineLayout } from './SkylineLayout';

/** Distant scenery only: no parcels or navigation are added outside the district. */
export class CityBackdrop {
  readonly group = new THREE.Group();
  private readonly towerLight = new THREE.MeshStandardMaterial({ color: 0x8b4925, emissive: 0xff6b12, emissiveIntensity: 1.6, roughness: .5, metalness: .4 });
  private readonly windowLight = new THREE.MeshStandardMaterial({ color: 0x536865, emissive: 0x92b4ac, emissiveIntensity: .35, roughness: .35, metalness: .15 });
  private readonly warmLight = new THREE.MeshStandardMaterial({ color: 0x8b8067, emissive: 0xd9bc81, emissiveIntensity: .32, roughness: .45 });
  private readonly neutralLight = new THREE.MeshStandardMaterial({ color: 0x8a9590, emissive: 0xb7c9bc, emissiveIntensity: .3, roughness: .4 });
  private readonly beacon = new THREE.MeshBasicMaterial({ color: 0xff4732 });
  constructor(scene: THREE.Scene) {
    const b = new CityBatch();
    const walls = [0x333d46, 0x485156, 0x5f6260, 0x42474c].map(color => new THREE.MeshStandardMaterial({ color, roughness: .88 }));
    const dark = new THREE.MeshStandardMaterial({ color: 0x16232a, roughness: .48, metalness: .3 });
    const ground = new THREE.MeshStandardMaterial({ color: 0x363c40, roughness: .96 });
    const paving = new THREE.MeshStandardMaterial({ color: 0x777b76, roughness: .96 });
    const paint = new THREE.MeshStandardMaterial({ color: 0xacae9f, roughness: .95 });
    b.b(ground, 0, -.26, -100, 620, .1, 620);
    b.b(ground, 0, -.065, -160, 7.4, .12, 174);
    for (const side of [-1, 1]) {
      b.b(paving, side * 5.5, -.02, -160, 3.5, .2, 174);
      for (let z = -82; z > -240; z -= 26) { b.b(dark, side * 7, 3.5, z, .12, 7, .12); b.b(dark, side * 6.2, 6.9, z, 1.6, .08, .08); b.b(this.windowLight, side * 5.5, 6.83, z, .58, .06, .23); }
    }
    for (let z = -80; z > -242; z -= 6) b.b(paint, 0, .005, z, .1, .015, 2.8);
    for (const spec of skylineLayout()) {
      const { x, z, width: w, depth: d, floors, family, layer, yaw } = spec, rng = random(spec.seed), height = floors * 3.15;
      const wall = walls[(family + layer) % walls.length], columns = Math.max(3, Math.floor(w / 1.7));
      b.origin(x, z, yaw);
      // Five massing families replace the identical slab/crown silhouette.
      if (family === 0) {
        b.b(wall, 0, height * .33, -d / 2, w, height * .66, d);
        b.b(walls[(family + 1) % 4], -w * .06, height * .76, -d / 2 - .6, w * .82, height * .20, d * .83);
        b.b(dark, -w * .1, height * .93, -d / 2 - 1, w * .59, height * .14, d * .64);
      } else if (family === 1) {
        b.b(wall, 0, height * .5, -d / 2, w * .78, height, d * .78);
        b.b(walls[2], -w * .41, height * .33, -d / 2, w * .18, height * .66, d);
        b.b(walls[2], w * .41, height * .4, -d / 2, w * .18, height * .8, d);
      } else if (family === 2) {
        b.b(wall, -w * .16, height * .5, -d * .57, w * .68, height, d * .85);
        b.b(walls[1], w * .3, height * .36, -d / 2, w * .39, height * .72, d);
        b.b(dark, -w * .17, height + .6, -d * .57, w * .69, 1.2, d * .86);
      } else {
        b.b(wall, 0, height / 2, -d / 2, w, height, d);
        if (family === 4) { b.b(walls[2], 0, height + 1.3, -d / 2, w * .75, 2.6, d * .75); b.b(dark, 0, height + 3.2, -d / 2, w * .42, 1.2, d * .5); }
      }
      b.b(walls[2], 0, 2.1, -d / 2, w + .3, 4.2, d + .3);
      const floorOccupancy = Array.from({ length: floors }, () => rng() > .30 ? .25 + rng() * .5 : .03);
      const suiteOccupancy = Array.from({ length: Math.ceil(columns / 3) }, () => rng() * .5);
      for (let f = 1; f < floors; f++) {
        const y = f * 3.15 + .6;
        const step = family === 0 && y > height * .66 ? (y > height * .86 ? .59 : .82) : family === 1 ? .78 : family === 2 ? .68 : 1;
        const fw = w * step, front = family === 0 && y > height * .66 ? -d / 2 - (y > height * .86 ? 1 : .6) + d * (y > height * .86 ? .64 : .83) / 2 : family === 1 ? -d * .11 : family === 2 ? -d * .145 : 0;
        const ox = family === 0 && y > height * .66 ? -w * (y > height * .86 ? .1 : .06) : family === 2 ? -w * .16 : 0;
        for (let c = 0; c < columns; c++) {
          const occupied = rng() < floorOccupancy[f] + suiteOccupancy[Math.floor(c / 3)] * .35;
          const material = occupied ? (f + Math.floor(c / 3) + family) % 5 === 0 ? this.warmLight : family === 1 ? this.windowLight : this.neutralLight : dark;
          const xx = ox - fw / 2 + (c + .5) * fw / columns, ww = fw / columns - (family === 1 ? .13 : .38);
          b.part('box', material, xx, y, front + .035, ww, family === 1 ? 1.95 : 1.65, .035, 0, 0, 0, occupied && c % 3 === 0 ? 0x9baaa1 : 0xffffff);
          if (occupied && layer < 2 && c % 3 === 1) for (const dy of [-.35, .12, .55]) b.b(dark, xx, y + dy, front + .065, ww, .022, .025);
        }
        if (family === 1 || (family === 3 && f % 3 === 0)) b.b(walls[3], ox, y - 1.15, front + .02, fw + .12, .14, .16);
      }
      // Side elevations face approach views rather than remaining blank dark slabs.
      for (const side of [-1, 1]) for (let f = 1; f < Math.floor(floors * (family === 0 ? .65 : family === 1 ? .65 : .7)); f++) for (let c = 0; c < Math.floor(d / 2.4); c++) {
        b.b(rng() > .62 ? this.warmLight : dark, side * (w / 2 + .015), f * 3.15 + .65, -1.4 - c * 2.35, .035, 1.5, 1.65);
      }
      for (let plant = 0; plant < 3; plant++) { b.b(dark, -w * .25 + plant * w * .22, height + .65, -d * .55, 1.1, 1.3, 1.6); b.b(wall, -w * .25 + plant * w * .22, height + 1.34, -d * .55, 1.3, .12, 1.8); }
      if (layer < 2) { b.b(dark, w * .32, height + 2, -d * .7, .09, 4, .09); b.part('sphere', this.beacon, w * .32, height + 4.1, -d * .7, .09, .09, .09); }
      b.origin();
    }
    this.group.add(b.finish(dark));
    this.tower(); this.group.name = 'Distant skyline and Akane broadcast tower'; scene.add(this.group);
  }
  private tower(): void {
    const b = new CityBatch(), v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    // Fictional broadcast tower: tapered four-leg steel structure with open lattice.
    b.origin(-7, -214);
    const levels = [[0, 12], [15, 9.1], [29, 6.8], [42, 4.6], [55, 2.5], [66, 1.55], [78, .7]];
    for (let l = 1; l < levels.length; l++) {
      const [y0, r0] = levels[l - 1], [y1, r1] = levels[l];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.rod(this.towerLight, v(sx * r0, y0, sz * r0), v(sx * r1, y1, sz * r1), l < 3 ? .26 : .16);
      for (const side of [-1, 1]) {
        b.rod(this.towerLight, v(-r0, y0, side * r0), v(r1, y1, side * r1), .095);
        b.rod(this.towerLight, v(r0, y0, side * r0), v(-r1, y1, side * r1), .095);
        b.rod(this.towerLight, v(side * r0, y0, -r0), v(side * r1, y1, r1), .095);
        b.rod(this.towerLight, v(side * r0, y0, r0), v(side * r1, y1, -r1), .095);
        b.b(this.towerLight, 0, y1, side * r1, r1 * 2, .2, .2);
        b.b(this.towerLight, side * r1, y1, 0, .2, .2, r1 * 2);
      }
    }
    for (let l = 1; l < levels.length; l++) {
      const [ya, ra] = levels[l - 1], [yb, rb] = levels[l];
      for (let part = 1; part <= 4; part++) {
        const a = (part - 1) / 4, c = part / 4, y0 = ya + (yb - ya) * a, y1 = ya + (yb - ya) * c, r0 = ra + (rb - ra) * a, r1 = ra + (rb - ra) * c;
        for (const side of [-1, 1]) {
          b.b(this.towerLight, 0, y1, side * r1, r1 * 2, .09, .09); b.b(this.towerLight, side * r1, y1, 0, .09, .09, r1 * 2);
          b.rod(this.towerLight, v(-r0, y0, side * r0), v(r1, y1, side * r1), .035); b.rod(this.towerLight, v(r0, y0, side * r0), v(-r1, y1, side * r1), .035);
          b.rod(this.towerLight, v(side * r0, y0, -r0), v(side * r1, y1, r1), .035); b.rod(this.towerLight, v(side * r0, y0, r0), v(side * r1, y1, -r1), .035);
        }
      }
    }
    const glass = new THREE.MeshStandardMaterial({ color: 0x423d35, emissive: 0xffbb61, emissiveIntensity: .5, roughness: .2 });
    for (const [y, width] of [[42, 11.5], [66, 5.5]]) {
      b.b(this.towerLight, 0, y, 0, width, 1.7, width);
      b.b(glass, 0, y + .95, 0, width * .93, .6, width * .93);
      b.b(this.towerLight, 0, y + 1.5, 0, width + .5, .35, width + .5);
    }
    b.part('cylinder', this.towerLight, 0, 84, 0, .28, 12, .28);
    for (let y = 80; y < 89; y += 2.4) b.part('cylinder', new THREE.MeshStandardMaterial({ color: 0xc9b9a5, emissive: 0xe6ac62, emissiveIntensity: .45 }), 0, y, 0, .3, .75, .3);
    for (const y of [43.8, 68, 90]) b.part('sphere', this.beacon, 0, y, 0, .28, .28, .28);
    b.origin(); this.group.add(b.finish(glass));
  }
  update(hour: number, night: number): void {
    this.towerLight.emissiveIntensity = .06 + night * 2.7;
    this.windowLight.emissiveIntensity = .02 + night * .34;
    this.warmLight.emissiveIntensity = .015 + night * .31; this.neutralLight.emissiveIntensity = .02 + night * .30;
    this.beacon.color.setHex(Math.floor(hour * 3600) % 2 === 0 ? 0xff4732 : 0x8c281d);
  }
}
