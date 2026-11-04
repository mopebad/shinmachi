import { seededRandom } from '../simulation/WorldRules.ts';

/** Fictional geography in metres, using an independent background RNG stream. */
export const AKANE_TOWER = Object.freeze({ x: -32, z: -1050, height: 333, baseWidth: 95, yaw: Math.PI * .09, mainDeck: 150, topDeck: 250, foundationHalfSize: 67 });
export const SKYLINE_FAMILIES = ['postwar-office','tile-apartment','curtain-office','mixed-use','stepped-residential','commercial-tower','utility-office'] as const;
export interface SkylineRect { minX: number; maxX: number; minZ: number; maxZ: number }
export interface SkylineBuilding { x: number; z: number; width: number; depth: number; floors: number; family: number; layer: number; yaw: number; seed: number; block: string; floorHeight: number; palette: number }
export interface SceneryRoad extends SkylineRect { id: string; axis: 'x' | 'z'; width: number }
export const PLAYABLE_ENVELOPE: SkylineRect = { minX: -75, maxX: 75, minZ: -75, maxZ: 75 };
export const RAIL_ENVELOPE: SkylineRect = { minX: -360, maxX: 360, minZ: -65, maxZ: -49 };
export const TOWER_ENVELOPE: SkylineRect = { minX: AKANE_TOWER.x-AKANE_TOWER.foundationHalfSize,maxX:AKANE_TOWER.x+AKANE_TOWER.foundationHalfSize,minZ:AKANE_TOWER.z-AKANE_TOWER.foundationHalfSize,maxZ:AKANE_TOWER.z+AKANE_TOWER.foundationHalfSize };
const xs = [-650,-420,-240,-110,0,110,240,420,650];
const zs = [-1520,-1220,-1035,-885,-690,-520,-370,-255,-160,-76,-40,12,76,195,330];
export const overlaps = (a: SkylineRect,b: SkylineRect) => a.minX<b.maxX && a.maxX>b.minX && a.minZ<b.maxZ && a.maxZ>b.minZ;
export function skylineFootprint(s: SkylineBuilding): SkylineRect {
  const hx=(Math.abs(Math.cos(s.yaw))*s.width+Math.abs(Math.sin(s.yaw))*s.depth)/2,hz=(Math.abs(Math.cos(s.yaw))*s.depth+Math.abs(Math.sin(s.yaw))*s.width)/2;
  return {minX:s.x-hx,maxX:s.x+hx,minZ:s.z-hz,maxZ:s.z+hz};
}
/** Scenery only: no routes, signals, destinations or actors are registered. */
export function skylineRoads(): SceneryRoad[] {
  const roads: SceneryRoad[]=[];
  for(const x of xs.slice(1,-1)) {
    const width=x===0?8:Math.abs(x)===240?16:9;
    for(const [a,b]of (Math.abs(x)<75?[[-1520,-75],[75,330]]:[[-1520,330]])) {
      const road={id:`north-south-${x}-${a}`,axis:'z' as const,width,minX:x-width/2,maxX:x+width/2,minZ:a,maxZ:b};
      if(overlaps(road,TOWER_ENVELOPE))roads.push({...road,maxZ:TOWER_ENVELOPE.minZ},{...road,id:road.id+'-south',minZ:TOWER_ENVELOPE.maxZ});else roads.push(road);
    }
  }
  for(const z of zs.slice(1,-1)) {
    const width=z===12?10:Math.abs(z)>300?13:8;
    for(const [a,b]of (Math.abs(z)<75?[[-650,-75],[75,650]]:[[-650,650]])) {
      const road={id:`east-west-${z}-${a}`,axis:'x' as const,width,minX:a,maxX:b,minZ:z-width/2,maxZ:z+width/2};
      if(overlaps(road,TOWER_ENVELOPE))roads.push({...road,maxX:TOWER_ENVELOPE.minX},{...road,id:road.id+'-east',minX:TOWER_ENVELOPE.maxX});else roads.push(road);
    }
  }
  return roads.filter(r=>r.maxX>r.minX&&r.maxZ>r.minZ);
}
/** Establish streets and common block setbacks before selecting individual parcels. */
export function skylineLayout(seed = 72831): SkylineBuilding[] {
  const rng=seededRandom(seed),buildings:SkylineBuilding[]=[],roads=skylineRoads();
  for(let iz=0;iz<zs.length-1;iz++)for(let ix=0;ix<xs.length-1;ix++) {
    const left=xs[ix]+12,right=xs[ix+1]-12,back=zs[iz]+12,front=zs[iz+1]-12;
    const distance=Math.hypot((left+right)/2,Math.min(0,(back+front)/2));
    const layer=distance<280?0:distance<650?1:2;
    const nx=Math.max(1,Math.floor((right-left)/(layer===0?26:layer===1?42:72))),nz=Math.max(1,Math.floor((front-back)/(layer===0?34:layer===1?48:82)));
    const cellW=(right-left)/nx,cellD=(front-back)/nz;
    const cluster=Math.max(Math.exp(-(((left+right)/2+230)**2)/45000-((back+front)/2+430)**2/60000),Math.exp(-(((left+right)/2-260)**2)/65000-((back+front)/2+760)**2/110000));
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++) {
      const width=cellW*(.73+rng()*.18),depth=cellD*(.67+rng()*.23),x=left+(i+.5)*cellW+(rng()-.5)*1.4,z=back+(j+.5)*cellD+(rng()-.5)*1.4;
      const commercial=cluster>.44||Math.abs(Math.abs(x)-240)<38;
      const family=commercial?(rng()<.43?2:rng()<.48?5:0):[0,1,3,4,6][Math.floor(rng()*5)];
      let floors=layer===0?4+Math.floor(rng()*8):5+Math.floor(rng()*10+cluster*15);
      if(family===5)floors+=8+Math.floor(cluster*9);
      if(x>100&&z>0)floors=Math.min(floors,4+Math.floor(rng()*5));
      const spec:SkylineBuilding={x,z,width,depth,floors,family,layer,yaw:family===6&&ix%2===0?Math.PI/2:0,seed:Math.floor(rng()*0xffffff),block:`${ix}:${iz}`,floorHeight:family===2||family===5?3.7:family===1||family===4?2.95:3.25,palette:Math.floor(rng()*7)};
      const box=skylineFootprint(spec),pad=1.6;
      if(box.minX<left||box.maxX>right||box.minZ<back||box.maxZ>front)continue;
      const padded={minX:box.minX-pad,maxX:box.maxX+pad,minZ:box.minZ-pad,maxZ:box.maxZ+pad};
      if([PLAYABLE_ENVELOPE,RAIL_ENVELOPE,TOWER_ENVELOPE,...roads].some(r=>overlaps(padded,r)))continue;
      if(buildings.some(other=>overlaps(padded,skylineFootprint(other))))continue;
      buildings.push(spec);
    }
  }
  return buildings;
}
