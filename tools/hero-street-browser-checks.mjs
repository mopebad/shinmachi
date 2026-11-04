import * as THREE from 'three';
import { CitySimulation } from '../src/world/simulation/CitySimulation.ts';
import { exercisePassengers } from './station3c-validation.mjs';

const require = (ok, message) => { if (!ok) throw new Error(message); };
const hour = 20.5, clock = 300;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Actual generated geometry and navigation; invoked through the running Vite browser. */
function auditGeometry(w) {
  const parts = [], matrix = new THREE.Matrix4(), group = w.district.group;
  const result = { parts: 0, lowParts: 0, samples: 0, intersections: [], movingPeopleSamples:0, pedestrianIntersections:[], families: [...new Set(group.userData.heroFrontages.map(s => s.family))] };
  group.updateMatrixWorld(true);
  group.traverse(mesh => {
    if (!mesh.isInstancedMesh || !mesh.userData.sections) return;
    mesh.geometry.computeBoundingBox();
    for (let i = 0; i < mesh.count; i++) {
      const section = mesh.userData.sections[i]; if (!section?.startsWith('hero-')) continue;
      mesh.getMatrixAt(i, matrix);
      require(matrix.elements.every(Number.isFinite), 'Nonfinite hero geometry');
      require(matrix.determinant() > 0, 'Degenerate or inverted hero geometry: ' + section);
      const box = mesh.geometry.boundingBox.clone().applyMatrix4(matrix.clone().premultiply(mesh.matrixWorld));
      result.parts++;
      if (box.min.y < 1.95 && box.max.y > .145 && !mesh.material.transparent) parts.push({ section, box, instance: i });
    }
  });
  result.lowParts = parts.length;
  const navigation = w.activity.simulation.navigation, checked = new Set();
  for (const a of navigation.nodes) for (const edge of navigation.edges.get(a.id) ?? []) {
    const b = navigation.nodes[edge.to], key = [a.id, b.id].sort((a,b)=>a-b).join(':');
    if (checked.has(key) || Math.abs(a.x) > 8 || Math.abs(b.x) > 8 || Math.max(a.z,b.z)<-51 || Math.min(a.z,b.z)>48 || Math.max(a.y,b.y)>.3) continue;
    checked.add(key);
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.06));
    for (let i = 0; i <= steps; i++) {
      const t=i/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=a.y+(b.y-a.y)*t;
      const body = new THREE.Box3(new THREE.Vector3(x-.22,y+.025,z-.22),new THREE.Vector3(x+.22,y+1.72,z+.22));
      result.samples++;
      for (const part of parts) if (body.intersectsBox(part.box)) result.intersections.push({edge:key,x,y,z,section:part.section,instance:part.instance});
    }
  }
  require(result.parts>1000 && result.families.length===5, 'Hero frontage geometry was not built');
  require(!result.intersections.length, 'New hero geometry blocks navigation: '+JSON.stringify(result.intersections.slice(0,12)));
  const grid=new Map(),key=(x,z)=>Math.floor(x/2)+':'+Math.floor(z/2);
  for(const part of parts)for(let x=Math.floor(part.box.min.x/2);x<=Math.floor(part.box.max.x/2);x++)for(let z=Math.floor(part.box.min.z/2);z<=Math.floor(part.box.max.z/2);z++) {
    const k=x+':'+z;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(part);
  }
  return {result,sample(sim){
    for(const p of sim.pedestrians) {
      if(!p.active||p.y>2||Math.abs(p.x)>8||p.z<-51||p.z>48)continue;
      const r=.23*p.scale,body=new THREE.Box3(new THREE.Vector3(p.x-r,p.y+.025,p.z-r),new THREE.Vector3(p.x+r,p.y+1.78*p.scale,p.z+r));
      const nearby=new Set();result.movingPeopleSamples++;
      for(const x of [body.min.x,body.max.x])for(const z of [body.min.z,body.max.z])for(const part of grid.get(key(x,z))??[])nearby.add(part);
      for(const part of nearby)if(body.intersectsBox(part.box))result.pedestrianIntersections.push({clock:sim.clock,id:p.id,x:p.x,y:p.y,z:p.z,section:part.section,instance:part.instance});
    }
    require(!result.pedestrianIntersections.length,'New hero geometry intersects an actual pedestrian: '+JSON.stringify(result.pedestrianIntersections.slice(0,8)));
  }};
}

export async function review() {
  const w=window.__shinmachi; w.setReviewPaused(true); w.setPlaying(false); w.setTime(hour); w.setWeather('damp'); w.setReflections(true); await w.assetsReady;
  const sim=w.activity.simulation;
  require(sim.clock<=clock+1e-7,'Reload the hero view before replaying the fixed capture clock');
  while(sim.clock<clock-1e-7)sim.update(1/30,hour);
  w.activity.update(0,hour);
  const before=await (await fetch('/quality/hero-street-contract-before.json')).json();
  const geometry=auditGeometry(w);
  const result={clock:sim.clock,frontages:w.district.group.userData.heroFrontages,contracts:{},geometry:geometry.result,captures:[]};
  for (const key of ['colliders','doors','shopfronts']) {
    result.contracts[key]=same(before[key],w.district[key]);
    require(result.contracts[key],key+' changed during the hero pass');
  }
  result.contracts.lamps=same(before.lamps,w.district.lamps.map(p=>p.toArray()));
  result.contracts.buildings=before.stats.buildings===w.district.stats.buildings;
  require(result.contracts.lamps&&result.contracts.buildings,'Street layout or lighting sources changed');
  result.captures.push(await w.captureBenchmark('hero-street-after','heroStreet',hour));
  result.captures.push(await w.captureBenchmark('hero-store-after','commercial',hour,{eye:[4.25,1.72,40.9],target:[8.9,1.6,38.7],fov:64}));
  result.captures.push(await w.captureBenchmark('hero-store-details-after','commercial',hour,{eye:[7.5,1.75,40.75],target:[11.2,1.25,38.4],fov:72}));
  const after=await (await fetch('/quality/captures/hero-street-after.json')).json();
  const baseline=await (await fetch('/quality/captures/hero-street-before.json')).json();
  result.matchingCapture={};
  for(const key of ['eye','quaternion','fov','hour','seed','surface','reflections','contactShading','width','height','pixelRatio','simulationClock']) {
    result.matchingCapture[key]=same(baseline[key],after[key]);require(result.matchingCapture[key],'Capture condition changed: '+key);
  }
  result.actorReplay={pedestrians:same(before.pedestrians,sim.pedestrians.map(p=>({id:p.id,x:p.x,y:p.y,z:p.z,active:p.active}))),vehicles:same(before.vehicles,sim.vehicles.map(v=>({id:v.id,x:v.x,z:v.z,active:v.active})))};
  const regression=new CitySimulation({seed:8412,bounds:w.district.colliders,doors:w.district.doors,station:w.district.station,railPassengers:{arrivingPassengers:6}});
  const update=regression.update.bind(regression);regression.update=(...args)=>{update(...args);geometry.sample(regression);};
  result.simulation=exercisePassengers(regression,{seconds:900,drainSeconds:600,hour});
  w.setWeather('dry');result.dryHidden=!w.reflections.surface.visible;w.setWeather('damp');w.setReflections(false);result.reflectionOffHidden=!w.reflections.surface.visible;w.setReflections(true);
  require(result.dryHidden&&result.reflectionOffHidden,'Reflection controls regressed');
  await w.captureBenchmark('hero-street-day','heroStreet',13); // secondary diagnostic, never compared with the evening baseline
  w.setTime(hour);w.teleport(8);
  const gl=w.renderer.getContext();result.failedShaderLinks=w.renderer.info.programs.filter(p=>!gl.getProgramParameter(p.program,gl.LINK_STATUS)).length;
  result.assets={loaded:w.nightlife.assets.loaded,errors:w.nightlife.assets.errors};
  require(!result.failedShaderLinks&&!result.assets.errors.length,'Browser render/assets failed');
  result.performance=await w.measurePerformance(5);
  const response=await fetch('/__review/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'hero-street-measurements',metadata:result})});
  require(response.ok,'Could not save hero street measurements');window.__heroStreetReview=result;
  return result;
}
