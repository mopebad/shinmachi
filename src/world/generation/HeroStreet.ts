import * as THREE from 'three';
import type { BuildingSpec } from './BuildingKit';
import type { CityBatch } from './CityBatch';
import { Materials, worldTexture } from './Materials';
import { surfaceTextures } from './SurfaceTextures';
import { storefrontSign } from './SignCatalog';

/** Authored frontage families for the existing Shinmachi-dori parcels. No layout RNG. */
export const HERO_STREET_VIEW = {
  name: 'Shinmachi Hero Street', eye: [4.7, 1.82, 43], target: [-1, 5, -25], fov: 60,
  seed: 8412, hour: 20.5, surface: 'damp', wetness: .64, reflections: true,
} as const;

export const HERO_FACADE_FAMILIES = ['rendered masonry', 'small ceramic tile', 'renovated office', 'brick shop house', 'residential balconies'] as const;
export function heroStreetFamily(s: BuildingSpec): number {
  if (s.heroStore) return 1;
  if (s.kind === 'apartment') return 4;
  return (s.heroStreet ?? 0) % 4;
}

/** Only the existing main street frontage visible ahead of the locked camera. */
export function onHeroStreet(s: BuildingSpec): boolean {
  return Math.abs(s.x) > 6 && Math.abs(s.x) < 7.1 && s.z >= -49 && s.z <= 48 && Math.abs(Math.abs(s.rotation) - Math.PI / 2) < .001;
}

export class HeroStreetKit {
  private readonly walls: THREE.MeshStandardMaterial[];
  private readonly bronze = new THREE.MeshStandardMaterial({ color: 0x675c49, metalness: .62, roughness: .46 });
  private readonly paint = new THREE.MeshStandardMaterial({ color: 0x9dafa9, roughness: .84 });
  private readonly rust = new THREE.MeshStandardMaterial({ color: 0x6e4938, roughness: .98 });
  private readonly canvas = new THREE.MeshStandardMaterial({ color: 0x625b42, map: surfaceTextures('wood').map, roughness: .98 });
  private readonly burgundy = new THREE.MeshStandardMaterial({ color: 0x66332c, roughness: .95 });
  private readonly soil = new THREE.MeshStandardMaterial({ color: 0x393b2c, roughness: 1 });
  constructor(private readonly b: CityBatch, private readonly m: Materials) {
    this.walls = [0xc1b6a1, 0xc1beb0, 0x728986, 0x765548, 0x929e95].map((color, i) => {
      const textures = surfaceTextures(i === 1 || i === 3 || i === 4 ? 'tile' : 'concrete');
      const mat = new THREE.MeshStandardMaterial({ color, map: textures.map, bumpMap: textures.bump, bumpScale: .018, roughnessMap: textures.roughness, roughness: .97 });
      worldTexture(mat, i === 1 ? 1.15 : i === 3 ? .47 : .67); return mat;
    });
    worldTexture(this.canvas, 1.2);
  }

  facade(s: BuildingSpec, occupied: boolean[][]): void {
    const b = this.b, m = this.m, family = heroStreetFamily(s), wall = this.walls[family];
    b.section(`hero-facade-${s.heroStreet}`);
    const h = s.floors * 2.85 + .3, stepped = s.kind === 'office' && s.floors >= 7, upperStart = stepped ? h - 5.7 : h;
    const narrow = family === 1, tall = family === 2, balcony = family === 4;
    for (let floor = 1; floor < s.floors; floor++) {
      const upper = floor * 2.85 + 1.35 > upperStart, w = upper ? s.width * .78 : s.width, front = upper ? -.5 : 0;
      const fy = floor * 2.85 + 1.35, wh = narrow ? 1.42 : tall ? 1.96 : balcony ? 1.93 : 1.54;
      const count = w < 4.4 ? 2 : narrow || family === 3 ? 3 : 2;
      const edge = family === 0 ? .43 : .25, gap = narrow ? .31 : tall ? .16 : balcony ? .25 : .42;
      const usable = w - edge * 2, unit = (usable - gap * (count - 1)) / count;
      // Real masonry reveals: glass is approximately 37 cm behind the outer face. Piers and
      // spandrels surround holes rather than pasting windows onto a solid wall.
      const lower = floor === 1 ? 3 : floor * 2.85 - .15, top = (floor + 1) * 2.85 - .15;
      b.b(wall, 0, (lower + fy - wh / 2) / 2, front - .14, w, fy - wh / 2 - lower, .48);
      b.b(wall, 0, (fy + wh / 2 + top) / 2, front - .14, w, top - fy - wh / 2, .48);
      let cursor = -w / 2;
      for (let col = 0; col < count; col++) {
        const a = -w / 2 + edge + col * (unit + gap), c = a + unit;
        b.b(wall, (cursor + a) / 2, fy, front - .14, a - cursor, wh, .48); cursor = c;
        const lit = occupied[floor - 1][col % occupied[floor - 1].length];
        this.window((a + c) / 2, fy, front, unit, wh, family, lit, floor + col);
        // Some suites have blinds, others curtains or unobstructed glazing.
        if (lit && (floor + col + (s.heroStreet ?? 0)) % 3 === 0) {
          for (let j = 0; j < 7; j++) b.b(this.paint, (a + c) / 2, fy + wh * .34 - j * .085, front - .205, unit - .04, .04, .018);
        }
      }
      b.b(wall, (cursor + w / 2) / 2, fy, front - .14, w / 2 - cursor, wh, .48);
      // Distinct slab edges and renovated cladding, rather than a cream band on every building.
      b.b(family === 2 ? this.bronze : wall, 0, top + .075, front - .12, w, .15, .52);
      if (family === 0) {
        b.b(m.cream, 0, top + .02, front + .15, w + .08, .09, .22);
        b.b(this.rust, w * .35, top - .08, front + .026, .07, .16, .008);
      }
      if (family === 1) {
        for (const x of [-w * .5 + .08, w * .5 - .08]) b.b(this.paint, x, fy, front + .12, .08, 2.85, .09);
        // Movement joints in tile veneer and thin coping drip.
        b.b(m.dark, 0, top - .06, front + .105, w, .016, .012);
      }
      if (balcony) this.balcony(w, fy - 1.04, floor, front, s.heroStreet ?? 0);
      else if ((floor + (s.heroStreet ?? 0)) % 3 !== 0 && family !== 2) this.condenser(w * .31, fy - wh / 2 - .32, front + .12, floor);
      if (family === 2 && floor % 2 === 1) b.b(this.bronze, -w * .32, fy + .18, front + .22, .1, 2.32, .28);
      if (family === 2) {
        // A renovated curtain-wall bay retains its original concrete side pier.
        b.b(m.facades[1], w / 2 - .14, fy, front + .12, .27, 2.85, .28);
        b.b(this.bronze, 0, fy - wh / 2 - .18, front + .16, w - .3, .21, .16);
      }
      // Small streaks below joints/coping have physical extents and follow drainage.
      if (floor % 2) for (let j = 0; j < 4; j++) b.b(this.rust, w * .5 - .21 - j * .055, top - .12 - j * .035, front + .105, .018, .1 + j * .065, .006);
    }
    // Weathered ground piers, service riser, meter covers and pipe clips.
    b.b(wall, 0, h - .225, stepped ? -.64 : -.14, stepped ? s.width * .78 : s.width, .45, .48);
    for (const x of [-s.width / 2 + .12, s.width / 2 - .12]) b.b(wall, x, 1.5, -.12, .24, 3, .43);
    const pipeX = -s.width / 2 + .14;
    b.part('cylinder', this.paint, pipeX, h / 2, .2, .037, h, .037);
    for (let y = .6; y < h; y += 1.65) b.b(m.metal, pipeX, y, .19, .13, .035, .1);
    b.rod(this.paint, new THREE.Vector3(pipeX, .6, .2), new THREE.Vector3(pipeX, .32, .03), .037);
    b.b(this.paint, -s.width * .38, 1.5, .14, .23, .37, .12);
    for (let i = 0; i < 2; i++) b.part('cylinder', m.windows, -s.width * .38, 1.44 + i * .14, .208, .046, .018, .046, Math.PI / 2);
    // Roof-edge drain, galvanized cowl, and a screened plant area remain inside the original parcel.
    b.b(this.bronze, 0, h + .57, -.01, s.width + .17, .075, .3);
    b.part('cylinder', m.metal, s.width * .3, h + 1.2, -1.1, .16, 1.7, .16);
    b.part('cylinder', this.paint, s.width * .3, h + 2.08, -1.1, .25, .08, .25);
    if (family === 2 || family === 4) for (let i = 0; i < 11; i++) b.b(this.paint, -s.width * .32 + i * s.width * .055, h + .95, -1.55, .055, .85, .08);
    b.section();
  }

  private window(x: number, y: number, z: number, w: number, h: number, family: number, lit: boolean, index: number): void {
    const b = this.b, m = this.m, frame = family === 2 || family === 3 ? this.bronze : this.paint;
    b.b(m.dark, x, y, z - .33, w + .03, h + .025, .06);
    b.b(lit ? m.businesses[family === 4 ? 'residential' : 'office'].window : m.windows, x, y, z - .28, w - .06, h - .06, .025);
    for (const side of [-1, 1]) b.b(frame, x + side * (w / 2 - .025), y, z - .13, .045, h, .32);
    for (const side of [-1, 1]) b.b(frame, x, y + side * (h / 2 - .025), z - .13, w, .045, .32);
    b.b(frame, x + (family === 0 ? w * .16 : 0), y, z - .22, .035, h, .07);
    b.b(frame, x, y - h / 2 - .035, z + .06, w + .12, .07, .29);
    if (family === 0 || family === 3) b.b(frame, x, y + h * .24, z - .22, w, .035, .07);
    if (lit && index % 3 !== 0) {
      b.b(m.cream, x - w * .39, y, z - .258, w * .16, h - .1, .015);
      if (index % 2) b.b(this.canvas, x + w * .4, y - .12, z - .257, w * .13, h - .34, .015);
    }
  }

  private condenser(x: number, y: number, z: number, floor: number): void {
    const b = this.b, m = this.m;
    b.b(this.paint, x, y, z + .17, .71, .41, .35);
    b.part('cylinder', m.dark, x + .12, y, z + .354, .145, .025, .145, Math.PI / 2);
    for (let i = -3; i <= 3; i++) b.b(m.metal, x + .12, y + i * .037, z + .373, .27, .009, .009);
    b.b(m.metal, x, y - .25, z + .15, .79, .045, .48);
    b.b(m.cream, x - .43, y + .2, z + .08, .04, .81, .07);
    if (floor % 2) b.b(this.rust, x - .3, y - .29, z + .05, .09, .12, .012);
  }

  private balcony(w: number, y: number, floor: number, front: number, ordinal: number): void {
    const b = this.b, m = this.m;
    const style = ordinal % 3, rail = style === 1 ? this.bronze : this.paint;
    b.b(style === 2 ? m.cream : this.walls[4], 0, y, front + .4, w - .15, .14, 1.0);
    b.b(this.paint, 0, y + .96, front + .87, w - .18, .05, .055);
    if (style === 1) b.b(this.walls[0], -w * .24, y + .4, front + .87, w * .47, .65, .07);
    for (let x = style === 1 ? .1 : -w / 2 + .2; x < w / 2 - .15; x += style === 2 ? .28 : .15) b.b(rail, x, y + .52, front + .87, .023, .84, .025);
    if (style === 2) b.b(this.paint, 0, y + .32, front + .87, w - .22, .4, .06);
    // Opaque escape partitions and a few occupied bays; laundry is not repeated on every floor.
    b.b(m.cream, 0, y + .7, front + .4, .06, 1.45, .85);
    if ((floor + ordinal) % 3 === 0) {
      b.b(m.metal, -w * .23, y + 1.8, front + .45, w * .36, .025, .025);
      for (let i = 0; i < 2; i++) b.b(i ? this.canvas : m.cream, -w * .34 + i * .49, y + 1.48, front + .45, .35, .48, .025);
    } else this.condenser(w * .32, y + .28, front + .12, floor);
  }

  storefront(s: BuildingSpec): void {
    const b = this.b, m = this.m, w = s.width, family = heroStreetFamily(s), shop = storefrontSign(s.kind, s.shop);
    b.section(`hero-storefront-${s.heroStreet}`);
    const restaurant = s.kind === 'izakaya', residential = s.kind === 'apartment' || s.kind === 'office';
    const fasciaY = family === 3 ? 3.13 : family === 0 ? 3.0 : 2.96, fasciaH = family === 1 ? .43 : family === 2 ? .64 : .6;
    const fasciaW = residential ? w * .55 : family === 0 ? w * .85 : w - .35, signX = family === 0 ? -.13 : residential ? -w * .1 : 0;
    b.b(family === 3 ? m.wood : family === 2 ? this.bronze : m.dark, signX, fasciaY, .16, fasciaW + .14, fasciaH + .16, .24);
    b.sign(shop, signX, fasciaY, .287, fasciaW, fasciaH);
    if (!residential) {
      const bladeX = (family % 2 ? 1 : -1) * (w / 2 - .38), bladeY = 3.9 + family * .38;
      const bladeW = family === 1 ? .61 : family === 2 ? .9 : .72, bladeH = family === 3 ? 1.48 : .84;
      for (const dy of [-.32, .32]) b.b(this.bronze, bladeX, bladeY + dy, .66, .065, .055, 1.12);
      b.b(m.dark, bladeX, bladeY, 1.05, .12, bladeH + .09, bladeW + .09);
      b.sign(shop, bladeX + .067, bladeY, 1.05, bladeW, bladeH, Math.PI / 2);
      b.sign(shop, bladeX - .067, bladeY, 1.05, bladeW, bladeH, -Math.PI / 2);
      if (family === 0 || family === 3) {
        b.b(m.dark, w / 2 - .25, 5.8, .3, .58, 2.35, .17);
        b.sign(shop, w / 2 - .25, 5.8, .393, .49, 2.18);
      }
    }
    if (restaurant || s.kind === 'retail') {
      const awningMat = restaurant ? this.burgundy : this.canvas;
      const reach = family === 2 ? .58 : .82;
      b.part('box', family === 1 ? this.paint : awningMat, 0, 2.64, reach / 2 + .12, w - .42, .055, reach, .1);
      b.b(awningMat, 0, 2.53, reach + .1, w - .42, .16, .035);
      for (const x of [-w / 2 + .27, w / 2 - .27]) b.rod(this.bronze, new THREE.Vector3(x, 2.17, .1), new THREE.Vector3(x, 2.61, reach + .08), .014);
      for (let x = -w / 2 + .4; x < w / 2 - .25; x += .64) b.b(this.bronze, x, 2.622, reach * .53, .014, .018, reach * .91);
      if (restaurant) {
        // Paper lantern, top/bottom rings, ribs and small noren over the existing door.
        const x = -w * .36;
        b.part('sphere', m.lantern, x, 1.99, .51, .19, .32, .19);
        for (const yy of [1.68, 2.3]) b.part('cylinder', m.dark, x, yy, .51, .115, .035, .115);
        for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4; b.rod(this.burgundy, new THREE.Vector3(x + Math.sin(a) * .15, 1.76, .51 + Math.cos(a) * .15), new THREE.Vector3(x + Math.sin(a) * .15, 2.22, .51 + Math.cos(a) * .15), .007); }
        b.rod(m.dark, new THREE.Vector3(x, 2.3, .51), new THREE.Vector3(x, 2.59, .51), .012);
        for (let i = 0; i < 4; i++) b.b(this.canvas, w * .2 - .44 + i * .23, 2.18, .22, .21, .47 + (i % 2) * .03, .015);
      }
    }
    // All new low props fit the wall-side strip; the existing threshold and sidewalk stay open.
    const propX = -w / 2 + .48;
    if (!residential) {
      b.b(m.wood, propX, .63, .2, .42, .65, .08);
      b.sign(shop, propX, .66, .246, .35, .48);
      for (const x of [propX - .18, propX + .18]) b.b(this.bronze, x, .28, .2, .025, .22, .18);
    }
    if ((s.heroStreet ?? 0) % 2 === 0) {
      const px = w / 2 - .28;
      b.part('cylinder', this.walls[3], px, .28, .18, .135, .31, .135);
      b.part('cylinder', this.soil, px, .44, .18, .12, .015, .12);
      for (let j = 0; j < 5; j++) { const dx = Math.sin(j * 2.4) * .09, dz = Math.cos(j * 2.4) * .09;
        b.rod(m.green, new THREE.Vector3(px, .43, .18), new THREE.Vector3(px + dx, .67 + j % 2 * .13, .18 + dz), .009);
        b.part('sphere', m.green, px + dx, .67 + j % 2 * .13, .18 + dz, .065, .09, .04);
      }
    }
    // Raised shutter cassette, side tracks, door transom, tenancy directory and an exhaust hood.
    if (!residential) {
      b.b(this.paint, 0, 2.77, .1, w - .48, .17, .22);
      for (let j = 0; j < 4; j++) b.b(m.metal, 0, 2.71 + j * .035, .218, w - .51, .008, .012);
    }
    if (family === 3) for (const x of [-w / 2 + .32, w / 2 - .32]) b.b(m.wood, x, 1.5, .19, .095, 2.3, .14);
    if (residential) { b.b(this.bronze, -w * .34, 1.8, .15, .38, .48, .05); for (let i = 0; i < 3; i++) b.b(m.cream, -w * .34, 1.67 + i * .12, .181, .3, .06, .008); }
    if (restaurant) {
      b.b(this.bronze, w / 2 - .42, 3.55, .22, .38, .27, .4);
      b.b(m.metal, w / 2 - .42, 4.52, .2, .23, 1.7, .25);
      // Timber stall below the glazing, joinery and a tiled kitchen wall seen through it.
      for (let x = -w / 2 + .4; x < w / 2 - .3; x += .16) {
        if (Math.abs(x - w * .2) < .5) continue;
        b.b(m.wood, x, .64, .13, .045, .63, .065);
      }
      for (let j = 0; j < 5; j++) {
        b.b(m.cream, -w * .34 + j * .18, 2.08, -3, .13, .39, .018);
        for (let k = 0; k < 3; k++) b.b(m.dark, -w * .34 + j * .18, 2.18 - k * .09, -2.986, .07, .012, .008);
      }
      b.b(m.metal, w * .28, 2.24, -2.8, w * .3, .26, .36);
      for (let j = 0; j < 5; j++) b.b(m.dark, w * .19 + j * .14, 2.22, -2.61, .055, .14, .015);
    }
    b.section();
  }

  /** The visible salon should contain chairs and mirrors, rather than grocery shelves. */
  salon(s: BuildingSpec): void {
    const b = this.b, m = this.m, w = s.width;
    b.section(`hero-salon-${s.heroStreet}`);
    for (const x of [-w * .27, w * .05]) {
      b.b(this.bronze, x, 1.65, -2.92, .82, 1.52, .07);
      b.b(m.windows, x, 1.67, -2.87, .7, 1.33, .025);
      b.b(m.wood, x, .95, -2.55, .95, .08, .58);
      b.part('cylinder', m.metal, x, .47, -1.64, .07, .45, .07);
      b.part('cylinder', m.metal, x, .25, -1.64, .26, .045, .26);
      b.b(m.dark, x, .73, -1.64, .51, .15, .55);
      b.b(m.dark, x, 1.0, -1.92, .51, .57, .12);
      for (const dx of [-.29, .29]) b.b(m.metal, x + dx, .9, -1.64, .045, .06, .4);
      for (let i = 0; i < 3; i++) b.part('cylinder', i % 2 ? m.white : m.green, x - .3 + i * .15, 1.08, -2.52, .03, .17, .03);
    }
    b.b(m.wood, w * .34, .78, -.84, .55, .84, .51);
    b.b(m.cream, w * .34, 1.21, -.84, .63, .04, .57);
    b.b(m.dark, w * .34, 1.32, -.87, .24, .18, .07);
    b.b(m.wood, -w * .34, .67, -.65, .65, .35, .42);
    for (let i = 0; i < 3; i++) b.b(this.canvas, -w * .34, .88 + i * .055, -.65, .47, .045, .29);
    b.section();
  }
}

/** Flush repair work and utility cuts on this street only; no navigation obstacles. */
export function heroRoadDetails(b: CityBatch, m: Materials): void {
  b.section('hero-road-repairs');
  const repair = m.asphalt.clone(); repair.color.setHex(0xb9bfbc); worldTexture(repair, .37);
  const tar = new THREE.MeshStandardMaterial({ color: 0x343a38, roughness: .98 });
  for (const [x, z, w, d, yaw] of [[2.75, 37, .65, 3.4, .035], [-2.8, 28, .75, 5.2, -.025], [.7, 30, 1.1, 1.4, .14], [2.8, -8, .8, 7.5, 0], [-2.9, -36, .6, 3.4, .02]]) {
    b.b(repair, x, -.024, z, w, .012, d, yaw);
    for (const side of [-1, 1]) b.b(tar, x + side * w / 2, -.0175, z, .012, .001, d + .03, yaw);
  }
  for (let i = 0; i < 6; i++) b.b(tar, 1.1 + Math.sin(i * 2.1) * .055, -.0175, 41 - i * .29, .012, .001, .34, Math.sin(i) * .27);
  b.section();
}
