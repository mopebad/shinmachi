import type { Pedestrian } from './CitySimulation.ts';
import { pedestrianSurfaceHeight } from './CharacterPose.ts';

export interface WalkingFoot {x:number;y:number;z:number;yaw:number;fromX:number;fromZ:number;lastPhase:number;startPhase:number;swing:boolean;grounded:boolean;settling?:boolean;settled?:boolean}

export interface Locomotion {
  speed:number;travelSpeed:number;vx:number;vy:number;vz:number;worldSpeed:number;blend:number;distance:number;footfalls:number;
  idleSeconds:number;lookYaw:number;previousX:number;previousY:number;previousZ:number;previousYaw:number;previousPhase:number;feet:WalkingFoot[];
}
export function locomotion():Locomotion {return{speed:0,travelSpeed:0,vx:0,vy:0,vz:0,worldSpeed:0,blend:0,distance:0,footfalls:0,idleSeconds:0,lookYaw:0,previousX:0,previousY:0,previousZ:0,previousYaw:0,previousPhase:0,feet:[]};}
export function turnToward(from:number,to:number,limit:number):number {
  const d=Math.atan2(Math.sin(to-from),Math.cos(to-from));return from+Math.max(-limit,Math.min(limit,d));
}
/** Safety may reduce this distance further; it may never be increased by personality. */
export function walkingDistance(p:Pedestrian,dt:number,distance:number,factor=1):number {
  const traits=p.identity,target=Math.min(p.speed*factor,Math.sqrt(Math.max(0,distance)*2*traits.deceleration));
  p.motion.travelSpeed+=Math.sign(target-p.motion.travelSpeed)*Math.min(Math.abs(target-p.motion.travelSpeed),(target>p.motion.travelSpeed?traits.acceleration:traits.deceleration)*dt);
  return Math.min(distance,p.motion.travelSpeed*dt);
}
export function beginLocomotion(p:Pedestrian):void {
  const m=p.motion;m.previousX=p.x;m.previousY=p.y;m.previousZ=p.z;m.previousYaw=p.yaw;m.previousPhase=p.phase;
}
export function finishLocomotion(p:Pedestrian,dt:number,clock:number):void {
  const m=p.motion,traits=p.identity;
  m.vx=(p.x-m.previousX)/dt;m.vy=(p.y-m.previousY)/dt;m.vz=(p.z-m.previousZ)/dt;m.worldSpeed=Math.hypot(m.vx,m.vy,m.vz);
  const riding=p.rail?.state==='riding',distance=riding?0:Math.hypot(p.x-m.previousX,p.z-m.previousZ);
  m.speed=riding?0:Math.hypot(m.vx,m.vz);p.moving=m.speed>.015;
  m.blend+=(Math.min(1,m.speed/p.speed)-m.blend)*(1-Math.exp(-dt*10));m.distance+=distance;
  const stride=traits.strideLength*Math.max(.6,Math.min(1,m.speed/traits.preferredSpeed));
  p.phase=m.previousPhase+distance*Math.PI/stride;
  if(p.station?.flight&&distance>0) {
    m.footfalls+=Math.max(0,Math.floor(m.distance/.29)-Math.floor((m.distance-distance)/.29));
  } else m.footfalls+=Math.max(0,Math.floor((p.phase+Math.PI/2)/Math.PI)-Math.floor((m.previousPhase+Math.PI/2)/Math.PI));
  m.idleSeconds=p.moving?0:m.idleSeconds+dt;
  m.lookYaw=p.moving?0:Math.sin(clock*(.23+traits.cadence*.06)+traits.phase)*.15;
  if(p.activity?.state==='acting'&&p.activity.kind==='look-around')m.lookYaw=Math.sin(clock*.5+traits.phase)*.42;
  if(!p.station&&!p.rail)p.yaw=turnToward(m.previousYaw,p.yaw,traits.turningRate*dt);
  if(!p.moving)m.travelSpeed=Math.max(0,m.travelSpeed-traits.deceleration*dt);
  updateWalkingFeet(p,dt);
}

function updateWalkingFeet(p:Pedestrian,dt:number):void {
  const m=p.motion;if(p.station||p.rail){m.feet.length=0;return;}
  const scale=p.scale*1.08*(p.style===4?.96:1),cs=Math.cos(p.yaw),sn=Math.sin(p.yaw),stride=p.identity.strideLength*scale;
  for(let i=0;i<2;i++) {
    const side=i?1:-1,phase=((p.phase-Math.PI/2+i*Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
    const x=p.x+side*.09*scale*cs,z=p.z-side*.09*scale*sn;
    let f=m.feet[i];
    if(!f){f={x,y:pedestrianSurfaceHeight(x,z),z,yaw:p.yaw,fromX:x,fromZ:z,lastPhase:phase,startPhase:phase,swing:false,grounded:true};m.feet[i]=f;}
    if(m.speed<.04) {
      const delay=.12+i*.27;
      if(m.idleSeconds>delay&&!f.settled&&(f.settling||Math.hypot(f.x-x,f.z-z)>.10)){
        if(!f.settling){f.settling=true;f.fromX=f.x;f.fromZ=f.z;}
        const t=Math.min(1,(m.idleSeconds-delay)/.24),ease=t*t*(3-2*t);
        f.x=f.fromX+(x-f.fromX)*ease;f.z=f.fromZ+(z-f.fromZ)*ease;
        f.y=pedestrianSurfaceHeight(f.x,f.z)+Math.sin(Math.PI*t)*.045*scale;f.yaw=turnToward(f.yaw,p.yaw,p.identity.turningRate*dt);f.grounded=t===1;
        if(t===1){f.settled=true;f.settling=false;}
      }else{f.y=Math.max(pedestrianSurfaceHeight(f.x,f.z),f.y-.8*dt);f.grounded=Math.abs(f.y-pedestrianSurfaceHeight(f.x,f.z))<1e-6;}
      f.swing=false;f.lastPhase=phase;continue;
    }
    f.settled=false;f.settling=false;
    if(phase<f.lastPhase||phase<Math.PI*1.10) {
      f.swing=false;f.grounded=true;f.y=pedestrianSurfaceHeight(f.x,f.z);
    } else {
      if(!f.swing){f.swing=true;f.startPhase=phase;f.fromX=f.x;f.fromZ=f.z;}
      const t=Math.min(1,(phase-f.startPhase)/(Math.PI*2-f.startPhase)),ease=t*t*(3-2*t),lead=stride*.47;
      f.x=f.fromX+(x+sn*lead-f.fromX)*ease;f.z=f.fromZ+(z+cs*lead-f.fromZ)*ease;
      f.y=pedestrianSurfaceHeight(f.x,f.z)+Math.sin(Math.PI*t)*.065*scale;f.yaw=turnToward(f.yaw,p.yaw,p.identity.turningRate*dt);f.grounded=t<1e-5;
    }
    f.lastPhase=phase;
  }
}
