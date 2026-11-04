import type {Pedestrian} from './CitySimulation.ts';
import type {Navigation} from './Navigation.ts';
import {pointBlocked,segmentClear} from './Navigation.ts';
import type {Bounds} from '../types.ts';
import {businessOpen,seededRandom} from './WorldRules.ts';
import type {Business,Point} from './WorldRules.ts';
import {walkingDistance} from './Locomotion.ts';

export type StreetAction='phone'|'browse'|'restaurant-wait'|'look-around'|'conversation';
export interface ActivityZone {id:number;anchor:number;business:Business;spots:Point[];facing:number}
export interface StreetActivity {kind:StreetAction;state:'approaching'|'acting'|'returning';zone:number;spot:number;origin:Point;started:number;elapsed:number;duration:number;blocked:number;partner?:number}
export interface Companion {uid:number;since:number}
export interface ActivityEvent {clock:number;uid:number;kind:StreetAction;state:string;zone:number}

/** Optional branches use clear frontage pockets; the original route is kept throughout. */
export class StreetLife {
  readonly zones:ActivityZone[]=[];
  readonly events:ActivityEvent[]=[];
  readonly metrics={started:0,completed:0,cancelled:0,pairs:0,conversations:0,maxActive:0};
  private readonly rng:()=>number;
  private readonly bounds:Bounds[];
  private nextSocial=0;
  constructor(nav:Navigation,bounds:Bounds[],seed:number){
    this.rng=seededRandom(seed^0x7131fe);this.bounds=bounds;
    for(const n of nav.nodes.filter(n=>n.door&&n.area==='commercial')){
      const d=n.door!,anchor=nav.edges.get(n.id)?.map(e=>nav.nodes[e.to]).find(a=>!a.door&&!a.station);
      if(!anchor||Math.abs(anchor.x)>5||Math.abs(d.x)>6.6||d.z>0&&d.z<23||d.z< -43)continue;
      const side=Math.sign(d.x),spots:Point[]=[];
      for(const dz of [.85,1.55,-.85,-1.55]){
        const spot={x:side*5.55,z:d.z+dz};
        if(pointBlocked(spot,bounds,.29)||!segmentClear(anchor,spot,bounds,.29)||spots.some(s=>Math.hypot(s.x-spot.x,s.z-spot.z)<.65))continue;
        spots.push(spot);if(spots.length===2)break;
      }
      if(spots.length)this.zones.push({id:this.zones.length,anchor:anchor.id,business:d.business??'retail',spots,facing:side*Math.PI/2});
    }
  }
  private event(p:Pedestrian,clock:number,state:string):void {
    const a=p.activity!;this.events.push({clock,uid:p.identity.uid,kind:a.kind,state,zone:a.zone});if(this.events.length>512)this.events.shift();
  }
  private free(zone:ActivityZone,spot:number,peers:Pedestrian[]):boolean {
    const point=zone.spots[spot];return peers.every(q=>!q.active||!q.activity&&Math.hypot(q.x-point.x,q.z-point.z)>.65||q.activity&&(q.activity.zone!==zone.id||q.activity.spot!==spot)&&Math.hypot(q.x-point.x,q.z-point.z)>.65);
  }
  consider(p:Pedestrian,peers:Pedestrian[],clock:number,hour:number):void {
    if(p.activity||p.station||p.crossing||p.rail||p.retiring||(p.activityCooldown??0)>clock||this.rng()>p.identity.optionalChance)return;
    const zone=this.zones.find(z=>(z.anchor===p.node||z.spots.some(s=>Math.hypot(s.x-p.x,s.z-p.z)<1.65))&&businessOpen(z.business,hour));if(!zone)return;
    const index=zone.spots.findIndex((s,i)=>this.free(zone,i,peers)&&segmentClear(p,s,this.bounds,.29));if(index<0)return;
    const kind:StreetAction=zone.business==='restaurant'?'restaurant-wait':zone.business==='retail'?'browse':p.identity.uid%3===0?'look-around':'phone';
    const start=(person:Pedestrian,spot:number,action:StreetAction,partner?:number)=>{
      person.activity={kind:action,state:'approaching',zone:zone.id,spot,origin:{x:person.x,z:person.z},started:clock,elapsed:0,duration:5+(person.identity.uid%8),blocked:0,partner};
      this.metrics.started++;this.event(person,clock,'approaching');
    };
    const partner=p.companion&&peers.find(q=>q.active&&q.identity.uid===p.companion!.uid&&!q.activity&&!q.station&&!q.crossing&&q.node===p.node&&Math.hypot(q.x-p.x,q.z-p.z)<1.6);
    const second=partner&&zone.spots.findIndex((s,i)=>i!==index&&this.free(zone,i,peers)&&segmentClear(partner,s,this.bounds,.29));
    if(partner&&second!==undefined&&second>=0){start(p,index,'conversation',partner.identity.uid);start(partner,second,'conversation',p.identity.uid);this.metrics.conversations++;}
    else start(p,index,kind);
  }
  move(p:Pedestrian,dt:number,clock:number,hour:number,move:(x:number,z:number,tx:number,tz:number)=>boolean):boolean {
    const a=p.activity;if(!a)return false;const zone=this.zones[a.zone];
    if((!businessOpen(zone.business,hour)||p.retiring||clock-a.started>45)&&a.state!=='returning'){
      a.state='returning';a.blocked=0;this.metrics.cancelled++;this.event(p,clock,'returning');
    }
    if(a.state==='acting'){
      const partner=zone.spots.find((_,i)=>i!==a.spot);
      p.yaw=a.kind==='conversation'&&partner?Math.atan2(partner.x-p.x,partner.z-p.z):zone.facing;a.elapsed+=dt;
      if(a.elapsed>=a.duration){a.state='returning';a.blocked=0;this.event(p,clock,'returning');}
      return true;
    }
    const target=a.state==='approaching'?zone.spots[a.spot]:a.origin,dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);
    if(d<.035){
      if(a.state==='approaching'){a.state='acting';a.elapsed=0;p.yaw=zone.facing;this.event(p,clock,'acting');}
      else{this.event(p,clock,'completed');p.activity=undefined;p.activityCooldown=clock+65;this.metrics.completed++;p.progress=undefined;}
      return true;
    }
    const distance=walkingDistance(p,dt,d,.75);
    if(move(p.x+dx/d*distance,p.z+dz/d*distance,target.x,target.z)){p.yaw=Math.atan2(dx,dz);a.blocked=0;}
    else{a.blocked+=dt;if(a.blocked>8&&a.state==='approaching'){a.state='returning';a.blocked=0;this.event(p,clock,'returning');}}
    return true;
  }
  update(peers:Pedestrian[],clock:number,hour:number):void {
    this.metrics.maxActive=Math.max(this.metrics.maxActive,peers.filter(p=>p.active&&p.activity).length);
    if(clock<this.nextSocial)return;this.nextSocial=clock+2;
    for(const p of peers){
      const q=p.companion&&peers.find(q=>q.active&&q.identity.uid===p.companion!.uid);
      if(p.companion&&(!q||p.station||q.station||p.retiring||q.retiring||p.path[p.next]!==q.path[q.next]||Math.hypot(p.x-q.x,p.z-q.z)>3.5)){if(q)q.companion=undefined;p.companion=undefined;}
    }
    for(const p of peers){
      if(!p.active||p.companion||p.activity||p.station||p.crossing||p.retiring||this.rng()>p.identity.socialChance)continue;
      const q=peers.find(q=>q!==p&&q.active&&!q.companion&&!q.activity&&!q.station&&!q.crossing&&!q.retiring&&q.node===p.node&&q.path[q.next]===p.path[p.next]&&Math.hypot(q.x-p.x,q.z-p.z)>.6&&Math.hypot(q.x-p.x,q.z-p.z)<1.6);
      if(q){p.companion={uid:q.identity.uid,since:clock};q.companion={uid:p.identity.uid,since:clock};this.metrics.pairs++;}
    }
    for(const p of peers)if(p.active&&p.wait<=0)this.consider(p,peers,clock,hour);
  }
}
