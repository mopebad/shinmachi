import * as THREE from 'three';
import {save} from './rail-district-browser-checks.mjs';
export const views=[
 ['hero-night','heroStreet',20.5],['commercial-day','commercial',13],
 ['station-night','station',20.5,{eye:[5,1.82,-35],target:[15,3,-46],fov:65}],
 ['residential-day','residential',13],['residential-night','residential',20.5],
 ['nightlife-night','nightlife',20.5],['nightlife-day','nightlife',13],
 ['transition-day','residential',13,{eye:[28.15,1.82,-25],target:[3,3,-25],fov:64}],
 ['overview-day','overview',13,{eye:[68,72,48],target:[0,4,-10],fov:65}],
];
export async function prepare(){const w=window.__shinmachi;await w.assetsReady;w.setReviewPaused(true);w.setPlaying(false);w.setTime(20.5);w.setWeather('damp');w.setReflections(true);w.setContactShading(true);if(w.activity.simulation.clock>300.001)throw new Error('Reload review URL');while(w.activity.simulation.clock<300-1e-7)w.activity.simulation.update(1/30,20.5);return w;}
export async function captureSet(stage){
 const w=await prepare(),s=w.activity.simulation,result={stage,clock:s.clock,captures:[],contracts:{colliders:w.district.colliders,playerColliders:w.district.playerColliders,doors:w.district.doors,shopfronts:w.district.shopfronts,station:w.district.station,lamps:w.district.lamps.map(p=>p.toArray()),navigation:{nodes:s.navigation.nodes,edges:[...s.navigation.edges]}},skyline:w.backdrop.group.userData};
 for(const [name,view,hour,framing]of views)result.captures.push(await w.captureBenchmark('neighborhood-'+name+'-'+stage,view,hour,framing));
 w.teleport(8);w.setTime(20.5);w.activity.update(0,20.5,w.camera.position);result.cost=await(await import('./skyline-browser-checks.mjs')).renderCost(w);
 await save('neighborhood-'+stage+'-measurements',result);return{captures:result.captures.length,cost:result.cost};
}
export async function audit(){
 const w=window.__shinmachi,s=w.activity.simulation,base=await(await fetch('/quality/neighborhood-before-measurements.json')).json(),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const contracts={colliders:w.district.colliders,playerColliders:w.district.playerColliders,doors:w.district.doors,shopfronts:w.district.shopfronts,station:w.district.station,lamps:w.district.lamps.map(p=>p.toArray()),navigation:{nodes:s.navigation.nodes,edges:[...s.navigation.edges]}};
 const result={contracts:{},skyline:same(base.skyline,w.backdrop.group.userData),parcels:w.district.group.userData.neighborhoods.parcels,parts:0,triangles:0,trainHits:[],routeHits:[],roadHits:[],unreservedGroundParts:[],samples:0,shaderErrors:0,assetErrors:w.nightlife.assets.errors};
 const expected=structuredClone(base.contracts);result.railCorrections=[];
 for(const p of result.parcels.filter(p=>p.rendered.railAdjusted||p.rendered.cornerAdjusted||p.rendered.parcelAdjusted)){
  for(const key of ['colliders','playerColliders']){const i=expected[key].findIndex(b=>same(b,p.originalFootprint));if(i<0)throw new Error('Original lot missing');if(p.rendered.renderable)expected[key][i]=p.footprint;else expected[key].splice(i,1);}
  const i=expected.shopfronts.findIndex(f=>f.x===p.x&&f.z===p.z);if(i<0)throw new Error('Original frontage missing');if(p.rendered.renderable)expected.shopfronts[i]={...expected.shopfronts[i],x:p.rendered.x,z:p.rendered.z,width:p.rendered.width};else expected.shopfronts.splice(i,1);
  if(p.rendered.renderable&&(p.footprint.minX<p.originalFootprint.minX-1e-6||p.footprint.maxX>p.originalFootprint.maxX+1e-6||p.footprint.minZ<p.originalFootprint.minZ-1e-6||p.footprint.maxZ>p.originalFootprint.maxZ+1e-6))throw new Error('Correction exceeded original lot');
  result.railCorrections.push({original:{x:p.x,z:p.z,width:p.width,floors:p.floors},rendered:p.rendered,originalFootprint:p.originalFootprint,footprint:p.footprint});
 }
 for(const key of Object.keys(contracts))result.contracts[key]=same(expected[key],contracts[key]);
 const points=[];for(const [id,list]of s.navigation.edges)for(const edge of list){const a=s.navigation.nodes[id],b=s.navigation.nodes[edge.to],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/.1));for(let i=0;i<=n;i++){const t=i/n;points.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});}}result.samples=points.length;
 const {RAIL_DISTRICT}=await import('../src/world/generation/RailDistrictLayout.ts'),train=RAIL_DISTRICT.train,matrix=new THREE.Matrix4();
 const roads=[{minX:-3.7,maxX:3.7,minZ:-70,maxZ:70},{minX:-70,maxX:70,minZ:6.9,maxZ:17.1},{minX:27.7,maxX:32.3,minZ:-63,maxZ:63}];
 const rectHit=(b,r)=>b.min.x<r.maxX&&b.max.x>r.minX&&b.min.z<r.maxZ&&b.max.z>r.minZ;
 w.district.group.updateMatrixWorld(true);w.district.group.traverse(mesh=>{if(!mesh.isInstancedMesh)return;mesh.geometry.computeBoundingBox();for(let i=0;i<mesh.count;i++){const section=mesh.userData.sections[i];if(!section.startsWith('neighborhood:')&&!section.startsWith('neighborhood-roof:'))continue;
  mesh.getMatrixAt(i,matrix);if(!matrix.elements.every(Number.isFinite)||matrix.determinant()<=0)throw new Error('Invalid instance '+section);
  result.parts++;result.triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;
  const box=mesh.geometry.boundingBox.clone().applyMatrix4(matrix.clone().premultiply(mesh.matrixWorld));
  if(rectHit(box,train)&&box.min.y<train.maxY&&box.max.y>train.minY)result.trainHits.push({section,min:box.min,max:box.max});
  if(box.min.y<4.5&&box.max.y>.2&&roads.some(r=>rectHit(box,r)))result.roadHits.push({section,min:box.min,max:box.max});
  if(box.max.y>.2)for(const p of points)if(p.x>box.min.x-.25&&p.x<box.max.x+.25&&p.z>box.min.z-.25&&p.z<box.max.z+.25&&p.y+.08<box.max.y&&p.y+1.75>box.min.y){result.routeHits.push({section,p,min:box.min,max:box.max});break;}
  if(box.min.y<1.8&&box.max.y>.3&&!contracts.colliders.some(c=>box.min.x>=c.minX-.006&&box.max.x<=c.maxX+.006&&box.min.z>=c.minZ-.006&&box.max.z<=c.maxZ+.006))result.unreservedGroundParts.push({section,min:box.min,max:box.max});
 }});
 const gl=w.renderer.getContext();result.shaderErrors=w.renderer.info.programs.filter(p=>!gl.getProgramParameter(p.program,gl.LINK_STATUS)).length;
 await save('neighborhood-geometry-audit',result);
 if(Object.values(result.contracts).some(v=>!v)||!result.skyline||result.trainHits.length||result.roadHits.length||result.routeHits.length||result.unreservedGroundParts.length||result.shaderErrors||result.assetErrors.length)throw new Error('Neighborhood spatial audit failed: '+JSON.stringify({...result,parcels:undefined}));
 return{contracts:result.contracts,parts:result.parts,triangles:result.triangles,samples:result.samples,parcels:result.parcels.length,railCorrections:result.railCorrections};
}
export async function validateCaptures(){const result=[];for(const [label]of views){const a=await(await fetch('/quality/captures/neighborhood-'+label+'-before.json')).json(),b=await(await fetch('/quality/captures/neighborhood-'+label+'-after.json')).json(),conditions={};for(const key of ['eye','quaternion','fov','seed','hour','simulationClock','surface','reflections','contactShading','width','height','pixelRatio','renderConditions']){conditions[key]=JSON.stringify(a[key])===JSON.stringify(b[key]);if(!conditions[key])throw new Error(label+' mismatch '+key);}result.push({label,conditions});}await save('neighborhood-capture-audit',{views:result,actorNote:'Population uses the revised district destination preferences; actor routes are allowed to differ.'});return result.length;}
export async function replayGeometry(){
 const w=window.__shinmachi,{NeighborhoodGenerator}=await import('../src/world/generation/NeighborhoodGenerator.ts'),fresh=new NeighborhoodGenerator(8412).generate(),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const records=g=>{const result=[];g.traverse(o=>{if(o.isInstancedMesh)result.push({sections:o.userData.sections,matrices:Array.from(o.instanceMatrix.array),colors:Array.from(o.instanceColor.array)});});return result;};
 const result={seed:8412,parcels:same(fresh.group.userData.neighborhoods,w.district.group.userData.neighborhoods),colliders:same(fresh.colliders,w.district.colliders.slice(0,fresh.colliders.length)),doors:same(fresh.doors,w.district.doors.slice(0,fresh.doors.length)),instances:same(records(fresh.group),records(w.district.group))};
 const shared=new Set();w.scene.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])for(const v of Object.values(m))if(v?.isTexture)shared.add(v);});
 const geometry=new Set(),materials=new Set(),textures=new Set();fresh.group.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture&&!shared.has(v))textures.add(v);}});geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
 await save('neighborhood-geometry-replay',result);if(Object.values(result).some(v=>v===false))throw new Error('Geometry replay failed');return result;
}
export async function exercise(){
 const w=window.__shinmachi,{CitySimulation}=await import('../src/world/simulation/CitySimulation.ts'),{passengerAudit}=await import('./station3c-validation.mjs'),{neighborhoodAt}=await import('../src/world/Neighborhoods.ts'),runs=[];
 for(const hour of [13,20.5]){
  const s=new CitySimulation({seed:8412,bounds:w.district.colliders,doors:w.district.doors,station:w.district.station}),a=passengerAudit(s),density={commercial:0,station:0,residential:0,nightlife:0},doorDwell={commercial:0,station:0,residential:0,nightlife:0};let cityOverlaps=0,minSeparation=Infinity,roadSteps=0;
  for(let tick=0;tick<45000;tick++){
   s.update(1/30,tick<27000?hour:3);a.sample();
   if(tick%30===0){const people=s.pedestrians.filter(p=>p.active&&!p.rail);
    for(const p of people){if(tick<27000){density[neighborhoodAt(p).id]++;if(s.navigation.nodes[p.node]?.door&&p.wait>0)doorDwell[neighborhoodAt(p).id]++;}if(p.y<2&&!p.crossing&&(Math.abs(p.x)<3.5||p.z>6.5&&p.z<17.5))roadSteps++;}
    for(let i=0;i<people.length;i++)for(let j=0;j<i;j++)if(Math.abs(people[i].y-people[j].y)<1.5){const d=Math.hypot(people[i].x-people[j].x,people[i].z-people[j].z);minSeparation=Math.min(minSeparation,d);if(d<.5-1e-7)cityOverlaps++;}
   }
   if(tick%900===0)await new Promise(r=>setTimeout(r,0));
  }
  const remaining=s.pedestrians.filter(p=>p.station||p.rail),result={hour,openSeconds:900,drainSeconds:600,...a.result,densityAgentSeconds:density,meanPopulation:Object.fromEntries(Object.entries(density).map(([id,n])=>[id,n/900])),doorDwellSeconds:doorDwell,cityOverlapSamples:cityOverlaps,minimumCitySeparation:minSeparation,roadSteps,rail:{...s.railPassengers.metrics},station:{...s.stationTraffic.metrics},activities:{...s.streetLife.metrics},remaining:remaining.length,reservations:s.stationTraffic.owners.size,trainActive:s.train.snapshot.active};runs.push(result);
  const fail=result.invalidPositions||result.unsafeCrossings||result.overlaps||result.unsafeDepartures||result.capacityViolations||result.gateConflicts||result.wallHits||result.vehicleOverlaps||cityOverlaps||roadSteps||remaining.length||result.reservations||result.trainActive||result.station.started!==result.station.completed||result.rail.boarded!==result.rail.delivered;
  if(fail){await save('neighborhood-simulation-audit',{runs});throw new Error('District simulation regression '+JSON.stringify(result));}
 }
 await save('neighborhood-simulation-audit',{runs});return runs.map(({hour,arrivals,departures,meanPopulation,rail,station,activities,minimumCitySeparation})=>({hour,arrivals,departures,meanPopulation,rail,station,activities,minimumCitySeparation}));
}
