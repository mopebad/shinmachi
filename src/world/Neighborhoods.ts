import type {Business,Point} from './simulation/WorldRules.ts';
import {STATION} from './generation/StationLayout.ts';
import type {Bounds} from './types.ts';

export type NeighborhoodId='commercial'|'station'|'residential'|'nightlife';
export const NEIGHBORHOODS={
 commercial:{name:'Shinmachi-dori',character:'mixed-age retail corridor',bounds:{minX:-21,maxX:21,minZ:-51,maxZ:67}},
 station:{name:'Shinmachi station quarter',character:'commuter services and rail-side offices',bounds:{minX:-71,maxX:71,minZ:-75,maxZ:-47}},
 residential:{name:'Higashi residential lane',character:'small residences, walk-ups and local apartments',bounds:{minX:22,maxX:44,minZ:-46,maxZ:64}},
 nightlife:{name:'Yoto / Lantern Alley',character:'small restaurants, bars and theatre',bounds:{minX:-23,maxX:23,minZ:-28,maxZ:-22}},
} as const;
const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const influence=(p:Point,b:{minX:number;maxX:number;minZ:number;maxZ:number},fade:number)=>1-smooth(0,fade,Math.hypot(Math.max(b.minX-p.x,0,p.x-b.maxX),Math.max(b.minZ-p.z,0,p.z-b.maxZ)));
/** One shared world-space lookup. Weights blend across streets without creating navigation areas. */
export function neighborhoodAt(p:Point):{id:NeighborhoodId;weights:Record<NeighborhoodId,number>}{
 const station=Math.max(influence(p,NEIGHBORHOODS.station.bounds,6),influence(p,{minX:8,maxX:26,minZ:-52,maxZ:-38},5));
 const nightlife=(1-station)*influence(p,NEIGHBORHOODS.nightlife.bounds,6);
 const residential=(1-station-nightlife)*influence(p,NEIGHBORHOODS.residential.bounds,6)*smooth(7,14,Math.abs(p.z-12));
 const weights={commercial:Math.max(0,1-station-nightlife-residential),station,residential,nightlife};
 const id=(Object.keys(weights) as NeighborhoodId[]).reduce((a,b)=>weights[b]>weights[a]?b:a,'commercial');return{id,weights};
}
/** Gentle preference only: existing pathfinding, admission, reservations and global population stay authoritative. */
export function neighborhoodDestinationWeight(p:Point,hour:number,purpose:string,business?:Business):number{
 const h=((hour%24)+24)%24,w=neighborhoodAt(p).weights,evening=smooth(15,20,h)*(1-smooth(23,24,h));
 const local=purpose==='leisure'||purpose==='student'?1.05:.68;
 return w.commercial*(business==='retail'||business==='convenience'?1.16:1)+w.station*(purpose==='office'||purpose==='commuter'?1.2:.95)+w.residential*local+w.nightlife*(business==='restaurant'?1.03+.35*evening:.9);
}
export function neighborhoodOptionalWeight(p:Point):number{const w=neighborhoodAt(p).weights;return w.commercial*1.08+w.station*.92+w.residential*.65+w.nightlife*1.15;}

export interface NeighborhoodParcel extends Point {width:number;depth:number;floors:number;kind:string;palette:number;rotation:number;heroStreet?:number}
export const NEIGHBORHOOD_RAIL_CLEARANCE={minZ:STATION.trackZ-4.6,maxZ:STATION.trackZ+4.7} as const;
/** Existing unconnected office parcels sometimes cross the line. Keep the largest valid strip of that same lot. */
export function neighborhoodParcel<T extends NeighborhoodParcel>(p:T):T&{railAdjusted:boolean;cornerAdjusted:boolean;parcelAdjusted:boolean;renderable:boolean}{
 const base={...p,railAdjusted:false,cornerAdjusted:false,parcelAdjusted:false,renderable:true};
 // Rear wings of the two east-lane corner apartments previously occupied the avenue shop lots.
 if(p.kind==='apartment'&&p.x>30&&p.x<35&&(p.z-p.width/2<4.4&&p.z+p.width/2> -4.6||p.z-p.width/2<28.6&&p.z+p.width/2>19.6))return{...base,depth:Math.min(p.depth,5.2),cornerAdjusted:true};
 const rail=NEIGHBORHOOD_RAIL_CLEARANCE,lo=p.z-p.width/2,hi=p.z+p.width/2;
 if(p.kind!=='office'||p.heroStreet!==undefined||Math.abs(Math.abs(p.rotation)-Math.PI/2)>.001||lo>=rail.maxZ||hi<=rail.minZ)return base;
 const strips=[[lo+.16,Math.min(hi-.16,rail.minZ-.16)],[Math.max(lo+.16,rail.maxZ+.16),hi-.16]].filter(([a,b])=>b-a>=2).sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]));
 if(!strips.length)return{...base,railAdjusted:true,renderable:false};
 const [a,b]=strips[0],width=b-a;return{...base,z:(a+b)/2,width,depth:p.depth-.16,floors:width<4.5?Math.min(3,p.floors):p.floors,railAdjusted:true};
}
export function neighborhoodFootprint(p:NeighborhoodParcel):Bounds{
 const c=Math.cos(p.rotation),s=Math.sin(p.rotation),points=[[-p.width/2-.12,.1],[p.width/2+.12,.1],[-p.width/2-.12,-p.depth-.08],[p.width/2+.12,-p.depth-.08]].map(([x,z])=>({x:p.x+x*c+z*s,z:p.z-x*s+z*c}));
 return{minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z))};
}
/** Retain a frontage strip inside an existing backland office lot instead of overlapping an earlier parcel. */
export function fitNeighborhoodParcel<T extends NeighborhoodParcel&{renderable:boolean}>(p:T,occupied:Bounds[]):T&{parcelAdjusted:boolean}{
 if(!p.renderable||p.kind!=='office'||p.heroStreet!==undefined||Math.abs(p.x)<35||Math.abs(Math.abs(p.rotation)-Math.PI/2)>.001)return{...p,parcelAdjusted:false};
 const box=neighborhoodFootprint(p);let strips=[[p.z-p.width/2,p.z+p.width/2]],changed=false;
 for(const b of occupied){if(box.minX>=b.maxX+.15||box.maxX<=b.minX-.15)continue;
  const next:number[][]=[];for(const [a,c]of strips){if(c<=b.minZ-.28||a>=b.maxZ+.28){next.push([a,c]);continue;}changed=true;if(a<b.minZ-.28)next.push([a,Math.min(c,b.minZ-.28)]);if(c>b.maxZ+.28)next.push([Math.max(a,b.maxZ+.28),c]);}strips=next;
 }
 if(!changed)return{...p,parcelAdjusted:false};
 const allowed=strips.filter(([a,b])=>b-a>=2.4).sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]));if(!allowed.length)return{...p,renderable:false,parcelAdjusted:true};
 const [a,b]=allowed[0],width=b-a;return{...p,z:(a+b)/2,width,depth:p.depth-.08,floors:width<4.5?Math.min(3,p.floors):p.floors,parcelAdjusted:true};
}
export const RESIDENTIAL_FAMILIES=['rendered-walkup','tile-mansion','small-residence','renovated-apartments'] as const;
export function parcelHash(p:Point,seed=8412):number{let h=Math.imul(Math.round(p.x*100),0x45d9f3b)^Math.imul(Math.round(p.z*100),0x27d4eb2d)^seed;h=Math.imul(h^(h>>>16),0x7feb352d);return(h^(h>>>15))>>>0;}
export function neighborhoodBuilding(p:NeighborhoodParcel,seed=8412){
 const hash=parcelHash(p,seed),local=p.kind==='apartment'&&p.x>=25&&p.x<=35&&Math.abs(Math.abs(p.rotation)-Math.PI/2)<.001;
 const family=local?((Math.floor((p.z+50)/10)+(p.x>30?2:0))%4+4)%4:hash%3;
 const style=local?RESIDENTIAL_FAMILIES[family]:p.kind==='office'?['postwar-office','renovated-office','ceramic-office'][family]:'existing-frontage';
 return {district:neighborhoodAt(p).id,family,style,variant:hash%7,replace:local||p.kind==='office'&&p.heroStreet===undefined,
  floors:local&&family===2?2:local?Math.max(2,Math.min(4,p.floors)):p.floors,signage:local?'entry-plaque':p.kind==='office'?'tenancy-directory':'retail-frontage'};
}
