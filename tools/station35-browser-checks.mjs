import * as THREE from 'three';
import { CitySimulation } from '../src/world/simulation/CitySimulation.ts';
import { STATION } from '../src/world/generation/StationLayout.ts';
import { BOARDING_CLEARANCE } from '../src/world/simulation/StationBoardingAccess.ts';
import { exerciseStation } from './station2-validation.mjs';
const require = (ok, message) => { if (!ok) throw new Error(message); };

// Extract the actual uploaded instances, including all glass frames and railway masts.
// Standalone meshes retain original triangles/materials for focused real-geometry raycasts.
export function renderedParts(w, train, region = new THREE.Box3(new THREE.Vector3(7.7,7.4,-56.4),new THREE.Vector3(61.8,9.3,-47.3))) {
  const parts=[];
  const instance = new THREE.Matrix4();
  for(const root of [w.district.group,train]) {
    root.updateMatrixWorld(true);
    root.traverse(source=>{
      if(!source.isMesh)return;
      // The city sign atlas is one disjoint triangle batch spanning the district, not one solid box.
      // Split its actual faces before doing volume checks; keep every local sign in the ray test.
      if(!source.isInstancedMesh && source.userData.faces) {
        const position=source.geometry.attributes.position,index=source.geometry.index;
        for(let k=0;k<index.count;k+=3) {
          const vertices=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(position,index.getX(k+j)).applyMatrix4(source.matrixWorld));
          const box=new THREE.Box3().setFromPoints(vertices);if(!box.intersectsBox(region))continue;
          const geometry=new THREE.BufferGeometry().setFromPoints(vertices),mesh=new THREE.Mesh(geometry,source.material);
          mesh.updateMatrixWorld(true);parts.push({box,mesh,id:`${root.name}/${source.name}/triangle-${k/3}`});
        }
        return;
      }
      source.geometry.computeBoundingBox();
      for(let i=0;i<(source.isInstancedMesh?source.count:1);i++) {
        if(source.isInstancedMesh)source.getMatrixAt(i,instance);else instance.identity();
        const matrix = instance.clone().premultiply(source.matrixWorld), box=source.geometry.boundingBox.clone().applyMatrix4(matrix);
        if(!box.intersectsBox(region))continue;
        const mesh=new THREE.Mesh(source.geometry,source.material);mesh.matrixAutoUpdate=false;mesh.matrixWorld.copy(matrix);
        parts.push({box,mesh,id:`${root.name}/${source.name||source.geometry.type}#${i}`});
      }
    });
  }
  return parts;
}

export function validateDoor(d,parts) {
  const a=d.boarding.approach,c=BOARDING_CLEARANCE;
  require(d.platformSide && d.boarding.aligned && d.state==='OPEN' && a?.clear,`Unavailable doorway ${d.id}`);
  const r={id:d.id,x:(d.opening.minX+d.opening.maxX)/2,sillY:d.opening.bottomY,platformY:STATION.platformY,
    sillError:a.sillError,gap:a.gap,openingWidth:d.clearOpening.width,pedestrianDiameter:c.radius*2,
    path:a.path,bodySamples:0,bodyIntersectionCount:0,bodyIntersections:[],minimumBodyClearance:Infinity,approachRays:0,blockedRays:0,
    platformFloorRays:0,maxPlatformFloorError:0,gapSamples:0,unsupportedGapSamples:0,measuredGap:0};
  const bodyParts=parts.filter(p=>p.box.max.y>STATION.platformY+.04&&p.box.min.y<STATION.platformY+c.height);
  const rayMeshes=parts.map(p=>p.mesh),body=new THREE.Box3();
  for(let i=1;i<a.path.length;i++) {
    const from=a.path[i-1],to=a.path[i],length=Math.hypot(to.x-from.x,to.z-from.z),n=Math.max(1,Math.ceil(length/.025));
    for(let j=0;j<=n;j++) {
      const t=j/n,x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t;
      body.min.set(x-c.radius,STATION.platformY+.04,z-c.radius);body.max.set(x+c.radius,STATION.platformY+c.height,z+c.radius);r.bodySamples++;
      for(const p of bodyParts) {
        const distance=Math.hypot(Math.max(p.box.min.x-x,0,x-p.box.max.x),Math.max(p.box.min.z-z,0,z-p.box.max.z));
        r.minimumBodyClearance=Math.min(r.minimumBodyClearance,distance-c.radius);
        if(body.intersectsBox(p.box)) {r.bodyIntersectionCount++;if(r.bodyIntersections.length<10)r.bodyIntersections.push({x,z,part:p.id});}
      }
      if(z>=STATION.platformEdgeZ+1e-6) {
        const ray=new THREE.Raycaster(new THREE.Vector3(x,STATION.platformY+.2,z),new THREE.Vector3(0,-1,0),0,.3);
        const hit=ray.intersectObjects(rayMeshes,false)[0];require(hit,`Missing rendered platform support ${d.id} at ${x},${z}`);
        r.platformFloorRays++;r.maxPlatformFloorError=Math.max(r.maxPlatformFloorError,Math.abs(hit.point.y-STATION.platformY));
      }
    }
    if(length<1e-8)continue;
    const direction=new THREE.Vector3(to.x-from.x,0,to.z-from.z).normalize(),lateral=new THREE.Vector3(-direction.z,0,direction.x);
    for(const offset of [-c.radius,0,c.radius])for(const height of [.05,.5,1,1.65]) {
      const origin=new THREE.Vector3(from.x,STATION.platformY+height,from.z).addScaledVector(lateral,offset);
      const ray=new THREE.Raycaster(origin,direction,0,length),hits=ray.intersectObjects(rayMeshes,false);
      r.approachRays++;if(hits.length)r.blockedRays++;
    }
  }
  // Scan actual platform and train step faces at 1mm spacing; the gap is a conditional step, not track support.
  const step=.001;
  for(let z=STATION.platformEdgeZ+.01;z>=d.opening.z-.01;z-=step) {
    const ray=new THREE.Raycaster(new THREE.Vector3(r.x,STATION.platformY+.15,z),new THREE.Vector3(0,-1,0),0,.2);
    const hit=ray.intersectObjects(rayMeshes,false)[0];r.gapSamples++;
    if(!hit)r.unsupportedGapSamples++;
  }
  r.measuredGap=r.unsupportedGapSamples*step;
  require(!r.bodyIntersections.length&&!r.blockedRays&&r.maxPlatformFloorError<.02&&Math.abs(r.measuredGap-a.gap)<.002,
    `Rendered boarding approach failed: ${JSON.stringify(r)}`);
  return r;
}

function exerciseAccess(sim) {
  const r={seconds:1200,arrivals:0,departures:0,physicalAccessViolations:0,boardingEnabledViolations:0,maxStopError:0};let old=sim.train.snapshot.state;
  for(let i=0;i<r.seconds*30;i++) {
    sim.update(1/30,12);const s=sim.train.snapshot;
    if(s.state==='DWELLING'&&old==='DOOR OPENING') {r.arrivals++;require(s.doors.filter(d=>d.boarding.passengerAccess).length===6,'Expected six clear approaches');}
    if(s.state==='ACCELERATING'&&old==='PREPARING DEPARTURE') {r.departures++;require(s.allDoorsClosed,'Departure interlock changed');}
    for(const d of s.doors) {
      if(d.boarding.passengerAccess && (s.velocity!==0||d.state!=='OPEN'||!d.platformSide||!d.boarding.aligned||!d.boarding.approach?.clear))r.physicalAccessViolations++;
      if(d.boarding.npcBoardingEnabled)r.boardingEnabledViolations++;
    }
    if(s.state==='DWELLING')r.maxStopError=Math.max(r.maxStopError,Math.abs(s.stoppingError));old=s.state;
  }
  require(r.arrivals>=6&&r.departures>=6&&!r.physicalAccessViolations&&!r.boardingEnabledViolations,'Access cycle regression');return r;
}

export async function review() {
  const w=window.__shinmachi;await w.assetsReady;w.setReviewPaused(true);w.setPlaying(false);w.setTime(12);w.activity.setStationDebug(false);
  const sim=w.activity.simulation,config={seed:8412,bounds:w.district.colliders,doors:w.district.doors,station:w.district.station};
  const result={captures:[],doors:[],frontage:w.district.station.boardingFrontage,hazards:w.district.station.navigationHazards,
    cycles:exerciseAccess(new CitySimulation(config)),pedestrianRegression:exerciseStation(new CitySimulation(config))};
  const advance=predicate=>{for(let i=0;i<30000;i++){if(predicate(sim.train.snapshot))return;sim.update(1/30,12);}throw new Error('Train review timeout');};
  advance(s=>s.state==='DWELLING'&&s.direction===1&&s.stateElapsed>=2);w.activity.update(0,12);
  const train=w.scene.getObjectByName('Three-car stainless Shinmachi Line train'),parts=renderedParts(w,train);
  result.renderedPartsChecked=parts.length;result.simulationClock=sim.clock;result.train=sim.train.snapshot;
  result.boardingInterface=sim.train.doors;
  const capture=async(name,framing)=>{result.captures.push(await w.captureBenchmark(name,'station',12,framing));};
  for(const d of sim.train.doors.filter(d=>d.platformSide)) {
    result.doors.push(validateDoor(d,parts));const x=(d.opening.minX+d.opening.maxX)/2;
    const cameraOffset=d.id==='car-3-south-1'?-.95:.95; // Keep the retained mast beside x=45 outside the doorway sightline.
    await capture(`station35-${d.id}-access`,{eye:[x+cameraOffset,9.45,-53.5],target:[x,8.25,-55.55],fov:68});
  }
  result.guards=w.district.station.boxes.filter(b=>b.material==='glass'&&b.minY>=7.4).map(b=>{
    const matchingMesh=parts.some(p=>Math.abs(p.box.min.x-b.minX)<1e-4&&Math.abs(p.box.max.x-b.maxX)<1e-4&&
      Math.abs(p.box.min.y-b.minY)<1e-4&&Math.abs(p.box.max.y-b.maxY)<1e-4&&Math.abs(p.box.min.z-b.minZ)<1e-4&&Math.abs(p.box.max.z-b.maxZ)<1e-4);
    require(matchingMesh,`Missing rendered guard ${b.id}`);return{id:b.id,collision:b.collision,matchingMesh};
  });
  await capture('station35-open-frontage',{eye:[56,10.05,-53.65],target:[24,8,-55.1],fov:74});
  await capture('station35-stair-guards',{eye:[27.4,10.4,-51.3],target:[19,7.6,-52],fov:75});
  advance(s=>s.state==='DOOR CLOSING'&&s.stateElapsed>.8);
  result.closing={simulationClock:sim.clock,train:sim.train.snapshot};require(sim.train.doors.every(d=>!d.boarding.passengerAccess),'Closing leaves expose access');
  advance(s=>s.state==='ACCELERATING'&&s.speed>1);result.departure={simulationClock:sim.clock,train:sim.train.snapshot};
  require(sim.train.doors.every(d=>!d.boarding.passengerAccess)&&sim.train.snapshot.allDoorsClosed,'Unsafe departure access');
  const gl=w.renderer.getContext();result.failedShaderLinks=w.renderer.info.programs.filter(p=>!gl.getProgramParameter(p.program,gl.LINK_STATUS)).length;
  result.pageErrors=window.__station35Errors??[];result.assets={loaded:w.nightlife.assets.loaded,errors:w.nightlife.assets.errors};
  require(!result.pageErrors.length&&!result.failedShaderLinks&&!result.assets.errors.length,'Browser rendering failure');
  const saved=await fetch('/__review/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'station35-measurements',metadata:result})});
  require(saved.ok,'Could not save access measurements');window.__station35Review=result;return result;
}
