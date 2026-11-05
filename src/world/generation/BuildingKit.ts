import * as THREE from 'three';
import { CityBatch } from './CityBatch';
import { Materials } from './Materials';
import { signBusiness } from '../simulation/WorldRules';
import { storefrontSign } from './SignCatalog';
import { buildConvenienceStore, KONBINI_ROOM_DEPTH } from './ConvenienceStore';
import { HeroStreetKit } from './HeroStreet';
import {NeighborhoodArchitecture} from './NeighborhoodArchitecture';
import {neighborhoodBuilding,neighborhoodParcel,parcelHash} from '../Neighborhoods';

export type Archetype = 'izakaya' | 'retail' | 'apartment' | 'office' | 'convenience';
export interface BuildingSpec { x: number; z: number; rotation: number; width: number; depth: number; floors: number; kind: Archetype; palette: number; shop: number; heroStore?: boolean; heroStreet?: number; rngDepth?:number }

export class BuildingKit {
  private hero?: HeroStreetKit;
  private local?:NeighborhoodArchitecture;
  constructor(private readonly b: CityBatch, private readonly m: Materials, private readonly rng: () => number,private readonly seed=8412) {}

  build(s: BuildingSpec,rendered=neighborhoodParcel(s)): void {
    if(neighborhoodBuilding(s,this.seed).replace){
      this.b.withoutGeometry(()=>this.legacyBuild(s));
      if(rendered.renderable){this.local??=new NeighborhoodArchitecture(this.b,this.m,this.seed);this.local.build(rendered);}
    }else this.legacyBuild(s);
  }
  private legacyBuild(s:BuildingSpec):void {
    const { width: w, depth: d, floors, kind } = s, h = floors * 2.85 + .3;
    const b = this.b, m = this.m, facade = m.facades[s.palette % m.facades.length], hero = s.heroStreet !== undefined;
    if (hero) this.hero ??= new HeroStreetKit(b, m);
    const stepped = kind === 'office' && floors >= 7, upperStart = stepped ? h - 5.7 : h, upperW = stepped ? w * .78 : w, upperD = stepped ? d * .84 : d, upperFront = stepped ? -.5 : 0;
    b.origin(s.x, s.z, s.rotation);
    // Recessed retail level, upper masonry, projecting floor bands and a real roof silhouette.
    b.b(facade, 0, (upperStart + 3) / 2, -(d + (hero ? .4 : 0)) / 2, w, upperStart - 3, d - (hero ? .4 : 0));
    if (stepped) b.b(facade, 0, (h + upperStart) / 2, upperFront - (upperD + (hero ? .4 : 0)) / 2, upperW, h - upperStart, upperD - (hero ? .4 : 0));
    const roomDepth = s.heroStore ? KONBINI_ROOM_DEPTH : 3.2;
    b.b(facade, 0, 1.5, -(d + roomDepth) / 2, w - .15, 3, d - roomDepth);
    b.b(m.pavement, 0, .14, -d / 2 + .2, w + .2, .28, d + .5);
    for (const x of [-w / 2 + .12, w / 2 - .12]) b.b(facade, x, 1.55, -.14, .25, 3.1, .65);
    if (!hero) for (let f = 1; f <= floors; f++) { const upper = f * 2.85 + .15 > upperStart, fw = upper ? upperW : w, fd = upper ? upperD : d, front = upper ? upperFront : 0; b.b(kind === 'office' ? m.metal : m.cream, 0, f * 2.85 + .15, front - fd / 2 + .04, fw + .12, .16, fd + .2); }

    const columns = Math.max(2, Math.floor(w / 1.7));
    const occupied: boolean[][] = [];
    for (let floor = 1; floor < floors; floor++) {
      const fy = floor * 2.85 + 1.35;
      const fw = fy > upperStart ? upperW : w, front = fy > upperStart ? upperFront : 0;
      const row: boolean[] = []; occupied.push(row);
      for (let col = 0; col < columns; col++) {
        const x = (col + .5) * (fw - .7) / columns - (fw - .7) / 2;
        // Preserve every old RNG draw, so frontage authoring cannot move subsequent parcels or actors.
        const lit = this.rng() < .32; row.push(lit);
        if (!hero) this.window(x, fy, front + .04, (fw - 1) / columns - .15, kind === 'office' ? 1.95 : 1.55, lit, m.businesses[kind === 'apartment' ? 'residential' : 'office'].window);
        if (!hero && kind !== 'office' && col === columns - 1 && !(s.heroStore && floor === 1)) this.aircon(x + .12, fy - 1, .22);
      }
      if (!hero && kind === 'apartment') this.balcony(w, fy - .9, floor);
      if (!hero && (kind === 'retail' || kind === 'izakaya') && floor < 3) {
        b.b(m.dark, -w / 2 + .6, fy, .23, .73, 1.9, .25);
        b.sign((s.shop + floor + 1) % 16, -w / 2 + .6, fy, .37, .66, 1.7);
      }
    }
    if (hero) this.hero!.facade(s, occupied);
    // Side elevations are detailed too: alleys expose these, not only the street facade.
    for (const side of [-1, 1]) {
      for (let f = 1; f < floors; f++) for (let j = 0; j < Math.floor((s.rngDepth??d) / 3.1); j++) {
        const upper = f * 2.85 + 1.3 > upperStart, fw = upper ? upperW : w, fd = upper ? upperD : d, front = upper ? upperFront : 0, z = upper ? front - (j + .5) * fd / Math.floor((s.rngDepth??d) / 3.1) : -1.9 - j * 2.7;
        b.b(m.dark, side * (fw / 2 + .01), f * 2.85 + 1.3, z, .09, 1.6, 1.1);
        b.b(this.rng() > .72 ? m.businesses[kind === 'apartment' ? 'residential' : 'office'].window : m.windows, side * (fw / 2 + .065), f * 2.85 + 1.3, z, .04, 1.4, .95);
        b.b(m.metal, side * (fw / 2 + .1), f * 2.85 + 1.3, z, .045, 1.43, .04);
      }
    }
    // Downpipes, conduit, utility cabinets and address plaque.
    b.part('cylinder', m.metal, w / 2 - .17, upperStart / 2, .15, .045, upperStart, .045);
    if (stepped) b.part('cylinder', m.metal, upperW / 2 - .17, (upperStart + h) / 2, upperFront + .15, .045, h - upperStart, .045);
    if (!s.heroStore) {
      b.b(m.cream, w / 2 - .45, .78, .22, .4, .5, .18);
      for (let i = 0; i < 3; i++) b.b(m.metal, w / 2 - .45 + i * .09, 1.3, .13, .018, 1, .03);
      b.sign(31, w / 2 - .36, 2.15, .2, .45, .33);
    }
    if (!hero && kind === 'office') {
      for (let i = 0; i <= columns; i++) { b.b(m.metal, -w / 2 + i * w / columns, upperStart / 2 + 1.5, .18, .09, upperStart - 3, .16); if (stepped) b.b(m.metal, -upperW / 2 + i * upperW / columns, (upperStart + h) / 2, upperFront + .18, .09, h - upperStart, .16); }
    }
    this.store(s);
    b.section(`neighborhood-roof:${s.x.toFixed(3)}:${s.z.toFixed(3)}`);
    this.roof(upperW, upperD, h, kind, upperFront,parcelHash(s,this.seed)%7);b.section();
    if (kind === 'apartment' || (s.palette % 3 === 0 && floors < 6)) this.stairs(w, d, floors);
    b.origin();
  }

  private window(x: number, y: number, z: number, w: number, h: number, lit: boolean, lightMaterial?: THREE.Material): void {
    const b = this.b, m = this.m;
    b.b(m.dark, x, y, z, w + .13, h + .12, .13);
    b.b(lit ? lightMaterial ?? m.warmWindows : m.windows, x, y, z + .08, w, h, .035);
    for (const side of [-1, 1]) b.b(m.metal, x + side * (w / 2 + .025), y, z + .14, .055, h + .1, .13);
    b.b(m.metal, x, y + h / 2, z + .14, w + .12, .06, .13);
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
    if (s.heroStore) { buildConvenienceStore(this.b, this.m, s.width); return; }
    const b = this.b, m = this.m, w = s.width, shop = storefrontSign(s.kind, s.shop);
    const business = s.kind === 'apartment' ? 'residential' : s.kind === 'office' ? 'office' : signBusiness(shop), interior = m.businesses[business];
    // A real 3m-deep room behind lightly reflective glass, not an opaque luminous window.
    b.b(interior.surface, 0, 1.45, -3.1, w - .5, 2.6, .12);
    b.b(business === 'convenience' ? m.pavement : m.wood, 0, .3, -1.5, w - .4, .12, 3.15);
    b.b(interior.surface, 0, 2.74, -1.5, w - .4, .13, 3.1);
    for (const x of [-w / 2 + .18, w / 2 - .18]) b.b(interior.surface, x, 1.45, -1.5, .15, 2.6, 3.1);
    b.b(m.shopGlass, 0, 1.35, .06, w - .6, 2.3, .025);
    b.b(m.dark, 0, .35, .06, w - .5, .5, .15);
    const panes = Math.max(3, Math.round(w / 1.15));
    for (let i = 0; i <= panes; i++) b.b(m.metal, -w / 2 + .3 + i * (w - .6) / panes, 1.4, .14, .055, 2.45, .08);
    b.b(m.metal, 0, 2.55, .1, w - .45, .08, .1);
    b.b(m.dark, w * .2, 1.23, -.04, .88, 2.25, .08);
    b.b(m.shopGlass, w * .2, 1.3, .12, .78, 2.03, .025);
    b.b(m.cream, w * .2 - .28, 1.1, .14, .035, .4, .08);
    if (business === 'restaurant') {
      b.b(m.wood, -w * .12, .82, -1.9, w * .72, .95, .58);
      b.b(m.cream, -w * .12, 1.33, -1.85, w * .75, .1, .8);
      for (let i = 0; i < 4; i++) {
        const x = -w * .36 + i * w * .17;
        b.part('cylinder', m.red, x, .84, -.94, .22, .12, .22); b.part('cylinder', m.metal, x, .53, -.94, .04, .6, .04); b.part('cylinder', m.metal, x, .32, -.94, .2, .04, .2);
        b.part('sphere', m.cream, x, 1.42, -1.6, .13, .055, .13);
        b.b(m.metal, x, 2.46, -1.9, .025, .42, .025); b.part('cylinder', m.dark, x, 2.23, -1.9, .23, .18, .23); b.part('cylinder', interior.light, x, 2.13, -1.9, .18, .02, .18);
      }
      b.sign(shop, -w * .2, 2.1, -3.02, w * .48, .7);
      b.b(m.metal, w * .31, 1.05, -2.55, .75, 1.4, .65);
    } else if (business === 'cafe') {
      for (const x of [-w * .28, w * .24]) {
        b.part('cylinder', m.wood, x, .93, -1.4, .5, .09, .5); b.part('cylinder', m.dark, x, .6, -1.4, .055, .6, .055);
        for (const z of [-.75, -2]) { b.b(m.wood, x, .57, z, .45, .08, .45); b.b(m.wood, x, .88, z + (z < -1 ? -.2 : .2), .45, .6, .06); for (const dx of [-.17, .17]) b.b(m.dark, x + dx, .4, z, .025, .4, .32); }
        b.part('cylinder', m.white, x, 1.05, -1.4, .07, .13, .07);
      }
      b.b(m.wood, -w * .25, 1, -2.6, w * .4, 1.3, .55); b.b(m.metal, -w * .25, 1.75, -2.6, .6, .4, .35); b.sign(shop, w * .22, 2, -3.01, 1.1, .75);
    } else if (business === 'residential' || business === 'office') {
      b.b(m.wood, 0, .85, -2.5, w * .55, 1.05, .55);
      for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) b.b(m.metal, -w * .3 + col * .28, .8 + row * .28, -3, .25, .25, .05);
      b.b(m.dark, w * .25, 1.45, -3, .8, 2.2, .05); b.b(m.metal, w * .25, 1.6, -2.95, .025, 1.8, .03);
    } else if (s.heroStreet !== undefined && s.shop === 13) {
      this.hero!.salon(s);
    } else {
      for (let shelf = 0; shelf < 4; shelf++) {
        b.b(m.white, -w * .18, .65 + shelf * .46, -1.65, w * .5, .055, .46);
        for (let j = 0; j < 10; j++) { const px = -w * .39 + j * w * .046, py = .81 + shelf * .46;
          if (j % 3) b.part('cylinder', [m.red, m.green, m.white, m.yellow][(j + shelf) % 4], px, py, -1.55, .065, .23, .065);
          else b.b(m.white, px, py, -1.55, .15, .28, .15);
          b.b(j % 2 ? m.red : m.cream, px, py, -1.46, .08, .04, .015);
        }
      }
      b.b(m.cream, w * .3, .83, -2.15, w * .28, 1.05, .65); b.b(m.dark, w * .3, 1.46, -2.15, .35, .22, .23);
      b.sign(shop, w * .3, 2.2, -3, 1.2, .55);
    }
    for (const x of [-w * .25, w * .25]) b.b(interior.light, x, 2.65, -1.3, w * .35, .035, .13);
    if (s.heroStreet !== undefined) { this.hero!.storefront(s); return; }
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
      b.b(m.dark, w / 2 - .15, 5.5, .75, .77, 3.35, .28);
      b.sign(shop, w / 2 - .15, 5.5, .9, .7, 3.2);
      // Projecting double-sided blade sign, seen down the street.
      b.b(m.metal, -w / 2 + .35, 4.5, .62, .07, .08, 1.5);
      b.b(m.dark, -w / 2 + .35, 4.15, 1.3, .17, 1.15, .85);
      b.sign(shop, -w / 2 + .45, 4.15, 1.3, .8, 1.05, Math.PI / 2);
      b.sign(shop, -w / 2 + .25, 4.15, 1.3, .8, 1.05, -Math.PI / 2);
    }
    // Menu easel and crates are part of the street-facing kit.
    b.part('box', m.wood, -w * .34, .55, .9, .55, 1, .09, -.12);
    b.sign(shop, -w * .34, .59, 1.01, .45, .7);
    if (s.kind === 'convenience' || s.shop === 3) for (let i = 0; i < 3; i++) {
      b.b(m.wood, -w / 2 + .6 + i * .5, .28, .75, .44, .4, .6);
      for (let j = 0; j < 4; j++) b.part('sphere', m.green, -w / 2 + .45 + i * .5 + j % 2 * .2, .52, .6 + Math.floor(j / 2) * .2, .12, .1, .12);
    }
  }
  private roof(w: number, d: number, h: number, kind: Archetype, front = 0,variant=0): void {
    const b = this.b, m = this.m;
    b.b(m.dark, 0, h + .08, front - d / 2, w + .1, .16, d + .1);
    for (const z of [front, front - d]) b.b(m.cream, 0, h + .3, z, w + .12, .5, .16);
    for (const x of [-w / 2, w / 2]) b.b(m.cream, x, h + .3, front - d / 2, .14, .5, d);
    if(variant%3!==0){b.b(m.facades[1],w*.25,h+.85,front-d*.76,w*.32,1.7,2.4);b.b(m.metal,w*.25,h+1.75,front-d*.76,w*.32+.12,.1,2.52);}
    for(let i=0;i<1+variant%2;i++){b.b(m.cream,w*.25,h+.4,front-1.6-i*1.4,.85,.7,1.05);b.part('cylinder',m.dark,w*.25,h+.77,front-1.6-i*1.4,.27,.04,.27);}
    const legacyTank=kind==='apartment'||this.rng()>.45;
    if (legacyTank&&variant%3===1) {
      for (const x of [-.55, .55]) for (const z of [-.55, .55]) b.b(m.metal,-w*.28+x,h+.55,front-d*.56+z,.07,1.1,.07);
      b.part('cylinder',m.cream,-w*.28,h+1.7,front-d*.56,.9,1.3,.9);
      b.part('cylinder',m.metal,-w*.28,h+2.38,front-d*.56,.95,.09,.95);
      for(const y of [h+1.2,h+2.1])b.part('cylinder',m.metal,-w*.28,y,front-d*.56,.915,.04,.915);
    }
    if(variant%3===0){b.part('cylinder',m.metal,-w*.35,h+1.8,front-d+1,.025,3.6,.025);for(let i=0;i<5;i++)b.b(m.metal,-w*.35,h+2.1,front-d+.3+i*.32,1.25-i*.14,.026,.025);}
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
