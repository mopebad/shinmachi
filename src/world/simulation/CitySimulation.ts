import type { Bounds, Doorway } from '../types.ts';
import { Navigation, pointBlocked } from './Navigation.ts';
import { businessOpen, laneRoute, populationTarget, sampleLane, seededRandom, signalState } from './WorldRules.ts';
import type { Approach, LaneRoute, Point, SignalState } from './WorldRules.ts';
import type { StationSpatial } from '../generation/StationLayout.ts';
import { StationTraffic } from './StationTraffic.ts';
import type { StationVisit } from './StationTraffic.ts';
import { pedestrianSurfaceHeight } from './CharacterPose.ts';

export const VEHICLE_PROFILES = {
  kei: { length: 3.25, width: 1.46, height: 1.65 },
  compact: { length: 3.9, width: 1.64, height: 1.45 },
  taxi: { length: 4.5, width: 1.7, height: 1.55 },
  van: { length: 4.2, width: 1.65, height: 2 },
  truck: { length: 4.8, width: 1.75, height: 2.25 },
} as const;
export type VehicleKind = keyof typeof VEHICLE_PROFILES;
export interface Vehicle extends Point { id: number; route: LaneRoute; s: number; speed: number; yaw: number; kind: VehicleKind; color: number; committed: boolean; braking: boolean; active: boolean }
export interface Pedestrian extends Point { y: number; id: number; node: number; path: number[]; next: number; speed: number; yaw: number; phase: number; moving: boolean; crossing: string | null; wait: number; active: boolean; retiring: boolean; shirt: number; style: number; scale: number; station?: StationVisit }
export interface SimulationConfig { seed?: number; bounds?: Bounds[]; doors?: Doorway[]; station?: StationSpatial }
const APPROACHES: Approach[] = ['N', 'S', 'E', 'W'];
const COLORS = [0xe5e1d5, 0x40555e, 0x9caaa3, 0x783b39, 0xc7b993, 0x31434f];
type ListenerPosition = Point & { y?: number };

/** Browser-independent deterministic world state; meshes and audio read this same snapshot. */
export class CitySimulation {
  readonly navigation: Navigation;
  readonly stationTraffic?: StationTraffic;
  readonly pedestrians: Pedestrian[] = [];
  readonly vehicles: Vehicle[] = [];
  clock = 8;
  hour = 17.25;
  signals: SignalState = signalState(8);
  trainX = -40;
  private readonly rng: () => number;
  private readonly bounds: Bounds[];
  private readonly routes = new Map<string, LaneRoute>();
  private readonly reachable: number[];
  private accumulator = 0; private spawnTimer = 0; private sequence = 0;
  constructor(config: SimulationConfig = {}) {
    this.rng = seededRandom(config.seed ?? 8412); this.bounds = config.bounds ?? [];
    this.navigation = new Navigation(this.bounds, config.doors ?? [],config.station);
    if(this.navigation.station)this.stationTraffic=new StationTraffic(this.navigation,config.seed??8412);
    this.reachable = this.navigation.nodes.filter(n => this.navigation.path(0, n.id).length > 0).map(n => n.id);
    for (const entry of APPROACHES) for (const turn of [false, true]) this.routes.set(`${entry}:${turn}`, laneRoute(entry, turn));
    for (let i = 0; i < 46; i++) this.spawnPedestrian(true);
    for (let i = 0; i < 12; i++) this.spawnVehicle(APPROACHES[i % 4], 7 + Math.floor(i / 4) * 15);
  }
  get stats() { return { pedestrians: this.pedestrians.filter(p => p.active).length, vehicles: this.vehicles.filter(c => c.active).length }; }
  update(dt: number, hour: number, listener?: ListenerPosition): void {
    this.hour = hour; this.accumulator += Math.max(0, Math.min(.25, dt));
    while (this.accumulator >= 1 / 30) { this.step(1 / 30, listener); this.accumulator -= 1 / 30; }
    this.trainX = ((this.clock * 9) % 330) - 130;
  }
  private occupied(axis: 'NS' | 'EW'): boolean {
    return this.vehicles.some(c => c.active && c.committed && c.route.axis === axis && c.x > -13 && c.x < 13 && c.z > -4 && c.z < 28);
  }
  private step(dt: number, listener?: ListenerPosition): void {
    this.clock += dt;
    this.signals = signalState(this.clock, this.pedestrians.some(p => p.active && p.crossing !== null), this.occupied('NS'), this.occupied('EW'));
    this.moveVehicles(dt); this.movePedestrians(dt, listener);
    for(const p of this.pedestrians)if(p.active&&(!p.station||p.station.state==='approaching'))p.y=pedestrianSurfaceHeight(p.x,p.z);
    this.stationTraffic?.observe(this.pedestrians);
    this.spawnTimer += dt;
    if (this.spawnTimer > 1.15) {
      this.spawnTimer = 0;
      const target = populationTarget(this.hour), stats = this.stats;
      if (stats.pedestrians < target.pedestrians) this.spawnPedestrian(false);
      if (stats.vehicles < target.vehicles) this.spawnVehicle(APPROACHES[this.sequence++ % 4], 0);
      const excess = stats.pedestrians - target.pedestrians;
      if (excess > this.pedestrians.filter(p => p.active && p.retiring).length) {
        const p = this.pedestrians.find(p => p.active && !p.retiring && !p.crossing && !p.station);
        if (p) p.retiring = true;
      }
    }
  }
  private spawnVehicle(entry: Approach, distance: number): void {
    if (this.vehicles.some(c => c.active && c.route.entry === entry && Math.abs(c.s - distance) < 11)) return;
    const slot = this.vehicles.find(c => !c.active), kind = (['kei', 'compact', 'taxi', 'van', 'truck'] as VehicleKind[])[Math.floor(this.rng() * 5)];
    const route = this.routes.get(`${entry}:${this.rng() < .3}`)!, p = sampleLane(route, distance);
    const c: Vehicle = { id: slot?.id ?? this.vehicles.length, ...p, route, s: distance, speed: 0, kind, color: kind === 'taxi' ? 0xb7c3af : COLORS[Math.floor(this.rng() * COLORS.length)], committed: false, braking: false, active: true };
    if (slot) Object.assign(slot, c); else if (this.vehicles.length < 20) this.vehicles.push(c);
  }
  private moveVehicles(dt: number): void {
    for (const c of this.vehicles) {
      if (!c.active) continue;
      const profile = VEHICLE_PROFILES[c.kind], stop = c.route.stopLine - profile.length / 2 - .35;
      const signal = c.route.axis === 'NS' ? this.signals.ns : this.signals.ew;
      let allowance = Infinity, desired = c.route.turn && c.s > c.route.stopLine - 4 && c.s < c.route.stopLine + 24 ? 3.6 : 6.1;
      if (!c.committed && signal !== 'green') allowance = Math.max(0, stop - c.s);
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
      for (const other of this.vehicles) {
        if (other === c || !other.active) continue;
        if (other.route.entry === c.route.entry && c.s < c.route.stopLine + 8 && other.s > c.s && other.s < c.route.stopLine + 8) {
          allowance = Math.min(allowance, other.s - c.s - (profile.length + VEHICLE_PROFILES[other.kind].length) / 2 - 1.15);
        } else {
          const dx = other.x - c.x, dz = other.z - c.z, ahead = dx * fx + dz * fz, lateral = Math.abs(dx * fz - dz * fx);
          if (ahead > 0 && ahead < 17 && lateral < (profile.width + VEHICLE_PROFILES[other.kind].width) / 2 + .1 && Math.cos(other.yaw - c.yaw) > .3) allowance = Math.min(allowance, ahead - (profile.length + VEHICLE_PROFILES[other.kind].length) / 2 - 1.15);
        }
      }
      desired = Math.min(desired, Math.sqrt(Math.max(0, allowance) * 4.4));
      c.braking = desired + .15 < c.speed || desired < .1;
      const acceleration = c.speed > desired ? 3.2 : 1.35;
      c.speed += Math.sign(desired - c.speed) * Math.min(Math.abs(desired - c.speed), acceleration * dt);
      const move = Math.min(c.speed * dt, Math.max(0, allowance)); c.s += move;
      if (!c.committed && c.s > stop + .001 && signal === 'green') c.committed = true;
      const p = sampleLane(c.route, c.s); c.x = p.x; c.z = p.z; c.yaw = p.yaw;
      if (c.s >= c.route.length - .05) c.active = false;
    }
  }
  private destination(p: Pedestrian,stationVisit=true): void {
    if(stationVisit&&this.stationTraffic?.choose(p,this.clock,this.hour))return;
    const candidates = this.reachable.filter(id => {
      const n = this.navigation.nodes[id];
      if(n.station||this.stationTraffic&&n.area==='station')return false;
      if (id === p.node || (n.door && !businessOpen(n.door.business ?? 'retail', this.hour))) return false;
      return !p.retiring || Math.abs(n.x) > 50 || n.z > 55 || n.area === 'station';
    });
    for (let attempt = 0; attempt < 10; attempt++) {
      const to = candidates[Math.floor(this.rng() * candidates.length)];
      if (to === undefined) break;
      const path = this.navigation.path(p.node, to); if (path.length > 1) { p.path = path; p.next = 1; return; }
    }
    p.wait = 1;
  }
  private spawnPedestrian(distributed: boolean): void {
    const candidates = this.reachable.filter(id => {
      const n = this.navigation.nodes[id]; return !n.door && !n.station && !(this.stationTraffic&&n.area==='station') && (distributed || Math.abs(n.x) > 50 || n.z > 55 || n.area === 'station');
    });
    for (let attempt = 0; attempt < 20; attempt++) {
      const node = this.navigation.nodes[candidates[Math.floor(this.rng() * candidates.length)]]; if (!node) return;
      const slot = this.pedestrians.find(p => !p.active), id = slot?.id ?? this.pedestrians.length;
      const p: Pedestrian = { id, x: node.x, y:pedestrianSurfaceHeight(node.x,node.z), z: node.z, node: node.id, path: [], next: 1, speed: 1.02 + this.rng() * .33, yaw: 0, phase: this.rng() * 6, crossing: null, moving: false, wait: 0, active: true, retiring: false, shirt: [0x35494e, 0xc6bbab, 0x47525a, 0x6a636d, 0x93736c, 0x2b5360, 0x8e9b86][id % 7], style: id % 5, scale: .91 + this.rng() * .13 };
      this.destination(p,false);
      const next = this.navigation.nodes[p.path[p.next]], edge = this.navigation.edges.get(node.id)?.find(e => e.to === next?.id);
      if (distributed && next && !edge?.crossing) { const t = this.rng(); p.x += (next.x - p.x) * t; p.z += (next.z - p.z) * t; p.y=pedestrianSurfaceHeight(p.x,p.z); }
      if (pointBlocked(p, this.bounds) || this.pedestrians.some(other => other.active && Math.hypot(other.x - p.x, other.z - p.z) < .7)) continue;
      if (slot) Object.assign(slot, p); else if (this.pedestrians.length < 88) this.pedestrians.push(p); return;
    }
  }
  private movePedestrians(dt: number, listener?: ListenerPosition): void {
    for (const p of this.pedestrians) {
      if (!p.active) continue; p.moving = false;
      if(this.stationTraffic?.move(p,dt,this.clock,this.pedestrians,this.hour,listener))continue;
      if (p.wait > 0) { p.wait -= dt; continue; }
      const goal = this.navigation.nodes[p.path[p.next]];
      if (!goal) { this.destination(p); continue; }
      if(p.station?.state==='approaching'&&goal.id===this.navigation.station?.anchor&&Math.hypot(goal.x-p.x,goal.z-p.z)<3.5&&!this.stationTraffic!.admitApproach(p,dt))continue;
      const source = this.navigation.nodes[p.node];
      const edge = this.navigation.edges.get(p.node)?.find(e => e.to === goal.id);
      const length = Math.hypot(goal.x - source.x, goal.z - source.z), routeX = (goal.x - source.x) / length, routeZ = (goal.z - source.z) / length;
      // Opposite flows have distinct lanes. At red, wait behind the curb in the entry
      // lane rather than standing on the exit lane of pedestrians still clearing.
      if (edge?.crossing && !p.crossing && !this.signals.walk) {
        const rank = this.pedestrians.filter(q => q.active && q.id < p.id && q.node === p.node && q.path[q.next] === goal.id && !q.crossing).length % 4;
        const holding = { x: source.x - routeX * .25 + routeZ * (.34 + rank * .52), z: source.z - routeZ * .25 - routeX * (.34 + rank * .52) };
        const d = Math.hypot(holding.x - p.x, holding.z - p.z), step = Math.min(d, dt * .65);
        if (d > .04) { const next = { x: p.x + (holding.x - p.x) / d * step, z: p.z + (holding.z - p.z) / d * step }; if (!pointBlocked(next, this.bounds)) { p.x = next.x; p.z = next.z; } }
        p.yaw = Math.atan2(routeX, routeZ); continue;
      }
      if (edge?.crossing && !p.crossing) {
        const entry = { x: source.x - routeX * .1 + routeZ * .34, z: source.z - routeZ * .1 - routeX * .34 };
        const d = Math.hypot(entry.x - p.x, entry.z - p.z);
        // First reach the stripe entrance on the pavement; never cut diagonally from a queue.
        if (d > .09) {
          const step = Math.min(d, p.speed * dt), next = { x: p.x + (entry.x - p.x) / d * step, z: p.z + (entry.z - p.z) / d * step };
          if (!pointBlocked(next, this.bounds)) { p.x = next.x; p.z = next.z; p.moving = true; p.phase += step * 7; }
          p.yaw = Math.atan2(routeX, routeZ); continue;
        }
        if (this.pedestrians.some(q => q !== p && q.active && q.crossing === edge.crossing && q.node === p.node && (q.x - p.x) * routeX + (q.z - p.z) * routeZ < .85)) continue;
      }
      let lane = edge?.crossing ? .34 : .26;
      if(p.station?.state==='approaching'&&goal.id===this.navigation.station?.anchor)lane=0;
      let target = { x: goal.x + routeZ * lane, z: goal.z - routeX * lane };
      if (pointBlocked(target, this.bounds)) { lane = .1; target = { x: goal.x + routeZ * lane, z: goal.z - routeX * lane }; }
      const dx = target.x - p.x, dz = target.z - p.z, distance = Math.hypot(dx, dz);
      if (distance < (p.station?.state==='approaching'&&goal.id===this.navigation.station?.anchor?1e-6:.09)) {
        p.x = target.x; p.z = target.z; p.node = goal.id; p.next++; p.crossing = null;
        if (p.next >= p.path.length) {
          if(p.station?.state==='approaching'){this.stationTraffic!.enter(p,this.clock);continue;}
          if (p.retiring) { p.active = false; continue; }
          p.wait = goal.door ? 4 + this.rng() * 8 : goal.area === 'station' ? 2 + this.rng() * 5 : this.rng() * 1.2;
          this.destination(p);
        }
        continue;
      }
      const fx = dx / distance, fz = dz / distance;
      let move = Math.min(distance, p.speed * dt), steer = 0;
      // Local separation and keep-left passing. The correction stays inside the pavement corridor.
      for (const other of this.pedestrians) {
        if (other === p || !other.active) continue;
        if(Math.abs(other.y-p.y)>1.5)continue;
        if (edge?.crossing) {
          if (other.crossing === edge.crossing && other.node === p.node) {
            const ox = other.x - p.x, oz = other.z - p.z, ahead = ox * routeX + oz * routeZ, lateral = Math.abs(ox * routeZ - oz * routeX);
            if (ahead > .12 && ahead < .9 && lateral < .28) move = Math.min(move, Math.max(0, ahead - .55));
          }
          continue;
        }
        const ox = other.x - p.x, oz = other.z - p.z, ahead = ox * fx + oz * fz, lateral = ox * fz - oz * fx;
        if (ahead > .12 && ahead < .9 && Math.abs(lateral) < .3) {
          if (Math.cos(other.yaw - Math.atan2(fx, fz)) > .3) move = Math.min(move, Math.max(0, ahead - .55));
          else steer = lateral > 0 ? -.35 : .35;
        }
      }
      if (listener && (listener.y===undefined||Math.abs(listener.y-p.y-.9)<1.6)) {
        const ox = listener.x - p.x, oz = listener.z - p.z;
        const ahead = ox * fx + oz * fz, lateral = ox * fz - oz * fx;
        if (ahead > 0 && Math.abs(lateral) < .6 && Math.hypot(ox, oz) < 1.2) { steer = lateral > 0 ? -.8 : .8; move = Math.min(move, Math.max(0, ahead - .72)); }
      }
      let x = p.x + fx * move + fz * steer * dt, z = p.z + fz * move - fx * steer * dt;
      if (pointBlocked({ x, z }, this.bounds) && steer) { x = p.x + fx * move - fz * steer * dt; z = p.z + fz * move + fx * steer * dt; }
      if (pointBlocked({ x, z }, this.bounds)) {
        // Recover toward the validated corridor when an avoidance offset meets a prop.
        const t = Math.max(0, Math.min(length, (p.x - source.x) * routeX + (p.z - source.z) * routeZ));
        const cx = source.x + routeX * t - p.x, cz = source.z + routeZ * t - p.z, distance = Math.hypot(cx, cz);
        if (distance > .001) { const step = Math.min(distance, p.speed * dt); x = p.x + cx / distance * step; z = p.z + cz / distance * step; }
      }
      if (pointBlocked({ x, z }, this.bounds)) continue;
      if (edge?.crossing && move > .0001) p.crossing = edge.crossing;
      p.x = x; p.z = z; p.yaw = Math.atan2(fx, fz); p.phase += move * 7; p.moving = move > .0001;
      if(p.station?.state==='approaching'&&p.moving)p.station.blockedFor=0;
    }
  }
}
