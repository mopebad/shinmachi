import type { Bounds, Doorway } from '../types.ts';
import { CROSSINGS } from './WorldRules.ts';
import type { Point } from './WorldRules.ts';

export interface NavNode extends Point { id: number; area: 'commercial' | 'alley' | 'station' | 'residential'; door?: Doorway }
export interface NavEdge { to: number; crossing?: string }
export const pointBlocked = (p: Point, bounds: Bounds[], radius = .19) => bounds.some(b => p.x > b.minX - radius && p.x < b.maxX + radius && p.z > b.minZ - radius && p.z < b.maxZ + radius);
export function segmentClear(a: Point, b: Point, bounds: Bounds[], radius = .19): boolean {
  const steps = Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) * 6);
  for (let i = 0; i <= steps; i++) { const t = steps ? i / steps : 0; if (pointBlocked({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, bounds, radius)) return false; }
  return true;
}
/** Only authored safe pavement corridors and explicitly tagged zebra-crossing edges exist. */
export class Navigation {
  readonly nodes: NavNode[] = [];
  readonly edges = new Map<number, NavEdge[]>();
  constructor(bounds: Bounds[], doors: Doorway[]) {
    const add = (x: number, z: number, area: NavNode['area'] = 'commercial', door?: Doorway) => { const id = this.nodes.length; this.nodes.push({ x, z, id, area, door }); this.edges.set(id, []); return id; };
    const link = (a: number, b: number, crossing?: string) => {
      if (!segmentClear(this.nodes[a], this.nodes[b], bounds)) return;
      this.edges.get(a)!.push({ to: b, crossing }); this.edges.get(b)!.push({ to: a, crossing });
    };
    const ids = new Map<string, number>();
    for (const side of [-1, 1]) {
      const x = side * 4.55, zs = [-49, -46, -37, -25, -12, 2.6, 21.4, 31, 44, 59];
      zs.forEach(z => ids.set(`${side}:${z}`, add(x, z)));
      for (let i = 1; i < zs.length; i++) if (zs[i] !== 21.4) link(ids.get(`${side}:${zs[i - 1]}`)!, ids.get(`${side}:${zs[i]}`)!);
      const nCorner = add(x, 6), sCorner = add(x, 18), nCross = add(side * 7.8, 6), sCross = add(side * 7.8, 18);
      link(ids.get(`${side}:2.6`)!, nCorner); link(nCorner, nCross); link(ids.get(`${side}:21.4`)!, sCorner); link(sCorner, sCross); link(nCross, sCross, side < 0 ? 'west' : 'east');
      for (const [node, z] of [[nCross, 6], [sCross, 18]]) {
        let previous = node;
        for (const px of [20, 30, 44, 58]) { const next = add(side * px, z); link(previous, next); previous = next; }
      }
      const alley = add(side * 18, -25, 'alley'); link(ids.get(`${side}:-25`)!, alley);
      if (side > 0) {
        const station = add(17, -46, 'station'), entrance = add(19, -48, 'station'); link(ids.get('1:-46')!, station); link(station, entrance);
        const residential = [-46, -25, -10, 6, 18, 40, 54].map(z => add(28.15, z, 'residential'));
        link(alley, residential[1]); link(station, residential[0]);
        for (let i = 1; i < residential.length; i++) if (i !== 4) link(residential[i - 1], residential[i]);
        // The avenue must be crossed at its zebra, never diagonally through traffic.
        const north = this.nodes.find(n => n.x === 30 && n.z === 6)!, south = this.nodes.find(n => n.x === 30 && n.z === 18)!;
        link(residential[3], north.id); link(residential[4], south.id);
      }
    }
    link(ids.get('-1:2.6')!, ids.get('1:2.6')!, CROSSINGS[0].id);
    link(ids.get('-1:21.4')!, ids.get('1:21.4')!, CROSSINGS[1].id);
    for (const door of doors) {
      // Shop visits stop at a clear threshold; no agent is allowed to cut through masonry.
      const threshold = { x: door.x, z: door.z };
      if (pointBlocked(threshold, bounds, .16)) continue;
      const sameSide = this.nodes.filter(n => Math.sign(n.x) === Math.sign(door.sidewalkX) && Math.abs(n.x) < 5 && ((n.z < 6 && door.z < 6) || (n.z > 20 && door.z > 20)));
      const nearest = sameSide.sort((a, b) => Math.abs(a.z - door.z) - Math.abs(b.z - door.z))[0]; if (!nearest) continue;
      const approach = add(door.sidewalkX, door.z), destination = add(door.x, door.z, 'commercial', door);
      link(nearest.id, approach); link(approach, destination);
    }
  }
  path(from: number, to: number): number[] {
    const queue = [from], parent = new Map<number, number>([[from, -1]]);
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i]; if (current === to) break;
      for (const edge of this.edges.get(current) ?? []) if (!parent.has(edge.to)) { parent.set(edge.to, current); queue.push(edge.to); }
    }
    if (!parent.has(to)) return [];
    const result = [to]; while (result[0] !== from) result.unshift(parent.get(result[0])!); return result;
  }
}
