import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// GLTFExporter requires FileReader even when a GLB has no image payloads.
globalThis.FileReader ??= class {
  result = null;
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.({ target: this }); }).catch(error => this.onerror?.(error)); }
  readAsDataURL(blob) { blob.arrayBuffer().then(value => { this.result = `data:${blob.type};base64,${Buffer.from(value).toString('base64')}`; this.onloadend?.({ target: this }); }).catch(error => this.onerror?.(error)); }
};
const output = new URL('../public/assets/nightlife/', import.meta.url); await mkdir(output, { recursive: true });
const material = (name, color, props = {}) => new THREE.MeshStandardMaterial({ name, color, roughness: .6, ...props });
function mesh(g, geometry, m, p = [0, 0, 0], r = [0, 0, 0]) { const o = new THREE.Mesh(geometry, m); o.position.fromArray(p); o.rotation.fromArray(r); g.add(o); return o; }
const box = (g, m, p, size, r) => mesh(g, new THREE.BoxGeometry(...size), m, p, r);
const cyl = (g, m, p, radius, height, r) => mesh(g, new THREE.CylinderGeometry(radius, radius, height, 24), m, p, r);
const ring = (g, m, p, radius, tube, r = [Math.PI / 2, 0, 0]) => mesh(g, new THREE.TorusGeometry(radius, tube, 4, 32), m, p, r);
const lathe = (g, m, profile, p) => mesh(g, new THREE.LatheGeometry(profile.map(v => new THREE.Vector2(...v)), 48), m, p);
function tube(g, m, points, radius, segments = 12) { const curve = new THREE.CatmullRomCurve3(points.map(v => new THREE.Vector3(...v))); return mesh(g, new THREE.TubeGeometry(curve, segments, radius, 6, false), m); }

function lantern() {
  const g = new THREE.Group(); g.name = 'Original ribbed paper lantern';
  const paper = material('Vermilion paper', 0xc94b2b, { roughness: .86, emissive: 0xb93713, emissiveIntensity: .25 });
  const ink = material('Ink and tassel', 0x261f1a, { roughness: .92 });
  const caps = material('Aged bronze caps', 0x65513a, { metalness: .76, roughness: .5 });
  const glow = material('Warm inner diffuser', 0xffd7a1, { emissive: 0xff9c44, emissiveIntensity: 1.1 });
  const radius = v => (.116 + .108 * Math.max(0, Math.sin(Math.PI * v)) ** .62) * (1 + .017 * Math.cos(v * Math.PI * 52));
  lathe(g, paper, Array.from({ length: 129 }, (_, j) => [radius(j / 128), .14 + j / 128 * .64]));
  for (let j = 1; j < 26; j++) ring(g, paper, [0, .14 + j / 26 * .64, 0], radius(j / 26) + .0008, .0024);
  for (const y of [.13, .795]) cyl(g, caps, [0, y, 0], .124, .035);
  for (const y of [.11, .816]) ring(g, ink, [0, y, 0], .113, .006);
  ring(g, caps, [0, .898, 0], .075, .0065, [0, 0, 0]); cyl(g, glow, [0, .46, 0], .104, .59);
  // Original geometry-painted 山. No downloaded font or model is embedded.
  for (const stroke of [[[0, .605], [0, .325]], [[-.105, .55], [-.105, .345], [.105, .345], [.105, .55]]]) {
    const points = stroke.map(([x, y]) => [x, y, Math.sqrt(Math.max(0, radius((y - .14) / .64) ** 2 - x * x)) + .004]);
    for (let i = 1; i < points.length; i++) tube(g, ink, [points[i - 1], points[i]], .009, 2);
  }
  cyl(g, caps, [0, .083, 0], .021, .05);
  for (let j = 0; j < 12; j++) { const a = j * Math.PI / 6; tube(g, ink, [[Math.cos(a) * .012, .07, Math.sin(a) * .012], [Math.cos(a) * .018, .035, Math.sin(a) * .018], [Math.cos(a) * .025, 0, Math.sin(a) * .025]], .0024, 6); }
  return { group: g, origin: 'Bottom of tassel, +Y up, glyph faces +Z' };
}
function condenser() {
  const g = new THREE.Group(); g.name = 'Original exterior AC condenser';
  const paint = material('Weathered warm enamel', 0xaeb3a8, { roughness: .73, metalness: .18 });
  const metal = material('Galvanized grille', 0x687779, { metalness: .83, roughness: .46 });
  const dark = material('Fan and ventilation', 0x202d2d, { metalness: .32, roughness: .83 });
  const copper = material('Oxidized copper pipe', 0x806246, { metalness: .79, roughness: .56 });
  mesh(g, new RoundedBoxGeometry(.82, .6, .33, 3, .025), paint, [0, .36, 0]);
  for (const x of [-.28, .28]) { box(g, metal, [x, .065, 0], [.12, .09, .4]); box(g, paint, [x, .018, 0], [.16, .035, .43]); }
  box(g, metal, [0, .648, .005], [.78, .015, .3]); cyl(g, dark, [-.145, .36, .175], .229, .018, [Math.PI / 2, 0, 0]);
  const shape = new THREE.Shape(); shape.moveTo(.015, .015); shape.bezierCurveTo(.045, .07, .085, .18, .022, .203); shape.bezierCurveTo(-.055, .18, -.075, .085, -.012, .015); shape.closePath();
  const blade = new THREE.ExtrudeGeometry(shape, { depth: .009, bevelEnabled: true, bevelSize: .003, bevelThickness: .002, bevelSegments: 1, steps: 1, curveSegments: 8 });
  for (let j = 0; j < 7; j++) mesh(g, blade, metal, [-.145, .36, .19], [0, 0, j * Math.PI * 2 / 7]);
  for (const r of [.045, .073, .103, .133, .163, .193, .224]) ring(g, metal, [-.145, .36, .221], r, .0032, [0, 0, 0]);
  for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4; tube(g, metal, [[-.145, .36, .226], [-.145 + Math.cos(a) * .225, .36 + Math.sin(a) * .225, .226]], .0036, 2); }
  cyl(g, paint, [-.145, .36, .235], .043, .021, [Math.PI / 2, 0, 0]); box(g, dark, [.293, .36, .172], [.165, .46, .015]);
  for (let j = 0; j < 12; j++) box(g, paint, [.292, .152 + j * .038, .19], [.164, .012, .035], [-.25, 0, 0]);
  for (const x of [-.375, .375]) for (const y of [.1, .615]) cyl(g, metal, [x, y, .176], .009, .008, [Math.PI / 2, 0, 0]);
  for (const y of [.21, .33]) { tube(g, copper, [[.41, y, -.055], [.475, y, -.055], [.51, y - .035, -.08], [.51, .08, -.135], [.565, .045, -.16]], .011, 12); cyl(g, metal, [.432, y, -.055], .019, .026, [0, 0, Math.PI / 2]); }
  return { group: g, origin: 'Bottom of mounting feet, +Y up, fan faces +Z' };
}
function lamp() {
  const g = new THREE.Group(); g.name = 'Original twin opal wall lamp';
  const brass = material('Aged lamp brass', 0x8a7050, { metalness: .84, roughness: .45 });
  const iron = material('Blackened iron bracket', 0x283331, { metalness: .78, roughness: .57 });
  const glass = material('Frosted opal globe', 0xd2c5a4, { roughness: .38, emissive: 0xe2b775, emissiveIntensity: .28 });
  const glow = material('Incandescent diffuser', 0xffe4ac, { emissive: 0xffbe66, emissiveIntensity: 1.5 });
  mesh(g, new RoundedBoxGeometry(.18, .34, .065, 2, .018), iron, [0, 0, .0325]);
  tube(g, iron, [[0, .045, .065], [0, .05, .2], [0, .045, .43], [0, -.04, .57], [0, -.15, .6]], .023, 20);
  tube(g, brass, [[0, -.125, .075], [0, -.2, .28], [0, -.15, .58]], .011, 12); tube(g, iron, [[-.38, -.15, .6], [.38, -.15, .6]], .02, 2);
  for (const x of [-.37, .37]) {
    cyl(g, brass, [x, -.25, .6], .014, .2); lathe(g, brass, [[.012, 0], [.055, -.015], [.105, -.06], [.12, -.075], [.122, -.09]], [x, -.35, .6]);
    mesh(g, new THREE.SphereGeometry(.17, 24, 16), glass, [x, -.585, .6]); mesh(g, new THREE.SphereGeometry(.095, 16, 12), glow, [x, -.585, .6]);
    for (const y of [-.438, -.733]) ring(g, brass, [x, y, .6], .085, .007);
    for (let j = 0; j < 4; j++) { const a = j * Math.PI / 2; tube(g, brass, Array.from({ length: 13 }, (_, k) => { const t = .52 + (Math.PI - 1.04) * k / 12; return [x + Math.sin(t) * Math.cos(a) * .174, -.585 + Math.cos(t) * .174, .6 + Math.sin(t) * Math.sin(a) * .174]; }), .0045, 12); }
    lathe(g, brass, [[.085, 0], [.068, -.025], [.025, -.04], [.009, -.065]], [x, -.733, .6]);
  }
  return { group: g, origin: 'Centre of wall mounting plate, +Y up, bracket projects +Z' };
}
const records = [], exporter = new GLTFExporter(), loader = new GLTFLoader();
for (const [filename, asset] of [['paper-lantern.glb', lantern()], ['ac-condenser.glb', condenser()], ['twin-street-lamp.glb', lamp()]]) {
  const scene = new THREE.Scene(); scene.add(asset.group); asset.group.userData = { units: 'metres', origin: asset.origin, provenance: 'Original authored geometry; no external models or textures' }; scene.updateMatrixWorld(true);
  const binary = await exporter.parseAsync(scene, { binary: true }); const parsed = await loader.parseAsync(binary, '');
  const bounds = new THREE.Box3().setFromObject(parsed.scene), materials = new Set(); let meshes = 0, triangles = 0;
  parsed.scene.traverse(o => { if (!o.isMesh) return; meshes++; const p = o.geometry.getAttribute('position'); if (![...p.array].every(Number.isFinite)) throw new Error(`${filename}: invalid vertex`); triangles += (o.geometry.index?.count ?? p.count) / 3; for (const m of [o.material].flat()) materials.add(m.uuid); });
  if (!meshes || materials.size !== 4) throw new Error(`${filename}: unexpected mesh/material count`);
  await writeFile(new URL(filename, output), Buffer.from(binary));
  const record = { filename, bytes: binary.byteLength, meshes, triangles, materials: materials.size, dimensionsMetres: bounds.getSize(new THREE.Vector3()).toArray(), origin: asset.origin }; records.push(record); console.log(JSON.stringify(record));
}
await writeFile(new URL('metadata.json', output), JSON.stringify(records, null, 2) + '\n');
await writeFile(new URL('README.md', output), '# Original nightlife models\n\nOriginal metre-scale geometry authored for Shinmachi. No downloaded models, fonts or textures. GLB exports are Blender-compatible. Rebuild with `node tools/build-nightlife-assets.mjs`; the exporter reloads every model and checks finite vertices, bounds and material counts. See [metadata.json](./metadata.json) for measured dimensions and origin conventions.\n');
console.log(`Validated assets written to ${fileURLToPath(output)}`);
