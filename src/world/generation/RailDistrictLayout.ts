import { seededRandom } from '../simulation/WorldRules.ts';
import { STATION, createStationLayout } from './StationLayout.ts';
import type { Bounds } from '../types.ts';

export interface RailDistrictParcel { id:string; x:number; z:number; width:number; depth:number; floors:number; family:number; palette:number; kind:'apartment'|'office'|'retail'|'izakaya'; stair:boolean; bay:boolean; footprint:Bounds; collision:Bounds }
export interface RailDistrictObstacle extends Bounds { id:string; minY:number; maxY:number; kind:'pier'|'cabinet'|'fence'|'bicycle'|'wayfinding' }
export const RAIL_DISTRICT = {
  train:{minX:-151,maxX:221,minZ:STATION.trackZ-1.65,maxZ:STATION.trackZ+1.65,minY:6.98,maxY:11.05},
  mainRoad:{minX:-5.9,maxX:5.9,minZ:-75,maxZ:-51},
  residentialRoad:{minX:27.5,maxX:32.5,minZ:-65,maxZ:-46},
  serviceLane:{minZ:-64.9,maxZ:-62.3},
  pierXs:[-65,-49,-33,-17,-7.8,7.8,15,26.4,33.6,47,63],
  portals:[{minX:-7.8,maxX:7.8,bottom:4.95,top:5.95},{minX:26.4,maxX:33.6,bottom:5.10,top:5.95}],
} as const;
export const railRectsOverlap=(a:Bounds,b:Bounds)=>a.minX<b.maxX&&a.maxX>b.minX&&a.minZ<b.maxZ&&a.maxZ>b.minZ;
export function railPierObstacles():RailDistrictObstacle[]{return RAIL_DISTRICT.pierXs.map(x=>({id:'rail-pier-'+x,kind:'pier',minX:x-.95,maxX:x+.95,minZ:-58.5,maxZ:-55.5,minY:0,maxY:6}));}
/** Conservative reservations include closed storefronts and their projecting low fixtures. */
export function railDistrictLayout(seed:number,existing:Bounds[]=[]):{parcels:RailDistrictParcel[];obstacles:RailDistrictObstacle[]}{
  const rng=seededRandom(seed^0x5241494c),parcels:RailDistrictParcel[]=[],obstacles:RailDistrictObstacle[]=railPierObstacles();
  const station=createStationLayout(),groundStation=station.boxes.filter(b=>b.minY<.3&&b.maxY>.3);
  const add=(x:number,z:number,width:number,depth:number,floors:number,family:number,bay=false,prefix=bay?'under-rail-':'north-block-')=>{
    const footprint={minX:x-width/2-.15,maxX:x+width/2+.15,minZ:z-depth-.15,maxZ:z+1.4};
    if([...existing,...groundStation,...parcels.map(p=>p.collision),RAIL_DISTRICT.mainRoad,RAIL_DISTRICT.residentialRoad].some(r=>railRectsOverlap(footprint,r)))return;
    const kinds=['retail','izakaya','office','retail','apartment'] as const;
    parcels.push({id:prefix+parcels.length,x,z,width,depth,floors,family,palette:Math.floor(rng()*8),kind:kinds[family],stair:!bay&&family===4,bay,footprint,collision:{...footprint}});
  };
  for(const [start,end]of [[-70,-9],[9,70]]){
    let cursor=start,index=start<0?0:2;
    while(cursor<end-5){const width=Math.min(5.4+rng()*3.2,end-cursor-1.3);if(width<4.2)break;
      const depth=5.8+rng()*1.7,floors=[3,5,4,2,6,4,3][index%7];add(cursor+width/2,-66.45-rng()*.25,width,depth,floors,index%5);cursor+=width+1.3;index++;
    }
  }
  // Infill fits between real piers/supports; no bay is forced into an occupied parcel.
  for(const [x,z,w,d,family]of [[-41.3,-53.8,7.0,4.0,1],[-24.6,-53.8,6.8,4.0,0],[43.2,-48.8,6.8,4.0,1],[55.1,-48.8,6.8,4.0,0]])add(x,z,w,d,1,family,true);
  // Rear-facing windows overlook the rail service court; fronts address its city-side access.
  // Keep the route around both ends and the apron in front of the viaduct tenancies open.
  add(-34,-41.8,6.2,6.0,3,3,false,'south-court-');
  add(-24,-41.8,6.0,5.8,4,2,false,'south-court-');
  for(const x of [-49,15,47])obstacles.push({id:'rail-electrical-'+x,kind:'cabinet',minX:x-.55,maxX:x+.55,minZ:-59.6,maxZ:-58.75,minY:0,maxY:1.81});
  for(const [a,b]of [[-71,-8],[8,27],[33,45.5],[48.5,71]])obstacles.push({id:'service-fence-'+a,kind:'fence',minX:a,maxX:b,minZ:-61.65,maxZ:-61.59,minY:0,maxY:1.8});
  // A closed, visibly hinged maintenance gate, independent of NPC fare gates.
  obstacles.push({id:'maintenance-gate',kind:'fence',minX:45.46,maxX:48.54,minZ:-61.8,maxZ:-61.44,minY:0,maxY:1.84});
  for(const x of [9.0,10.2,11.4])obstacles.push({id:'station-cycle-'+x,kind:'bicycle',minX:x-.34,maxX:x+.34,minZ:-40.9,maxZ:-39.1,minY:0,maxY:1.25});
  obstacles.push({id:'station-wayfinding',kind:'wayfinding',minX:7.65,maxX:8.15,minZ:-41.8,maxZ:-41.4,minY:0,maxY:2.8});
  return {parcels,obstacles};
}
