import type { Pedestrian } from './CitySimulation.ts';
import type { StationPoint } from '../generation/StationLayout.ts';
import { STATION } from '../generation/StationLayout.ts';
import type { TrainOperation } from './TrainOperation.ts';
import type { TrainDoorSnapshot } from './TrainDoors.ts';
import type { StationTraffic } from './StationTraffic.ts';
import { RAIL_VEHICLE, railGeometry } from './RailGeometry.ts';
import { populationTarget, railServiceOpen } from './WorldRules.ts';
import { PASSENGER_SPACE, trainBerths, passengerTransferPath, passengerPositionValid, pointPathDistance, transferPathsConflict } from './RailPassengerGeometry.ts';
import type { TrainBerth } from './RailPassengerGeometry.ts';

export interface RailPassengerConfig { arrivingPassengers?: number; capacityPerDoor?: number; stationDemand?: number; boardingGraceSeconds?: number }
export interface RailJourney {
  kind: 'inbound'|'outbound'; state: 'riding'|'boarding'|'alighting'; berthId: string; doorId: string;
  localX: number; localZ: number; path: StationPoint[]; index: number; started: number;
}
export interface PassengerEvent { clock: number; pedestrian: number; visit: number; event: 'origin'|'boarding'|'boarded'|'alighting'|'alighted'|'delivered'; doorId: string; x: number; y: number; z: number; stop: number }

/** One fixed-step passenger lifecycle, shared by station visitors, actual train occupants and human presentation. */
export class RailPassengers {
  readonly berths: TrainBerth[];
  readonly queues = new Map<string,number[]>();
  readonly events: PassengerEvent[] = [];
  readonly metrics={originated:0,boarded:0,alighted:0,delivered:0,maxOnboard:0,maxTransfers:0,invalidMoves:0,unsafeCrossings:0,capacityRefusals:0,
    doorBoardings:{} as Record<string,number>,doorAlightings:{} as Record<string,number>};
  private loadedLeg=-1; private stop=-1; private openedAt=0; private boardingUntil=0; private alightingDone=false;
  private readonly train: TrainOperation;
  private readonly traffic: StationTraffic;
  private readonly people: Pedestrian[];
  private readonly config: RailPassengerConfig;
  constructor(train: TrainOperation,traffic: StationTraffic,people: Pedestrian[],config: RailPassengerConfig={}) {
    this.train=train;this.traffic=traffic;this.people=people;this.config=config;
    const perDoor=config.capacityPerDoor??2;
    if(!Number.isInteger(perDoor)||perDoor<1||perDoor>2||config.arrivingPassengers!==undefined&&(!Number.isInteger(config.arrivingPassengers)||config.arrivingPassengers<0||config.arrivingPassengers>perDoor*6)||
      config.stationDemand!==undefined&&(!Number.isFinite(config.stationDemand)||config.stationDemand<0||config.stationDemand>1)||
      config.boardingGraceSeconds!==undefined&&(!Number.isFinite(config.boardingGraceSeconds)||config.boardingGraceSeconds<=0))throw new Error('Invalid rail passenger configuration');
    this.berths=trainBerths(perDoor);
    traffic.platformClear=(p,next)=>this.active.every(q=>q===p||pointPathDistance(next,q.rail!.path)>=PASSENGER_SPACE.separation ||
      pointPathDistance(next,q.rail!.path)>=pointPathDistance(p,q.rail!.path)-1e-7);
  }
  get active(): Pedestrian[] {return this.people.filter(p=>p.active&&p.rail&&p.rail.state!=='riding');}
  get onboard(): Pedestrian[] {return this.people.filter(p=>p.active&&p.rail?.state==='riding');}
  get snapshot() {return structuredClone({capacity:this.berths.length,onboard:this.onboard.map(p=>({id:p.id,visit:p.station!.id,...p.rail})),transfers:this.active.map(p=>({id:p.id,visit:p.station!.id,...p.rail})),
    queues:Object.fromEntries(this.queues),metrics:this.metrics,boardingUntil:this.boardingUntil,alightingDone:this.alightingDone});}
  private event(p: Pedestrian,event: PassengerEvent['event'],clock: number): void {
    this.events.push({clock,pedestrian:p.id,visit:p.station!.id,event,doorId:p.rail!.doorId,x:p.x,y:p.y,z:p.z,stop:this.train.snapshot.completedStops});
    if(this.events.length>1024)this.events.shift();
  }
  private hold(key: string,held: boolean): void {this.train.setPassengerHold(key,held);}
  private freeBerths(): TrainBerth[] {return this.berths.filter(b=>!this.people.some(p=>p.active&&p.rail?.berthId===b.id));}
  private berth(p: Pedestrian): TrainBerth {return this.berths.find(b=>b.id===p.rail!.berthId)!;}
  private usable(d: TrainDoorSnapshot): boolean {
    // The crossing person's own sensor must not obstruct their exit from the doorway. External inputs still stop admission/movement.
    return d.platformSide&&d.boarding.aligned&&d.boarding.approach?.clear===true&&d.state==='OPEN'&&d.fraction===1&&
      d.obstructionSources.every(s=>s==='passenger');
  }
  private pathFree(p: Pedestrian,path: StationPoint[]): boolean {
    return this.active.every(q=>q===p||!transferPathsConflict(path,q.rail!.path)) &&
      this.people.every(q=>q===p||!q.active||pointPathDistance(q,path)>=PASSENGER_SPACE.separation);
  }
  private originate(clock: number,hour: number): void {
    const s=this.train.snapshot,g=railGeometry(),offstage=s.x+g.halfLength<-90||s.x-g.halfLength>90;
    if(!offstage)return;
    if(s.destination==='turnback'&&s.motion==='hold')for(const p of this.onboard.filter(p=>p.rail!.kind==='outbound')) {
      this.event(p,'delivered',clock);this.traffic.finish(p,clock,'rail');p.rail=undefined;p.active=false;this.metrics.delivered++;
    }
    if(!s.active||s.destination!=='station'||this.loadedLeg===s.turnbacks||!railServiceOpen(hour))return;
    this.loadedLeg=s.turnbacks;
    const demand=this.config.arrivingPassengers??Math.max(2,Math.min(6,Math.round(populationTarget(hour).pedestrians/11)));
    // Alternate doors before filling their second standing positions.
    const ordered=this.freeBerths().sort((a,b)=>a.id.slice(-1).localeCompare(b.id.slice(-1))||a.doorId.localeCompare(b.doorId));
    for(const b of ordered.slice(0,demand)) {
      const old=this.people.find(p=>!p.active),id=old?.id??this.people.length;if(!old&&id>=88)break;
      const p: Pedestrian={id,x:s.x+b.localX,y:RAIL_VEHICLE.sillY,z:STATION.trackZ+b.localZ,node:-1,path:[],next:1,speed:1.1,yaw:0,phase:id*.71,moving:false,crossing:null,wait:0,active:true,retiring:false,
        shirt:[0x35494e,0xc6bbab,0x47525a,0x93736c][id%4],style:id%5,scale:.97+(id%4)*.012,
        rail:{kind:'inbound',state:'riding',berthId:b.id,doorId:b.doorId,localX:b.localX,localZ:b.localZ,path:[],index:0,started:clock}};
      this.traffic.registerInbound(p,clock);if(old)Object.assign(old,p);else this.people.push(p);
      this.event(old??p,'origin',clock);this.metrics.originated++;
    }
  }
  private start(p: Pedestrian,path: StationPoint[],kind: 'boarding'|'alighting',clock: number): void {
    p.rail!.state=kind;p.rail!.path=path;p.rail!.index=1;p.rail!.started=clock;p.station!.flight=undefined;
    this.traffic.state(p,kind,clock);this.hold('passenger:'+p.id,true);this.event(p,kind,clock);
    if(kind==='boarding')this.traffic.releaseSlot(p);
  }
  /** Called before train stepping: thresholds and reserved unfinished traversals already own the interlocks. */
  synchronizeInterlocks(): void {
    const s=this.train.snapshot;
    for(const d of s.doors.filter(d=>d.platformSide)) {
      const x=(d.opening.minX+d.opening.maxX)/2;
      const occupied=this.people.some(p=>p.active&&Math.abs(p.y-RAIL_VEHICLE.sillY)<.2&&Math.abs(p.x-x)<.53+.3&&Math.abs(p.z-d.opening.z)<.42);
      this.train.setDoorObstructed(d.id,occupied,'passenger');
    }
    for(const p of this.active)this.hold('passenger:'+p.id,true);
    if(s.velocity===0&&s.destination==='station')for(const p of this.onboard.filter(p=>p.rail!.kind==='inbound'))this.hold('passenger:'+p.id,true);
  }
  update(dt: number,clock: number,hour: number): void {
    this.originate(clock,hour);
    for(const p of this.onboard) {const b=this.berth(p);p.x=this.train.x+b.localX;p.y=RAIL_VEHICLE.sillY;p.z=STATION.trackZ+b.localZ;p.moving=false;}
    const s=this.train.snapshot,doors=s.doors.filter(d=>d.platformSide),layout=this.traffic.navigation.station!.layout;
    if(s.completedStops!==this.stop&&s.state==='DWELLING') {
      this.stop=s.completedStops;this.openedAt=clock;this.boardingUntil=clock+this.train.config.dwellSeconds;this.alightingDone=false;
    }
    if(s.state==='DWELLING') {
      const incoming=this.onboard.filter(p=>p.rail!.kind==='inbound').sort((a,b)=>a.rail!.berthId.localeCompare(b.rail!.berthId));
      for(const p of incoming) {
        const d=doors.find(d=>d.id===p.rail!.doorId)!;if(!this.usable(d))continue;
        const slot=this.traffic.claimArrivalSlot(p);if(!slot)continue;
        const wait=this.traffic.navigation.nodes[slot.node],path=passengerTransferPath(layout,d,wait,this.berth(p),this.train.x).reverse();
        if(this.pathFree(p,path))this.start(p,path,'alighting',clock);else this.traffic.releaseSlot(p);
      }
      const alighting=this.people.some(p=>p.active&&p.rail?.kind==='inbound');
      // Keep the batch held for the tick in which its final person reaches the platform,
      // so boarding admission is decided before the train can advance to its warning phase.
      this.hold('alighting-priority',alighting);
      if(!alighting&&!this.alightingDone) {this.alightingDone=true;this.boardingUntil=Math.max(this.openedAt+this.train.config.dwellSeconds,clock+(this.config.boardingGraceSeconds??12));}
      this.queues.clear();for(const d of doors)this.queues.set(d.id,[]);
      const waiting=this.people.filter(p=>p.active&&p.station?.state==='waiting'&&p.station.journey==='outbound').sort((a,b)=>a.station!.started-b.station!.started||a.id-b.id);
      for(const p of waiting) {
        const available=this.freeBerths(),candidates=doors.filter(d=>available.some(b=>b.doorId===d.id));
        const cost=(d:TrainDoorSnapshot)=>Math.abs((d.opening.minX+d.opening.maxX)/2-p.x)+
          8*(this.queues.get(d.id)!.length+this.people.filter(q=>q.active&&q.rail?.doorId===d.id).length);
        candidates.sort((a,b)=>cost(a)-cost(b)||a.id.localeCompare(b.id));
        if(!candidates.length){this.metrics.capacityRefusals++;continue;}
        let d=candidates[0],b=available.find(b=>b.doorId===d.id)!;
        let path=passengerTransferPath(layout,d,p,b,this.train.x);
        if(!alighting&&clock<this.boardingUntil&&railServiceOpen(hour)) {
          const clear=candidates.find(candidate=>this.usable(candidate)&&this.pathFree(p,passengerTransferPath(layout,candidate,p,available.find(b=>b.doorId===candidate.id)!,this.train.x)));
          if(clear){d=clear;b=available.find(b=>b.doorId===d.id)!;path=passengerTransferPath(layout,d,p,b,this.train.x);}
        }
        this.queues.get(d.id)!.push(p.id);
        if(this.queues.get(d.id)![0]!==p.id||alighting||clock>=this.boardingUntil||!railServiceOpen(hour)||!this.usable(d)||!this.pathFree(p,path))continue;
        p.rail={kind:'outbound',state:'riding',berthId:b.id,doorId:b.doorId,localX:b.localX,localZ:b.localZ,path:[],index:0,started:clock};
        this.start(p,path,'boarding',clock);
      }
      this.hold('boarding-window',!alighting&&clock<this.boardingUntil&&waiting.length>0&&this.freeBerths().length>0&&railServiceOpen(hour));
    } else {this.hold('boarding-window',false);this.hold('alighting-priority',false);}
    for(const p of this.active) {
      const r=p.rail!,d=doors.find(d=>d.id===r.doorId)!;p.moving=false;
      if(!this.usable(d))continue;
      const goal=r.path[r.index],dx=goal.x-p.x,dy=goal.y-p.y,dz=goal.z-p.z,length=Math.hypot(dx,dy,dz),step=Math.min(length,p.speed*PASSENGER_SPACE.speed*dt),t=length?step/length:1;
      const next={x:p.x+dx*t,y:p.y+dy*t,z:p.z+dz*t};
      if(!passengerPositionValid(layout,next,d,this.berth(p),this.train.x)) {this.metrics.invalidMoves++;throw new Error('Invalid rail passenger position '+JSON.stringify({id:p.id,next,door:d.id}));}
      if(this.people.some(q=>q!==p&&q.active&&Math.abs(q.y-next.y)<1.5&&Math.hypot(q.x-next.x,q.z-next.z)<.56))continue;
      p.x=next.x;p.y=next.y;p.z=next.z;p.yaw=Math.atan2(dx,dz);p.moving=step>1e-8;p.phase+=step*7;
      if(length<=step+1e-9) {
        r.index++;
        if(r.index===r.path.length) {
          const kind=r.state;this.hold('passenger:'+p.id,false);p.moving=false;
          if(kind==='boarding') {
            r.state='riding';r.path=[];r.index=0;this.traffic.state(p,'riding',clock);this.metrics.boarded++;this.metrics.doorBoardings[d.id]=(this.metrics.doorBoardings[d.id]??0)+1;this.event(p,'boarded',clock);
          } else {
            this.metrics.alighted++;this.metrics.doorAlightings[d.id]=(this.metrics.doorAlightings[d.id]??0)+1;this.event(p,'alighted',clock);
            p.rail=undefined;this.traffic.startReturn(p,clock);
          }
        }
      }
    }
    this.synchronizeInterlocks();
    this.metrics.maxOnboard=Math.max(this.metrics.maxOnboard,this.onboard.length);this.metrics.maxTransfers=Math.max(this.metrics.maxTransfers,this.active.length);
  }
}
