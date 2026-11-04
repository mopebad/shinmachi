import type { Bounds, Doorway } from '../types.ts';
import { Navigation, pointBlocked } from './Navigation.ts';
import { businessOpen, laneRoute, populationTarget, sampleLane, seededRandom, signalState, wrapHour,railServiceOpen } from './WorldRules.ts';
import type { Approach, LaneRoute, Point, SignalState } from './WorldRules.ts';
import type { StationSpatial } from '../generation/StationLayout.ts';
import { StationTraffic } from './StationTraffic.ts';
import type { StationVisit } from './StationTraffic.ts';
import { pedestrianSurfaceHeight } from './CharacterPose.ts';
import { TrainOperation } from './TrainOperation.ts';
import type { TrainConfig } from './TrainOperation.ts';
import { RailPassengers } from './RailPassengers.ts';
import type { RailJourney, RailPassengerConfig } from './RailPassengers.ts';
import { VEHICLE_PROFILES, selectVehicle } from './VehicleCatalog.ts';
import type { VehicleKind } from './VehicleCatalog.ts';
import { pedestrianIdentity,driverIdentity } from './AgentIdentity.ts';
import type { PedestrianIdentity,DriverIdentity } from './AgentIdentity.ts';
import { locomotion,beginLocomotion,finishLocomotion,walkingDistance } from './Locomotion.ts';
import type { Locomotion } from './Locomotion.ts';
import {vehicleLights,safeDrivingSpeed,updateVehicleLights} from './Driving.ts';
import type {VehicleLights} from './Driving.ts';
import {StreetLife} from './StreetLife.ts';
import type {StreetActivity,Companion} from './StreetLife.ts';
import {businessAffinity} from './AgentIdentity.ts';
export { VEHICLE_PROFILES } from './VehicleCatalog.ts';
export type { VehicleKind } from './VehicleCatalog.ts';

export interface Vehicle extends Point { id: number; spawn: number; variant: number; driver:DriverIdentity; acceleration:number; route: LaneRoute; s: number; speed: number; yaw: number; kind: VehicleKind; color: number; committed: boolean; braking: boolean; active: boolean }
export interface Pedestrian extends Point { identity:PedestrianIdentity;motion:Locomotion;y: number; id: number; node: number; path: number[]; next: number; speed: number; yaw: number; phase: number; moving: boolean; crossing: string | null; wait: number; active: boolean; retiring: boolean; shirt: number; style: number; scale: number; station?: StationVisit; rail?: RailJourney }
export interface SimulationConfig { seed?: number; bounds?: Bounds[]; doors?: Doorway[]; station?: StationSpatial; train?: Partial<TrainConfig>; railPassengers?: RailPassengerConfig }
export interface Pedestrian { progress?:{node:number;to:number;best:number;seconds:number};detours?:number;activity?:StreetActivity;activityCooldown?:number;companion?:Companion }
export interface Vehicle {lights:VehicleLights;steering:number}
const APPROACHES: Approach[] = ['N', 'S', 'E', 'W'];
type ListenerPosition = Point & { y?: number };

/** Browser-independent deterministic world state; meshes and audio read this same snapshot. */
export class CitySimulation {
  readonly navigation: Navigation;
  readonly streetLife:StreetLife;
  readonly stationTraffic?: StationTraffic;
  readonly pedestrians: Pedestrian[] = [];
  readonly vehicles: Vehicle[] = [];
  clock = 8;
  hour = 17.25;
  wet = false;
  signals: SignalState = signalState(8);
  readonly train: TrainOperation;
  readonly railPassengers?: RailPassengers;
  get trainX(): number { return this.train.x; }
  private readonly rng: () => number;
  private readonly bounds: Bounds[];
  private readonly routes = new Map<string, LaneRoute>();
  private readonly reachable: number[];
  private accumulator = 0; private spawnTimer = 0; private sequence = 0;
  private vehicleSequence = 0;
  private pedestrianSequence=0;private readonly seed:number;
  constructor(config: SimulationConfig = {}) {
    this.seed=config.seed??8412;this.train = new TrainOperation(config.train);
    this.rng = seededRandom(config.seed ?? 8412); this.bounds = config.bounds ?? [];
    this.navigation = new Navigation(this.bounds, config.doors ?? [],config.station);
    this.streetLife=new StreetLife(this.navigation,this.bounds,this.seed);
    if(this.navigation.station){
      this.stationTraffic=new StationTraffic(this.navigation,config.seed??8412,config.railPassengers?.stationDemand);
      this.railPassengers=new RailPassengers(this.train,this.stationTraffic,this.pedestrians,config.railPassengers,()=>this.newPedestrianTraits('station'));
    }
    this.reachable = this.navigation.nodes.filter(n => this.navigation.path(0, n.id).length > 0).map(n => n.id);
    for (const entry of APPROACHES) for (const turn of [false, true]) this.routes.set(`${entry}:${turn}`, laneRoute(entry, turn));
    for (let i = 0; i < 46; i++) this.spawnPedestrian(true);
    for (let i = 0; i < 12; i++) this.spawnVehicle(APPROACHES[i % 4], 7 + Math.floor(i / 4) * 15);
  }
  get stats() { return { pedestrians: this.pedestrians.filter(p => p.active).length, vehicles: this.vehicles.filter(c => c.active).length }; }
  update(dt: number, hour: number, listener?: ListenerPosition, hourRate = 0): void {
    if (!Number.isFinite(dt) || !Number.isFinite(hour) || !Number.isFinite(hourRate)) throw new Error('Invalid simulation update');
    this.hour = hour; this.accumulator += Math.max(0, dt);
    this.train.update(0, hour);
    // Ten nanoseconds of arithmetic tolerance avoids losing a tick when equal elapsed
    // time is partitioned into thousands of 144 Hz frames or irregular frame intervals.
    while (this.accumulator >= 1 / 30 - 1e-8) { this.step(1 / 30, listener, hourRate); this.accumulator = Math.max(0, this.accumulator - 1 / 30); }
    for(const c of this.vehicles)if(c.active)updateVehicleLights(c,this.clock,this.hour,this.wet,0);
  }
  private occupied(axis: 'NS' | 'EW'): boolean {
    return this.vehicles.some(c => c.active && c.committed && c.route.axis === axis && c.x > -13 && c.x < 13 && c.z > -4 && c.z < 28);
  }
  private step(dt: number, listener?: ListenerPosition, hourRate = 0): void {
    this.clock += dt;
    for(const p of this.pedestrians)if(p.active)beginLocomotion(p);
    if (hourRate) this.hour = wrapHour(this.hour + dt * hourRate);
    this.railPassengers?.synchronizeInterlocks();this.train.update(dt, this.hour);
    this.railPassengers?.update(dt,this.clock,this.hour);
    this.signals = signalState(this.clock, this.pedestrians.some(p => p.active && p.crossing !== null), this.occupied('NS'), this.occupied('EW'));
    this.moveVehicles(dt); this.movePedestrians(dt, listener);
    this.streetLife.update(this.pedestrians,this.clock,this.hour);
    for(const p of this.pedestrians)if(p.active&&(!p.station||p.station.state==='approaching'))p.y=pedestrianSurfaceHeight(p.x,p.z);
    for(const p of this.pedestrians)if(p.active)finishLocomotion(p,dt,this.clock);
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
    const slot = this.vehicles.find(c => !c.active), active = this.vehicles.filter(c=>c.active);
    const leader = active.filter(c=>c.route.entry===entry&&c.s>distance).sort((a,b)=>a.s-b.s)[0];
    const spawn=this.vehicleSequence++,appearance=selectVehicle(this.rng(),spawn,active,leader?.kind);
    const route = this.routes.get(`${entry}:${this.rng() < .3}`)!, p = sampleLane(route, distance);
    const c: Vehicle = { id: slot?.id ?? this.vehicles.length, spawn, ...appearance, driver:driverIdentity(this.seed,spawn,appearance.kind),acceleration:0,steering:0,lights:vehicleLights(),...p, route, s: distance, speed: 0, committed: false, braking: false, active: true };
    updateVehicleLights(c,this.clock,this.hour,this.wet,0);
    if (slot) Object.assign(slot, c); else if (this.vehicles.length < 20) this.vehicles.push(c);
  }
  private moveVehicles(dt: number): void {
    for (const c of this.vehicles) {
      if (!c.active) continue;
      const profile = VEHICLE_PROFILES[c.kind], stop = c.route.stopLine - profile.length / 2 - .35;
      const signal = c.route.axis === 'NS' ? this.signals.ns : this.signals.ew;
      const braking=c.driver.braking;
      let allowance = Infinity, desired = c.driver.preferredSpeed;
      if(c.route.turn&&c.s<c.route.distances.at(-2)!){
        const untilCurve=Math.max(0,c.route.distances[1]-c.s);
        desired=Math.min(desired,Math.sqrt(c.driver.turnSpeed**2+2*braking*untilCurve));
      }
      const greenLeft=c.route.axis==='NS'?22-this.signals.phase:46-this.signals.phase;
      if(!c.committed&&signal==='green'&&greenLeft<c.speed/braking+.15){
        if(stop-c.s<c.speed*c.speed/(2*braking)+c.speed*dt+.05)c.committed=true;
        else allowance=Math.max(0,stop-c.s);
      }
      if (!c.committed && signal !== 'green') allowance = Math.max(0, stop - c.s);
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
      for (const other of this.vehicles) {
        if (other === c || !other.active) continue;
        if (other.route.entry === c.route.entry && c.s < c.route.stopLine + 8 && other.s > c.s && other.s < c.route.stopLine + 8) {
          allowance = Math.min(allowance, other.s - c.s - (profile.length + VEHICLE_PROFILES[other.kind].length) / 2 - c.driver.followingGap);
        } else {
          const dx = other.x - c.x, dz = other.z - c.z, ahead = dx * fx + dz * fz, lateral = Math.abs(dx * fz - dz * fx);
          if (ahead > 0 && ahead < 17 && lateral < (profile.width + VEHICLE_PROFILES[other.kind].width) / 2 + .1 && Math.cos(other.yaw - c.yaw) > .3) allowance = Math.min(allowance, ahead - (profile.length + VEHICLE_PROFILES[other.kind].length) / 2 - c.driver.followingGap);
        }
      }
      desired = Math.min(desired, safeDrivingSpeed(allowance,braking,dt),Number.isFinite(allowance)?Math.max(0,allowance)/c.driver.headway:Infinity);
      const oldSpeed=c.speed,acceleration = c.speed > desired ? braking : c.driver.acceleration;
      c.speed += Math.sign(desired - c.speed) * Math.min(Math.abs(desired - c.speed), acceleration * dt);
      const move = Math.min(c.speed * dt, Math.max(0, allowance)); c.s += move;
      c.speed=move/dt;c.acceleration=(c.speed-oldSpeed)/dt;
      if (!c.committed && c.s > stop + .001 && signal === 'green') c.committed = true;
      const p = sampleLane(c.route, c.s); c.x = p.x; c.z = p.z; c.yaw = p.yaw;
      updateVehicleLights(c,this.clock,this.hour,this.wet,dt);
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
      const weights=candidates.map(id=>{const n=this.navigation.nodes[id];return n.door?businessAffinity(p.identity,n.door.business??'retail',this.hour):n.area==='residential'?(p.identity.purpose==='leisure'?1.3:.6):1;});
      let draw=this.rng()*weights.reduce((sum,w)=>sum+w,0),index=0;while(index<weights.length-1&&draw>weights[index])draw-=weights[index++];
      const to = candidates[index];
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
      const p: Pedestrian = { id, ...this.newPedestrianTraits(),x: node.x, y:pedestrianSurfaceHeight(node.x,node.z), z: node.z, node: node.id, path: [], next: 1,yaw: 0,crossing: null, moving: false, wait: 0, active: true, retiring: false };
      this.destination(p,false);
      const next = this.navigation.nodes[p.path[p.next]], edge = this.navigation.edges.get(node.id)?.find(e => e.to === next?.id);
      if (distributed && next && !edge?.crossing) { const t = this.rng(); p.x += (next.x - p.x) * t; p.z += (next.z - p.z) * t; p.y=pedestrianSurfaceHeight(p.x,p.z); }
      if (pointBlocked(p, this.bounds) || this.pedestrians.some(other => other.active && Math.hypot(other.x - p.x, other.z - p.z) < .7)) continue;
      if (slot) Object.assign(slot, p); else if (this.pedestrians.length < 88) this.pedestrians.push(p); return;
    }
  }
  private newPedestrianTraits(purpose?:PedestrianIdentity['purpose']) {
    const identity=pedestrianIdentity(this.seed,this.pedestrianSequence++,purpose),a=identity.appearance;
    return {identity,motion:locomotion(),speed:identity.preferredSpeed,phase:identity.phase,shirt:a.shirt,style:a.style,scale:a.scale,station:undefined,rail:undefined,activity:undefined,companion:undefined,progress:undefined,activityCooldown:undefined,detours:0};
  }
  private streetPositionClear(p:Pedestrian,x:number,z:number):boolean {
    if(pointBlocked({x,z},this.bounds))return false;
    for(const q of this.pedestrians) {
      if(q===p||!q.active||Math.abs(q.y-p.y)>=1.5)continue;
      if(Math.hypot(q.x-x,q.z-z)<.515&&Math.hypot(q.x-x,q.z-z)<Math.hypot(q.x-p.x,q.z-p.z)-1e-7)return false;
    }
    return true;
  }
  private moveStreetSafely(p:Pedestrian,x:number,z:number,dt:number,targetX:number,targetZ:number):boolean {
    const from=this.navigation.nodes[p.node],to=this.navigation.nodes[p.path[p.next]],edge=this.navigation.edges.get(p.node)?.find(e=>e.to===to?.id);
    const walkable=(nx:number,nz:number)=>{
      if(!p.crossing&&(Math.abs(nx)<4.05||nz>6.50&&nz<17.50))return false;
      if(p.crossing&&from&&to){const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz);if(Math.abs((nx-from.x)*dz-(nz-from.z)*dx)/length>.50)return false;}
      if(!edge?.crossing&&from&&to&&Math.abs(from.x)===4.55&&Math.abs(to.x)===4.55&&Math.sign(from.x)===Math.sign(to.x)&&Math.abs(nx)<4.20)return false;
      return this.streetPositionClear(p,nx,nz);
    };
    if(Math.hypot(x-p.x,z-p.z)>1e-7&&walkable(x,z)){p.x=x;p.z=z;return true;}
    const dx=targetX-p.x,dz=targetZ-p.z,d=Math.hypot(dx,dz);if(d<1e-8)return false;
    const fx=dx/d,fz=dz/d,step=Math.min(d,p.speed*.55*dt),near=this.pedestrians.filter(q=>q!==p&&q.active&&Math.abs(q.y-p.y)<1.5&&Math.hypot(q.x-p.x,q.z-p.z)<1.2);
    let best=-Infinity,bx=p.x,bz=p.z;
    // A small reciprocal sidestep can clear a blocked lane without shrinking body separation.
    // Candidate directions stay on pavement (or inside the already admitted crossing).
    for(const angle of [-Math.PI/2,Math.PI/2,-Math.PI/4,Math.PI/4,0,-Math.PI*.75,Math.PI*.75,Math.PI]) {
      const cs=Math.cos(angle),sn=Math.sin(angle),nx=p.x+(fx*cs-fz*sn)*step,nz=p.z+(fx*sn+fz*cs)*step;
      if(!walkable(nx,nz))continue;
      let score=d-Math.hypot(targetX-nx,targetZ-nz);
      for(const q of near)score+=(Math.hypot(q.x-nx,q.z-nz)-Math.hypot(q.x-p.x,q.z-p.z))*.12;
      score+=angle<0?.0015:0;if(score>best){best=score;bx=nx;bz=nz;}
    }
    if(Number.isFinite(best)){p.x=bx;p.z=bz;return true;}return false;
  }
  private movePedestrians(dt: number, listener?: ListenerPosition): void {
    for (const p of this.pedestrians) {
      if (!p.active||p.rail) continue; p.moving = false;
      if(p.station?.state==='approaching'&&!railServiceOpen(this.hour))this.stationTraffic!.finish(p,this.clock,'city');
      if(this.stationTraffic?.move(p,dt,this.clock,this.pedestrians,this.hour,listener))continue;
      if(this.streetLife.move(p,dt,this.clock,this.hour,(x,z,tx,tz)=>this.moveStreetSafely(p,x,z,dt,tx,tz)))continue;
      if (p.wait > 0) { p.wait -= dt; continue; }
      const goal = this.navigation.nodes[p.path[p.next]];
      if (!goal) { this.destination(p); continue; }
      if(!p.crossing){
        const d=Math.hypot(goal.x-p.x,goal.z-p.z),m=p.progress;
        if(!m||m.node!==p.node||m.to!==goal.id)p.progress={node:p.node,to:goal.id,best:d,seconds:0};
        else if(d<m.best-.18){m.best=d;m.seconds=0;}else m.seconds+=dt;
        if(p.progress!.seconds>12&&!this.navigation.edges.get(p.node)?.find(e=>e.to===goal.id)?.crossing){
          const alternatives=(this.navigation.edges.get(p.node)??[]).filter(e=>e.to!==goal.id&&!e.crossing&&!e.station&&!this.navigation.nodes[e.to].door);
          const end=p.path.at(-1)!;
          const alternate=alternatives[(p.detours??0)%Math.max(1,alternatives.length)];
          if(alternate){const route=this.navigation.path(alternate.to,end);if(route.length){p.path=[p.node,...route];p.next=1;p.detours=(p.detours??0)+1;p.progress=undefined;continue;}}
        }
        const urgent=this.pedestrians.find(q=>q!==p&&q.active&&q.crossing&&Math.hypot(q.x-p.x,q.z-p.z)<1.05);
        if(urgent){const dx=p.x-urgent.x,dz=p.z-urgent.z,l=Math.hypot(dx,dz)||1;this.moveStreetSafely(p,p.x+dx/l*p.speed*dt,p.z+dz/l*p.speed*dt,dt,p.x+dx,p.z+dz);continue;}
      }
      if(p.station?.state==='approaching'&&goal.id===this.navigation.station?.anchor&&Math.hypot(goal.x-p.x,goal.z-p.z)<3.5&&!this.stationTraffic!.admitApproach(p,dt))continue;
      const source = this.navigation.nodes[p.node];
      const edge = this.navigation.edges.get(p.node)?.find(e => e.to === goal.id);
      const length = Math.hypot(goal.x - source.x, goal.z - source.z), routeX = (goal.x - source.x) / length, routeZ = (goal.z - source.z) / length;
      // Opposite flows have distinct lanes. At red, wait behind the curb in the entry
      // lane rather than standing on the exit lane of pedestrians still clearing.
      const opposingFlow=edge?.crossing&&this.pedestrians.some(q=>q.active&&q.crossing===edge.crossing&&q.node!==p.node);
      if (edge?.crossing && !p.crossing && (!this.signals.walk||opposingFlow)) {
        const rank = this.pedestrians.filter(q => q.active && q.identity.uid < p.identity.uid && q.node === p.node && q.path[q.next] === goal.id && !q.crossing).length;
        const back=.25,side=.34+rank*.52;
        const holding = { x: source.x - routeX * back + routeZ * side, z: source.z - routeZ * back - routeX * side };
        const d = Math.hypot(holding.x - p.x, holding.z - p.z), step = walkingDistance(p,dt,d,.55);
        if (d > .04) this.moveStreetSafely(p,p.x+(holding.x-p.x)/d*step,p.z+(holding.z-p.z)/d*step,dt,holding.x,holding.z);
        p.yaw = Math.atan2(routeX, routeZ); continue;
      }
      if (edge?.crossing && !p.crossing) {
        const entry = { x: source.x - routeX * .1 + routeZ * .34, z: source.z - routeZ * .1 - routeX * .34 };
        const d = Math.hypot(entry.x - p.x, entry.z - p.z);
        // First reach the stripe entrance on the pavement; never cut diagonally from a queue.
        const pastEntry=(p.x-entry.x)*routeX+(p.z-entry.z)*routeZ>=0&&Math.abs((p.x-source.x)*routeZ-(p.z-source.z)*routeX)<.50;
        if (d > .09&&!pastEntry) {
          const step = walkingDistance(p,dt,d), next = { x: p.x + (entry.x - p.x) / d * step, z: p.z + (entry.z - p.z) / d * step };
          this.moveStreetSafely(p,next.x,next.z,dt,entry.x,entry.z);
          p.yaw = Math.atan2(routeX, routeZ); continue;
        }
        if (this.pedestrians.some(q => q !== p && q.active && q.crossing === edge.crossing && q.node === p.node && (q.x - p.x) * routeX + (q.z - p.z) * routeZ > 0 && (q.x - p.x) * routeX + (q.z - p.z) * routeZ < .9)) continue;
        const ex=goal.x+routeZ*.34+routeX*.25,ez=goal.z-routeX*.34+routeZ*.25;
        if(this.pedestrians.some(q=>q!==p&&q.active&&!q.crossing&&Math.abs(q.y-p.y)<1.5&&Math.hypot(q.x-ex,q.z-ez)<.59))continue;
      }
      let lane = edge?.crossing ? .34 : .31+p.identity.laneBias;
      if(p.station?.state==='approaching'&&goal.id===this.navigation.station?.anchor)lane=0;
      if(goal.door)lane=0;
      let target = { x: goal.x + routeZ * lane, z: goal.z - routeX * lane };
      if (pointBlocked(target, this.bounds)) { lane = .1; target = { x: goal.x + routeZ * lane, z: goal.z - routeX * lane }; }
      const dx = target.x - p.x, dz = target.z - p.z, distance = Math.hypot(dx, dz);
      const crossingCleared=!!p.crossing&&(p.x-goal.x)*routeX+(p.z-goal.z)*routeZ>=-.12;
      const atWaypoint=p.crossing?crossingCleared:p.station?.state==='approaching'&&goal.id===this.navigation.station?.anchor?distance<1e-6:goal.door?distance<.12:Math.hypot(p.x-goal.x,p.z-goal.z)<.52;
      if (atWaypoint) {
        // Accept a waypoint without snapping a body onto an occupied shared point.
        // The reserved station entrance still requires its exact physical anchor.
        p.node = goal.id; p.next++; p.crossing = null;
        if(!p.station&&!p.activity&&['commuter','station'].includes(p.identity.purpose)&&this.stationTraffic?.choose(p,this.clock,this.hour))continue;
        if(p.next<p.path.length)this.streetLife.consider(p,this.pedestrians,this.clock,this.hour);
        if (p.next >= p.path.length) {
          if(p.station?.state==='approaching'){this.stationTraffic!.enter(p,this.clock);continue;}
          if (p.retiring) { p.active = false; continue; }
          p.wait = goal.door ? 4 + this.rng() * 8 : goal.area === 'station' ? 2 + this.rng() * 5 : this.rng() * 1.2;
          this.destination(p);
        }
        continue;
      }
      const fx = dx / distance, fz = dz / distance;
      const following=this.navigation.nodes[p.path[p.next+1]],continuing=following&&((following.x-goal.x)*routeX+(following.z-goal.z)*routeZ)>.98*Math.hypot(following.x-goal.x,following.z-goal.z);
      let move = Math.min(distance,walkingDistance(p,dt,distance+(continuing?2:0))), steer = 0;
      const companion=p.companion&&this.pedestrians.find(q=>q.active&&q.identity.uid===p.companion!.uid);
      if(companion&&!p.crossing&&!edge?.crossing){const behind=(p.x-companion.x)*fx+(p.z-companion.z)*fz;if(behind>p.identity.personalSpace+.36)move*=.65;}
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
      // Keep avoidance inside the existing pavement corridor, never over a curb.
      if(!edge?.crossing&&!p.crossing){
        if(Math.abs(source.x)===4.55&&Math.abs(goal.x)===4.55&&Math.sign(source.x)===Math.sign(goal.x))x=Math.sign(source.x)*Math.max(4.20,Math.min(5.0,Math.abs(x)));
        if(source.z===goal.z&&(source.z===6||source.z===18))z=Math.max(source.z-.35,Math.min(source.z+.35,z));
      }
      const displacement=Math.hypot(x-p.x,z-p.z),limit=p.speed*dt;
      if(displacement>limit){x=p.x+(x-p.x)*limit/displacement;z=p.z+(z-p.z)*limit/displacement;}
      if(!this.moveStreetSafely(p,x,z,dt,target.x,target.z))continue;
      if (edge?.crossing && (p.x-p.motion.previousX)*routeX+(p.z-p.motion.previousZ)*routeZ>.0001) p.crossing = edge.crossing;
      p.yaw = Math.atan2(fx, fz);p.moving = move > .0001;
      if(p.station?.state==='approaching'&&p.moving)p.station.blockedFor=0;
    }
  }
}
