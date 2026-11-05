import * as THREE from 'three';
import {CityBatch} from './CityBatch';
import {NightlifeMaterials} from './NightlifeMaterials';
import type {YotoVenueSpatial} from './YotoVenueLayout';
import {SHINDO_CONTROLS,SHINDO_PANEL} from './ShindoConsole';

/** Authored basement fittings. Fixed furniture carcasses are shared with the walking contract. */
export function buildShindoInterior(b:CityBatch,m:NightlifeMaterials,v:YotoVenueSpatial){
 const f=v.floorY,top=-.42;
 const sign=(theme:string,x:number,y:number,z:number,w:number,h:number,ry=0)=>b.panel(m.signMaterial(theme,w/h),x,y,z,w,h,ry);
 const rod=(material:THREE.Material,a:number[],c:number[],r:number)=>b.rod(material,new THREE.Vector3(...a),new THREE.Vector3(...c),r);
 // Continuous skirting, wainscot and framed acoustic absorption rather than a bare tiled tunnel.
 for(const x of [16.0,20.35]){
  b.b(m.walnut,x,f+.07,-36.95,.06,.14,8.15);
  b.b(m.walnut,x,f+.55,-36.95,.055,.85,8.15);
  b.b(m.brass,x,f+1.01,-36.95,.067,.022,8.15);
 }
 b.section('shindo:acoustic-cassettes');
 for(const z of [-34.25,-35.8,-37.35,-38.9]){
  b.b(m.walnut,20.335,f+1.76,z,.07,1.05,1.24);
  b.b(m.acoustic,20.285,f+1.76,z,.045,.94,1.1);
  for(let i=0;i<9;i++)b.b(m.walnut,20.252,f+1.76,z-.49+i*.123,.035,.94,.025);
 }
 b.section('yoto:venue');
 // Visible joists, a purposeful duct and cable trays stay above the 2.1 m walking headroom.
 for(const z of [-33.25,-36.9,-39.9])b.b(m.shindoCeiling,18.18,top-.085,z,4.38,.17,.13);
 b.b(m.grille,20.07,top-.15,-37.3,.28,.28,7.15);
 for(const z of [-34,-37.5,-40.1]){b.b(m.metal,20.07,top-.3,z,.35,.03,.08);b.b(m.grille,19.87,top-.19,z,.05,.16,.28);}
 rod(m.metal,[16.52,top-.11,-33],[16.52,top-.11,-40.85],.025);
 // A tight single-person service aisle; counter, foot rail and inset joinery.
 b.section('shindo:countertop');
 b.b(m.walnut,17.39,f+1.06,-35.85,.84,.09,4.06);
 b.b(m.brass,17.81,f+1.027,-35.85,.018,.035,4.04);
 b.section('yoto:venue');
 for(const z of [-34.45,-35.35,-36.25,-37.15]){b.b(m.walnut,17.715,f+.53,z,.035,.81,.81);b.b(m.acoustic,17.739,f+.53,z,.016,.66,.65);}
 rod(m.brass,[17.96,f+.22,-34.05],[17.96,f+.22,-37.6],.022);
 for(const z of [-34.2,-35.85,-37.45])rod(m.brass,[17.72,f+.22,z],[17.96,f+.22,z],.016);
 // Recessed backbar: mirrored panels, illuminated shelves, original unbranded bottles.
 b.b(m.smokedSteel,15.995,f+1.63,-35.84,.035,1.35,3.96);
 for(const z of [-34.4,-35.35,-36.3,-37.25])b.b(m.shindoShelfBacking,16.022,f+1.67,z,.02,1.19,.84);
 for(const height of [.97,1.52,2.04]){
  const y=f+height;
  if(height===.97)b.section('shindo:lower-shelf');
  b.b(m.walnut,16.19,y,-35.84,.4,.065,3.98);
  b.b(m.smokedSteel,16.12,y-.044,-35.84,.2,.025,3.83);
  b.b(m.shindoShelfLight,16.19,y-.059,-35.84,.06,.009,3.79);
  b.section('yoto:venue');
 }
 // A draining tray keeps clean glasses together, clear of the basin and bottle groupings.
 b.b(m.smokedSteel,16.23,f+1.012,-36.78,.23,.018,.48);
 // Sink, taps, under-counter refrigerator and practical bar tools have an actual work side.
 b.section('shindo:service-fixtures');
 b.b(m.metal,16.16,f+.9,-37.25,.29,.025,.6);b.b(m.grille,16.16,f+.916,-37.25,.22,.012,.43);
 rod(m.metal,[16.15,f+.94,-37.52],[16.15,f+1.16,-37.52],.016);
 rod(m.metal,[16.15,f+1.16,-37.52],[16.29,f+1.16,-37.52],.016);
 b.b(m.metal,16.38,f+.44,-34.32,.025,.7,.62);b.b(m.brass,16.403,f+.64,-34.09,.022,.2,.025);
 b.section('yoto:venue');
 for(const [i,z]of [-34.55,-35.65,-36.75].entries()){
  b.section('shindo:stools');
  b.part('disc',m.leather,18.22,f+.69,z,.22,.1,.22);
  b.part('disc',m.metal,18.22,f+.34,z,.035,.63,.035);
  b.part('torus',m.brass,18.22,f+.23,z,.16,.16,.16,Math.PI/2);
  b.part('disc',m.acoustic,18.22,f+.035,z,.2,.055,.2);
  b.section('yoto:venue');
  // A highball, water and rocks whisky; open glass rims, liquid and ice have distinct heights.
  b.part('disc',m.leather,17.56,f+1.114,z,.075,.009,.075);
  if(i===0){
   const bottom=f+1.12,h=.225;
   b.part('torus',m.citrus,17.578,bottom+h-.024,z-.018,.024,.024,.024,.6);
   b.part('disc',m.citrusFlesh,17.578,bottom+h-.024,z-.018,.0225,.002,.0225,Math.PI/2+.6);
   rod(m.brass,[17.586,bottom+.04,z],[17.586,bottom+h+.025,z],.002);
  }
  if(i!==1){b.b(m.cloth,17.58,f+1.113,z+.19,.13,.008,.15,.08);b.b(m.acoustic,17.58,f+1.118,z+.19,.085,.002,.06,.08);}
 }
 for(const [x,z]of [[17.18,-34.92],[17.16,-37.12]]){
  b.b(m.cloth,x+.18,f+1.117,z,.2,.012,.22);
  b.part('disc',m.smokedSteel,x,f+1.115,z+.16,.09,.013,.09);
 }
 b.b(m.smokedSteel,17.28,f+1.115,-37.48,.28,.018,.2);
 for(let i=0;i<5;i++)rod(m.metal,[17.17+i*.045,f+1.13,-37.55],[17.17+i*.045,f+1.13,-37.41],.004);
 sign('shindo-menu',16.055,f+1.55,-33.28,.38,.58,Math.PI/2);
 // Upholstered banquettes define a quieter lounge while preserving the continuous east aisle.
 for(const [x,z,d,side]of [[16.3,-39.35,1.7,-1],[20.07,-38.05,2.4,1]]){
  b.b(m.walnut,x,f+.21,z,.49,.42,d);
  b.section('shindo:upholstery');
  b.b(m.leather,x,f+.48,z,.51,.15,d);
  b.b(m.leather,x+side*.21,f+.83,z,.12,.62,d);
  b.section('yoto:venue');
  for(let i=0;i<3;i++)b.b(m.walnut,x,f+.36,z-d/2+.13+i*(d-.26)/2,.52,.025,.014);
  b.section('shindo:upholstery');
  for(let i=1;i<4;i++)b.b(m.acoustic,x,f+.559,z-d/2+i*d/4,.49,.003,.009);
  b.section('yoto:venue');
 }
 for(const z of [-37.02,-39.07]){
  b.b(m.walnut,20.02,f+.7,z,.34,.035,.3);
  b.part('disc',m.walnut,20.02,f+.725,z,.07,.009,.07);
  b.part('tumbler',m.clearGlass,20.02,f+.797,z,.07,.13,.07);
 }
 for(const x of [16.97,17.38])for(const z of [-39.53,-39.12])b.b(m.metal,x,f+.29,z,.035,.58,.035);
 b.b(m.walnut,17.175,f+.61,-39.325,.61,.055,.61);
 b.part('disc',m.neonAmber,17.175,f+.72,-39.325,.045,.16,.045);
 b.part('disc',m.metal,17.175,f+.82,-39.325,.1,.07,.1);
 b.b(m.cloth,17.33,f+.647,-39.37,.14,.012,.19);
 // A front-operated selector console: one deck, a small integrated amplifier and headphones.
 // No implied operator aisle behind the cabinet, no duplicated players for the single source.
 b.b(m.walnut,18.35,f+1.025,-40.48,2.5,.07,.79);
 // Metre-scale imported hi-fi occupies these same counter positions (ShindoAssets).
 b.part('torus',m.metal,19.2,f+1.25,-40.51,.11,.11,.11,0,Math.PI/2);
 for(const z of [-40.6,-40.42])b.b(m.leather,19.2,f+1.2,z,.1,.13,.06);
 b.b(m.smokedSteel,19.2,f+1.074,-40.51,.14,.02,.2);
 b.b(m.smokedSteel,19.2,f+1.21,-40.51,.013,.26,.013);
 rod(m.smokedSteel,[19.16,f+1.34,-40.51],[19.24,f+1.34,-40.51],.012);
 rod(m.acoustic,[19.19,f+1.1,-40.73],[19.19,f+.4,-40.8],.008);
 // Visible rubber feet support the equipment, with a rear cable chase within the cabinet.
 b.b(m.smokedSteel,18.35,f+1.065,-40.82,2.18,.02,.055);
 // Compact walnut monitors on steel stands, toed into the listening area.
 for(const x of [16.45,20.0]){
  b.origin(x,-40.72,Math.atan2(18.25-x,4.5));
  b.b(m.smokedSteel,0,f+.045,0,.46,.06,.4);b.b(m.smokedSteel,0,f+.29,0,.09,.5,.09);b.b(m.smokedSteel,0,f+.545,0,.43,.035,.35);
 }
 b.origin();
 // A quiet acoustic wall with a small identity plaque and one framed sleeve. Architecture first.
 b.b(m.acoustic,18.25,f+1.98,-41.005,2.65,.94,.055);
 for(let i=0;i<27;i++)b.b(m.walnut,17.0+i*.096,f+1.97,-40.955,.034,.9,.05+(i%4)*.025);
 b.b(m.smokedSteel,17.66,f+1.98,-40.81,.49,.55,.055);
 sign('shindo-art',17.66,f+1.98,-40.778,.45,.51);
 b.b(m.brass,18.96,f+1.88,-40.81,.53,.19,.025);
 sign('shindo-plaque',18.96,f+1.88,-40.791,.5,.16);
 for(const x of [17.68,18.45,19.22]){
  b.b(m.walnut,x,f+.4,-40.08,.64,.53,.025);
  // LP sleeves are 33 cm high; the upper cabinet band is reserved for the music controls.
  for(let j=0;j<20;j++)b.b(j%7===0?m.redPaint:j%3===1?m.acoustic:m.cloth,x-.23+j*.024,f+.435,-40.047,.012,.33,.035);
 }
 for(const [i,x]of [17.68,18.45,19.22].entries())sign('shindo-sleeve-'+['a','b','c'][i],x,f+.435,-40.022,.3,.3);
 b.b(m.smokedSteel,18.94,f+.865,-40.05,.77,.29,.035);
 for(const {x}of SHINDO_CONTROLS)b.b(m.acoustic,x,f+SHINDO_PANEL.yAboveFloor,-40.021,SHINDO_PANEL.width,SHINDO_PANEL.height,.014);
 for(const x of [18.577,19.303])for(const y of [.737,.993])b.part('disc',m.brass,x,f+y,-40.031,.004,.003,.004,Math.PI/2);
 sign('shindo-sessions',20.235,f+1.76,-35.43,.39,.55,-Math.PI/2);
 for(const [theme,z]of [['shindo-poster-b',-38.68],['shindo-poster-c',-39.62]] as const){
  b.b(m.smokedSteel,16.014,f+1.72,z,.045,.56,.4);sign(theme,16.043,f+1.72,z,.36,.52,Math.PI/2);
 }
 sign('shindo-house',17.27,f+1.65,-32.837,.34,.43,Math.PI);
 // This leaf is held open at the public stair threshold. No tenant/credits sign belongs on it.
 // Pendant shades and practical accents correspond to the bounded local lights in NightlifeStreet.
 for(const z of [-34.7,-36.6]){
  rod(m.metal,[17.65,top-.02,z],[17.65,f+2.13,z],.009);
  b.part('disc',m.acoustic,17.65,f+2.08,z,.2,.15,.2);
  b.part('disc',m.light,17.65,f+1.997,z,.12,.018,.12);
 }
 b.b(m.smokedSteel,18.25,f+2.39,-40.75,1.8,.035,.11);
 b.b(m.light,18.25,f+2.367,-40.73,1.55,.009,.055);
 b.b(m.neonAmber,16.013,f+1.03,-39.45,.02,.025,2.05);
 // Framed held-open acoustic leaf and exit marker mark a real landing, clear of the stairs.
 b.section('shindo:entry-door');
 for(const x of [18.63,20.35])b.b(m.walnut,x,f+1.2,-32.87,.065,2.4,.09);
 b.b(m.walnut,19.5,f+2.36,-32.87,1.76,.1,.09);
 b.b(m.shindoWall,19.5,f+2.4675,-32.87,1.805,.115,.12);
 b.b(m.walnut,20.3,f+1.155,-33.31,.075,2.31,.83);
 b.b(m.acoustic,20.25,f+1.155,-33.31,.024,2.09,.67);
 b.b(m.brass,20.221,f+1.04,-33.03,.025,.24,.025);
 b.b(m.smokedSteel,19.5,f+2.44,-32.915,.5,.14,.03);
 b.section('yoto:venue');
 // Opposite faces of the head: arrival from the stair, exit toward the street.
 sign('shindo-exit',19.5,f+2.36,-32.949,.54,.071,Math.PI);
 sign('shindo-arrival',19.5,f+2.36,-32.791,.54,.071);
}
