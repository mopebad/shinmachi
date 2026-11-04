/** Original metre-scale archetypes. Width includes the rendered exterior mirrors. */
export interface VehicleProfile {
  name: string; family: 'work' | 'commuter' | 'service' | 'premium' | 'enthusiast';
  length: number; width: number; bodyWidth: number; height: number; wheelbase: number; wheelRadius: number;
  belt: number; frontBase: number; frontRoof: number; rearRoof: number; rearBase: number;
  roofWidth: number; nose: number; style: 'kei' | 'van' | 'hatch' | 'sedan' | 'truck' | 'sport' | 'modern' | 'luxury' | 'wagon' | 'crossover' | 'coupe' | 'mpv' | 'hybrid';
  weight: number; palette: readonly number[];
}
const neutral = [0xd9dbd5, 0xa8b1b4, 0x333d45, 0x263c4d, 0x703d3b];
const work = [0xd8dcd5, 0xb2bcb8, 0xc1b9a0, 0x79968b];
const premium = [0x242c34, 0x64737b, 0xc6cbca, 0xe0dfd7, 0x25374e];

export const VEHICLE_PROFILES = {
  kei: { name:'Koma K — kei work van',family:'work',length:3.38,bodyWidth:1.47,width:1.69,height:1.87,wheelbase:2.43,wheelRadius:.267,belt:.97,frontBase:.43,frontRoof:.34,rearRoof:-.42,rearBase:-.46,roofWidth:.91,nose:.88,style:'kei',weight:18,palette:work },
  van: { name:'Shiro Cargo — delivery van',family:'work',length:4.68,bodyWidth:1.70,width:1.98,height:1.99,wheelbase:2.58,wheelRadius:.308,belt:1.02,frontBase:.44,frontRoof:.32,rearRoof:-.42,rearBase:-.47,roofWidth:.89,nose:.88,style:'van',weight:15,palette:work },
  compact: { name:'Minato H — city hatchback',family:'commuter',length:3.98,bodyWidth:1.69,width:1.95,height:1.53,wheelbase:2.50,wheelRadius:.297,belt:.87,frontBase:.30,frontRoof:.11,rearRoof:-.28,rearBase:-.43,roofWidth:.82,nose:.78,style:'hatch',weight:18,palette:[...neutral,0x8a9f9b,0x9b883e] },
  commuter: { name:'Hikari S — commuter sedan',family:'commuter',length:4.57,bodyWidth:1.75,width:2.01,height:1.46,wheelbase:2.68,wheelRadius:.309,belt:.87,frontBase:.22,frontRoof:.05,rearRoof:-.19,rearBase:-.35,roofWidth:.80,nose:.82,style:'sedan',weight:11,palette:neutral },
  taxi: { name:'Hikari Service — city taxi',family:'service',length:4.57,bodyWidth:1.75,width:2.01,height:1.63,wheelbase:2.68,wheelRadius:.309,belt:.87,frontBase:.22,frontRoof:.05,rearRoof:-.19,rearBase:-.35,roofWidth:.80,nose:.82,style:'sedan',weight:8,palette:[0x343c3f,0xe3e0d0,0xc9d3cb] },
  truck: { name:'Machi Box — light delivery truck',family:'work',length:4.86,bodyWidth:1.83,width:2.09,height:2.59,wheelbase:2.62,wheelRadius:.327,belt:1.02,frontBase:.46,frontRoof:.39,rearRoof:.13,rearBase:.12,roofWidth:.92,nose:.92,style:'truck',weight:10,palette:[0xd9dfd8,0xa5b7bd,0xb6c6bb] },
  mpv: { name:'Sora M — family minivan',family:'commuter',length:4.77,bodyWidth:1.77,width:2.03,height:1.88,wheelbase:2.86,wheelRadius:.315,belt:.99,frontBase:.35,frontRoof:.22,rearRoof:-.39,rearBase:-.46,roofWidth:.88,nose:.86,style:'mpv',weight:6,palette:neutral },
  hybrid: { name:'Nagi E — hybrid liftback',family:'commuter',length:4.56,bodyWidth:1.77,width:2.03,height:1.44,wheelbase:2.72,wheelRadius:.315,belt:.86,frontBase:.28,frontRoof:.04,rearRoof:-.14,rearBase:-.45,roofWidth:.80,nose:.77,style:'hybrid',weight:6,palette:[0xd9e1dc,0xb3bdc0,0x38464d,0x667b8c,0x8b9374] },
  executive: { name:'Rhein 48 — sporting executive sedan',family:'premium',length:4.82,bodyWidth:1.83,width:2.09,height:1.45,wheelbase:2.85,wheelRadius:.333,belt:.87,frontBase:.18,frontRoof:.015,rearRoof:-.20,rearBase:-.34,roofWidth:.79,nose:.83,style:'sport',weight:2,palette:premium },
  modern: { name:'Elbe A — modern executive sedan',family:'premium',length:4.86,bodyWidth:1.85,width:2.11,height:1.43,wheelbase:2.88,wheelRadius:.337,belt:.88,frontBase:.23,frontRoof:.045,rearRoof:-.22,rearBase:-.39,roofWidth:.81,nose:.86,style:'modern',weight:2,palette:premium },
  luxury: { name:'Linden L — formal luxury sedan',family:'premium',length:4.94,bodyWidth:1.87,width:2.13,height:1.48,wheelbase:2.95,wheelRadius:.342,belt:.89,frontBase:.19,frontRoof:.035,rearRoof:-.205,rearBase:-.35,roofWidth:.81,nose:.86,style:'luxury',weight:1,palette:premium },
  wagon: { name:'Elbe Touring — luxury estate',family:'premium',length:4.83,bodyWidth:1.85,width:2.11,height:1.53,wheelbase:2.83,wheelRadius:.337,belt:.91,frontBase:.23,frontRoof:.045,rearRoof:-.35,rearBase:-.46,roofWidth:.83,nose:.85,style:'wagon',weight:1,palette:premium },
  crossover: { name:'Feld C — urban crossover',family:'premium',length:4.58,bodyWidth:1.86,width:2.12,height:1.66,wheelbase:2.74,wheelRadius:.356,belt:1.00,frontBase:.24,frontRoof:.065,rearRoof:-.27,rearBase:-.43,roofWidth:.82,nose:.85,style:'crossover',weight:1,palette:premium },
  coupe: { name:'Akebono R — enthusiast coupe',family:'enthusiast',length:4.48,bodyWidth:1.81,width:2.05,height:1.34,wheelbase:2.65,wheelRadius:.326,belt:.80,frontBase:.15,frontRoof:-.01,rearRoof:-.21,rearBase:-.34,roofWidth:.77,nose:.87,style:'coupe',weight:1,palette:[0x405d8f,0x75434c,0xb4b8b9,0xd9ded6,0x353a44] },
} as const satisfies Record<string,VehicleProfile>;
export type VehicleKind = keyof typeof VEHICLE_PROFILES;
export const VEHICLE_KINDS = Object.keys(VEHICLE_PROFILES) as VehicleKind[];
export interface VehicleAppearance { kind: VehicleKind; color: number; variant: number }

/** One seeded draw; diversity constraints never draw from an unseeded visual RNG. */
export function selectVehicle(draw: number, serial: number, active: readonly VehicleAppearance[], leader?: VehicleKind): VehicleAppearance {
  const premiums=active.filter(v=>VEHICLE_PROFILES[v.kind].family==='premium').length;
  const candidates=VEHICLE_KINDS.filter(k=>k!==leader && (VEHICLE_PROFILES[k].family!=='premium'||premiums<(active.length<14?1:2)));
  const total=candidates.reduce((sum,k)=>sum+VEHICLE_PROFILES[k].weight,0);
  let remaining=Math.min(1-Number.EPSILON,Math.max(0,draw))*total,kind=candidates.at(-1)!;
  for(const k of candidates){remaining-=VEHICLE_PROFILES[k].weight;if(remaining<0){kind=k;break;}}
  const palette=VEHICLE_PROFILES[kind].palette;
  const offset=(Math.imul(serial+1,2654435761)>>>0)%palette.length;
  for(let i=0;i<palette.length*3;i++) {
    const color=palette[(offset+i)%palette.length],variant=(serial+Math.floor(i/palette.length))%3;
    if(!active.some(v=>v.kind===kind&&v.color===color&&v.variant===variant))return{kind,color,variant};
  }
  return{kind,color:palette[offset],variant:serial%3};
}
