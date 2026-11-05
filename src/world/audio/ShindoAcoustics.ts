import {YOTO_VENUE,inVenueRect} from '../generation/YotoVenueLayout.ts';
export const unit=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(a:number,b:number,x:number)=>{const t=unit((x-a)/(b-a));return t*t*(3-2*t);};
/** Height-aware room influence also prevents street ambience leaking through the basement ceiling. */
export function shindoRoom(p:{x:number;y:number;z:number}){
 const room=inVenueRect(p,YOTO_VENUE.room)&&p.y<.4,stair=inVenueRect(p,YOTO_VENUE.shaft)&&p.y<3;
 const depth=unit((YOTO_VENUE.groundY-(p.y-1.705))/3.06),blend=room?smooth(32.64,34,-p.z):0;
 return{room,stair,depth,blend,ambience:room?.27-.15*blend:stair?1-depth*.73:1};
}
/** Short deterministic stereo early reflections, with a damped tail rather than a club-sized wash. */
export function shindoImpulse(sampleRate:number){
 const length=Math.ceil(sampleRate*.32),channels=[new Float32Array(length),new Float32Array(length)];let seed=8412;
 for(const [channel,data]of channels.entries()){
  for(let i=0;i<length;i++){seed=Math.imul(seed,1664525)+1013904223|0;const noise=(seed>>>0)/4294967296*2-1;data[i]=i>sampleRate*.009?noise*.025*Math.exp(-i/sampleRate*24):0;}
  for(const [time,gain]of [[.011,.19],[.023,.14],[.039,.1],[.061,.065]])data[Math.round((time+channel*.0017)*sampleRate)]+=gain;
 }
 return channels;
}
