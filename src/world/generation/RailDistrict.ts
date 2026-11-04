import * as THREE from 'three';
import { CityBatch } from './CityBatch';
import { HeroStreetKit } from './HeroStreet';
import type { BuildingSpec } from './BuildingKit';
import type { Materials } from './Materials';
import type { Bounds } from '../types';
import { seededRandom } from '../simulation/WorldRules';
import { railDistrictLayout, RAIL_DISTRICT } from './RailDistrictLayout';
import type { RailDistrictParcel } from './RailDistrictLayout';

/** Local station context. Closed scenic tenancies do not create new NPC destinations. */
export function buildRailDistrict(m:Materials,seed:number,bounds:Bounds[]):{group:THREE.Group;colliders:Bounds[];buildings:number;instances:number}{
  const plan=railDistrictLayout(seed,bounds),b=new CityBatch(),frontages=new HeroStreetKit(b,m);
  const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
  const room=(p:RailDistrictParcel)=>{
    b.origin(p.x,p.z);const w=p.width,d=p.depth;
    b.b(m.pavement,0,.055,-d/2,w,.11,d);
    b.b(m.facades[p.palette],0,1.55,-d+.12,w,3.1,.24);
    for(const side of [-1,1])b.b(m.facades[p.palette],side*(w/2-.12),1.55,-d/2,.24,3.1,d);
    b.b(m.dark,0,3.15,-d/2,w,.22,d);
    const business=p.kind==='izakaya'?'restaurant':p.kind==='apartment'?'residential':p.kind==='office'?'office':'retail';
    b.b(m.businesses[business].surface,0,1.4,-1.5,w-.4,2.5,.06);
    b.b(m.shopGlass,0,1.45,-.12,w-.55,2.5,.025);
    for(const x of [-w*.32,0,w*.32]){b.b(m.metal,x,1.5,.03,.055,2.8,.1);b.b(m.businesses[business].light,x,2.87,-.6,w*.21,.025,.12);}
    b.b(m.wood,0,.83,-.75,w*.65,.7,.45);
  };
  const block=(p:RailDistrictParcel)=>{
    b.section(p.id);const rng=seededRandom(seed^Math.round(p.x*100)),w=p.width-(p.stair?1.8:0),offset=p.stair?-.9:0,h=p.floors*2.85+.3;
    room({...p,x:p.x+offset,width:w});
    b.origin(p.x+offset,p.z);
    const wall=m.facades[p.palette];b.b(wall,0,(h+3)/2,-(p.depth+.65)/2,w,h-3,p.depth-.65);
    const spec:BuildingSpec={x:p.x+offset,z:p.z,rotation:0,width:w,depth:p.depth,floors:p.floors,kind:p.kind,palette:p.palette,shop:[2,0,15,13,10][p.family],heroStreet:100+p.family};
    const occupied=Array.from({length:p.floors-1},()=>Array.from({length:4},()=>rng()<.38));
    frontages.facade(spec,occupied);frontages.storefront(spec);b.section(p.id);
    // Back and side elevations are visible from trains, rooftops and the elevated review.
    for(let f=1;f<p.floors;f++){
      const y=f*2.85+1.35;
      for(const x of [-w*.27,w*.27]){b.b(m.dark,x,y,-p.depth-.02,w*.23,1.6,.04);b.b(rng()<.3?m.businesses[p.kind==='apartment'?'residential':'office'].window:m.windows,x,y,-p.depth-.05,w*.2,1.45,.025);}
      for(const side of [-1,1])for(let j=0;j<2;j++){const z=-1.7-j*(p.depth-2.5)/2;b.b(m.dark,side*(w/2+.015),y,z,.025,1.6,1.4);b.b(rng()<.3?m.warmWindows:m.windows,side*(w/2+.04),y,z,.025,1.42,1.2);}
    }
    b.b(m.metal,0,h+.06,-p.depth/2,w,.12,p.depth);
    if(p.family!==2)b.b(wall,-w*.21,h+.7,-p.depth*.65,w*.35,1.4,p.depth*.27);
    for(let i=0;i<(p.family===2?3:p.family===3?0:1);i++){
      const x=-w*.2+i*w*.36;b.b(m.metal,x,h+.5,-p.depth*.3,.85,1,1.15);
      for(let j=0;j<5;j++)b.b(m.dark,x,h+.18+j*.15,-p.depth*.3+.585,.66,.035,.018);
    }
    if(p.family===4){b.part('cylinder',m.cream,w*.23,h+1.25,-p.depth*.72,.7,1.4,.7);for(const side of [-1,1])b.b(m.metal,w*.23+side*.55,h+.35,-p.depth*.72,.08,.7,.08);}
    if(p.family===1||p.family===4){b.b(m.metal,0,h+1.4,-p.depth*.5,.04,2.8,.04);for(let i=0;i<3;i++)b.b(m.metal,0,h+1.8+i*.23,-p.depth*.5,.7+i*.24,.02,.02);}
    if(p.family===3){b.part('cylinder',m.metal,w*.23,h+1.1,-p.depth*.7,.17,2.2,.17);b.part('cylinder',m.metal,w*.23,h+2.22,-p.depth*.7,.3,.06,.3);}
    if(p.stair){
      const x=w/2+.9;
      for(const dx of [-.8,.8])for(const z of [-.9,-3.3])b.b(m.metal,x+dx,h/2,z,.07,h,.07);
      for(let f=0;f<p.floors-1;f++){
        for(let flight=0;flight<2;flight++){
          const xx=x+(flight? .4:-.4),fromZ=flight?-3.0:-1.0,toZ=flight?-1.0:-3.0,fromY=f*2.85+flight*1.425;
          for(let i=0;i<9;i++)b.b(m.metal,xx,fromY+(i+1)*1.425/9-.025,fromZ+(toZ-fromZ)*(i+.5)/9,.74,.05,2/9+.02);
          b.rod(m.metal,v(xx-.38,fromY+.95,fromZ),v(xx-.38,fromY+2.375,toZ),.02);
          b.rod(m.metal,v(xx+.38,fromY+.95,fromZ),v(xx+.38,fromY+2.375,toZ),.02);
          b.b(m.metal,x,fromY+1.425-.03,toZ,1.8,.06,.5);
        }
        b.b(m.dark,w/2+.013,(f+1)*2.85+1,-1,.025,2,.65);
      }
    }
    b.origin();
  };
  const bay=(p:RailDistrictParcel)=>{
    b.section(p.id);room(p);const w=p.width;
    b.b(m.pavement,0,.055,.65,w+.1,.11,1.3);
    for(let x=-w/2+.5;x<w/2;x+=1.2)b.b(m.dark,x,.113,1.2,.45,.015,.12);
    b.b(m.wood,0,2.76,.04,w-.25,.7,.2);
    b.sign(p.family===1?0:6,-w*.1,2.76,.155,w*.62,.47);
    b.part('box',m.metal,0,2.35,.45,w-.2,.08,.9,.1);
    b.b(m.cream,w*.32,1.6,.06,.7,1.2,.025);b.sign(30,w*.32,1.6,.09,.59,.96);
    for(const x of [-w*.2,w*.18]){b.b(m.wood,x,.9,-.8,.9,.1,.6);b.part('cylinder',m.metal,x,.45,-.8,.04,.9,.04);}
    b.b(m.metal,w*.32,3.65,-p.depth*.7,.6,1.0,.6);b.b(m.metal,w*.32,4.2,-p.depth*.7,.85,.12,.85);
    b.origin();
  };
  plan.parcels.forEach(p=>p.bay?bay(p):block(p));
  b.section('rail-structure');
  for(const portal of RAIL_DISTRICT.portals)for(const z of [-59.2,-54.8]){
    const x=(portal.minX+portal.maxX)/2,length=portal.maxX-portal.minX,cy=(portal.bottom+portal.top)/2;
    b.b(m.metal,x,cy,z,length,portal.top-portal.bottom,.18);
    for(const y of [portal.bottom,portal.top])b.b(m.metal,x,y,z,length,.09,.65);
    for(let xx=portal.minX+.7;xx<portal.maxX;xx+=2.1)b.b(m.metal,xx,cy,z,.05,portal.top-portal.bottom,.6);
  }
  for(const z of [-59.6,-54.4])b.b(m.facades[1],0,5.63,z,142,.28,.4);
  for(const x of RAIL_DISTRICT.pierXs){
    for(const side of [-1,1]){
      b.b(m.metal,x+side*.625,1.2,-57,.045,2.15,2.62);
      b.b(m.metal,x,1.2,-57+side*1.325,1.28,2.15,.045);
    }
    // Gutter feeds a branch under the deck, then a downpipe fixed to the north face of a pier.
    b.rod(m.metal,v(x,6.4,-60.35),v(x,5.45,-58.44),.055);b.rod(m.metal,v(x,5.45,-58.44),v(x,.16,-58.44),.055);
    for(let y=.8;y<5.5;y+=1.2)b.b(m.metal,x,y,-58.35,.2,.05,.28);
    b.b(m.dark,x,.013,-58.7,.42,.026,.48);
  }
  b.b(m.metal,0,6.45,-60.35,142,.16,.2);b.b(m.dark,0,6.57,-60.35,142,.04,.13);
  b.b(m.cream,0,6.17,-60.2,140,.16,.23);
  for(let x=-65;x<70;x+=6)b.b(m.metal,x,6.18,-60.35,.045,.32,.36);
  for(const o of plan.obstacles){
    if(o.kind==='pier')continue;b.section(o.id);const x=(o.minX+o.maxX)/2,z=(o.minZ+o.maxZ)/2;
    if(o.kind==='cabinet'){
      b.b(m.metal,x,.13,z,1.1,.26,.85);b.b(m.cream,x,.97,z,1.03,1.52,.7);b.b(m.metal,x,1.77,z,1.09,.08,.85);
      b.b(m.dark,x,1.0,z-.36,.88,1.28,.025);b.b(m.metal,x,1.0,z-.38,.82,1.22,.025);b.b(m.dark,x+.27,1,z-.4,.04,.26,.025);
      b.part('triangle',m.yellow,x,1.22,z-.405,.24,.24,1);for(let j=0;j<5;j++)b.b(m.dark,x,.47+j*.09,z-.40,.6,.025,.012);
    }else if(o.kind==='fence'){
      const length=o.maxX-o.minX;
      for(let xx=o.minX+.03;xx<o.maxX-.03;xx+=2.4)b.b(m.metal,xx,.9,z,.055,1.8,.06);
      b.b(m.metal,o.maxX-.03,.9,z,.055,1.8,.06);
      for(const y of [.18,1.55,1.79])b.b(m.metal,x,y,z,length,.035,.04);
      for(let xx=o.minX+.14;xx<o.maxX;xx+=.18)b.b(m.metal,xx,.91,z,.008,1.48,.008);
      for(let y=.3;y<1.55;y+=.22)b.b(m.metal,x,y,z,length,.008,.008);
      if(o.id==='maintenance-gate'){b.b(m.dark,o.minX+.04,.92,z,.08,1.84,.08);b.b(m.dark,o.maxX-.04,.92,z,.08,1.84,.08);b.b(m.metal,o.maxX-.2,.95,z-.06,.08,.1,.16);}
    }else if(o.kind==='bicycle'){
      for(const zz of [-.56,.56]){b.part('torus',m.dark,x,.42,z+zz,.32,.32,.32,0,Math.PI/2);b.rod(m.metal,v(x,.42,z+zz),v(x,.9,z),.024);}
      b.rod(m.metal,v(x,.42,z-.56),v(x,.42,z+.56),.023);b.rod(m.metal,v(x,.85,z-.1),v(x,.42,z+.56),.024);b.b(m.dark,x,.95,z-.15,.18,.065,.25);b.b(m.metal,x,1.1,z+.48,.42,.03,.03);
      b.b(m.metal,x,1.0,z+.72,.28,.24,.25);b.b(m.dark,x,1.13,z+.72,.25,.018,.22);b.b(m.metal,x,.18,z+.6,.48,.3,.055);
    }else if(o.kind==='wayfinding'){
      b.b(m.dark,x,1.4,z,.4,2.8,.2);b.sign(16,x,2.35,z+.115,.36,.5);b.sign(19,x,1.55,z+.115,.36,.55);
    }
  }
  b.section('maintenance-surface');
  for(const [a,c]of [[-71,-8],[8,27],[33,71]]){
    b.b(m.pavement,(a+c)/2,-.004,-63.65,c-a,.032,2.6);
    b.b(m.dark,(a+c)/2,-.003,-65.0,c-a,.025,.15);
    for(let x=a;x<c;x+=2)b.b(m.metal,x,.012,-65.0,.025,.015,.13);
  }
  b.section('station-posters');
  b.b(m.metal,19.7,1.95,-48.91,1.15,1.4,.04);
  b.origin();b.section();
  const group=b.finish(m.signs);group.name='Rail district / closed frontages and service infrastructure';
  const source=document.createElement('canvas');source.width=840;source.height=1040;const ctx=source.getContext('2d')!;
  ctx.fillStyle='#e3e2d1';ctx.fillRect(0,0,840,1040);ctx.fillStyle='#214d46';ctx.fillRect(0,0,840,165);ctx.fillStyle='#f2eddd';ctx.font='bold 66px "Yu Gothic",Meiryo,sans-serif';ctx.fillText('周辺案内',45,86);ctx.font='32px sans-serif';ctx.fillText('Shinmachi / Area guide',45,136);
  const px=(x:number)=>90+(x+10)/48*660,pz=(z:number)=>220+(z+76)/47*580;
  ctx.strokeStyle='#8c918a';ctx.lineWidth=26;ctx.beginPath();ctx.moveTo(px(0),pz(-76));ctx.lineTo(px(0),pz(-29));ctx.moveTo(px(30),pz(-76));ctx.lineTo(px(30),pz(-29));ctx.stroke();ctx.lineWidth=10;ctx.strokeStyle='#484f50';ctx.beginPath();ctx.moveTo(40,pz(-57));ctx.lineTo(800,pz(-57));ctx.stroke();
  ctx.fillStyle='#a4b3a1';ctx.fillRect(px(8),pz(-55),px(26)-px(8),pz(-46)-pz(-55));ctx.fillStyle='#223e36';ctx.font='32px "Yu Gothic",sans-serif';ctx.fillText('新町駅',px(9),pz(-51));ctx.font='25px sans-serif';ctx.fillText('Station',px(9),pz(-48));
  ctx.fillStyle='#b64e35';ctx.beginPath();ctx.arc(px(19),pz(-44.5),13,0,Math.PI*2);ctx.fill();ctx.font='29px "Yu Gothic",sans-serif';ctx.fillText('現在地 / You are here',px(3),850);
  ctx.fillStyle='#344943';ctx.font='31px "Yu Gothic",sans-serif';ctx.fillText('↑ 北 / N',620,225);ctx.font='29px "Yu Gothic",sans-serif';ctx.fillText('線路内立入禁止',50,943);ctx.font='25px sans-serif';ctx.fillText('Keep off tracks · use station stairs',50,986);
  const map=new THREE.CanvasTexture(source);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  const poster=new THREE.Mesh(new THREE.PlaneGeometry(1.05,1.3),new THREE.MeshStandardMaterial({map,roughness:.85}));poster.position.set(19.7,1.95,-48.883);poster.name='Station area guide / actual local street coordinates';group.add(poster);
  const colliders=[...plan.parcels.map(p=>p.collision),...plan.obstacles.filter(o=>o.kind!=='pier').map(({minX,maxX,minZ,maxZ})=>({minX,maxX,minZ,maxZ}))];
  group.userData.railDistrict={...plan,colliders,seed,visualTenancies:true};
  return{group,colliders,buildings:plan.parcels.length,instances:b.instances};
}
