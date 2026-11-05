import {businessOpen} from '../simulation/WorldRules.ts';
import {shindoRoom} from './ShindoAcoustics.ts';
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
/** Ear-space acoustic zones follow the real shaft and room; exterior transmission uses the doorway. */
export function venueMusicMix(p:{x:number;y:number;z:number},kind:'shindo'|'jazz',hour:number,portalOpen=true){
 if(![p.x,p.y,p.z,hour].every(Number.isFinite))return{inside:0,outside:0,cutoff:250,zone:'invalid',portal:{x:0,y:0,z:0}};
 const open=businessOpen('restaurant',hour),portal=kind==='shindo'?{x:19.5,y:.95,z:-27.4}:{x:-11.8,y:1.35,z:-22.2};
 const distance=Math.hypot(p.x-portal.x,p.y-portal.y,p.z-portal.z),attenuation=(1-smooth(14,24,distance))/(1+(distance/4)**2);
 if(kind==='jazz')return{inside:0,outside:open?.035*attenuation:0,cutoff:p.z< -22.2?2300:550,zone:'jazz-frontage',portal};
 const {room,stair,depth,blend:roomBlend}=shindoRoom(p);
 const progress=room?Math.max(depth*.7,roomBlend):stair?depth:0;
 const direct=p.x>18.6&&p.x<20.4&&p.z>=-27.6;
 const transmission=portalOpen?1:.09;
 return{inside:open?(room?.17+.08*roomBlend:stair?.17*progress*transmission:0):0,
  outside:open?(room?0:stair?.018*(1-depth):.018*attenuation*(direct?1:.18))*transmission:0,
  cutoff:room?14100+3400*roomBlend:stair?600+progress*progress*13500:direct&&portalOpen?2100:320,
  zone:room?'basement':stair?'stairwell':direct?'entrance':'through-wall',portal};
}
