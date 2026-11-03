import type { Pedestrian } from './CitySimulation.ts';
import type { Navigation } from './Navigation.ts';
import { populationTarget, railServiceOpen, seededRandom } from './WorldRules.ts';
import { stationPositionValid } from './StationNavigation.ts';
import type { PassengerState, StationTraversal, WaitingDestination } from './StationNavigation.ts';

export interface StationVisit {
  id: number; state: PassengerState; paid: boolean; gate: string; slot: string; origin: number;
  route: number[]; index: number; started: number; idle: number; blockedFor: number;
  flight?: string; failed: boolean; history: PassengerState[]; waitedSeconds: number;
}
export interface StationVisitResult { visit: number; pedestrian: number; seconds: number; originNode: number; rejoinedNode: number; waitedSeconds: number; states: PassengerState[]; entranceGate: string; exitGate: string }

/** Fixed-step station circulation. Reservations meter turns; positions always traverse graph edges. */
export class StationTraffic {
  readonly navigation: Navigation;
  readonly owners = new Map<string,number>();
  readonly completed: StationVisitResult[] = [];
  readonly events: { clock: number; pedestrian: number; visit: number; state: PassengerState }[] = [];
  readonly metrics = { started:0, completed:0, failures:0, invalidMoves:0, maxActive:0, maxMovingWait:0, maxGateWait:0, maxStairWait:0, maxVisitSeconds:0, maxWaiting:0, transitions:{} as Partial<Record<PassengerState,number>> };
  private readonly requests = new Map<number,{ticket: number; locks: string[]}>();
  private readonly slots = new Map<string,number>();
  private readonly cooldown = new Map<number,number>();
  private readonly rng: () => number;
  private ticket=0; private sequence=0;
  constructor(navigation: Navigation,seed: number) {this.navigation=navigation;this.rng=seededRandom(seed^0x51a710);}
  private state(p: Pedestrian,state: PassengerState,clock: number): void {
    const v=p.station!;if(v.state===state)return;v.state=state;v.history.push(state);
    this.metrics.transitions[state]=(this.metrics.transitions[state]??0)+1;
    this.events.push({clock,pedestrian:p.id,visit:v.id,state});if(this.events.length>512)this.events.shift();
  }
  /** Called only at a real exterior graph node by the existing destination system. */
  choose(p: Pedestrian,clock: number,hour: number): boolean {
    const n=this.navigation.station!;
    const source=this.navigation.nodes[p.node];
    // Select station errands on public pavement, after an existing doorway/alley visit has cleared.
    if(source.door||source.station||source.area==='alley'||source.area==='station')return false;
    const capacity=Math.min(8,Math.max(2,Math.floor(populationTarget(hour).pedestrians/8)));
    if(p.retiring||p.station||!railServiceOpen(hour)||this.slots.size>=capacity||(this.cooldown.get(p.id)??0)>clock||this.rng()>.34)return false;
    const path=this.navigation.path(p.node,n.anchor);if(!path.length)return false;
    const free=n.waiting.filter(s=>!this.slots.has(s.id));if(!free.length)return false;
    const slot=free[Math.floor(this.rng()*free.length)];
    const gate=n.entranceGates[this.sequence%n.entranceGates.length];
    p.station={id:++this.sequence,state:'approaching',paid:false,gate,slot:slot.id,origin:p.node,route:[],index:0,started:clock,idle:15+this.rng()*20,blockedFor:0,failed:false,history:['approaching'],waitedSeconds:0};
    this.slots.set(slot.id,p.id);p.path=path;p.next=1;p.wait=0;this.metrics.started++;
    this.metrics.transitions.approaching=(this.metrics.transitions.approaching??0)+1;
    if(path.length===1)this.enter(p,clock);
    return true;
  }
  private slot(p: Pedestrian): WaitingDestination {return this.navigation.station!.waiting.find(s=>s.id===p.station!.slot)!;}
  enter(p: Pedestrian,clock: number): void {
    const v=p.station!,n=this.navigation.station!,slot=this.slot(p);
    v.route=[...n.inbound.get(v.gate)!,...slot.inbound.slice(1)];v.index=1;
    p.path=v.route;p.next=1;p.wait=0;this.state(p,'entering',clock);
  }
  admitApproach(p: Pedestrian,dt: number):boolean {
    if(this.reserve(p,['forecourt-entry']))return true;
    this.blocked(p,{kind:'walk',state:'approaching',speed:1,locks:['forecourt-entry']},dt);return false;
  }
  private retain(p: Pedestrian,locks: string[]): void {for(const [key,owner]of this.owners)if(owner===p.id&&!locks.includes(key))this.owners.delete(key);}
  private reserve(p: Pedestrian,locks: string[]): boolean {
    if(!locks.length){this.requests.delete(p.id);return true;}
    const needed=locks.filter(key=>this.owners.get(key)!==p.id);
    if(!needed.length){this.requests.delete(p.id);return true;}
    let request=this.requests.get(p.id);
    if(!request){request={ticket:this.ticket++,locks};this.requests.set(p.id,request);}else request.locks=locks;
    if(locks.some(key=>this.owners.has(key)&&this.owners.get(key)!==p.id))return false;
    if([...this.requests].some(([id,q])=>id!==p.id&&q.ticket<request!.ticket&&q.locks.some(key=>needed.includes(key))))return false;
    for(const key of locks)this.owners.set(key,p.id);this.requests.delete(p.id);return true;
  }
  private blocked(p: Pedestrian,edge: StationTraversal,dt: number): void {
    const v=p.station!;v.blockedFor+=dt;this.metrics.maxMovingWait=Math.max(this.metrics.maxMovingWait,v.blockedFor);
    if(edge.kind==='gate')this.metrics.maxGateWait=Math.max(this.metrics.maxGateWait,v.blockedFor);
    if(edge.kind==='stairs')this.metrics.maxStairWait=Math.max(this.metrics.maxStairWait,v.blockedFor);
  }
  move(p: Pedestrian,dt: number,clock: number,peers: Pedestrian[],hour: number,listener?: {x:number;y?:number;z:number}): boolean {
    const v=p.station;if(!v||v.state==='approaching')return false;
    p.moving=false;
    if(v.state==='waiting'){
      p.yaw=Math.PI;v.idle-=dt;v.waitedSeconds+=dt;
      if(v.idle>0&&railServiceOpen(hour))return true;
      v.route=this.slot(p).outbound;v.index=1;p.path=v.route;p.next=1;v.blockedFor=0;this.state(p,'returning',clock);
    }
    const goal=this.navigation.nodes[v.route[v.index]],edge=this.navigation.edges.get(p.node)?.find(e=>e.to===goal?.id)?.station;
    if(!goal||!edge)throw new Error(`Disconnected station visit ${v.id} at node ${p.node}`);
    this.state(p,edge.state,clock);v.flight=edge.flight;
    if(!this.reserve(p,edge.locks)){this.blocked(p,edge,dt);return true;}
    const dx=goal.x-p.x,dy=goal.y-p.y,dz=goal.z-p.z,d=Math.hypot(dx,dy,dz),step=Math.min(d,p.speed*edge.speed*dt),t=d?step/d:1;
    const next={x:p.x+dx*t,y:p.y+dy*t,z:p.z+dz*t};
    if(!stationPositionValid(this.navigation.station!.layout,next)){
      this.metrics.invalidMoves++;if(!v.failed){v.failed=true;this.metrics.failures++;}this.blocked(p,edge,dt);return true;
    }
    for(const q of peers){
      if(q===p||!q.active||Math.abs(q.y-next.y)>1.5)continue;
      const before=Math.hypot(q.x-p.x,q.z-p.z),after=Math.hypot(q.x-next.x,q.z-next.z);
      if(after<.56&&after<before-1e-7){this.blocked(p,edge,dt);return true;}
    }
    if(listener&&(listener.y===undefined||Math.abs(listener.y-p.y-.9)<1.6)){
      const before=Math.hypot(listener.x-p.x,listener.z-p.z),after=Math.hypot(listener.x-next.x,listener.z-next.z);
      if(after<.65&&after<before-1e-7){this.blocked(p,edge,dt);return true;}
    }
    p.x=next.x;p.y=next.y;p.z=next.z;p.yaw=Math.atan2(dx,dz);p.moving=step>1e-6;p.phase+=Math.hypot(dx*t,dz*t)*7;v.blockedFor=0;
    if(d<=step+1e-9){
      p.node=goal.id;v.index++;p.next=v.index;
      if(goal.station===v.gate+':paid')v.paid=true;
      if(goal.station==='exit-gate-unpaid')v.paid=false;
      const following=this.navigation.edges.get(p.node)?.find(e=>e.to===v.route[v.index])?.station;
      this.retain(p,following?.locks??[]);
      if(v.index===v.route.length){
        this.requests.delete(p.id);v.flight=undefined;
        if(goal.id===this.navigation.station!.exitAnchor){
          const seconds=clock-v.started;this.metrics.completed++;this.metrics.maxVisitSeconds=Math.max(this.metrics.maxVisitSeconds,seconds);
          this.completed.push({visit:v.id,pedestrian:p.id,seconds,originNode:v.origin,rejoinedNode:p.node,waitedSeconds:v.waitedSeconds,states:[...v.history],entranceGate:v.gate,exitGate:this.navigation.station!.exitGate});if(this.completed.length>128)this.completed.shift();
          this.slots.delete(v.slot);this.cooldown.set(p.id,clock+90);p.station=undefined;p.path=[];p.next=1;p.wait=.4;
        }else{p.moving=false;this.state(p,'waiting',clock);}
      }
    }
    return true;
  }
  observe(pedestrians: Pedestrian[]): void {
    this.metrics.maxActive=Math.max(this.metrics.maxActive,pedestrians.filter(p=>p.active&&p.station&&p.station.state!=='approaching').length);
    this.metrics.maxWaiting=Math.max(this.metrics.maxWaiting,pedestrians.filter(p=>p.active&&p.station?.state==='waiting').length);
  }
}
