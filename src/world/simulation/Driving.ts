import type {Vehicle} from './CitySimulation.ts';
import {dayState,sampleLane} from './WorldRules.ts';
import {VEHICLE_PROFILES} from './VehicleCatalog.ts';
export interface VehicleLights {indicator:'none'|'left';blink:boolean;brake:boolean;headlights:boolean;taillights:boolean;edges:number}
export const vehicleLights=():VehicleLights=>({indicator:'none',blink:false,brake:false,headlights:false,taillights:false,edges:0});
/** Discrete stopping envelope includes the next fixed-step integration interval. */
export function safeDrivingSpeed(distance:number,braking:number,dt:number):number {
  return Math.max(0,Math.sqrt(Math.max(0,distance)*2*braking+(braking*dt)**2)-braking*dt);
}
export function updateVehicleLights(c:Vehicle,clock:number,hour:number,wet:boolean,dt:number):void {
  const end=c.route.distances.at(-2)!,start=c.route.distances[1],p=VEHICLE_PROFILES[c.kind];
  const indicator=c.route.turn&&c.s>=start-Math.max(14,c.speed*3)&&c.s<end+p.length*.5+1?'left':'none';
  const blink=indicator!=='none'&&((clock+c.driver.indicatorPhase)%.75)<.375;
  if(blink!==c.lights.blink)c.lights.edges++;
  c.lights.indicator=indicator;c.lights.blink=blink;
  c.lights.brake=c.acceleration<-.18||c.speed<.12;
  c.braking=c.lights.brake;c.lights.headlights=dayState(hour).night>.2||wet;c.lights.taillights=c.lights.headlights;
  const ahead=sampleLane(c.route,c.s+1.5),delta=Math.atan2(Math.sin(ahead.yaw-c.yaw),Math.cos(ahead.yaw-c.yaw));
  const desired=Math.max(-.5,Math.min(.5,Math.atan(p.wheelbase*delta/1.5)));
  c.steering+=Math.sign(desired-c.steering)*Math.min(Math.abs(desired-c.steering),c.driver.steeringRate*dt);
}
