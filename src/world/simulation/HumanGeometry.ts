import { BufferGeometry, Float32BufferAttribute } from 'three';

type Ring = readonly [y: number, radiusX: number, radiusZ: number, centerZ?: number];
type Warp = (point: [number, number, number], angle: number) => [number, number, number];

function finish(p: number[], uv: number[], indices: number[], rows: number, segments: number): BufferGeometry {
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(p, 3)); g.setAttribute('uv', new Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals();
  const n = g.getAttribute('normal');
  for (let row = 0; row < rows; row++) { const a = row * (segments + 1), b = a + segments, x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1; n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l); }
  g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}
function loft(rings: readonly Ring[], caps = true, warp?: Warp, segments = 24): BufferGeometry {
  const p: number[] = [], uv: number[] = [], indices: number[] = [];
  rings.forEach(([y, rx, rz, cz = 0], row) => {
    for (let s = 0; s <= segments; s++) { const a = s / segments * Math.PI * 2; let v: [number, number, number] = [Math.sin(a) * rx, y, Math.cos(a) * rz + cz]; if (warp) v = warp(v, a); p.push(...v); uv.push(s / segments, row / (rings.length - 1)); }
  });
  for (let row = 0; row < rings.length - 1; row++) for (let s = 0; s < segments; s++) { const a = row * (segments + 1) + s, c = a + segments + 1; indices.push(a, a + 1, c, a + 1, c + 1, c); }
  if (caps) for (const row of [0, rings.length - 1]) {
    const [y, rx, rz, cz = 0] = rings[row], center = p.length / 3; p.push(0, y, cz); uv.push(.5, .5); const rim = p.length / 3;
    for (let s = 0; s <= segments; s++) { const source = (row * (segments + 1) + s) * 3, x = p[source], z = p[source + 2]; p.push(x, p[source + 1], z); uv.push(.5 + x / (rx * 2), .5 + (z - cz) / (rz * 2)); }
    for (let s = 0; s < segments; s++) indices.push(center, rim + s + (row === 0 ? 1 : 0), rim + s + (row === 0 ? 0 : 1));
  }
  return finish(p, uv, indices, rings.length, segments);
}
const HEAD: readonly Ring[] = [
  [-.115, .028, .040, .009], [-.100, .043, .056, .009], [-.078, .061, .064, .005], [-.064, .069, .071], [-.045, .074, .077, -.004], [-.018, .079, .081, -.007], [-.005, .080, .082, -.008], [.032, .079, .085, -.005], [.065, .073, .083, -.004], [.090, .056, .066, -.004], [.108, .032, .039, -.004], [.115, .004, .007, -.004],
];
function scalpAt(y: number): number[] {
  for (let i = 1; i < HEAD.length; i++) if (y <= HEAD[i][0]) { const a = HEAD[i - 1], b = HEAD[i], t = Math.max(0, Math.min(1, (y - a[0]) / (b[0] - a[0]))); return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, (a[3] ?? 0) + ((b[3] ?? 0) - (a[3] ?? 0)) * t]; } return [.004, .007, -.004];
}
function hair(): BufferGeometry {
  const p: number[] = [], uv: number[] = [], indices: number[] = [], segments = 32, rows = 11;
  for (let row = 0; row < rows; row++) for (let s = 0; s <= segments; s++) { const a = s / segments * Math.PI * 2, line = .014 + Math.cos(a) * .027 + Math.sin(a * 3) * .005 + Math.sin(a * 7) * .0025, y = line + (.119 - line) * Math.sin(row / (rows - 1) * Math.PI / 2), [rx, rz, cz] = scalpAt(y); p.push(Math.sin(a) * (rx + .008), y + .003, Math.cos(a) * (rz + .009) + cz); uv.push(s / segments, row / rows); }
  for (let row = 0; row < rows - 1; row++) for (let s = 0; s < segments; s++) { const a = row * (segments + 1) + s, c = a + segments + 1; indices.push(a, a + 1, c, a + 1, c + 1, c); }
  const top = p.length / 3; p.push(0, .126, -.004); uv.push(.5, 1); const last = (rows - 1) * (segments + 1); for (let s = 0; s < segments; s++) indices.push(top, last + s, last + s + 1);
  return finish(p, uv, indices, rows, segments);
}

/** Actual metres. Limbs run along Y, proximal end +Y. Face/toes point +Z. */
export function createHumanGeometry() {
  return {
    torso: loft([[-.28, .165, .105], [-.205, .156, .102], [-.13, .145, .095], [.015, .172, .105], [.095, .19, .113], [.185, .21, .103], [.225, .183, .092], [.28, .069, .068]]),
    pelvis: loft([[-.095, .143, .09], [-.06, .162, .10], [.045, .158, .106], [.095, .148, .102]]),
    head: loft(HEAD, true, ([x, y, z], a) => { const f = Math.max(0, Math.cos(a)), narrow = Math.exp(-Math.pow(Math.sin(a) / .23, 2)), nose = .021 * Math.max(0, 1 - Math.abs(y + .018) / .036) * narrow * Math.pow(f, 12), lips = .004 * Math.max(0, 1 - Math.abs(y + .064) / .014) * narrow * Math.pow(f, 8); return [x, y, z + nose + lips]; }, 48),
    hair: hair(),
    neck: loft([[-.0375, .0475, .045], [.0375, .045, .043]]),
    upperLeg: loft([[-.17, .055, .057], [-.11, .061, .066], [.035, .075, .082], [.125, .080, .087], [.17, .078, .083]]),
    lowerLeg: loft([[-.17, .04, .043], [-.1, .043, .05], [.015, .057, .065], [.105, .055, .06], [.17, .0525, .055]]),
    upperArm: loft([[-.125, .04, .041], [-.05, .045, .046], [.07, .0525, .055], [.125, .05, .052]]),
    forearm: loft([[-.115, .0275, .028], [-.06, .031, .032], [.045, .04, .041], [.115, .0375, .039]]),
    hand: loft([[-.075, .02, .012], [-.05, .032, .018], [.005, .036, .02], [.065, .026, .018], [.075, .026, .018]]),
    shoe: loft([[-.045, .046, .131, .04], [-.035, .05, .135, .04], [.005, .047, .124, .035], [.038, .036, .073, -.016], [.045, .034, .065, -.017]]),
    skirt: loft([[-.21, .235, .155], [-.15, .219, .145], [.015, .179, .12], [.16, .153, .105], [.21, .148, .101]], false, ([x, y, z], a) => { const f = 1 + .035 * (.21 - y) / .42 * Math.cos(a * 8); return [x * f, y, z * f]; }),
  };
}
