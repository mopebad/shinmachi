import type { NavNode, NavEdge } from './Navigation.ts';
import { inStationRect, stationBodyBlocked } from '../generation/StationLayout.ts';
import type { StationSpatial, StationPoint, StationFlight } from '../generation/StationLayout.ts';

export type PassengerState = 'approaching' | 'entering' | 'gate-in' | 'paid' | 'ascending' | 'platform' | 'waiting' | 'returning' | 'descending' | 'gate-out' | 'exiting';
export interface StationTraversal {
  kind: 'walk' | 'stairs' | 'gate'; state: PassengerState; speed: number;
  locks: string[]; gate?: string; flight?: string;
}
export interface WaitingDestination { id: string; node: number; inbound: number[]; outbound: number[] }
type Waypoint = { key: string; p: StationPoint; traversal: StationTraversal };
const distance = (a: StationPoint, b: StationPoint) => Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

/** Actual tread/landing support, distinct from the continuous body trajectory between footfalls. */
export function stationFootSurface(s: StationSpatial, x: number, z: number, y: number): number | null {
  const tread=s.surfaces.find(f=>f.kind==='tread'&&inStationRect({x,z},f)&&Math.abs(f.y-y)<=.19);
  if(tread)return tread.y;
  let best: number | null = null, delta = Infinity;
  for(const f of s.surfaces) if(inStationRect({x,z},f) && Math.abs(f.y-y)<delta) {best=f.y;delta=Math.abs(f.y-y);}
  if(delta<=.19)return best;
  // Existing main-street sidewalk; the station contract owns its apron/forecourt surfaces.
  if(Math.abs(y-s.nodes.street.y)<.001 && x>=3.85&&x<=5.75&&z>=-67&&z<=6.7)return s.nodes.street.y;
  return null;
}
export function stationPositionValid(s: StationSpatial, p: StationPoint): boolean {
  const support=stationFootSurface(s,p.x,p.z,p.y);
  return support!==null && !stationBodyBlocked(s,p.x,p.z,Math.max(p.y,support));
}

/** Directed lanes embedded in the existing graph. Every flight is derived from its authored treads. */
export class StationNavigation {
  readonly layout: StationSpatial;
  readonly anchor: number;
  readonly exitAnchor: number;
  readonly inbound = new Map<string,number[]>();
  readonly waiting: WaitingDestination[] = [];
  readonly nodeIds = new Set<number>();
  readonly entranceGates: string[];
  readonly exitGate: string;
  readonly validation: { edges: number; samples: number };
  constructor(nodes: NavNode[], edges: Map<number,NavEdge[]>, layout: StationSpatial, anchor: number) {
    this.layout=layout;this.anchor=anchor;
    const g=layout.nodes.forecourt.y,p=layout.nodes.upperLanding.y,keys=new Map<string,number>();
    keys.set('forecourt',anchor);
    const walk=(state: PassengerState,locks: string[]=[]): StationTraversal=>({kind:'walk',state,speed:1,locks});
    const wp=(key: string,x: number,y: number,z: number,t: StationTraversal): Waypoint=>({key,p:{x,y,z},traversal:t});
    const at=(key: string,point: StationPoint,state: PassengerState,locks: string[]=[]): Waypoint=>({key,p:{...point},traversal:walk(state,locks)});
    const route=(points: Waypoint[]): number[]=>{
      const ids:number[]=[];
      for(const w of points){
        let id=keys.get(w.key);
        if(id===undefined){id=nodes.length;keys.set(w.key,id);nodes.push({...w.p,id,area:'station',station:w.key});edges.set(id,[]);this.nodeIds.add(id);}
        if(ids.length && ids.at(-1)!==id){
          const list=edges.get(ids.at(-1)!)!;
          if(!list.some(e=>e.to===id))list.push({to:id,station:w.traversal});
        }
        ids.push(id);
      }return ids;
    };
    const lower=layout.flights[0],upper=layout.flights.at(-1)!;
    const lane=(f: StationFlight,inbound: boolean)=>f.from.z-Math.sign(f.to.x-f.from.x)*(inbound?1:-1)*.34;
    const stair=(f: StationFlight,inbound: boolean): Waypoint[]=>{
      const state=inbound?'ascending':'descending',z=lane(f,inbound),prefix=(inbound?'up:':'down:')+f.id;
      const original=[{...f.from},...f.treads.map(t=>({x:(t.minX+t.maxX)/2,y:t.y,z})),{...f.to}];
      const sequence=inbound?original:[...original].reverse();
      return sequence.map((q,i)=>{
        const locks:string[]=[];
        if(f===lower && (inbound?i<=1:i>=sequence.length-2))locks.push('paid-junction');
        if(f===upper && (inbound?i>=sequence.length-3:i<=2))locks.push('upper-junction');
        return wp(prefix+':'+i,q.x,q.y,z,{kind:i===0?'walk':'stairs',state,speed:i===0?1:inbound?.62:.7,locks,flight:i===0?undefined:f.id});
      });
    };
    const turn=layout.surfaces.find(s=>s.id==='return-landing')!,turnWidth=turn.maxX-turn.minX;
    const ascending: Waypoint[]=[];
    for(const [i,f] of layout.flights.entries()){
      if(i===2){
        const x=turn.minX+turnWidth*.34;
        ascending.push(wp('up-return-a',x,turn.y,lane(lower,true),walk('ascending')),wp('up-return-b',x,turn.y,lane(f,true),walk('ascending')));
      }
      ascending.push(...stair(f,true));
    }
    const access=layout.nodes.platformAccess,landing=layout.nodes.upperLanding;
    const east=layout.surfaces.find(s=>s.id==='platform-east')!,corridorX=east.minX+1.09;
    ascending.push(wp('up-landing',landing.x,p,lane(upper,true),walk('platform',['upper-junction'])),
      at('up-access',access,'platform',['upper-junction']),wp('up-neck-clear',upper.to.x+.8,p,access.z,walk('platform',['upper-junction'])),
      wp('up-neck-east-hold',corridorX-1.1,p,access.z,walk('platform')),wp('up-neck-east',corridorX,p,access.z,walk('platform',['east-turn'])),wp('platform-in-start',corridorX,p,access.z+1.2,walk('platform',['east-turn'])));
    const up=route(ascending);
    const [exit,...entry]=layout.gates;this.entranceGates=entry.map(g=>g.id);this.exitGate=exit.id;
    for(const gate of entry){
      const laneT: StationTraversal={kind:'gate',state:'gate-in',speed:.78,locks:['paid-junction','gate:'+gate.id],gate:gate.id};
      const prefix=route([at('forecourt',layout.nodes.forecourt,'entering'),at('entry',layout.nodes.entrance,'entering',['forecourt-entry']),wp('concourse',layout.nodes.concourse.x,g,layout.nodes.gateApproach.z,walk('entering')),
        wp('unpaid-turn',layout.nodes.unpaidTurn.x,g,layout.nodes.gateApproach.z,walk('entering')),wp(gate.id+':approach',gate.center.x,g,gate.center.z+gate.depth/2+.45,walk('entering')),
        wp(gate.id+':center',gate.center.x,g,gate.center.z,laneT),wp(gate.id+':paid',gate.center.x,g,gate.center.z-gate.depth/2-.45,laneT),
        wp(gate.id+':paid-turn',gate.center.x,g,lane(lower,true),walk('paid',['paid-junction'])),ascending[0]]);
      this.inbound.set(gate.id,[...prefix,...up.slice(1)]);
    }
    const descending: Waypoint[]=[wp('platform-out-start',corridorX,p,access.z+1.9,walk('returning')),
      wp('down-neck-east',corridorX,p,access.z-.6,walk('returning',['east-turn'])),wp('down-neck-hold',upper.to.x+.8,p,access.z-.6,walk('returning')),
      wp('down-access',landing.x-.7,p,access.z-.6,walk('returning',['upper-junction'])),
      wp('down-landing',landing.x-.7,p,lane(upper,false),walk('returning',['upper-junction']))];
    for(const [i,f]of [...layout.flights].reverse().entries()){
      if(i===2){const x=turn.minX+turnWidth*.72;
        descending.push(wp('down-return-a',x,turn.y,lane(upper,false),walk('descending')),wp('down-return-b',x,turn.y,lane(f,false),walk('descending')));}
      descending.push(...stair(f,false));
    }
    const outT: StationTraversal={kind:'gate',state:'gate-out',speed:.78,locks:['paid-junction','gate:'+exit.id],gate:exit.id};
    descending.push(wp('down-paid-turn',layout.nodes.stairFoot.x,g,lane(lower,false),walk('paid',['paid-junction'])),
      wp('exit-gate-paid',exit.center.x,g,exit.center.z-exit.depth/2-.45,walk('paid',['paid-junction'])),
      wp('exit-gate-center',exit.center.x,g,exit.center.z,outT),wp('exit-gate-unpaid',exit.center.x,g,exit.center.z+exit.depth/2+.45,outT),
      wp('exit-west',exit.center.x,g,layout.nodes.entrance.z-.2,walk('exiting')),
      wp('exit-turn',layout.nodes.stairFoot.x,g,layout.nodes.entrance.z-.2,walk('exiting')),
      wp('city-exit',layout.nodes.stairFoot.x,g,layout.nodes.forecourt.z+1,walk('exiting')));
    const down=route(descending);
    this.exitAnchor=down.at(-1)!;
    const waitingArea=layout.areas.find(a=>a.id==='waiting-east')!;
    const slots:StationPoint[]=[];
    for(let x=waitingArea.minX+2.2;x<waitingArea.maxX-.8;x+=2.2){
      const z=(waitingArea.minZ+waitingArea.maxZ)/2;
      if(Array.from({length:41},(_,i)=>({x,y:p,z:access.z+1.9+(z-access.z-1.9)*i/40})).every(q=>stationPositionValid(layout,q)))slots.push({x,y:p,z});
    }
    const inCorridor: Waypoint[]=[ascending.at(-1)!];
    for(const [i,q]of slots.entries()){
      const locks=['waiting-junction:'+i],inZ=ascending.at(-1)!.p.z,outZ=descending[0].p.z;
      inCorridor.push(wp('in-before-'+i,q.x-.8,p,inZ,walk('platform')),wp('in-mid-'+i,q.x,p,inZ,walk('platform',locks)),wp('in-after-'+i,q.x+.8,p,inZ,walk('platform',locks)));
      const wait=at('wait-'+i,q,'platform',locks);
      const inRoute=route([...inCorridor.slice(0,-1),wait]);
      const outCorridor: Waypoint[]=[wait,wp('out-cross-'+i,q.x,p,inZ,walk('returning',locks)),wp('out-mid-'+i,q.x,p,outZ,walk('returning',locks)),wp('out-before-'+i,q.x-.8,p,outZ,walk('returning',locks))];
      for(let j=i-1;j>=0;j--){const r=slots[j],lock=['waiting-junction:'+j];outCorridor.push(wp('out-after-'+j,r.x+.8,p,outZ,walk('returning')),wp('out-mid-'+j,r.x,p,outZ,walk('returning',lock)),wp('out-before-'+j,r.x-.8,p,outZ,walk('returning',lock)));}
      const outRoute=route([...outCorridor,descending[0]]);
      this.waiting.push({id:'waiting-'+i,node:inRoute.at(-1)!,inbound:inRoute,outbound:[...outRoute,...down.slice(1)]});
    }
    let checked=0,samples=0;
    for(const [from,list]of edges)for(const e of list)if(e.station){
      const a=nodes[from],b=nodes[e.to],n=Math.ceil(distance(a,b)/.05);checked++;
      for(let i=0;i<=n;i++){const t=n?i/n:0,q={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};samples++;
        if(!stationPositionValid(layout,q))throw new Error(`Invalid station link ${a.station??'forecourt'} → ${b.station}: ${JSON.stringify(q)}`);
      }
    }
    this.validation={edges:checked,samples};
  }
}
