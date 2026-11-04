import { seededRandom } from './WorldRules.ts';
import type { Business } from './WorldRules.ts';
import type { VehicleKind } from './VehicleCatalog.ts';

export type PedestrianPurpose='commuter'|'office'|'student'|'shopper'|'leisure'|'restaurant'|'station';
export interface PedestrianIdentity {
  readonly uid:number; readonly purpose:PedestrianPurpose; readonly preferredSpeed:number;
  readonly acceleration:number; readonly deceleration:number; readonly turningRate:number;
  readonly cadence:number; readonly strideLength:number; readonly personalSpace:number;
  readonly urgency:number; readonly optionalChance:number; readonly socialChance:number;
  readonly phase:number; readonly laneBias:number;
  readonly appearance:Readonly<{shirt:number;trousers:number;skin:number;hair:number;hairStyle:number;style:number;scale:number;build:number;shoe:number}>;
}
export interface DriverIdentity {
  readonly uid:number;readonly preferredSpeed:number;readonly acceleration:number;readonly braking:number;
  readonly followingGap:number;readonly headway:number;readonly turnSpeed:number;readonly steeringRate:number;
  readonly indicatorPhase:number;readonly purpose:'delivery'|'service'|'commute'|'private'|'leisure';readonly engine:'kei'|'diesel'|'hybrid'|'ordinary'|'refined'|'sport';
}
const clamp=(x:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,x));
const purposes:PedestrianPurpose[]=['commuter','office','student','shopper','leisure','restaurant','station'];

/** A separate birth stream makes traits independent of render frames and route RNG draws. */
export function pedestrianIdentity(seed:number,uid:number,purpose?:PedestrianPurpose):PedestrianIdentity {
  const rng=seededRandom(seed^Math.imul(uid+1,0x45d9f3b));
  const normal=(mean:number,spread:number)=>mean+((rng()+rng()+rng())/3-.5)*spread*2;
  purpose??=purposes[Math.floor(rng()*purposes.length)];
  const purposeful=['commuter','office','station'].includes(purpose),urgency=clamp(normal(purposeful?.70:.35,.28),.1,.95);
  const preferredSpeed=clamp(normal(1.04+urgency*.40,.25),.94,1.50),cadence=clamp(normal(1.03+urgency*.12,.14),.9,1.25);
  const colors=purpose==='office'||purpose==='commuter'?[0x303d49,0x495263,0x736c66,0x59616b]:[0x52675c,0xb6a59a,0x7c6068,0x3b6575,0x8b8e77,0xb6b4a6,0x594e59];
  const style=purpose==='office'||purpose==='commuter'?0:purpose==='student'?1:Math.floor(rng()*5);
  const appearance=Object.freeze({shirt:colors[Math.floor(rng()*colors.length)],trousers:[0x30383f,0x3d4245,0x3b4853,0x5b544d,0x4b494b][Math.floor(rng()*5)],
    skin:[0xbd9275,0xd0aa89,0xae8065,0xc59f85,0xd1b39b][Math.floor(rng()*5)],hair:style===4?0x77736b:[0x211f1c,0x362b26,0x48372d][Math.floor(rng()*3)],hairStyle:Math.floor(rng()*3),style,
    scale:normal(.972,.045),build:normal(1,.065),shoe:Math.floor(rng()*3)});
  return Object.freeze({uid,purpose,preferredSpeed,acceleration:normal(1.25,.35),deceleration:normal(1.8,.35),turningRate:normal(3.5,.7),cadence,
    strideLength:clamp(preferredSpeed/(2*cadence),.48,.68),personalSpace:normal(.69,.11),urgency,optionalChance:purposeful?.13:.38,socialChance:purpose==='leisure'||purpose==='student'?.38:.17,
    phase:rng()*Math.PI*2,laneBias:normal(0,.02),appearance});
}

export function driverIdentity(seed:number,uid:number,kind:VehicleKind):DriverIdentity {
  const rng=seededRandom(seed^Math.imul(uid+3,0x27d4eb2d)),vary=(base:number,range:number)=>base+(rng()+rng()-1)*range;
  const delivery=['kei','van','truck'].includes(kind),premium=['executive','modern','luxury','wagon','crossover'].includes(kind),sport=kind==='coupe'||kind==='executive';
  return Object.freeze({uid,preferredSpeed:clamp(vary(delivery?5.55:sport?5.98:5.8,.32),5.05,6.1),acceleration:vary(kind==='truck'?.9:delivery?1.08:sport?1.85:premium?1.5:1.35,.14),
    braking:vary(delivery?2.1:2.4,.2),followingGap:vary(delivery?1.55:1.30,.15),headway:vary(delivery?1.0:.85,.12),turnSpeed:vary(delivery?3.0:sport?3.6:3.35,.15),
    steeringRate:vary(delivery?.7:1.05,.12),indicatorPhase:rng()*.75,purpose:delivery?'delivery':kind==='taxi'?'service':sport?'leisure':premium?'private':'commute',
    engine:kind==='kei'?'kei':kind==='van'||kind==='truck'?'diesel':kind==='hybrid'?'hybrid':sport?'sport':premium?'refined':'ordinary'});
}

export function businessAffinity(p:PedestrianIdentity,business:Business,hour:number):number {
  const morning=Math.exp(-(((hour-8)/2)**2)),evening=Math.exp(-(((hour-19)/3)**2));
  if(business==='office')return p.purpose==='office'?3+morning*3:.25;
  if(business==='restaurant')return p.purpose==='restaurant'?3+evening*3:1+evening;
  if(business==='retail')return p.purpose==='shopper'?4:1;
  if(business==='cafe')return p.purpose==='student'||p.purpose==='leisure'?2.5:1+morning;
  if(business==='residential')return p.purpose==='leisure'?.8:.35;
  return 1.5;
}
