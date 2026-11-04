import * as THREE from 'three';
import type { CityBatch } from './CityBatch';
import type { Materials } from './Materials';
import { KONBINI_SIGNS as S } from './SignCatalog';
import { drawRun, measureSignInk, signTextureSettings } from './SignTextures';
import { fittedRun } from './SignLayout';

/** One authored AoZora branch, inside the existing parcel and doorway contract. Metres, local +Z faces the street. */
export const KONBINI_ROOM_DEPTH = 6.1;
const fill = (color: number, strength = .14, roughness = .65) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: strength, roughness });

function packageMaterial(name: string, category: 'tea' | 'snack' | 'rice' | 'meal' | 'water' | 'coffee' | 'juice'): THREE.MeshStandardMaterial {
  const source = document.createElement('canvas'); source.width = 256; source.height = 320;
  const c = source.getContext('2d')!;
  const backgrounds = { rice:'#e6e3d4',tea:'#bfd09c',snack:'#d8ad73',meal:'#e3d8b5',water:'#c4dce2',coffee:'#ac886b',juice:'#e2b66e' };
  c.fillStyle = backgrounds[category]; c.fillRect(0, 0, 256, 320);
  c.fillStyle = category === 'snack' ? '#973f2d' : '#214c47'; c.fillRect(0, 0, 256, 48);
  const text = (s: string, y: number, h: number, color: string) => { c.fillStyle = color; drawRun(c, fittedRun(s, { x: 15, y, width: 226, height: h }, h * .8, (s, size) => measureSignInk(c, s, size))); };
  text('青空', 8, 30, '#f2ead4'); text(name, 59, 46, '#263c32');
  if (category === 'rice') {
    c.fillStyle = '#fffdf0'; c.beginPath(); c.moveTo(128, 118); c.lineTo(201, 242); c.lineTo(55, 242); c.closePath(); c.fill();
    c.fillStyle = '#253c30'; c.fillRect(105, 195, 46, 53);
  } else if (category === 'meal') {
    c.fillStyle = '#292e2b'; c.fillRect(22, 122, 212, 127); c.fillStyle = '#f8f0d3'; c.fillRect(30, 130, 105, 111);
    for (const [x, color] of [[162, '#a95a2f'], [205, '#748746']] as const) { c.fillStyle = color; c.beginPath(); c.arc(x, 180, 23, 0, Math.PI * 2); c.fill(); }
  } else if (category === 'water') {
    c.strokeStyle='#4d879b';c.lineWidth=7;
    for(let j=0;j<4;j++){c.beginPath();for(let x=20;x<238;x+=3)c.lineTo(x,147+j*23+Math.sin(x*.045+j)*8);c.stroke();}
  } else if (category === 'coffee') {
    c.fillStyle='#f1e5cf';c.fillRect(66,146,112,81);c.beginPath();c.ellipse(122,146,56,12,0,0,Math.PI*2);c.fill();
    c.fillStyle='#513b2e';c.beginPath();c.ellipse(122,144,48,8,0,0,Math.PI*2);c.fill();
    c.strokeStyle='#f1e5cf';c.lineWidth=12;c.beginPath();c.arc(179,176,23,-Math.PI/2,Math.PI/2);c.stroke();
  } else if (category === 'juice') {
    c.fillStyle='#c07b33';c.beginPath();c.arc(128,184,60,0,Math.PI*2);c.fill();
    c.fillStyle='#61794e';c.beginPath();c.ellipse(151,123,29,12,-.5,0,Math.PI*2);c.fill();
  } else {
    c.fillStyle = category === 'tea' ? '#537657' : '#b08034';
    for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(72 + i % 2 * 88, 138 + i * 19, 28, 13, i * .4, 0, Math.PI * 2); c.fill(); }
  }
  text(category === 'tea' ? '国産茶葉' : '毎日の、おいしい。', 261, 23, '#38463b');
  c.fillStyle = '#303932'; for (let i = 0; i < 40; i++) c.fillRect(74 + i * 2.7, 298, i % 3 ? 1 : 2, 14);
  const map = signTextureSettings(new THREE.CanvasTexture(source));
  return new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .2, roughness: .72 });
}

export function buildConvenienceStore(b: CityBatch, m: Materials, w: number): void {
  const room = m.businesses.convenience, enamel = fill(0xd6d9d0), brand = fill(0x214b50, .1), amber = fill(0xbf8c3e),
    stainless = new THREE.MeshStandardMaterial({ color: 0x909a98, metalness: .68, roughness: .34 }),
    floor = fill(0xaaa99b, .07, .43), grout = fill(0x929386, .07), dark = fill(0x252f32, .06), paper = fill(0xe6dfca, .18),
    packs = { tea: packageMaterial('緑茶', 'tea'), snack: packageMaterial('ポテト', 'snack'), rice: packageMaterial('おにぎり', 'rice'), meal: packageMaterial('お弁当', 'meal'),
      water: packageMaterial('天然水','water'),coffee:packageMaterial('珈琲','coffee'),juice:packageMaterial('果汁','juice') };
  const left = -w / 2 + .84, right = w / 2 - .23, doorX = w * .2, doorW = 1.55;
  const wall = fill(0xc4c9bd, .11, .93), ceiling = fill(0xc7ccc4, .09, .9);
  const box = (mat: THREE.Material, x: number, y: number, z: number, width: number, height: number, depth: number) => b.b(mat, x, y, z, width, height, depth);
  const panel = (mat: THREE.Material, x: number, y: number, z: number, width: number, height: number, tint = 0xffffff) => b.part('plane', mat, x, y, z, width, height, 1, 0, 0, 0, tint);
  const label = (index: number, x: number, y: number, z: number, width: number, height: number) => b.sign(index, x, y, z, width, height);

  // Tiled threshold, deep room, neutral ceiling, and small construction joints.
  box(floor, 0, .29, -2.95, w - .4, .08, 6.2);
  for (let x = left; x < right; x += .6) box(grout, x, .332, -2.95, .007, .002, 6.2);
  for (let z = -.1; z > -6; z -= .6) box(grout, 0, .332, z, w - .45, .002, .007);
  box(wall, 0, 1.51, -6.03, w - .4, 2.38, .12);
  box(ceiling, 0, 2.72, -2.95, w - .4, .12, 6.1);
  for (const x of [left, right]) box(wall, x, 1.5, -2.95, .1, 2.4, 6.1);
  // The neighbouring building's external stair occupies the party-wall edge; enclose that service strip.
  box(enamel, -w / 2 + .48, 1.49, -2.94, .65, 2.4, 6.08);
  box(brand, -w / 2 + .48, 1.49, .11, .65, 2.39, .08);
  label(S.coffee, -w / 2 + .48, 1.65, .157, .47, .68);
  for (let z = -.7; z > -5.8; z -= 1.2) {
    box(stainless, 0, 2.65, z, w - .6, .018, .018);
    for (const x of [-w * .24, w * .24]) { box(enamel, x, 2.62, z, .55, .055, .29); box(room.light, x, 2.585, z, .47, .012, .19); }
  }
  // Access panels, a return grille and panel joints break up the formerly luminous blank ceiling.
  for (let z = -.6; z > -6; z -= .6) box(grout, 0, 2.654, z, w - .55, .005, .012);
  for (const x of [-w * .22, w * .22]) box(grout, x, 2.654, -2.95, .012, .005, 6.0);
  box(stainless, -w * .3, 2.645, -4.6, .63, .025, .47);
  for (let i = 0; i < 9; i++) box(dark, -w * .3 - .25 + i * .062, 2.627, -4.6, .025, .008, .37);
  box(stainless, w * .28, 2.635, -3.2, .53, .035, .48);
  for (let i = -3; i <= 3; i++) box(dark, w * .28 + i * .055, 2.61, -3.2, .018, .012, .36);

  // Shallow lightbox, single amber rule, restrained blade; no unrelated advertising.
  box(stainless, 0, 2.98, .12, w - .28, .67, .29);
  label(S.fascia, -.28, 2.99, .273, w - 1.13, .54);
  label(S.hours, right - .38, 2.99, .275, .62, .54);
  box(brand, 0, 2.625, .17, w - .34, .08, .28);
  box(amber, 0, 2.666, .18, w - .35, .025, .29);
  box(enamel, 0, 2.55, .2, w - .4, .08, .46);
  box(room.light, 0, 2.502, .15, w - .6, .012, .09);
  for (const y of [3.52, 4.24]) box(stainless, left, y, .66, .07, .06, 1.32);
  box(brand, left, 3.88, 1.13, .16, .87, .9);
  b.sign(S.fascia, left + .085, 3.88, 1.13, .83, .78, Math.PI / 2);
  b.sign(S.fascia, left - .085, 3.88, 1.13, .83, .78, -Math.PI / 2);

  // Separate flat glass panes avoid overlapping box faces. Entry position matches the old threshold.
  const pane = (a: number, c: number, door = false) => {
    if (c - a < .06) return;
    const x = (a + c) / 2, width = c - a;
    panel(m.shopGlass, x, 1.43, .078, width - .035, 2.17);
    for (const y of [.355, 2.51]) box(stainless, x, y, .1, width, .045, .075);
    if (!door) box(brand, x, .43, .08, width - .035, .12, .06);
    box(brand, x, 1.02, .091, width - .035, .064, .012); box(amber, x, 1.062, .093, width - .035, .012, .012);
  };
  const edges = [left, (left + doorX - doorW / 2) / 2, doorX - doorW / 2, doorX, doorX + doorW / 2, right];
  for (let i = 0; i < edges.length - 1; i++) pane(edges[i], edges[i + 1], i === 2 || i === 3);
  for (const x of edges) box(stainless, x, 1.43, .11, .045, 2.2, .075);
  box(enamel, doorX, 2.47, .14, doorW + .15, .14, .14);
  box(dark, doorX, 2.425, .225, .12, .035, .06); // automatic-door sensor
  box(stainless, doorX, .346, .08, doorW, .017, .14);
  box(dark, doorX, .354, -.38, 1.48, .025, .68); // entry mat
  label(S.door, doorX, 1.15, .158, .66, .22);
  label(S.coffee, left + .6, 1.9, .135, .68, .38);
  label(S.fresh, left + 1.35, 1.82, .137, .58, .38);
  label(S.services, right - .38, 1.88, .14, .55, .59);

  // A clear entrance aisle runs beside the low stocked gondola to the back refrigeration.
  const shelfX = left + 1.08, shelfW = Math.min(1.45, w * .27);
  for (const z of [-2.05, -3.66]) {
    box(enamel, shelfX, .47, z, shelfW, .26, .78);
    box(enamel, shelfX, 1.03, z - .13, shelfW, 1.22, .055);
    for (const dx of [-shelfW / 2 + .025, shelfW / 2 - .025]) box(stainless, shelfX + dx, 1.02, z - .14, .035, 1.34, .07);
    for (let row = 0; row < 4; row++) {
      const y = .61 + row * .285;
      box(enamel, shelfX, y, z + .08, shelfW, .035, .67); box(amber, shelfX, y + .028, z + .42, shelfW, .038, .018);
      for (let j = 0; j < 8; j++) {
        if ((j * 3 + row + Math.round(-z)) % 13 === 0) continue; // small, stable stock gaps
        const x = shelfX - shelfW * .43 + j * shelfW * .123, setback = j % 3 === 0 ? .08 : 0;
        if (row === 0) {
          b.part('rice', paper, x, y + .11, z + .16, .15, .18, .09);
          box(brand, x, y + .07, z + .209, .055, .09, .008);
          panel(packs.rice, x, y + .12, z + .214, .065, .04);
        } else {
          const ph = .15 + (j + row) % 3 * .022;
          b.part('box', paper, x, y + ph / 2 + .02, z + .16 - setback, .13, ph, .18, 0,0,0,[0xf0e5cd,0xe4dbc2,0xd0dcc7,0xe6cfb4][(j+row)%4]);
          panel(row === 2 ? packs.tea : packs.snack, x, y + ph / 2 + .023, z + .255 - setback, .126, ph, [0xffffff, 0xe8c897, 0xbac8ab, 0xd4b4a1][(j + row) % 4]);
        }
        box(paper, x, y + .015, z + .435, .075, .028, .007);
      }
    }
  }
  label(S.groceries, shelfX, 1.74, -1.56, shelfW, .18);

  // Back-wall glazed drinks cases, compressors, handles, and two rows of capped bottles per shelf.
  const coldW = w - .85, coldZ = -5.45, bays = Math.max(3, Math.floor(coldW / .85)), bayW = coldW / bays;
  box(dark, 0, 1.43, coldZ - .3, coldW, 2.13, .6);
  for (let bay = 0; bay < bays; bay++) {
    const x = -coldW / 2 + (bay + .5) * bayW;
    box(room.surface, x, 1.42, coldZ - .03, bayW - .08, 1.86, .04);
    for (let row = 0; row < 5; row++) {
      const y = .55 + row * .325;
      box(enamel, x, y, coldZ + .17, bayW - .055, .035, .42);
      for (let j = 0; j < 5; j++) {
        if ((bay+row+j*2)%17===0) continue;
        const px = x - bayW * .36 + j * bayW * .18, drink=(bay*2+Math.floor(row/2))%4;
        const label=[packs.tea,packs.water,packs.coffee,packs.juice][drink];
        const bh = drink === 2 ? .145 : drink === 1 ? .25 : .205;
        const tint=[0xc0c89f,0xc9e2e2,0x8b7058,0xe7c391][drink];
        if(drink===3) {
          b.part('box',paper,px,y+.125,coldZ+.19,.085,.21,.085,0,0,0,tint);
          box(amber,px,y+.243,coldZ+.19,.084,.028,.04);
        } else {
          b.part('cylinder', drink===2?stainless:paper, px, y+bh/2+.02, coldZ+.19, .044, bh, .044, 0,0,0,tint);
          b.part('cylinder', drink===2?stainless:drink===1?paper:brand,px,y+bh+.035,coldZ+.19,drink===2?.045:.028,drink===2?.014:.03,drink===2?.045:.028);
        }
        panel(label,px,y+bh*.52+.02,coldZ+.24,.071,Math.min(.13,bh*.78));
      }
    }
    panel(m.shopGlass, x, 1.48, coldZ + .44, bayW - .065, 1.81);
    box(stainless, x - bayW / 2, 1.46, coldZ + .46, .035, 2, .06);
    box(stainless, x + bayW * .35, 1.49, coldZ + .49, .025, .49, .035);
    box(room.light, x - bayW * .43, 1.48, coldZ + .02, .016, 1.65, .015);
  }
  label(S.drinks, 0, 2.4, coldZ + .48, coldW, .2);
  b.sign(S.fresh,left+.06,1.92,-4.1,.72,.48,Math.PI/2);
  for (let i = 0; i < 20; i++) box(stainless, -coldW * .46 + i * coldW * .048, .4, coldZ + .48, .04, .08, .02);

  // Checkout remains on the right, behind the door approach; visible POS, hot case, coffee and parcel shelves.
  const counterX = right - .65, counterZ = -2.4;
  box(brand, counterX, .88, counterZ, 1.03, 1.05, .69);
  box(stainless, counterX, 1.43, counterZ, 1.16, .065, .79);
  box(dark, counterX - .17, 1.54, counterZ + .07, .1, .19, .1);
  b.part('box', dark, counterX - .17, 1.68, counterZ + .04, .32, .23, .045, -.14);
  box(room.surface, counterX - .17, 1.68, counterZ + .069, .265, .165, .008);
  box(dark, counterX + .24, 1.48, counterZ + .13, .17, .055, .24);
  box(enamel, counterX, .88, -3.6, 1.08, 1.05, .61);
  box(stainless, counterX, 1.43, -3.6, 1.14, .055, .65);
  box(dark, counterX, 1.74, -3.64, .48, .57, .39);
  for (const x of [counterX - .11, counterX + .11]) { box(stainless, x, 1.67, -3.41, .035, .06, .05); b.part('cylinder', paper, x, 1.49, -3.4, .045, .09, .045); }
  label(S.coffee, counterX, 2.15, -3.32, .87, .29);
  box(enamel, counterX + .31, 1.65, counterZ + .08, .36, .37, .37);
  panel(m.shopGlass, counterX + .31, 1.65, counterZ + .273, .32, .31);
  for (let i = 0; i < 4; i++) box(amber, counterX + .22 + i % 2 * .16, 1.56 + Math.floor(i / 2) * .13, counterZ + .15, .1, .065, .13);
  for (let i = 0; i < 4; i++) { box(enamel, counterX, .6 + i * .32, -4.48, 1, .035, .51); box(paper, counterX - .18, .73 + i * .32, -4.48, .38, .2, .35); }
  label(S.services, counterX, 2.2, -4.17, 1.04, .32);
  // Chilled prepared meals near the front window, low enough to see over.
  box(enamel, left + .45, .79, -.75, .65, .9, .66);
  for (let row = 0; row < 3; row++) {
    const y = .58 + row * .26; box(stainless, left + .45, y, -.67, .65, .025, .48);
    for (let j = 0; j < 3; j++) { box(dark, left + .23 + j * .21, y + .07, -.67, .19, .11, .29); panel(packs.meal, left + .23 + j * .21, y + .075, -.52, .18, .105); }
  }
  label(S.price, left + .45, 1.3, -.39, .64, .2);
  // Low magazine display and a small basket of impulse goods sit inside the glazing,
  // beside the existing clear entrance aisle, rather than filling it with more shelving.
  const rackX = left + 1.55;
  box(brand, rackX, .59, -.47, 1.0, .48, .28);
  for (let row = 0; row < 2; row++) {
    box(stainless, rackX, .55 + row * .22, -.29 - row * .09, 1.0, .025, .14);
    for (let i = 0; i < 5; i++) {
      const xx = rackX - .39 + i * .19, yy = .7 + row * .23, zz = -.31 - row * .1;
      box([amber, brand, paper, dark][(i + row) % 4], xx, yy, zz, .175, .235, .025);
      box(paper, xx, yy + .07, zz + .017, .14, .018, .007);
      box([brand, paper, amber][i % 3], xx, yy - .02, zz + .018, .1, .06, .007);
    }
  }
  box(brand, counterX + .05, 1.51, counterZ + .26, .24, .09, .19);
  for (let i = 0; i < 5; i++) box(i % 2 ? amber : paper, counterX - .04 + i * .04, 1.58, counterZ + .26, .027, .07, .09);
  box(paper, counterX - .37, 1.49, counterZ + .14, .19, .015, .13);
  // Compact in-store ATM corresponds to the entrance service notice.
  box(brand, right - .32, 1.03, -1.32, .48, 1.39, .4);
  box(enamel, right - .32, 1.49, -1.107, .4, .34, .025);
  box(dark, right - .32, 1.51, -1.087, .29, .19, .012);
  box(room.surface, right - .32, 1.51, -1.077, .23, .13, .008);
  box(stainless, right - .32, 1.18, -1.08, .31, .055, .14);
  box(dark, right - .32, .96, -1.105, .2, .025, .015);
  label(S.services, right - .32, 1.88, -1.107, .45, .23);
  // Basket stack and tidy indoor sorting bins leave the exterior pavement clear.
  for (let i = 0; i < 5; i++) { box(brand, doorX - 1.12, .45 + i * .055, -.42, .4, .035, .32); for (const dx of [-.195, .195]) box(brand, doorX - 1.12 + dx, .5 + i * .055, -.42, .025, .12, .32); }
  for (let i = 0; i < 2; i++) { box(enamel, right - .19, .64, -.45 - i * .38, .3, .58, .31); box(dark, right - .19, .943, -.45 - i * .38, .18, .025, .13); }
}
