import * as THREE from 'three';
import { CitySimulation } from '../src/world/simulation/CitySimulation.ts';
import { passengerTransferPath } from '../src/world/simulation/RailPassengerGeometry.ts';
import { renderedParts, validateDoor } from './station35-browser-checks.mjs';
import { exercisePassengers } from './station3c-validation.mjs';
const require=(ok,message)=>{if(!ok)throw new Error(message);};
const hour=18.5;

function renderedPeople(w,parts) {
  const sim=w.activity.simulation,owners=new Map(sim.railPassengers.active.filter(p=>Math.abs(p.z+55.555)<.8).map(p=>[p.id,p]));
  const r={clock:sim.clock,people:[...owners].map(([id,p])=>({id,visit:p.station.id,state:p.rail.state,x:p.x,y:p.y,z:p.z,doorId:p.rail.doorId})),parts:0,intersections:[]};
  const matrix=new THREE.Matrix4();w.activity.people.group.updateMatrixWorld(true);
  w.activity.people.group.traverse(mesh=>{
    if(!mesh.isInstancedMesh||mesh.name==='contacts')return;mesh.geometry.computeBoundingBox();
    for(let i=0;i<mesh.count;i++) {
      const id=mesh.userData.pedestrianIds?.[i];if(!owners.has(id))continue;
      mesh.getMatrixAt(i,matrix);const box=mesh.geometry.boundingBox.clone().applyMatrix4(matrix.clone().premultiply(mesh.matrixWorld));r.parts++;
      for(const p of parts) {
        if(Math.min(box.max.x,p.box.max.x)-Math.max(box.min.x,p.box.min.x)>.003&&
          Math.min(box.max.y,p.box.max.y)-Math.max(box.min.y,p.box.min.y)>.003&&
          Math.min(box.max.z,p.box.max.z)-Math.max(box.min.z,p.box.min.z)>.003)
          r.intersections.push({id,human:mesh.name,solid:p.id});
      }
    }
  });
  require(!r.intersections.length,'Rendered human intersects train/station: '+JSON.stringify(r));return r;
}

function renderedRoutes(sim,parts) {
  const r={paths:0,samples:0,intersections:0};
  const waiting=sim.navigation.nodes[sim.navigation.station.waiting[0].node];
  for(const berth of sim.railPassengers.berths) {
    const d=sim.train.doors.find(d=>d.id===berth.doorId),path=passengerTransferPath(sim.navigation.station.layout,d,waiting,berth,sim.train.x);r.paths++;
    for(let i=1;i<path.length;i++) {
      const a=path[i-1],b=path[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.025));
      for(let j=0;j<=n;j++) {
        const x=a.x+(b.x-a.x)*j/n,z=a.z+(b.z-a.z)*j/n;
        const body=new THREE.Box3(new THREE.Vector3(x-.25,7.495,z-.25),new THREE.Vector3(x+.25,9.105,z+.25));r.samples++;
        if(parts.some(p=>body.intersectsBox(p.box)))r.intersections++;
      }
    }
  }
  require(!r.intersections,'Blocked rendered transfer route: '+JSON.stringify(r));return r;
}

export async function review() {
  const w=window.__shinmachi;await w.assetsReady;w.setReviewPaused(true);w.setPlaying(false);w.setTime(hour);w.activity.setStationDebug(false);w.controller.setMode('fly');
  const sim=w.activity.simulation,train=w.scene.getObjectByName('Three-car stainless Shinmachi Line train');
  const config={seed:8412,bounds:w.district.colliders,doors:w.district.doors,station:w.district.station,railPassengers:{arrivingPassengers:6}};
  const result={captures:[],observations:[],humanGeometry:[],configuration:{capacity:sim.railPassengers.berths,train:sim.train.config},
    generatedWorld:exercisePassengers(new CitySimulation(config))};
  let parts,lastGeometry=-Infinity;
  const geometry=()=>{
    if(parts&&sim.clock-lastGeometry>.15&&sim.railPassengers.active.some(p=>Math.abs(p.z+55.555)<.8)) {
      w.activity.update(0,hour);result.humanGeometry.push(renderedPeople(w,parts));lastGeometry=sim.clock;
    }
  };
  const advance=predicate=>{for(let i=0;i<60000;i++){if(predicate())return;sim.update(1/30,hour);geometry();}throw new Error('Live passenger review timeout: '+JSON.stringify(sim.railPassengers.snapshot));};
  const capture=async(name,framing,focus)=>{
    w.activity.update(0,hour);geometry();
    result.observations.push({name,clock:sim.clock,train:sim.train.snapshot,rail:sim.railPassengers.snapshot,focus:focus?{id:focus.id,visit:focus.station?.id,x:focus.x,y:focus.y,z:focus.z,state:focus.station?.state}:null});
    result.captures.push(await w.captureBenchmark(name,'station',hour,framing));
  };
  const closeup=p=>{const d=sim.train.doors.find(d=>d.id===p.rail.doorId),x=(d.opening.minX+d.opening.maxX)/2;return{eye:[x+(d.id==='car-3-south-1'?-.95:.95),9.4,-53.5],target:[x,8.35,-55.55],fov:72};};
  advance(()=>sim.train.snapshot.state==='APPROACHING'&&sim.pedestrians.some(p=>p.station?.state==='waiting'));
  await capture('station3c-approaching-and-waiting',{eye:[54,10,-52.8],target:[33,8.4,-55.4],fov:76});
  advance(()=>sim.train.snapshot.state==='DWELLING');w.activity.update(0,hour);
  parts=renderedParts(w,train,new THREE.Box3(new THREE.Vector3(7.7,7.4,-58.5),new THREE.Vector3(61.8,9.4,-47.3)));
  result.doorApproaches=sim.train.doors.filter(d=>d.platformSide).map(d=>validateDoor(d,parts));result.renderedRoutes=renderedRoutes(sim,parts);
  result.navigation=sim.navigation.station.boardingApproaches;
  let inbound;
  advance(()=>!!(inbound=sim.railPassengers.active.find(p=>p.rail.state==='alighting'&&Math.abs(p.z+55.555)<.1)));
  const inboundId=inbound.id,inboundVisit=inbound.station.id;
  await capture('station3c-alighting-threshold',closeup(inbound),inbound);
  advance(()=>inbound.rail?.state==='alighting'&&inbound.z>-55.05);
  await capture('station3c-alighting-platform',closeup(inbound),inbound);
  let outbound;
  advance(()=>!!(outbound=sim.railPassengers.active.find(p=>p.rail.state==='boarding')));
  const outboundId=outbound.id,outboundVisit=outbound.station.id,boardingDoor=outbound.rail.doorId;
  const d=sim.train.doors.find(d=>d.id===boardingDoor),doorX=(d.opening.minX+d.opening.maxX)/2;
  await capture('station3c-boarding-approach',{eye:[doorX+2,10.2,-51.8],target:[doorX,8.4,-55.1],fov:78},outbound);
  advance(()=>outbound.rail?.state==='boarding'&&Math.abs(outbound.z+55.555)<.1);
  await capture('station3c-boarding-threshold',closeup(outbound),outbound);
  advance(()=>outbound.rail?.state==='riding');
  const interior=()=>({eye:[outbound.x+1.4,8.8,-56.6],target:[outbound.x,8.3,-57.55],fov:86});
  await capture('station3c-boarded-interior',interior(),outbound);
  advance(()=>sim.train.snapshot.state==='DEPARTURE WARNING'&&!sim.railPassengers.active.length);
  await capture('station3c-clear-doorways',{eye:[doorX+1.1,9.4,-53.5],target:[doorX,8.3,-55.55],fov:72});
  advance(()=>sim.train.snapshot.state==='PREPARING DEPARTURE');
  await capture('station3c-doors-secured',{eye:[doorX+1.1,9.4,-53.5],target:[doorX,8.3,-55.55],fov:72});
  advance(()=>sim.train.snapshot.state==='ACCELERATING'&&sim.train.snapshot.speed>1);
  await capture('station3c-riding-away',interior(),outbound);
  advance(()=>sim.stationTraffic.completed.some(v=>v.visit===inboundVisit&&v.destination==='city'));
  const resumed=sim.pedestrians.find(p=>p.id===inboundId);
  await capture('station3c-alighter-resumes-city',{eye:[resumed.x+3,3.1,resumed.z+4],target:[resumed.x,resumed.y+.9,resumed.z],fov:65},resumed);
  advance(()=>sim.stationTraffic.completed.some(v=>v.visit===outboundVisit&&v.destination==='rail'));
  result.trackedJourneys={inboundId,inboundVisit,outboundId,outboundVisit,completed:sim.stationTraffic.completed.filter(v=>v.visit===inboundVisit||v.visit===outboundVisit)};
  result.events=[...sim.railPassengers.events];result.finalRail=sim.railPassengers.snapshot;
  const gl=w.renderer.getContext();result.failedShaderLinks=w.renderer.info.programs.filter(p=>!gl.getProgramParameter(p.program,gl.LINK_STATUS)).length;
  result.pageErrors=window.__station3cErrors??[];result.assets={loaded:w.nightlife.assets.loaded,errors:w.nightlife.assets.errors};
  require(!result.failedShaderLinks&&!result.pageErrors.length&&!result.assets.errors.length,'Browser rendering failed');
  const saved=await fetch('/__review/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'station3c-measurements',metadata:result})});
  require(saved.ok,'Could not save passenger measurements');window.__station3cReview=result;return result;
}
