/** Authoritative metre-scale station contract. Rendering and future multi-level navigation use these same surfaces. */
export interface StationPoint { x: number; y: number; z: number }
export interface StationRect { minX: number; maxX: number; minZ: number; maxZ: number }
export interface StationSurface extends StationRect { id: string; y: number; kind: 'concourse' | 'landing' | 'platform' | 'tread'; thickness: number }
export interface StationBox extends StationRect { id: string; minY: number; maxY: number; material: 'wall' | 'concrete' | 'steel' | 'glass' | 'roof' | 'gate' | 'wood'; collision: boolean; renderedByRailway?: boolean }
export interface StationFlight { id: string; from: StationPoint; to: StationPoint; width: number; risers: number; going: number; rise: number; treads: StationSurface[] }
export interface StationGate { id: string; center: StationPoint; width: number; depth: number; accessible: boolean }
export interface StationArea extends StationRect { id: string; y: number; kind: 'entrance' | 'circulation' | 'landing' | 'waiting' }
export interface StationConnection { from: string; to: string; kind: 'walk' | 'gate' | 'stairs'; width: number }
export interface StationSpatial {
  id: string; bounds: StationRect; surfaces: StationSurface[]; boxes: StationBox[]; flights: StationFlight[];
  areas: StationArea[]; gates: StationGate[]; nodes: Record<string, StationPoint>; connections: StationConnection[];
  platformEdges: { id: string; a: StationPoint; b: StationPoint; inward: StationPoint; warningWidth: number }[];
  journey: StationPoint[]; npcReservation: StationRect[];
}

export const STATION = {
  groundY: .115, platformY: 7.455, trackZ: -57, railHeadY: 7.02,
  platformMinX: 8, platformMaxX: 61.5, platformEdgeZ: -55.5, platformRearZ: -47.7,
  stairStartX: 15.2, stairEndX: 23.21, landingEndX: 25.21, restMinX: 18.3, restMaxX: 19.8, lowerZ: -49.9, upperZ: -52.2,
  stairWidth: 1.8, risers: 21, going: .31, openingMinZ: -53.1, openingMaxZ: -49,
} as const;

const point = (x: number, y: number, z: number): StationPoint => ({ x, y, z });
export const inStationRect = (p: { x: number; z: number }, r: StationRect, inset = 0) => p.x >= r.minX + inset && p.x <= r.maxX - inset && p.z >= r.minZ + inset && p.z <= r.maxZ - inset;

export function createStationLayout(): StationSpatial {
  const c = STATION, g = c.groundY, p = c.platformY, mid = (g + p) / 2, rise = (p - g) / (c.risers * 2);
  const surfaces: StationSurface[] = [], boxes: StationBox[] = [];
  const surface = (id: string, kind: StationSurface['kind'], minX: number, maxX: number, minZ: number, maxZ: number, y: number, thickness = .28) => { const s = { id, kind, minX, maxX, minZ, maxZ, y, thickness }; surfaces.push(s); return s; };
  const box = (id: string, material: StationBox['material'], minX: number, maxX: number, minZ: number, maxZ: number, minY: number, maxY: number, collision = true) => boxes.push({ id, material, minX, maxX, minZ, maxZ, minY, maxY, collision });
  surface('concourse-floor','concourse',9.6,25.6,-53.1,-46.4,g,.18);
  surface('lower-landing','landing',13.2,c.stairStartX,-50.8,-49,g,.2);
  surface('return-landing','landing',c.stairEndX,c.landingEndX,c.openingMinZ,c.openingMaxZ,mid,.25);
  // Four pieces leave a real stairwell opening. There is no invisible full platform slab across the stairs.
  surface('platform-trackside','platform',c.platformMinX,c.platformMaxX,c.platformEdgeZ,c.openingMinZ,p);
  surface('platform-rear','platform',c.platformMinX,c.platformMaxX,c.openingMaxZ,c.platformRearZ,p);
  surface('platform-west','platform',c.platformMinX,c.stairStartX,c.openingMinZ,c.openingMaxZ,p);
  surface('platform-east','platform',c.landingEndX,c.platformMaxX,c.openingMinZ,c.openingMaxZ,p);
  const flight = (id: string, from: StationPoint, to: StationPoint, risers: number): StationFlight => {
    const direction = Math.sign(to.x-from.x), treads: StationSurface[] = [];
    for(let i=0;i<risers;i++) {
      const a=from.x+direction*i*c.going,b=a+direction*c.going;
      treads.push(surface(`${id}-tread-${i+1}`,'tread',Math.min(a,b),Math.max(a,b),from.z-c.stairWidth/2,from.z+c.stairWidth/2,from.y+(i+1)*rise,rise));
    }
    return {id,from,to,width:c.stairWidth,risers,going:c.going,rise,treads};
  };
  const lowRest=g+10*rise,upRest=mid+11*rise;
  surface('lower-rest','landing',c.restMinX,c.restMaxX,c.lowerZ-.9,c.lowerZ+.9,lowRest,.25);
  surface('upper-rest','landing',c.restMinX,c.restMaxX,c.upperZ-.9,c.upperZ+.9,upRest,.25);
  const flights=[
    flight('lower-flight-a',point(c.stairStartX,g,c.lowerZ),point(c.restMinX,lowRest,c.lowerZ),10),
    flight('lower-flight-b',point(c.restMaxX,lowRest,c.lowerZ),point(c.stairEndX,mid,c.lowerZ),11),
    flight('upper-flight-a',point(c.stairEndX,mid,c.upperZ),point(c.restMaxX,upRest,c.upperZ),11),
    flight('upper-flight-b',point(c.restMinX,upRest,c.upperZ),point(c.stairStartX,p,c.upperZ),10),
  ];
  for(const [z,y]of [[c.lowerZ,lowRest],[c.upperZ,upRest]])for(const side of [-1,1])box(`rest-rail-${z}-${side}`,'glass',c.restMinX,c.restMaxX,z+side*.9-.025,z+side*.9+.025,y,y+1.02);
  box('rest-support','concrete',18.96,19.14,-51.14,-50.96,g,upRest-.25);
  for(const [z,y]of [[c.lowerZ,lowRest],[c.upperZ,upRest]])box(`rest-crosshead-${z}`,'concrete',18.9,19.2,Math.min(z-.9,-51.14),Math.max(z+.9,-50.96),y-.43,y-.25,false);
  // Concourse walls and the paid/unpaid separator are structural, not a single opaque collision rectangle.
  box('west-wall','wall',9.45,9.65,-53.2,-46.4,g,7.175);
  box('east-wall','wall',25.5,25.7,-53.2,-46.4,g,7.175);
  box('ticket-wall','wall',18.4,25.6,-49.14,-48.94,g,3.9);
  box('paid-rear-wall','wall',9.6,15.2,-53.25,-53.05,g,3.3);
  box('paid-ceiling','roof',9.65,15.2,-53.05,-49,3.18,3.3,false);
  box('gate-return','steel',14.45,14.54,-49,-48.4,g,1.25);
  box('gate-west-divider','steel',9.65,10.1,-48.51,-48.39,g,1.25);
  box('ticket-roof','roof',9.3,25.9,-49,-45.8,4.02,4.24,false);
  box('entrance-beam','steel',9.3,25.9,-46.07,-45.85,3.2,3.9,false);
  for(const x of [9.8,15.0,25.2])box(`foyer-column-${x}`,'concrete',x-.16,x+.16,-46.7,-46.38,g,4.02);
  // The platform extension is carried by paired columns, longitudinal girders and crossheads.
  for(const x of [8.5,25.2,37.2,49.2,61.0])for(const z of [-54.3,-48.15]){
    box(`support-${x}-${z}`,'concrete',x-.26,x+.26,z-.28,z+.28,g,6.94);
    box(`footing-${x}-${z}`,'concrete',x-.42,x+.42,z-.44,z+.44,-.08,.22);
  }
  for(const z of [-54.3,-48.15])box(`platform-girder-${z}`,'concrete',c.platformMinX,c.platformMaxX,z-.22,z+.22,6.72,p-.28,false);
  for(const x of [8.5,25.2,37.2,49.2,61.0])box(`platform-crosshead-${x}`,'concrete',x-.23,x+.23,c.platformEdgeZ,c.platformRearZ,6.71,p-.28,false);
  // Stairwell guard volumes follow the rail panels drawn by StationDetails; the west upper exit stays open.
  for(const z of [c.openingMinZ,c.openingMaxZ])box(`well-guard-${z}`,'glass',c.stairStartX,c.landingEndX,z-.035,z+.035,p,p+1.1);
  box('well-east-guard','glass',c.landingEndX-.035,c.landingEndX+.035,c.openingMinZ,c.openingMaxZ,p,p+1.1);
  box('well-west-lower-guard','glass',c.stairStartX-.035,c.stairStartX+.035,-50.85,c.openingMaxZ,p,p+1.1);
  box('return-east-guard','glass',c.landingEndX-.035,c.landingEndX+.035,c.openingMinZ,c.openingMaxZ,mid,mid+1.1);
  for(const z of [c.openingMinZ,c.openingMaxZ])box(`return-guard-${z}`,'glass',c.stairEndX,c.landingEndX,z-.035,z+.035,mid,mid+1.1);
  // Edge screens remain closed static architecture, with no boarding or door-control logic.
  box('track-edge-screen','glass',c.platformMinX,c.platformMaxX,c.platformEdgeZ+.085,c.platformEdgeZ+.135,p,p+1.12);
  box('rear-guard','glass',c.platformMinX,c.platformMaxX,c.platformRearZ-.065,c.platformRearZ-.015,p,p+1.1);
  for(const x of [c.platformMinX,c.platformMaxX])box(`platform-end-${x}`,'glass',x-.03,x+.03,c.platformEdgeZ+.11,c.platformRearZ-.04,p,p+1.1);
  for(const x of [8.5,25.2,37.2,49.2,61.0])for(const z of [-53.35,-48.15])box(`canopy-post-${x}-${z}`,'steel',x-.085,x+.085,z-.085,z+.085,p,10.78);
  box('canopy','roof',7.8,61.7,-55.3,-47.4,10.91,11.05,false);
  for(let x=8.5;x<62;x+=3)box(`canopy-beam-${x}`,'steel',x-.045,x+.045,-55.25,-47.45,10.7,10.91,false);
  // Existing catenary masts stay in place. Export their exact obstacle bounds without drawing duplicates.
  for(const x of [15,30,45,60])boxes.push({id:`railway-mast-${x}`,minX:x-.04,maxX:x+.04,minZ:-54.74,maxZ:-54.66,minY:6.6,maxY:11.6,material:'steel',collision:true,renderedByRailway:true});
  const gates=[{id:'wide-gate',center:point(10.95,g,-48.45),width:1.05,depth:1.6,accessible:true},{id:'gate-2',center:point(12.3,g,-48.45),width:.9,depth:1.6,accessible:false},{id:'gate-3',center:point(13.6,g,-48.45),width:.9,depth:1.6,accessible:false}];
  for(const [i,x]of [10.22,11.65,12.95,14.25].entries())box(`gate-body-${i}`,'gate',x-.16,x+.16,-49.25,-47.65,g,g+1.02);
  for(const x of [21.7,23.15])box(`ticket-machine-${x}`,'steel',x-.45,x+.45,-48.915,-48.285,g,2.285);
  box('stair-glazing-plinth','wall',15.2,23.7,-49.02,-48.92,g,1.885);
  for(const x of [23.45,24.95])for(const z of [-52.85,-49.25])box(`landing-leg-${x}-${z}`,'concrete',x-.09,x+.09,z-.09,z+.09,g,3.535);
  for(const x of [29,41,53]){
    box(`bench-seat-${x}`,'wood',x-1,x+1,-48.49,-48.01,p+.435,p+.525);
    box(`bench-back-${x}`,'wood',x-1,x+1,-48.0625,-47.9975,p+.505,p+1.055);
  }
  const areas: StationArea[]=[
    {id:'east-entrance',kind:'entrance',minX:15.5,maxX:22,minZ:-46.7,maxZ:-46.1,y:g},
    {id:'unpaid-concourse',kind:'circulation',minX:15.6,maxX:22,minZ:-48.75,maxZ:-46.4,y:g},
    {id:'ticket-approach',kind:'circulation',minX:10.4,maxX:14.1,minZ:-47.6,maxZ:-46.5,y:g},
    {id:'paid-circulation',kind:'circulation',minX:10.4,maxX:15.2,minZ:-50.8,maxZ:-49.25,y:g},
    {id:'upper-landing',kind:'landing',minX:13.2,maxX:15.2,minZ:-53.1,maxZ:-51.3,y:p},
    {id:'waiting-west',kind:'waiting',minX:9,maxX:12.7,minZ:-54.6,maxZ:-53.7,y:p},
    {id:'waiting-east',kind:'waiting',minX:26,maxX:59.5,minZ:-54.6,maxZ:-53.7,y:p},
  ];
  const nodes={street:point(4.55,g,-46),forecourt:point(17,g,-46),entrance:point(19,g,-46.4),concourse:point(19,g,-48),unpaidTurn:point(16,g,-47.1),gateApproach:point(13.6,g,-47.3),gate:point(13.6,g,-48.45),paid:point(13.6,g,-49.45),stairFoot:point(14.2,g,-49.9),lowerStart:flights[0].from,lowerRestA:flights[0].to,lowerRestB:flights[1].from,lowerTop:flights[1].to,returnA:point(24.21,mid,-49.9),returnB:point(24.21,mid,-52.2),upperStart:flights[2].from,upperRestA:flights[2].to,upperRestB:flights[3].from,upperTop:flights[3].to,upperLanding:point(14.2,p,-52.2),platformAccess:point(14.2,p,-53.8),waiting:point(27,p,-53.8)};
  const ids=Object.keys(nodes) as (keyof typeof nodes)[];
  const stairEnds: Record<string,number>={lowerRestA:0,lowerTop:1,upperRestA:2,upperTop:3};
  const connections: StationConnection[]=ids.slice(1).map((id,i)=>({from:ids[i],to:id,kind:id==='gate'?'gate':id in stairEnds?'stairs':'walk',width:id==='gate'?.9:1.8}));
  const journey: StationPoint[]=[];
  for(const id of ids){
    if(id in stairEnds){const f=flights[stairEnds[id]];for(const t of f.treads)journey.push(point((t.minX+t.maxX)/2,t.y,(t.minZ+t.maxZ)/2));}
    journey.push(nodes[id]);
  }
  return {id:'shinmachi-station',bounds:{minX:7.8,maxX:61.7,minZ:-55.5,maxZ:-45.8},surfaces,boxes,flights,areas,gates,nodes,connections,journey,
    platformEdges:[{id:'platform-1-track-edge',a:point(c.platformMinX,p,c.platformEdgeZ),b:point(c.platformMaxX,p,c.platformEdgeZ),inward:point(0,0,1),warningWidth:.3}],
    // Flat city agents retain their original exterior station boundary until multi-level navigation is implemented.
    npcReservation:[{minX:12.9,maxX:25.1,minZ:-54,maxZ:-49.5}]
  };
}

/** Step/landing support with a bounded step-up/down. No support means walking must stop at the drop. */
export function stationSupport(layout: StationSpatial, x: number, z: number, previousY: number): number | null {
  const candidates=layout.surfaces.filter(s=>inStationRect({x,z},s)&&s.y<=previousY+.205&&s.y>=previousY-.205).map(s=>s.y);
  if(candidates.length)return Math.max(...candidates);
  return previousY < .32 ? STATION.groundY : null;
}

export function stationBodyBlocked(layout: StationSpatial, x: number, z: number, footY: number, radius=.25): boolean {
  for(const f of layout.flights){
    if(x>Math.min(f.from.x,f.to.x)&&x<Math.max(f.from.x,f.to.x)&&Math.abs(z-f.from.z)<f.width/2+radius){
      const t=f.treads.find(t=>inStationRect({x,z},t));
      if(t&&footY<t.y-.02&&footY+1.65>t.y-.23)return true;
      if(Math.abs(z-f.from.z)>f.width/2-radius&&footY>=Math.min(f.from.y,f.to.y)-.1&&footY<Math.max(f.from.y,f.to.y)+1)return true;
    }
  }
  return layout.boxes.some(b=>b.collision&&x>b.minX-radius&&x<b.maxX+radius&&z>b.minZ-radius&&z<b.maxZ+radius&&footY+1.65>b.minY+.02&&footY<b.maxY-.015);
}
