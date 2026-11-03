import * as THREE from 'three';
import { CityBatch } from './CityBatch';
import type { Materials } from './Materials';

/** Readable railway wayfinding and a furnished exterior station/platform. */
export function stationDetails(b: CityBatch, m: Materials): THREE.Group {
  const group = new THREE.Group(); group.name = 'Shinmachi station wayfinding and platform';
  function board(x: number, y: number, z: number, w: number, h: number, draw: (c: CanvasRenderingContext2D, width: number, height: number) => void, ratio = w / h): void {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = Math.round(1024 / ratio); const c = canvas.getContext('2d')!; draw(c, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
    const material = new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: 0xffffff, emissiveIntensity: .65, roughness: .65 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); mesh.position.set(x, y, z); group.add(mesh);
  }
  // Platform on the south side of the existing line; its outer parapet remains a guardrail.
  b.b(m.pavement, 22, 7.19, -54.78, 29, .3, 1.6); b.b(m.yellow, 22, 7.35, -55.42, 29, .025, .22);
  b.b(m.metal, 22, 11.55, -54.7, 30.5, .2, 2.5);
  for (const x of [8.5, 17.5, 26.5, 35.5]) { b.b(m.cream, x, 9.4, -54.15, .17, 4.2, .17); b.b(m.metal, x, 11.31, -54.7, .09, .12, 2.3); b.b(m.businesses.convenience.light, x + 1.2, 11.38, -54.5, 2, .035, .15); }
  for (const x of [13, 29]) { b.b(m.wood, x, 7.85, -54.45, 2.6, .12, .45); b.b(m.wood, x, 8.2, -54.2, 2.6, .55, .08); for (const dx of [-.9, .9]) b.b(m.metal, x + dx, 7.55, -54.45, .09, .65, .3); }
  // Shallow entrance concourse, structural canopy seams and warm-white strip lights.
  for (const x of [13.4, 17.1, 20.8, 24.5]) { b.b(m.metal, x, 4.24, -47.7, .08, .14, 3.5); b.b(m.businesses.convenience.light, x + .6, 4.13, -47.7, 1.1, .035, .16); }
  b.b(m.pavement, 19, .14, -48, 10.5, .12, 3.5);
  // Two return flights connect the concourse visually with the elevated platform.
  for (let step = 0; step < 21; step++) {
    b.b(m.pavement, 14.5 + step * .34, .3 + step * .169, -51.1, .36, .17, 1.15);
    b.b(m.pavement, 21.3 - step * .34, 3.85 + step * .169, -52.65, .36, .17, 1.15);
  }
  b.b(m.pavement, 21.7, 3.73, -51.9, 1.1, .2, 2.7);
  for (const z of [-50.47, -51.72]) b.rod(m.metal, new THREE.Vector3(14.5, 1.3, z), new THREE.Vector3(21.5, 4.8, z), .028);
  for (const z of [-52.02, -53.28]) b.rod(m.metal, new THREE.Vector3(21.5, 4.8, z), new THREE.Vector3(14.5, 8.3, z), .028);
  b.b(m.pavement, 14.3, 7.33, -53.85, 1.2, .18, 2);
  for (const x of [13.65, 16.5, 19.5, 22.3]) b.b(m.metal, x, 5.8, -53.3, .065, 3.6, .065);
  b.b(m.shopGlass, 18, 5.8, -53.32, 8.7, 3.5, .035);
  for (const x of [13.6, 24.2]) { b.b(m.metal, x, 1.45, -48.6, .9, 2.45, .7); b.b(m.dark, x, 1.75, -48.22, .65, .65, .04); b.b(m.shop, x, 1.75, -48.19, .49, .44, .03); b.b(m.dark, x, .76, -48.18, .5, .16, .04); b.b(m.yellow, x, 1.18, -48.18, .3, .08, .025); }
  for (const x of [16.5, 18, 19.5, 21]) { b.b(m.dark, x + .23, .7, -48.05, .23, .24, .035); b.b(m.businesses.convenience.light, x, 1.24, -48.35, .18, .025, .22); }
  // Backlit entrance lettering is drawn at its final aspect ratio, not stretched from a square.
  board(19, 3.55, -46.275, 11.8, .89, (c, w, h) => { c.fillStyle = '#e2e6da'; c.fillRect(0, 0, w, h); c.fillStyle = '#19744f'; c.fillRect(0, h - 12, w, 12); c.fillStyle = '#203d33'; c.font = '700 42px "Yu Gothic",Meiryo,sans-serif'; c.textBaseline = 'middle'; c.fillText('新町駅', 28, h / 2); c.font = '500 27px sans-serif'; c.fillText('Shinmachi Station', 230, h / 2); c.font = '24px sans-serif'; c.fillText('東口  East Exit', 720, h / 2); });
  const departures = (c: CanvasRenderingContext2D, w: number, h: number) => { c.fillStyle = '#101b1b'; c.fillRect(0, 0, w, h); c.fillStyle = '#c3cfbf'; c.font = '30px "Yu Gothic",sans-serif'; c.fillText('新町線  Shinmachi Line', 24, 44); c.fillStyle = '#87caa0'; c.fillRect(24, 62, w - 48, 3); c.font = '24px sans-serif'; c.fillStyle = '#e5d49b'; c.fillText('1   各駅停車  Local     中央方面  Central', 24, 104); c.fillStyle = '#9fb7b5'; c.font = '19px sans-serif'; c.fillText('IC cards accepted   ·   Please stand behind the yellow line', 24, h - 22); };
  board(18.8, 2.62, -49.42, 4.8, .85, departures);
  for (const x of [13.2, 30.5]) board(x, 9.55, -53.76, 3.7, .7, (c, w, h) => { c.fillStyle = '#e4e6dc'; c.fillRect(0, 0, w, h); c.fillStyle = '#246e4f'; c.fillRect(0, h * .67, w, h * .15); c.fillStyle = '#203a32'; c.font = 'bold 65px "Yu Gothic",sans-serif'; c.fillText('新町', 32, h * .51); c.font = '42px sans-serif'; c.fillText('Shinmachi', 330, h * .5); });
  // Area map and timetable sit outside the clear path through the gate bank.
  b.b(m.metal, 11.1, 1.7, -45.8, 1.8, 2.1, .15);
  board(11.1, 1.72, -45.705, 1.65, 1.95, (c, w, h) => { c.fillStyle = '#dcded2'; c.fillRect(0, 0, w, h); c.fillStyle = '#24473d'; c.font = 'bold 69px "Yu Gothic",sans-serif'; c.fillText('周辺案内', 55, 110); c.font = '35px sans-serif'; c.fillText('NEIGHBORHOOD MAP', 55, 172); c.strokeStyle = '#b3b9ab'; c.lineWidth = 29; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(100 + i * 180, 250); c.lineTo(100 + i * 180, h - 120); c.stroke(); c.beginPath(); c.moveTo(50, 300 + i * 180); c.lineTo(w - 50, 300 + i * 180); c.stroke(); } c.strokeStyle = '#2e805b'; c.lineWidth = 32; c.beginPath(); c.moveTo(50, 350); c.lineTo(w - 50, 350); c.stroke(); c.fillStyle = '#b54732'; c.beginPath(); c.arc(470, 650, 28, 0, 7); c.fill(); c.font = '38px sans-serif'; c.fillText('YOU ARE HERE', 300, 745); });
  return group;
}
