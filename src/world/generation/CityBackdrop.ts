import * as THREE from 'three';
import { CityBatch } from './CityBatch';
import { random } from './Materials';

/** Distant scenery only: no parcels or navigation are added outside the district. */
export class CityBackdrop {
  readonly group = new THREE.Group();
  private readonly towerLight = new THREE.MeshStandardMaterial({ color: 0x8b4925, emissive: 0xff6b12, emissiveIntensity: 1.6, roughness: .5, metalness: .4 });
  private readonly windowLight = new THREE.MeshStandardMaterial({ color: 0x899b99, emissive: 0xc4dfd8, emissiveIntensity: .7, roughness: .4 });
  private readonly beacon = new THREE.MeshBasicMaterial({ color: 0xff4732 });
  constructor(scene: THREE.Scene) {
    const b = new CityBatch(), rng = random(72831);
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
    // Street corridors stay open; silhouettes surround rather than block the landmark.
    for (const side of [-1, 1]) for (let row = 0; row < 3; row++) for (let j = 0; j < 11; j++) {
      const x = side * (23 + j * 16 + rng() * 8), z = -91 - row * 48 - rng() * 16;
      const w = 9 + rng() * 9, d = 13 + rng() * 14, floors = 5 + Math.floor(rng() * (row === 2 ? 16 : 10)), h = floors * 3.1;
      b.b(walls[j % walls.length], x, h / 2, z, w, h, d);
      b.b(walls[(j + 1) % walls.length], x, h + .5, z, w * .9, 1, d * .9);
      b.b(dark, x + w * .16, h + 1.4, z, w * .35, 1.8, d * .4);
      const columns = Math.floor(w / 1.8);
      for (let f = 1; f < floors; f++) for (let c = 0; c < columns; c++) {
        const lit = rng() > .48;
        b.b(lit ? this.windowLight : dark, x - w / 2 + (c + .5) * w / columns, f * 3.1 + .7, z + d / 2 + .02, w / columns - .55, 1.5, .04);
      }
      for (let c = 0; c <= columns; c++) b.b(dark, x - w / 2 + c * w / columns, h / 2, z + d / 2 + .05, .1, h, .08);
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
    this.windowLight.emissiveIntensity = .03 + night * .85;
    this.beacon.color.setHex(Math.floor(hour * 3600) % 2 === 0 ? 0xff4732 : 0x8c281d);
  }
}
