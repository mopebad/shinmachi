import * as THREE from 'three';
import type {CityBatch} from './CityBatch';
import type {Materials} from './Materials';
import type {BuildingSpec} from './BuildingKit';
import {neighborhoodBuilding,parcelHash} from '../Neighborhoods';
import {NEIGHBORHOOD_SIGNS} from './SignCatalog';

/** Facades occupy the original lots. Ground fixtures stay inside the reserved wall-side strip. */
export class NeighborhoodArchitecture {
 constructor(private readonly b:CityBatch,private readonly m:Materials,private readonly seed:number){}
 build(s:BuildingSpec):void{
  const b=this.b,m=this.m,p=neighborhoodBuilding(s,this.seed),home=s.kind==='apartment',w=s.width,d=s.depth,h=p.floors*2.85+.3,hash=parcelHash(s,this.seed);
  const wall=home?[m.facades[0],m.facades[3],m.cream,m.facades[4]][p.family]:[m.facades[1],m.facades[6],m.facades[5]][p.family];
  const frame=home&&p.family===2?m.wood:m.metal,section=`neighborhood:${s.x.toFixed(3)}:${s.z.toFixed(3)}:${p.style}`;
  b.origin(s.x,s.z,s.rotation);b.section(section);
  b.b(m.pavement,0,.14,-d/2+.04,w,.28,d+.08);
  b.b(wall,0,(h+3)/2,-(d+.7)/2,w,h-3,d-.7);
  b.b(wall,0,1.65,-(d+1.1)/2,w,2.7,d-1.1);
  // Recessed entrances retain their previous threshold X; no ground-floor retail is invented in housing.
  const door=w*.2;
  this.row(w,wall,frame,-.5,.28,2.99,[{x:-w*.24,width:w*.36,y:home?1.72:1.58,height:home?.92:1.95,lit:false},{x:door,width:.94,y:1.35,height:2.12,lit:home&&p.variant%3===0}],home);
  b.b(m.metal,door+.27,1.12,-.72,.03,.3,.06);b.b(m.metal,door,2.55,-.27,1.38,.08,.72);
  if(home){
   b.b(m.metal,door,2.51,-.29,.65,.07,.16);b.b(m.businesses.residential.light,door,2.47,-.29,.54,.025,.11);
   const mx=-w/2+.27;
   for(let j=0;j<(p.family===2?1:p.floors);j++){b.b(m.metal,mx,.86+j*.2,-.44,.22,.17,.13);b.b(m.dark,mx,.88+j*.2,-.368,.15,.018,.012);}
   b.b(frame,w*.38,1.87,-.46,.65,.29,.065);b.sign([41,42,43,44][p.family],w*.38,1.87,-.422,.59,.23,0,'residential');
   b.b(m.metal,w/2-.2,.9,-.44,.18,.32,.13);b.part('cylinder',m.windows,w/2-.2,.92,-.365,.05,.015,.05,Math.PI/2);
   const px=-w*.04;b.part('cylinder',m.wood,px,.46,-.15,.15,.35,.15);b.part('cylinder',m.dark,px,.645,-.15,.14,.02,.14);
   for(let j=0;j<4;j++){const a=j*2.1;b.rod(m.green,new THREE.Vector3(px,.65,-.15),new THREE.Vector3(px+Math.sin(a)*.11,.9+j%2*.12,-.15+Math.cos(a)*.09),.009);b.part('sphere',m.green,px+Math.sin(a)*.11,.9+j%2*.12,-.15+Math.cos(a)*.09,.075,.12,.06);}
  }else{
   b.b(frame,-w*.24,2.43,-.44,w*.35,.48,.1);b.sign(15,-w*.24,2.43,-.382,w*.33,.35,0,'office');
   const narrow=w<4.4,dx=narrow?-w*.24:-w/2+.22,dz=narrow?-.97:-.44;
   b.b(m.cream,dx,1.05,dz,narrow?.46:.32,.88,.08);b.sign(NEIGHBORHOOD_SIGNS.directory,dx,1.05,dz+.049,narrow?.39:.27,.66,0,'office');
   for(let j=0;j<3;j++)b.b(m.metal,w*.39,.96+j*.24,-.42,.45,.19,.1);
  }
  for(let f=1;f<p.floors;f++){
   const lower=f*2.85+.15,upper=(f+1)*2.85+.15,columns=home?(p.family===0?3:2):w<4.4?2:p.family===1?Math.max(2,Math.floor(w/2)):3;
   const edge=home?.4:.3,gap=home?(p.family===3?.7:.38):p.family===1?.12:.45,ww=(w-2*edge-(columns-1)*gap)/columns;
   const panes=Array.from({length:columns},(_,i)=>({x:-w/2+edge+ww/2+i*(ww+gap),width:ww,y:lower+1.32+(home&&p.family===3&&i===0?.15:0),height:home?(p.family===0?1.36:p.family===2?1.18:1.82):p.family===1?2.1:1.7,lit:((hash>>>((f+i)%16))+f*7+i*13)%10<(home?2:3)}));
   this.row(w,wall,frame,0,lower,upper,panes,home);
   if(home&&p.family===1||home&&p.family===3&&f%2===1){
    const bw=p.family===3?w*.55:w-.3,bx=p.family===3?-w*.17:0,y=lower+.02;
    b.b(m.cream,bx,y,.38,bw,.13,.95);b.b(frame,bx,y+1,.79,bw,.05,.06);
    if(p.family===1)b.b(wall,bx,y+.39,.79,bw,.66,.09);
    else for(let x=bx-bw/2+.12;x<bx+bw/2;x+=.21)b.b(frame,x,y+.52,.79,.025,.96,.03);
    b.b(m.cream,bx,y+.7,.35,.07,1.4,.8);
   }else if(home&&p.family===0){b.b(m.cream,0,lower-.02,.13,w,.14,.48);for(const x of [-w*.3,w*.3]){b.b(frame,x,lower+.45,.33,w*.22,.8,.025);}}
   if(home&&p.family!==2&&(f+hash)%2===0){const x=w*.34;b.b(m.cream,x,lower+.52,.19,.65,.42,.36);b.part('cylinder',m.dark,x+.12,lower+.52,.38,.13,.02,.13,Math.PI/2);b.b(frame,x,lower+.25,.15,.7,.05,.46);}
   if(!home){
    if(p.family===1){for(const x of [-w/2+.08,w/2-.08])b.b(frame,x,(h+3)/2,.14,.11,h-3,.24);}
    else b.b(p.family===2?m.wood:m.cream,0,lower-.04,.05,w,.14,.25);
   }
  }
  // Side/rear elevations remain complete from the adjacent lane and overview.
  for(let f=1;f<p.floors;f++)for(const side of [-1,1])for(let j=0;j<(home?2:3);j++){
   const z=-1.5-j*(d-2.5)/(home?2:3),y=f*2.85+1.45;
   b.b(frame,side*(w/2+.018),y,z,.035,1.45,home?.85:1.25);b.b(m.windows,side*(w/2+.04),y,z,.025,1.3,home?.72:1.1);
  }
  for(let f=1;f<p.floors;f++)for(const x of [-w*.26,w*.23]){b.b(frame,x,f*2.85+1.35,-d-.025,w*.21,1.5,.04);b.b(m.windows,x,f*2.85+1.35,-d-.055,w*.19,1.34,.025);}
  const pipeX=-w/2+.12;b.rod(frame,new THREE.Vector3(pipeX,h,.05),new THREE.Vector3(pipeX,3.3,.05),.033);b.rod(frame,new THREE.Vector3(pipeX,3.3,.05),new THREE.Vector3(pipeX,3,-.4),.033);b.rod(frame,new THREE.Vector3(pipeX,3,-.4),new THREE.Vector3(pipeX,.29,-.4),.033);
  for(let y=.8;y<h;y+=1.5)b.b(frame,pipeX,y,y<3?-.43:.01,.13,.04,.15);
  if(home&&p.family===2){
   const rise=.65,angle=Math.atan2(rise,w/2),slope=Math.hypot(w/2,rise);
   for(const side of [-1,1])b.part('box',m.dark,side*w/4,h+rise/2,-d/2,slope,.14,d+.1,0,0,-side*angle);
   for(const back of [false,true])b.part('triangle',wall,0,h+rise*4/9,back?-d:0,w,rise/.9,1,0,back?Math.PI:0,Math.PI);
   b.b(m.metal,0,h+rise,-d/2,.09,.11,d+.12);
  }else this.roof(s,h,home,p.variant);
  b.section();b.origin();
 }
 private row(width:number,wall:THREE.Material,frame:THREE.Material,front:number,bottom:number,top:number,panes:{x:number;width:number;y:number;height:number;lit:boolean}[],home:boolean):void{
  const b=this.b,m=this.m;let cursor=-width/2;
  // Caller edge and window spans cover the authored frontage without putting a solid box behind glass.
  for(const p of panes){const a=p.x-p.width/2,c=p.x+p.width/2;
   if(a>cursor)b.b(wall,(a+cursor)/2,(bottom+top)/2,front-.2,a-cursor,top-bottom,.4);
   b.b(wall,p.x,(bottom+p.y-p.height/2)/2,front-.2,p.width,p.y-p.height/2-bottom,.4);
   b.b(wall,p.x,(top+p.y+p.height/2)/2,front-.2,p.width,top-p.y-p.height/2,.4);
   b.b(m.dark,p.x,p.y,front-.45,p.width,p.height,.04);b.b(p.lit?m.businesses[home?'residential':'office'].window:m.windows,p.x,p.y,front-.32,p.width-.07,p.height-.07,.025);
   for(const side of [-1,1]){b.b(frame,p.x+side*(p.width/2-.02),p.y,front-.13,.04,p.height,.3);b.b(frame,p.x,p.y+side*(p.height/2-.02),front-.13,p.width,.04,.3);}
   b.b(frame,p.x+(home?p.width*.14:0),p.y,front-.25,.035,p.height,.07);cursor=c;
  }
  if(cursor<width/2)b.b(wall,(cursor+width/2)/2,(bottom+top)/2,front-.2,width/2-cursor,top-bottom,.4);
 }
 private roof(s:BuildingSpec,h:number,home:boolean,variant:number):void{
  const b=this.b,m=this.m,w=s.width,d=s.depth;
  b.b(m.dark,0,h+.08,-d/2,w+.1,.16,d+.1);
  for(const z of [0,-d])b.b(m.cream,0,h+.28,z,w+.1,.42,.14);
  for(const x of [-w/2,w/2])b.b(m.cream,x,h+.28,-d/2,.12,.42,d);
  if(variant%3!==0){b.b(m.facades[home?2:6],w*.21,h+.72,-d*.72,w*.3,1.44,d*.25);b.b(m.metal,w*.21,h+1.47,-d*.72,w*.3+.12,.06,d*.25+.12);}
  for(let i=0;i<(home?1:variant%3+1);i++){const x=-w*.28+i*.95;b.b(m.cream,x,h+.42,-1.6,.72,.65,.95);for(let j=0;j<4;j++)b.b(m.dark,x,h+.23+j*.12,-1.11,.56,.025,.015);}
  if(home&&variant%3===1){b.part('cylinder',m.cream,-w*.18,h+1,-d*.64,.48,1,.48);for(const x of [-.37,.37])b.b(m.metal,-w*.18+x,h+.3,-d*.64,.055,.6,.055);}
  if(home&&variant%2===0){b.b(m.metal,-w*.27,h+1.35,-d*.72,.035,2.7,.035);for(let j=0;j<3;j++)b.b(m.metal,-w*.27,h+1.8+j*.22,-d*.72,.75+j*.2,.02,.02);}
 }
}
