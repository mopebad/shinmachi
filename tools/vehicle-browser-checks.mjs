import * as THREE from 'three';
import { CitySimulation } from '../src/world/simulation/CitySimulation.ts';
import { VEHICLE_KINDS, VEHICLE_PROFILES } from '../src/world/simulation/VehicleCatalog.ts';
import { passengerAudit } from './station3c-validation.mjs';

const require=(ok,message)=>{if(!ok)throw new Error(message);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hour=20.5;
const yieldBrowser=()=>new Promise(resolve=>setTimeout(resolve,0));

function overlaps(a,b) {
  const pa=VEHICLE_PROFILES[a.kind],pb=VEHICLE_PROFILES[b.kind];
  const af=[Math.sin(a.yaw),Math.cos(a.yaw)],ar=[Math.cos(a.yaw),-Math.sin(a.yaw)],bf=[Math.sin(b.yaw),Math.cos(b.yaw)],br=[Math.cos(b.yaw),-Math.sin(b.yaw)];
  for(const axis of [af,ar,bf,br]) {
    const dot=v=>Math.abs(v[0]*axis[0]+v[1]*axis[1]);
    const radius=dot(af)*pa.length/2+dot(ar)*pa.width/2+dot(bf)*pb.length/2+dot(br)*pb.width/2;
    if(Math.abs((a.x-b.x)*axis[0]+(a.z-b.z)*axis[1])>=radius-.04)return false;
  }
  return true;
}

/** Explicit GPU completion is usable even when the shared browser suspends animation frames. */
function renderTiming(w) {
  const gl=w.renderer.getContext(),samples=[];
  for(let i=0;i<8;i++){w.composer.render(0);gl.finish();}
  for(let i=0;i<30;i++){const start=performance.now();w.renderer.info.reset();w.composer.render(0);gl.finish();samples.push(performance.now()-start);}
  samples.sort((a,b)=>a-b);
  return {clock:w.activity.simulation.clock,hidden:document.hidden,viewport:[w.renderer.domElement.width,w.renderer.domElement.height],medianMs:samples[15],p95Ms:samples[28],stats:w.stats,
    method:'30 synchronous composite renders with gl.finish; not rAF or isolated GPU timing'};
}

/** Generated-world check: real station visits, intersections, footprints and signals. */
async function trafficRegression(w) {
  const sim=new CitySimulation({seed:8412,bounds:w.district.colliders,doors:w.district.doors,station:w.district.station,railPassengers:{arrivingPassengers:6}});
  const passengers=passengerAudit(sim),seen=new Set();let old=new Map();
  const result={seconds:900,drainSeconds:600,ticks:0,vehicleSamples:0,pairTests:0,overlaps:0,redEntries:0,stopLineViolations:0,laneErrors:0,premiumCapViolations:0,duplicateAppearances:0,exits:0,turns:0,
    spawns:Object.fromEntries(VEHICLE_KINDS.map(k=>[k,0]))};
  const {sampleLane}=await import('../src/world/simulation/WorldRules.ts');
  for(let tick=0;tick<1500*30;tick++) {
    sim.update(1/30,tick<900*30?hour:3);passengers.sample();result.ticks++;
    const cars=sim.vehicles.filter(c=>c.active),appearances=new Set();
    if(cars.filter(c=>VEHICLE_PROFILES[c.kind].family==='premium').length>2)result.premiumCapViolations++;
    for(const c of cars) {
      result.vehicleSamples++;
      const key=c.kind+':'+c.color+':'+c.variant;
      if(appearances.has(key))result.duplicateAppearances++;appearances.add(key);
      if(!seen.has(c.spawn)){seen.add(c.spawn);result.spawns[c.kind]++;}
      const before=old.get(c.id),light=c.route.axis==='NS'?sim.signals.ns:sim.signals.ew;
      if(before?.spawn===c.spawn&&!before.committed&&c.committed&&light!=='green')result.redEntries++;
      if(!c.committed&&light!=='green'&&c.s>c.route.stopLine-VEHICLE_PROFILES[c.kind].length/2-.35+.001)result.stopLineViolations++;
      const lane=sampleLane(c.route,c.s);
      if(Math.hypot(lane.x-c.x,lane.z-c.z)>1e-8)result.laneErrors++;
      if(c.route.turn&&before?.spawn===c.spawn&&before.s<=c.route.stopLine+12&&c.s>c.route.stopLine+12)result.turns++;
    }
    for(const before of old.values())if(!sim.vehicles.some(c=>c.active&&c.spawn===before.spawn))result.exits++;
    for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++)if(Math.hypot(cars[i].x-cars[j].x,cars[i].z-cars[j].z)<7){result.pairTests++;if(overlaps(cars[i],cars[j]))result.overlaps++;}
    old=new Map(cars.map(c=>[c.id,{id:c.id,spawn:c.spawn,s:c.s,committed:c.committed}]));
    if(tick%900===0)await yieldBrowser();
  }
  result.passengers={...passengers.result,station:sim.stationTraffic.metrics,rail:sim.railPassengers.metrics,remaining:sim.pedestrians.filter(p=>p.station||p.rail).length,reservations:sim.stationTraffic.owners.size};
  require(!result.overlaps&&!result.redEntries&&!result.stopLineViolations&&!result.laneErrors&&!result.premiumCapViolations&&!result.duplicateAppearances,'Vehicle regression: '+JSON.stringify(result));
  const p=result.passengers;
  require(!p.invalidPositions&&!p.unsafeCrossings&&!p.overlaps&&!p.unsafeDepartures&&!p.capacityViolations&&!p.gateConflicts&&!p.wallHits&&!p.vehicleOverlaps&&!p.remaining&&!p.reservations,'Passenger regression: '+JSON.stringify(p));
  require(result.exits>100&&result.turns>10&&p.station.completed===p.station.started&&p.rail.boarded===p.rail.delivered,'Traffic or station failed to complete journeys');
  return result;
}

function framing(c,side=1) {
  const p=VEHICLE_PROFILES[c.kind],cs=Math.cos(c.yaw),sn=Math.sin(c.yaw),x=3.5*side,z=4.3;
  return {eye:[c.x+x*cs+z*sn,Math.max(2.1,p.height+.5),c.z-x*sn+z*cs],target:[c.x,p.height*.47,c.z],fov:52};
}

function clearFrame(c,f,sim) {
  const camera=new THREE.PerspectiveCamera(f.fov,16/9,.1,200);camera.position.set(...f.eye);camera.lookAt(...f.target);camera.updateMatrixWorld();
  const rect=points=>{const r={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};for(const p of points){p.project(camera);r.minX=Math.min(r.minX,p.x);r.maxX=Math.max(r.maxX,p.x);r.minY=Math.min(r.minY,p.y);r.maxY=Math.max(r.maxY,p.y);}return r;};
  const corners=(x,y,z,w,h,l,yaw=0)=>{const points=[];for(const a of [-w/2,w/2])for(const b of [0,h])for(const d of [-l/2,l/2])points.push(new THREE.Vector3(x+a*Math.cos(yaw)+d*Math.sin(yaw),y+b,z-a*Math.sin(yaw)+d*Math.cos(yaw)));return points;};
  const p=VEHICLE_PROFILES[c.kind],car=rect(corners(c.x,0,c.z,p.width,p.height,p.length,c.yaw)),direction=new THREE.Vector3(...f.target).sub(camera.position).normalize(),distance=camera.position.distanceTo(new THREE.Vector3(...f.target));
  for(const person of sim.pedestrians.filter(p=>p.active&&p.y<2)) {
    const depth=new THREE.Vector3(person.x,person.y+.9,person.z).sub(camera.position).dot(direction);
    if(depth<.1||depth>distance+p.length/2)continue;
    const other=rect(corners(person.x,person.y,person.z,.7,1.9,.7));
    if(other.minX<car.maxX&&other.maxX>car.minX&&other.minY<car.maxY&&other.maxY>car.minY)return false;
  }
  return true;
}

function auditPresentation(w) {
  const sim=w.activity.simulation,result={clock:sim.clock,cars:0,wheels:0,near:0,far:0},matrix=new THREE.Matrix4(),point=new THREE.Vector3();
  w.activity.update(0,sim.hour,w.camera.position);
  for(const c of sim.vehicles.filter(c=>c.active)) {
    const family=w.activity.vehicles.families.get(c.kind),distance=Math.hypot(c.x-w.camera.position.x,c.z-w.camera.position.z),lod=distance>45?'far':'near';
    const pools=family[lod],body=pools.find(p=>p.surface==='paint'&&!p.wheel).mesh,index=body.userData.vehicleIds.indexOf(c.id);
    require([...family.near,...family.far].every(p=>!p.mesh.castShadow),'Moving vehicle entered the static shadow cache');
    require(index>=0,'Missing actual vehicle body: '+c.id);body.getMatrixAt(index,matrix);
    point.setFromMatrixPosition(matrix);require(Math.hypot(point.x-c.x,point.z-c.z)<.00002,'Body detached from route');
    const inv=matrix.clone().invert(),wheels=pools.find(p=>p.surface==='rubber'&&p.wheel).mesh,centers=[];
    wheels.userData.vehicleIds.forEach((id,i)=>{if(id===c.id){wheels.getMatrixAt(i,matrix);require(matrix.elements.every(Number.isFinite),'Invalid wheel transform');centers.push(point.setFromMatrixPosition(matrix).applyMatrix4(inv).clone());}});
    const p=VEHICLE_PROFILES[c.kind];require(centers.length===4,'Missing wheels');
    require(centers.every(v=>Math.abs(Math.abs(v.z)-p.wheelbase/2)<.00002&&Math.abs(v.y-p.wheelRadius)<.00002),'Wheelbase detached from body');
    const tail=pools.find(p=>p.surface==='tail'&&p.braking===c.braking).mesh;
    require(tail.userData.vehicleIds.includes(c.id),'Brake lights disagree with authoritative braking state');
    result.cars++;result.wheels+=centers.length;result[lod]++;
  }
  return result;
}

export async function review() {
  const w=window.__shinmachi;w.setReviewPaused(true);w.setPlaying(false);w.setTime(hour);w.setWeather('damp');w.setReflections(true);await w.assetsReady;
  const sim=w.activity.simulation;require(sim.clock<=300+1e-7,'Reload the hero view before replaying the fixed capture clock');
  while(sim.clock<300-1e-7)sim.update(1/30,hour);
  const result={configuration:{seed:8412,hour,clock:sim.clock,surface:'damp',wetness:.64,reflections:true},profiles:VEHICLE_PROFILES,captures:[],familyCaptures:[],matchingCapture:{}};
  result.captures.push(await w.captureBenchmark('vehicles-hero-after','heroStreet',hour));
  const baseline=await(await fetch('/quality/captures/vehicles-hero-before.json')).json();
  const after=await(await fetch('/quality/captures/vehicles-hero-after.json')).json();
  for(const key of ['eye','quaternion','fov','hour','seed','surface','reflections','contactShading','width','height','pixelRatio','simulationClock','renderConditions']) {
    result.matchingCapture[key]=same(baseline[key],after[key]);require(result.matchingCapture[key],'Capture condition changed: '+key);
  }
  result.performance=renderTiming(w);
  result.presentation=[auditPresentation(w)];
  result.captures.push(await w.captureBenchmark('vehicles-hero-day-after','heroStreet',13));
  const dayBefore=await(await fetch('/quality/captures/vehicles-hero-day-before.json')).json(),dayAfter=await(await fetch('/quality/captures/vehicles-hero-day-after.json')).json();
  result.dayMatchingCapture={};for(const key of Object.keys(result.matchingCapture)){result.dayMatchingCapture[key]=same(dayBefore[key],dayAfter[key]);require(result.dayMatchingCapture[key],'Day capture condition changed: '+key);}
  w.setTime(hour);sim.update(0,hour);
  const pending=new Set(VEHICLE_KINDS),trafficShots=new Set(['red-queue','crossing-clearance','turning']);let mixed=false;
  for(let tick=0;tick<180000&&(pending.size||trafficShots.size||!mixed);tick++) {
    const cars=sim.vehicles.filter(c=>c.active);
    for(const c of cars) {
      if(!pending.has(c.kind)||Math.abs(c.x)>32||Math.abs(c.z)>39)continue;
      // Choose an actual straight-lane car with a clear front. Never stage actors or change families.
      if(c.route.turn&&Math.abs(c.s-c.route.stopLine)<18)continue;
      if(cars.some(b=>b!==c&&Math.abs((b.x-c.x)*Math.cos(c.yaw)-(b.z-c.z)*Math.sin(c.yaw))<2.1&&(b.x-c.x)*Math.sin(c.yaw)+(b.z-c.z)*Math.cos(c.yaw)>0&&(b.x-c.x)*Math.sin(c.yaw)+(b.z-c.z)*Math.cos(c.yaw)<8))continue;
      const f=[framing(c),framing(c,-1)].find(f=>clearFrame(c,f,sim));if(!f)continue;
      const observation={kind:c.kind,id:c.id,spawn:c.spawn,clock:sim.clock,x:c.x,z:c.z,yaw:c.yaw,speed:c.speed,braking:c.braking,framing:f};
      result.captures.push(await w.captureBenchmark('vehicle-'+c.kind+'-day','commercial',13,f));
      result.captures.push(await w.captureBenchmark('vehicle-'+c.kind+'-night','commercial',hour,f));
      result.presentation.push(auditPresentation(w));
      result.familyCaptures.push(observation);pending.delete(c.kind);sim.update(0,hour);
    }
    const queue=cars.filter(c=>Math.abs(c.x)<3&&c.z>25&&c.z<55);
    if(!mixed&&queue.some(c=>VEHICLE_PROFILES[c.kind].family==='premium')&&queue.some(c=>VEHICLE_PROFILES[c.kind].family==='work')) {
      result.mixedClock=sim.clock;result.captures.push(await w.captureBenchmark('vehicles-hero-mixed','heroStreet',hour));mixed=true;
    }
    const triggers={
      'red-queue':cars.filter(c=>c.speed<.01&&!c.committed).length>=5,
      'crossing-clearance':sim.signals.walk&&sim.pedestrians.some(p=>p.crossing),
      turning:cars.some(c=>c.route.turn&&c.speed>1&&c.s>c.route.stopLine+4&&c.s<c.route.stopLine+12),
    };
    for(const name of trafficShots)if(triggers[name]) {
      result.captures.push(await w.captureBenchmark('vehicles-traffic-'+name,'commercial',hour,{eye:[0,8,24.5],target:[0,.65,10.8],fov:72}));
      trafficShots.delete(name);
    }
    sim.update(1/30,hour);if(tick%900===0)await yieldBrowser();
  }
  require(!pending.size&&!trafficShots.size&&mixed,'Missing actual traffic captures: '+[...pending,...trafficShots]);
  result.modelBudgets=[...w.activity.vehicles.families].map(([kind,f])=>({kind,nearTriangles:f.models[0].triangles,farTriangles:f.models[1].triangles,nearDraws:f.near.length,farDraws:f.far.length}));
  result.traffic=await trafficRegression(w);
  const gl=w.renderer.getContext();result.failedShaderLinks=w.renderer.info.programs.filter(p=>!gl.getProgramParameter(p.program,gl.LINK_STATUS)).length;
  result.assets={loaded:w.nightlife.assets.loaded,errors:w.nightlife.assets.errors};result.browserErrors=window.__vehicleErrors??[];
  require(!result.failedShaderLinks&&!result.assets.errors.length&&!result.browserErrors.length,'Browser rendering failed');
  w.teleport(8);w.setTime(hour);w.activity.update(0,hour,w.camera.position);
  const saved=await fetch('/__review/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'vehicle-measurements',metadata:result})});
  require(saved.ok,'Could not save vehicle measurements');window.__vehicleReview=result;return result;
}
