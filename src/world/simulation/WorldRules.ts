import {neighborhoodAt} from '../Neighborhoods.ts';

export type Point = { x: number; z: number };
export type Axis = 'NS' | 'EW';
export type Approach = 'N' | 'S' | 'E' | 'W';
export type Light = 'red' | 'amber' | 'green';
export type Business = 'restaurant' | 'cafe' | 'retail' | 'convenience' | 'residential' | 'office';
export function districtZone(p: Point): 'commercial' | 'alley' | 'station' | 'residential' {
  const id=neighborhoodAt(p).id;return id==='nightlife'?'alley':id;
}
export const BUSINESSES: Business[] = ['restaurant', 'cafe', 'retail', 'convenience', 'residential', 'office'];
export function signBusiness(index: number): Business {
  if ([0, 1, 4, 5, 9, 14, 20, 21, 24, 25, 26, 28, 30].includes(index)) return 'restaurant';
  if ([2, 10, 29].includes(index)) return 'cafe';
  if ([3, 12, 16, 17, 18, 19, 23, 31].includes(index)) return 'convenience';
  if (index === 15) return 'office';
  return 'retail';
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export const wrapHour = (hour: number): number => ((hour % 24) + 24) % 24;
export const railServiceOpen = (hour: number): boolean => wrapHour(hour) >= 5 || wrapHour(hour) < 1;
export function businessOpen(kind: Business, hour: number): boolean {
  const h = wrapHour(hour);
  if (kind === 'convenience' || kind === 'residential') return true;
  if (kind === 'restaurant') return h >= 11 || h < 1;
  if (kind === 'cafe') return h >= 7 && h < 21;
  if (kind === 'office') return h >= 7 && h < 20;
  return h >= 10 && h < 22;
}
export function dayState(hour: number) {
  const h = wrapHour(hour), elevation = Math.sin((h - 6) / 12 * Math.PI);
  const smooth = (x: number, a: number, b: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const daylight = smooth(elevation, -.12, .28);
  const golden = (1 - smooth(Math.abs(elevation), .03, .45)) * daylight;
  return { hour: h, elevation, daylight, night: 1 - daylight, golden };
}
export function populationTarget(hour: number) {
  const h = wrapHour(hour), rush = Math.exp(-(((h - 8) / 1.9) ** 2)) + Math.exp(-(((h - 18.5) / 2.6) ** 2));
  const awake = .5 + .5 * Math.tanh((h - 6) * 1.2), bedtime = 1 - .65 / (1 + Math.exp(-(h - 23) * 3));
  return { pedestrians: Math.round(12 + 27 * awake * bedtime + 28 * rush), vehicles: Math.round(3 + 5 * awake * bedtime + 6 * rush) };
}

export const CROSSINGS = [
  { id: 'north', a: { x: -4.55, z: 2.6 }, b: { x: 4.55, z: 2.6 } },
  { id: 'south', a: { x: -4.55, z: 21.4 }, b: { x: 4.55, z: 21.4 } },
  { id: 'west', a: { x: -7.8, z: 6 }, b: { x: -7.8, z: 18 } },
  { id: 'east', a: { x: 7.8, z: 6 }, b: { x: 7.8, z: 18 } },
] as const;

export interface SignalState { ns: Light; ew: Light; walk: boolean; clearance: boolean; phase: number }
/** 22s NS, 3s amber, 3s clearance, 18s EW, amber/clearance, 11s walk, 14s foot clearance. */
export function signalState(clock: number, crossingOccupied = false, nsOccupied = false, ewOccupied = false): SignalState {
  const p = ((clock % 80) + 80) % 80;
  let ns: Light = p < 22 ? 'green' : p < 25 ? 'amber' : 'red';
  let ew: Light = p >= 28 && p < 46 ? 'green' : p >= 46 && p < 49 ? 'amber' : 'red';
  if (crossingOccupied || ewOccupied) ns = 'red';
  if (crossingOccupied || nsOccupied) ew = 'red';
  return { ns, ew, walk: p >= 52 && p < 63 && !nsOccupied && !ewOccupied, clearance: p >= 63 && p < 77, phase: p };
}

export interface LaneRoute { entry: Approach; exit: Approach; axis: Axis; turn: boolean; points: Point[]; distances: number[]; length: number; stopLine: number }
const ENTRY: Record<Approach, Point> = { N: { x: 1.8, z: -70 }, S: { x: -1.8, z: 70 }, E: { x: 70, z: 14.2 }, W: { x: -70, z: 9.8 } };
const EXIT: Record<Approach, Point> = { N: { x: -1.8, z: -70 }, S: { x: 1.8, z: 70 }, E: { x: 70, z: 9.8 }, W: { x: -70, z: 14.2 } };
const STRAIGHT: Record<Approach, Approach> = { N: 'S', S: 'N', E: 'W', W: 'E' };
const LEFT: Record<Approach, Approach> = { N: 'E', S: 'W', E: 'S', W: 'N' };
const START: Record<Approach, Point> = { N: { x: 1.8, z: 5.8 }, S: { x: -1.8, z: 18.2 }, E: { x: 5.8, z: 14.2 }, W: { x: -5.8, z: 9.8 } };
const END: Record<Approach, Point> = { N: { x: 5.8, z: 9.8 }, S: { x: -5.8, z: 14.2 }, E: { x: 1.8, z: 18.2 }, W: { x: -1.8, z: 5.8 } };
export function laneRoute(entry: Approach, turn: boolean): LaneRoute {
  const exit = (turn ? LEFT : STRAIGHT)[entry], points: Point[] = [{ ...ENTRY[entry] }];
  if (turn) {
    const a = START[entry], b = END[entry], control = entry === 'N' || entry === 'S' ? { x: a.x, z: b.z } : { x: b.x, z: a.z };
    points.push(a);
    for (let i = 1; i <= 20; i++) { const t = i / 20, u = 1 - t; points.push({ x: u * u * a.x + 2 * u * t * control.x + t * t * b.x, z: u * u * a.z + 2 * u * t * control.z + t * t * b.z }); }
  }
  points.push({ ...EXIT[exit] });
  const distances = [0]; for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  return { entry, exit, axis: entry === 'N' || entry === 'S' ? 'NS' : 'EW', turn, points, distances, length: distances.at(-1)!, stopLine: entry === 'N' ? 69.7 : entry === 'S' ? 45.9 : 59.8 };
}
export function sampleLane(route: LaneRoute, distance: number): Point & { yaw: number } {
  const s = Math.max(0, Math.min(route.length, distance));
  let i = 1; while (i < route.distances.length - 1 && route.distances[i] < s) i++;
  const a = route.points[i - 1], b = route.points[i], t = (s - route.distances[i - 1]) / (route.distances[i] - route.distances[i - 1]);
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, yaw: Math.atan2(b.x - a.x, b.z - a.z) };
}
