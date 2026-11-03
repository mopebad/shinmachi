// Run in the existing Vite browser. Passengers are never repositioned or replaced for captures.
import * as THREE from 'three';
import { CitySimulation } from '../src/world/simulation/CitySimulation.ts';
import { LOCATIONS } from '../src/world/CityWorld.ts';
import { pointBlocked } from '../src/world/simulation/Navigation.ts';
import { stationFootSurface } from '../src/world/simulation/StationNavigation.ts';
import { exerciseStation } from './station2-validation.mjs';
const require=(ok,message)=>{if(!ok)throw new Error(message);};

export async function review(){
  const w=window.__shinmachi;await w.assetsReady;
  const config={seed:8412,bounds:w.district.colliders,doors:w.district.doors,station:w.district.station};
  const validationSim=new CitySimulation(config);window.__station2ValidationSim=validationSim;
  const result={seed:8412,generatedWorld:exerciseStation(validationSim),captures:[],journey:[]};
  const sim=w.activity.simulation;w.setTime(12);w.setPlaying(false);w.activity.setStationDebug(false);
  let passenger,visit;
  const capture=async(name,framing,debug=false)=>{
    w.activity.setStationDebug(debug);w.activity.update(0,12);
    const p=passenger;
    const record={name,clock:sim.clock,pedestrian:p.id,visit,state:p.station?.state??'city',position:[p.x,p.y,p.z],paid:p.station?.paid??false,flight:p.station?.flight??null,gateOwners:[...sim.stationTraffic.owners].filter(([key])=>key.startsWith('gate:'))};
    result.journey.push(record);result.captures.push(await w.captureBenchmark(name,'station',12,framing));
    w.activity.setStationDebug(false);
  };
  const advance=predicate=>{
    for(let ticks=0;ticks<27000;ticks++){
      if(!passenger){passenger=sim.pedestrians.find(p=>p.active&&p.station?.state==='entering');if(passenger)visit=passenger.station.id;}
      if(passenger&&predicate(passenger))return;
      sim.update(1/30,12);
    }throw new Error('Timed out following live station visitor '+JSON.stringify({visit,passenger}));
  };
  advance(p=>p.station?.state==='entering'&&p.x>18.8&&p.z<-46.4);
  await capture('station2-entering',{eye:[17.1,2.4,-41.8],target:[18.8,1.5,-47.2],fov:58});
  advance(p=>p.station?.state==='gate-in'&&Math.abs(p.z-w.district.station.gates.find(g=>g.id===p.station.gate).center.z)<.45);
  const gate=w.district.station.gates.find(g=>g.id===passenger.station.gate);
  await capture('station2-gate-in',{eye:[gate.center.x+.6,2,-45.9],target:[gate.center.x,1.05,-48.5],fov:55});
  await capture('station2-gate-debug',{eye:[17,5.5,-43.5],target:[13,1.2,-48.8],fov:62},true);
  advance(p=>p.station?.state==='ascending'&&p.station.flight==='lower-flight-a'&&p.y>1&&p.y<1.6);
  await capture('station2-ascending',{eye:[14.1,2.1,-49.7],target:[passenger.x,passenger.y+.8,passenger.z],fov:58});
  advance(p=>p.station?.state==='ascending'&&p.station.flight==='upper-flight-b'&&p.y>6&&p.y<6.6);
  await capture('station2-upper-stairs',{eye:[23.9,6.25,-50.2],target:[passenger.x,passenger.y+.8,passenger.z],fov:55});
  advance(p=>p.station?.state==='waiting');
  await capture('station2-waiting',{eye:[passenger.x+3,9.5,-50.8],target:[passenger.x,8.2,-54.15],fov:58});
  await capture('station2-platform-debug',{eye:[33,15,-45],target:[34,7.6,-53],fov:67},true);
  await capture('station2-network-debug',{eye:[27,18,-34],target:[20,4.5,-50.5],fov:62},true);
  advance(p=>p.station?.state==='descending'&&p.station.flight==='upper-flight-b'&&p.y>6&&p.y<6.8);
  await capture('station2-descending',{eye:[23.8,7.8,-50.2],target:[passenger.x,passenger.y+.8,passenger.z],fov:58});
  advance(p=>p.station?.state==='gate-out'&&Math.abs(p.z-w.district.station.gates[0].center.z)<.45);
  await capture('station2-gate-out',{eye:[12.4,2.05,-46.4],target:[10.95,1,-48.4],fov:58});
  advance(p=>p.station?.state==='exiting'&&p.x>13.8);
  await capture('station2-exiting',{eye:[17.1,2.4,-41.8],target:[14.2,1.3,-46.4],fov:58});
  advance(p=>!p.station&&sim.stationTraffic.completed.some(v=>v.visit===visit)&&p.path.length>1);
  await capture('station2-rejoined-city',{eye:[12,3,-40],target:[passenger.x,1.1,passenger.z],fov:58});
  result.followedVisit=sim.stationTraffic.completed.find(v=>v.visit===visit);
  require(result.followedVisit?.states.includes('waiting'),'Captured visitor did not complete a real visit');
  // Presentation matrices must follow this same live simulation, including upper-level passengers.
  w.activity.update(0,12);const active=sim.pedestrians.filter(p=>p.active),matrix=new THREE.Matrix4(),position=new THREE.Vector3();
  result.renderedPeople={count:active.length,torsoCount:w.activity.people.torso.count,maxPositionError:0};
  for(const [i,p]of active.entries()){w.activity.people.torso.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);const error=Math.hypot(position.x-p.x,position.z-p.z);result.renderedPeople.maxPositionError=Math.max(result.renderedPeople.maxPositionError,error);require(error<.0001&&position.y>p.y+.65&&position.y<p.y+1.5,'Rendering does not follow authoritative pedestrian position');}
  w.district.group.updateMatrixWorld(true);result.renderedSurfaces={samples:0,maxTopError:0};
  for(const id of [...sim.navigation.station.nodeIds].filter((_,i)=>i%4===0)){
    const n=sim.navigation.nodes[id],y=stationFootSurface(w.district.station,n.x,n.z,n.y);
    const ray=new THREE.Raycaster(new THREE.Vector3(n.x,y+.045,n.z),new THREE.Vector3(0,-1,0),0,.09);
    const hit=ray.intersectObject(w.district.group,true).find(h=>!h.object.material?.transparent);
    require(hit,'Navigation support missing from actual geometry at '+JSON.stringify(n));
    const error=Math.abs(hit.point.y-y);result.renderedSurfaces.maxTopError=Math.max(result.renderedSurfaces.maxTopError,error);result.renderedSurfaces.samples++;
    require(error<.035,'Navigation elevation differs from rendered floor/tread');
  }
  result.cameraPresets=LOCATIONS.map((l,index)=>({index,safe:l.eye[1]>15||!pointBlocked({x:l.eye[0],z:l.eye[2]},w.district.colliders,.25)}));
  require(result.cameraPresets.every(p=>p.safe),'Original camera start blocked');
  const gl=w.renderer.getContext();result.failedShaderLinks=w.renderer.info.programs.filter(p=>!gl.getProgramParameter(p.program,gl.LINK_STATUS)).length;require(!result.failedShaderLinks,'WebGL shader link failed');
  result.assets={loaded:w.nightlife.assets.loaded,errors:w.nightlife.assets.errors};
  w.activity.setStationDebug(false);w.teleport(2);w.setTime(20.5);w.setPlaying(false);
  const size=w.renderer.getSize(new THREE.Vector2()),ratio=w.renderer.getPixelRatio(),aspect=w.camera.aspect;
  window.__station2Review=result;
  try{w.renderer.setPixelRatio(1);w.composer.setPixelRatio(1);w.renderer.setSize(1920,1080,false);w.composer.setSize(1920,1080);w.camera.aspect=16/9;w.camera.updateProjectionMatrix();result.performance=document.hidden?{unavailable:'Review tab is hidden; frame timing omitted.'}:await Promise.race([w.measurePerformance(5),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Frame measurement timed out')),8000))]);}
  catch(error){result.performance={unavailable:String(error)};}
  finally{w.renderer.setPixelRatio(ratio);w.composer.setPixelRatio(ratio);w.renderer.setSize(size.x,size.y,false);w.composer.setSize(size.x,size.y);w.camera.aspect=aspect;w.camera.updateProjectionMatrix();}
  window.__station2Review=result;return result;
}
