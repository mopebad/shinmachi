import type { StationSpatial } from '../generation/StationLayout.ts';
import type { Pedestrian } from './CitySimulation.ts';
import { legPose } from './CharacterPose.ts';

/** Two-bone foot placement on actual treads. This changes articulation, never the simulated route/root position. */
export function stationStairPose(layout: StationSpatial,p: Pedestrian,scale: number): {rootY: number; legs: ReturnType<typeof legPose>[]; feet: {x:number;y:number;z:number;grounded:boolean}[]} | null {
  const flight=layout.flights.find(f=>f.id===p.station?.flight);if(!flight)return null;
  const descending=p.station?.state==='descending',direction=Math.sign(flight.to.x-flight.from.x)*(descending?-1:1);
  const treads=descending?[...flight.treads].reverse():flight.treads;
  const start=descending?flight.to:flight.from,end=descending?flight.from:flight.to;
  const progress=(p.x-start.x)*direction/flight.going-.5;
  const support=(i: number)=>i<0?{x:start.x-direction*.1,y:start.y}:i>=treads.length?{x:end.x+direction*.1,y:end.y}:{x:(treads[i].minX+treads[i].maxX)/2,y:treads[i].y};
  const cs=Math.cos(p.yaw),sn=Math.sin(p.yaw);
  const feet=[0,1].map(side=>{
    let q=(progress+side)/2,base=Math.floor(q)*2-side,phase=q-Math.floor(q);
    let t=Math.max(0,(phase-.55)/.45);t=t*t*(3-2*t);
    if(!p.moving){base=Math.round(progress);t=0;}
    const a=support(base),b=support(base+2),lift=p.moving?Math.sin(Math.PI*t)*.18:0;
    const x=a.x+(b.x-a.x)*t+direction*(descending?.015:-.045)*scale,sideways=(side?1:-1)*.09*scale;
    return {x:x+sideways*cs,y:a.y+(b.y-a.y)*t+lift,z:p.z-sideways*sn,grounded:!p.moving||phase<=.55};
  });
  // Bend the pelvis enough for the stance foot on the lower tread; keep both limb lengths fixed.
  const ankles=feet.map(f=>({y:f.y+.06*scale,z:((f.x-p.x)*sn+(f.z-p.z)*cs)/scale}));
  const hipY=Math.min(p.y+.74*scale,...ankles.map(a=>a.y+Math.sqrt(Math.max(.001,(.675*scale)**2-(a.z*scale)**2))));
  const rootY=hipY-.79*scale;
  const legs=ankles.map(a=>{
    const hip={y:.79,z:0},ankle={y:(a.y-rootY)/scale,z:a.z},dy=ankle.y-hip.y,dz=ankle.z,d=Math.hypot(dy,dz),h=Math.sqrt(Math.max(0,.34**2-(d/2)**2));
    const knee={y:(hip.y+ankle.y)/2+dz/d*h,z:ankle.z/2-dy/d*h};
    return {hip,knee,ankle,upperRotation:Math.atan2(-knee.z,hip.y-knee.y),lowerRotation:Math.atan2(knee.z-ankle.z,knee.y-ankle.y)};
  });
  return {rootY,legs,feet};
}
