import { STATION, stationBodyBlocked, stationSupport } from '../generation/StationLayout.ts';
import type { StationPoint, StationSpatial } from '../generation/StationLayout.ts';
import { RAIL_VEHICLE, railGeometry } from './RailGeometry.ts';
import { trainDoorDefinitions } from './TrainDoors.ts';
import type { TrainDoorSnapshot } from './TrainDoors.ts';

export const PASSENGER_SPACE = { separation: .62, radius: .25, aisleZ: -.55, speed: .95 } as const;
export interface TrainBerth { id: string; doorId: string; car: number; localX: number; localZ: number }
export function trainBerths(perDoor = 2): TrainBerth[] {
  return trainDoorDefinitions().filter(d=>d.side===1).flatMap(d=>Array.from({length:perDoor},(_,i)=>({
    id:d.id+':standing-'+i,doorId:d.id,car:d.car,localX:d.localX+(i===0?-.7:.7),localZ:PASSENGER_SPACE.aisleZ })));
}
export function pointPathDistance(p: StationPoint, path: StationPoint[]): number {
  let result=Infinity;
  for(let i=1;i<path.length;i++) {
    const a=path[i-1],b=path[i],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,length=dx*dx+dy*dy+dz*dz;
    const t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/length)):0;
    result=Math.min(result,Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t,p.z-a.z-dz*t));
  }
  return result;
}
export function transferPathsConflict(a: StationPoint[], b: StationPoint[]): boolean {
  for(let i=1;i<a.length;i++) {
    const from=a[i-1],to=a[i],n=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.15));
    for(let j=0;j<=n;j++)if(pointPathDistance({x:from.x+(to.x-from.x)*j/n,y:from.y,z:from.z+(to.z-from.z)*j/n},b)<PASSENGER_SPACE.separation+.08)return true;
  }
  return false;
}

/** Uses the existing circulation lane, bypassing waiting people and the real stairwell before the west doors. */
export function passengerTransferPath(layout: StationSpatial, door: TrainDoorSnapshot, waiting: StationPoint, berth: TrainBerth, trainX: number): StationPoint[] {
  const x=(door.opening.minX+door.opening.maxX)/2,y=layout.boardingFrontage.y,at=(x:number,z:number)=>({x,y,z});
  const neck=layout.surfaces.find(s=>s.id==='platform-east')!.minX+1.09,corridorZ=layout.nodes.platformAccess.z+1.2;
  const path=[{x:waiting.x,y:waiting.y,z:waiting.z},at(waiting.x,corridorZ)];
  if(x<neck)path.push(at(neck,corridorZ),at(neck,-53.85),at(x,-53.85));else path.push(at(x,corridorZ));
  path.push({...door.boarding.platformPoint!},{...door.boarding.approach!.edgePoint}, {...door.boarding.thresholdPoint},
    {...door.boarding.interiorPoint},at(x,STATION.trackZ+PASSENGER_SPACE.aisleZ),at(trainX+berth.localX,STATION.trackZ+berth.localZ));
  return path.filter((p,i)=>!i||Math.hypot(p.x-path[i-1].x,p.z-path[i-1].z)>1e-8);
}

/** Height-bearing platform, this exact conditional sill gap, or the real carriage floor; never a general track surface. */
export function passengerPositionValid(layout: StationSpatial, p: StationPoint, door: TrainDoorSnapshot, berth: TrainBerth, trainX: number): boolean {
  if(Math.abs(p.y-RAIL_VEHICLE.sillY)>.001 || stationBodyBlocked(layout,p.x,p.z,p.y))return false;
  if(p.z>=STATION.platformEdgeZ)return stationSupport(layout,p.x,p.z,p.y)!==null;
  const doorX=(door.opening.minX+door.opening.maxX)/2;
  if(p.z>=STATION.trackZ+1.075)return Math.abs(p.x-doorX)<=RAIL_VEHICLE.doorWidth/2-PASSENGER_SPACE.radius && door.boarding.approach?.clear===true;
  const center=trainX+railGeometry().centers[berth.car];
  return Math.abs(p.x-center)<=RAIL_VEHICLE.carLength/2-.3 && Math.abs(p.z-STATION.trackZ)<=1.075;
}
