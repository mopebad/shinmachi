import * as THREE from 'three';
import {CityBatch} from './CityBatch';
import {NightlifeMaterials} from './NightlifeMaterials';
import {YotoVenueSpatial} from './YotoVenueLayout';
import {buildShindoInterior} from './ShindoInterior';

/** Close-range authored architecture fitted around the retained twelve business thresholds. */
export function buildYotoVenue(b:CityBatch,m:NightlifeMaterials,v:YotoVenueSpatial){
 b.origin();b.section('yoto:venue');
 const sign=(theme:string,x:number,y:number,z:number,w:number,h:number,ry=0)=>b.panel(m.signMaterial(theme,w/h),x,y,z,w,h,ry);
 for(const s of v.surfaces){
  if(s.id.startsWith('tread')){const h=s.y-v.floorY+.16;b.b(m.shindoFloor,(s.minX+s.maxX)/2,s.y-h/2,(s.minZ+s.maxZ)/2,s.maxX-s.minX,h,s.maxZ-s.minZ);b.b(m.stairNosing,(s.minX+s.maxX)/2,s.y+.002,s.maxZ-.021,s.maxX-s.minX-.08,.004,.042);}
  else b.b(s.id==='basement-floor'?m.shindoFloor:m.darkTile,(s.minX+s.maxX)/2,s.y-.065,(s.minZ+s.maxZ)/2,s.maxX-s.minX,.13,s.maxZ-s.minZ);
 }
 for(const o of v.boxes){
  if(o.id.startsWith('stool')||o.id.startsWith('soffit-')||o.id.startsWith('speaker-')||o.id.startsWith('stair-rail-')||o.id.includes('bench')||o.id==='lounge-table'||o.id==='entry-leaf'||o.id==='entry-head'||o.id==='room-east-lining')continue;
  const material=o.material==='wood'?(o.minY<0?m.walnut:m.wood):o.material==='metal'?m.smokedSteel:o.material==='tile'?m.darkTile:o.material==='ceiling'?m.shindoCeiling:o.id.startsWith('room-')||o.id.startsWith('shaft-')?m.shindoWall:m.plaster;
  b.b(material,(o.minX+o.maxX)/2,(o.minY+o.maxY)/2,(o.minZ+o.maxZ)/2,o.maxX-o.minX,o.maxY-o.minY,o.maxZ-o.minZ);
 }
 // Ground-floor kitchen window, a separate foyer doorway and the open stair entrance.
 b.b(m.metal,18.14,3.1,-28.9,4.68,.22,2.9);
 b.b(m.glass,16.48,1.66,-27.51,.82,1.7,.025);
 for(const x of [15.89,18.51,20.49])b.b(m.darkTile,x,1.65,-27.62,.16,3.3,.28);
 b.b(m.wood,17.06,1.25,-27.97,.07,2.45,.85); // Real open leaf, held against the foyer side wall.
 b.b(m.metal,17.1,1.25,-27.71,.04,.3,.04);
 b.b(m.wood,16.8,1.22,-29.55,1.45,.08,.7);
 for(const x of [16.35,16.8,17.25]){b.part('cylinder',m.metal,x,1.28,-29.6,.055,.1,.055);b.b(m.light,x,2.6,-29.7,.18,.025,.09);}
 sign('yototei',16.95,2.86,-27.43,2.45,.48);
 sign('shindo',19.5,2.84,-27.41,1.65,.52);
 sign('directory',18.2,1.65,-27.38,.4,2.15);
 sign('stair-notice',20.49,1.65,-27.36,.22,.95);
 b.b(m.metal,18.14,3.37,-27.15,4.8,.13,1.0);
 b.b(m.redPaint,18.14,3.29,-26.67,4.8,.19,.06);
 // Ground floor plus two upper levels: 1F / 2F / 3F, with private offstage upper rooms.
 for(let floor=0;floor<2;floor++){
  const y=3.4+floor*3.05,top=y+2.85;
  b.b(floor===1?m.darkTile:m.plaster,18.14,y+1.5,-30.27,4.68,3,.18);
  for(const x of [15.9,20.48])b.b(m.plaster,x,y+1.5,-28.9,.2,3,2.8);
  b.b(m.metal,18.14,top,-28.9,4.8,.18,3.0);
  for(const x of [16.27,18.2,20.4])b.b(m.darkTile,x,y+1.4,-27.56,.2,2.8,.32);
  for(const x of [17.2,19.35]){
   b.b(m.glass,x,y+1.45,-27.63,1.65,2.0,.025);
   b.b(m.wood,x,y+.4,-27.5,1.75,.55,.16);
   b.b(m.metal,x,y+2.5,-27.54,1.75,.12,.24);
   for(const dx of [-.84,.84])b.b(m.metal,x+dx,y+1.45,-27.49,.05,2.05,.08);
   b.b(m.wood,x,y+.72,-29.35,1.1,.08,.55);
   for(const dx of [-.35,.35])b.b(m.metal,x+dx,y+.36,-29.35,.035,.7,.035);
   b.b(floor===1?m.redPaint:m.wood,x,y+.45,-28.8,.4,.75,.45);
   b.b(m.light,x,y+2.6,-29.0,.5,.025,.12);
  }
  const theme=floor===0?'yohaku':'otoniwa';
  sign(theme,floor===1?17.2:19.5,y+2.25,-27.35,floor===1?1.45:2.15,.48);
  // Offstage upper rooms have dark interior doors and physically mounted floor identifiers.
  b.b(m.wood,16.45,y+1.1,-30.12,.8,2.2,.09);
 }
 b.b(m.darkTile,18.14,9.8,-28.9,4.8,.22,3.1);
 b.b(m.grille,19.9,10.3,-29.25,1.1,.82,.75);b.b(m.metal,16.5,10.19,-29.3,.8,.6,.6);
 for(const x of [16.05,20.48]){b.b(m.metal,x,5,-27.32,.045,9.9,.07);for(const y of [1.4,4.5,7.6,9.5])b.b(m.redPaint,x,y,-27.28,.1,.045,.1);}
 // Stacked projecting tenant panels at varied widths with real structural brackets.
 for(const [i,theme]of ['shindo','yohaku','otoniwa'].entries()){
  const y=4.25+i*2.15,x=20.45;
  b.b(m.metal,x,y,-27.03,.17,2.0,.9);b.b(m.metal,x,y+.65,-27.35,.12,.08,.9);
  sign(theme,x-.095,y,-27.03,.78,1.78,-Math.PI/2);sign(theme,x+.095,y,-27.03,.78,1.78,Math.PI/2);
 }
 // Fixtures embed their backing plates into the wall; lenses stand clear of the housing face.
 b.section('shindo:stair-fittings');
 for(const i of [2,7,12,17]){const s=v.surfaces.find(s=>s.id==='tread-'+(i+1))!,z=(s.minZ+s.maxZ)/2;
  b.b(m.smokedSteel,18.6375,s.y+.42,z,.08,.18,.22);b.b(m.light,18.6835,s.y+.42,z,.008,.075,.13);
 }
 // Exactly one continuous grip per side, with closed returns and real L-shaped wall brackets.
 const z0=-27.6,z1=v.shaft.minZ,railY=(z:number)=>v.groundY+.82+(v.floorY-v.groundY)*(z-z0)/(z1-z0);
 for(const [x,wall,plate]of [[18.72,18.598,18.606],[20.28,20.402,20.394]]){
  b.rod(m.brass,new THREE.Vector3(x,railY(z0),z0),new THREE.Vector3(x,railY(z1),z1),.022);
  for(const z of [z0,z1])b.rod(m.brass,new THREE.Vector3(x,railY(z),z),new THREE.Vector3(wall,railY(z),z),.022);
  for(const z of [-28.3,-29.7,-31.1,-32.22]){
   const y=railY(z);b.b(m.smokedSteel,plate,y-.08,z,.024,.13,.065);
   b.rod(m.smokedSteel,new THREE.Vector3(wall,y-.08,z),new THREE.Vector3(x,y-.08,z),.009);
   b.rod(m.smokedSteel,new THREE.Vector3(x,y-.08,z),new THREE.Vector3(x,y-.022,z),.009);
  }
 }
 // Seal the rear stair housing and make the descent read as one enclosed access.
 // Side caps terminate 20 mm inside the walls rather than sharing either exposed wall plane.
 b.part('box',m.shindoCeiling,19.5,1.27,-30.12,1.84,.18,Math.hypot(5.04,3.06),-Math.atan2(3.06,5.04));
 b.b(m.metal,19.5,2.96,-31.5,2.18,.12,2.5);
 // A shallow saddle joins the same-height stair landing and listening-room floor.
 b.b(m.brass,19.5,v.floorY+.002,-32.94,1.6,.004,.06);
 b.section('yoto:venue');
 buildShindoInterior(b,m,v);
 b.origin();b.section();
}

export function yotoFacadeLayers(b:CityBatch,m:NightlifeMaterials,index:number,w:number,h:number){
 b.section('yoto:layers');
 // Deliberate patches beneath service fittings, displaced awning fixings and older sign scars.
 if(index%3===0){b.b(m.plaster,w*.28,1.0,.012,w*.22,1.8,.018);b.b(m.darkTile,-w*.3,.28,.025,.65,.3,.025);}
 for(const y of [1.0,1.7,2.3]){b.b(m.metal,w*.43,y,.18,.16,.22,.10);b.b(m.redPaint,w*.43,y+.02,.237,.035,.025,.015);}
 b.rod(m.metal,new THREE.Vector3(w*.43,.8,.2),new THREE.Vector3(w*.43,h-.35,.2),.012);
 if(index%2===1){b.b(m.wood,-w*.43,2.36,.18,.12,.45,.08);b.b(m.metal,-w*.43,2.65,.18,.035,.1,.32);}
 if(index<6){
  // Hand-painted boards and mismatched small lights belong to these actual small businesses.
  const theme=index===3?'tsuki':index===4?'coffee':index===0?'ramen':'bar';
  if(index!==2){b.b(m.wood,-w*.34,3.75,.25,.55,1.14,.11);b.panel(m.signMaterial(theme,.42/1.0),-w*.34,3.75,.312,.42,1.0);}
  if(index===0||index===3){b.b(m.grille,w*.35,.38,.25,.4,.6,.34);b.part('cylinder',m.metal,w*.35,.72,.25,.2,.05,.2);}
  if(index===4){b.b(m.metal,-.65,1.82,-2.4,.6,.08,.4);b.part('cylinder',m.grille,-.7,1.88,-2.4,.16,.02,.16);b.part('cylinder',m.cloth,-.7,1.9,-2.4,.045,.01,.045);b.b(m.wood,1.6,1.9,-2.5,.35,.55,.22);}
 }else{
  // Narrower supplementary panels contrast with warm low-rise bars to the west.
  const theme=index===11?'otoniwa':index===9?'yohaku':'bar';
  b.b(m.metal,-w*.36,4.3,.21,.68,.9,.14);b.panel(m.signMaterial(theme,.6/.76),-w*.36,4.3,.29,.6,.76);
 }
 b.section();
}
