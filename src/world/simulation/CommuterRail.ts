import * as THREE from 'three';
import { railServiceOpen, dayState } from './WorldRules';

/** Static instanced detail moves as one group; no train geometry is rebuilt each frame. */
export class CommuterRail {
  private readonly group = new THREE.Group();
  private readonly windows: THREE.MeshStandardMaterial[] = [];
  constructor(scene: THREE.Scene) {
    const boxes = new Map<THREE.Material, THREE.Matrix4[]>(), wheels = new Map<THREE.Material, THREE.Matrix4[]>();
    const mat = (color: number, metalness = .7, roughness = .36) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
    const steel = mat(0xa0aaa8), door = mat(0xc0c5bf), roof = mat(0x757c7b, .6, .6), green = mat(0x08734f, .25), dark = mat(0x172021, .4, .75), glass = mat(0x20383c, .65, .18);
    const head = new THREE.MeshStandardMaterial({ color: 0xe3fff4, emissive: 0xdffff0, emissiveIntensity: 3 });
    const tail = new THREE.MeshStandardMaterial({ color: 0xd8242c, emissive: 0xff1725, emissiveIntensity: 2.6 });
    for (let variant = 0; variant < 3; variant++) { const texture = this.windowTexture(variant); this.windows.push(new THREE.MeshStandardMaterial({ color: 0xd4e5da, map: texture, emissive: 0xb9d6c6, emissiveMap: texture, emissiveIntensity: 1.2, roughness: .3 })); }
    const destination = document.createElement('canvas'); destination.width = 512; destination.height = 64; const c = destination.getContext('2d')!;
    c.fillStyle = '#081d19'; c.fillRect(0, 0, 512, 64); c.fillStyle = '#bcdfa9'; c.font = 'bold 32px "Yu Gothic",sans-serif'; c.textBaseline = 'middle'; c.fillText('新町線', 20, 34); c.font = '22px sans-serif'; c.fillText('SHINMACHI LINE', 180, 34);
    const routeMap = new THREE.CanvasTexture(destination); routeMap.colorSpace = THREE.SRGBColorSpace;
    const route = new THREE.MeshStandardMaterial({ map: routeMap, emissiveMap: routeMap, emissive: 0xffffff, emissiveIntensity: 1.1 });
    const add = (pool: Map<THREE.Material, THREE.Matrix4[]>, m: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, rx = 0, rz = 0) => {
      const matrix = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(w, h, d));
      const list = pool.get(m); if (list) list.push(matrix); else pool.set(m, [matrix]);
    };
    const box = (m: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, rz = 0) => add(boxes, m, x, y, z, w, h, d, 0, rz);
    for (let car = 0; car < 4; car++) {
      const x = (car - 1.5) * 13.1;
      box(steel, x, 8.55, 0, 12.8, 2.38, 2.65); box(roof, x, 9.8, 0, 12.58, .19, 2.54); box(dark, x, 7.42, 0, 12.3, .22, 2.24);
      for (const side of [-1, 1]) {
        box(green, x, 7.98, side * 1.355, 12.7, .38, .025); box(green, x, 9.35, side * 1.355, 12.7, .065, .025);
        for (const y of [7.64, 7.73, 9.43]) box(door, x, y, side * 1.34, 12.45, .025, .025);
        for (const dx of [-3.6, 3.6]) {
          box(dark, x + dx, 8.38, side * 1.365, 1.13, 1.91, .02); box(door, x + dx, 8.38, side * 1.38, 1.06, 1.85, .02);
          box(green, x + dx, 7.98, side * 1.398, 1.05, .38, .014); box(this.windows[(car + 1) % 3], x + dx, 8.78, side * 1.402, .8, .8, .02); box(dark, x + dx, 8.38, side * 1.42, .022, 1.85, .015);
          for (const handle of [-.14, .14]) box(steel, x + dx + handle, 8.13, side * 1.435, .025, .15, .02);
        }
        [-5.35, -1.72, 0, 1.72, 5.35].forEach((dx, i) => { const width = Math.abs(dx) > 5 ? 1.2 : 1.34; box(dark, x + dx, 8.78, side * 1.367, width + .1, 1.1, .025); box(this.windows[(i + car + (side > 0 ? 1 : 0)) % 3], x + dx, 8.78, side * 1.388, width, 1.01, .025); box(steel, x + dx, 8.26, side * 1.405, width + .1, .035, .045); });
        box(route, x + 5.3, 9.48, side * 1.395, 1.12, .18, .025);
      }
      for (const bogie of [-4.36, 4.36]) { box(dark, x + bogie, 7.28, 0, 1.86, .38, 1.88); for (const axle of [-.57, .57]) for (const side of [-1, 1]) { add(wheels, dark, x + bogie + axle, 7.2, side * 1.04, .27, .16, .27, Math.PI / 2); add(wheels, steel, x + bogie + axle, 7.2, side * 1.13, .16, .025, .16, Math.PI / 2); } }
      box(roof, x - 1.5, 7.38, 0, 2.2, .45, 1.42); box(dark, x + 1.35, 7.37, 0, 1.48, .39, 1.68);
      for (const dx of [-2.1, 2.1]) { box(roof, x + dx, 10.02, 0, 2.35, .3, 1.72); for (let vent = -3; vent <= 3; vent++) box(dark, x + dx + vent * .24, 10.18, 0, .075, .018, 1.26); }
      if (car < 3) box(dark, x + 6.55, 8.39, 0, .32, 1.93, 1.98);
    }
    for (const x of [-11, 15.2]) { box(dark, x, 9.95, 0, 1.35, .13, 1.12); for (const side of [-1, 1]) { box(steel, x - .23, 10.24, side * .44, .085, .74, .07, -.69); box(steel, x + .23, 10.58, side * .44, .085, .74, .07, .69); } box(dark, x, 10.86, 0, .37, .065, 1.72); }
    for (const end of [-1, 1]) { const x = end * 26.05; box(dark, x, 8.77, 0, .055, 1.43, 2.4); for (const side of [-1, 1]) { box(glass, x + end * .033, 8.79, side * .57, .035, 1.08, .99); box(end > 0 ? head : tail, x + end * .04, 7.99, side * .91, .045, .16, .28); } box(green, x + end * .025, 7.76, 0, .05, .16, 2.47); }
    for (const [pool, geometry] of [[boxes, new THREE.BoxGeometry(1, 1, 1)], [wheels, new THREE.CylinderGeometry(1, 1, 1, 12)]] as const) for (const [material, matrices] of pool) { const mesh = new THREE.InstancedMesh(geometry, material, matrices.length); matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix)); mesh.receiveShadow = true; mesh.computeBoundingSphere(); this.group.add(mesh); }
    this.group.name = 'Four-car stainless Shinmachi Line train'; this.group.position.z = -57; scene.add(this.group);
  }
  update(x: number, hour: number): void { this.group.position.x = x; this.group.visible = railServiceOpen(hour); this.windows.forEach(m => { m.emissiveIntensity = .45 + dayState(hour).night * 1.35; }); }
  private windowTexture(variant: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 192; const c = canvas.getContext('2d')!;
    const gradient = c.createLinearGradient(0, 0, 0, 192); gradient.addColorStop(0, '#d4e8dd'); gradient.addColorStop(.5, '#aec9bc'); gradient.addColorStop(1, '#607c77'); c.fillStyle = gradient; c.fillRect(0, 0, 256, 192);
    c.fillStyle = '#edf3e9'; c.fillRect(0, 9, 256, 8); c.fillStyle = '#446c69'; c.fillRect(0, 150, 256, 42);
    for (let pole = 0; pole < 3; pole++) { c.fillStyle = '#9fb8ae'; c.fillRect(34 + pole * 84, 22, 3, 140); c.strokeStyle = '#a8bdb0'; c.lineWidth = 2; c.beginPath(); c.ellipse(42 + pole * 80, 53, 7, 10, 0, 0, Math.PI * 2); c.stroke(); }
    for (let person = 0; person < 3; person++) { const x = 35 + person * 86 + (variant * 19 + person * 11) % 23, y = 85 + (variant * 7 + person * 13) % 24; c.fillStyle = ['#354542', '#4a5350', '#283c3c'][(variant + person) % 3]; c.beginPath(); c.ellipse(x, y, 12, 15, .12, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(x - 9, y + 15); c.quadraticCurveTo(x - 27, y + 24, x - 28, 192); c.lineTo(x + 29, 192); c.quadraticCurveTo(x + 26, y + 25, x + 9, y + 15); c.fill(); }
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
}
