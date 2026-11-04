import type { Pedestrian } from './CitySimulation.ts';
type P={x:number;y:number;z:number};
/** Feet are planted by the authoritative locomotion step; rendering solves connected 3D limbs. */
export function walkingPose(p:Pedestrian,scale:number):{rootY:number;legs:{hip:P;knee:P;ankle:P;foot:P;yaw:number}[]}|null {
  if(p.station||p.rail||p.motion.feet.length!==2)return null;
  const cs=Math.cos(p.yaw),sn=Math.sin(p.yaw),length=.34*scale;
  let hipY=p.y+.74*scale;
  for(let i=0;i<2;i++) {
    const f=p.motion.feet[i],side=i?1:-1,x=p.x+side*.09*scale*cs,z=p.z-side*.09*scale*sn;
    hipY=Math.min(hipY,f.y+.06*scale+Math.sqrt(Math.max(.01,(.675*scale)**2-(f.x-x)**2-(f.z-z)**2)));
  }
  const legs=p.motion.feet.map((f,i)=>{
    const side=i?1:-1,hip={x:p.x+side*.09*scale*cs,y:hipY,z:p.z-side*.09*scale*sn},ankle={x:f.x,y:f.y+.06*scale,z:f.z};
    const dx=ankle.x-hip.x,dy=ankle.y-hip.y,dz=ankle.z-hip.z,d=Math.hypot(dx,dy,dz),dot=(sn*dx+cs*dz)/(d*d);
    let bx=sn-dx*dot,by=-dy*dot,bz=cs-dz*dot;const norm=Math.hypot(bx,by,bz);bx/=norm;by/=norm;bz/=norm;
    const bend=Math.sqrt(Math.max(0,length*length-d*d/4)),knee={x:(hip.x+ankle.x)/2+bx*bend,y:(hip.y+ankle.y)/2+by*bend,z:(hip.z+ankle.z)/2+bz*bend};
    return {hip,knee,ankle,foot:{x:f.x,y:f.y,z:f.z},yaw:f.yaw};
  });
  return{rootY:hipY-.79*scale,legs};
}
