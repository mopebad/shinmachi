// Loaded by Vite in the real browser through konbini-review.mjs; never bundled into the app.
import * as THREE from 'three';
import { LOCATIONS } from '/src/world/CityWorld.ts';
import { CitySimulation, VEHICLE_PROFILES } from '/src/world/simulation/CitySimulation.ts';
import { pointBlocked } from '/src/world/simulation/Navigation.ts';

const require = (ok, detail) => { if (!ok) throw new Error(detail); };
const framing = m => ({ eye: m.eye, target: new THREE.Vector3(...m.eye).add(new THREE.Vector3(0,0,-1).applyQuaternion(new THREE.Quaternion(...m.quaternion))).toArray(), fov: m.fov });

export async function review() {
  const w = window.__shinmachi; await w.assetsReady;
  const result = { browser: navigator.userAgent, captures: [], checks: {} };
  for (const subject of ['commercial','day','interior','nightlife','sign','store','vertical','perf']) {
    const m = await (await fetch(`/quality/captures/konbini-${subject}-before.json`)).json();
    w.activity.update(0,m.hour,w.camera.position);
    result.captures.push(await w.captureBenchmark(`konbini-${subject}-after`,m.view,m.hour,framing(m)));
  }
  const store = await (await fetch('/quality/captures/konbini-store-before.json')).json();
  for (const [hour, label] of [[12,'day'],[3,'overnight']]) { w.activity.update(0,hour,w.camera.position); result.captures.push(await w.captureBenchmark(`konbini-store-${label}-after`,'commercial',hour,framing(store))); }
  for (const view of ['station','residential']) result.captures.push(await w.captureBenchmark(`konbini-${view}-after`,view,20.5));

  const signs = w.district.group.children.filter(n=>n.name.startsWith('Measured sign'));
  let runs = 0, pixels = 0;
  for (const mesh of signs) {
    const map = mesh.material.map; pixels += map.image.width * map.image.height;
    for (const face of map.userData.layouts) for (const run of face.runs) {
      const b = run.bounds; runs++;
      require(b.x >= -.001 && b.y >= -.001 && b.x+b.width <= face.width+.001 && b.y+b.height <= face.height+.001, `Clipped actual glyphs: ${run.text}`);
    }
    require(mesh.geometry.attributes.aBusiness.count === mesh.geometry.attributes.position.count, 'Sign schedule attributes misaligned');
  }
  result.checks.signs = { measuredTextRuns: runs, pages: signs.map(n=>[n.material.map.image.width,n.material.map.image.height]), rgbaWithMipmapsMiB: pixels*4*4/3/1024/1024 };
  const nightlife = [...w.nightlife.materials.signs.entries()];
  result.checks.nightlifeTextureBudget = {
    previousEstimatedPixels: nightlife.reduce((sum,[key])=>{const r=Math.max(.25,Math.min(4,Number(key.split(':')[1])));return sum+Math.round(768*Math.max(1,r))*Math.round(768*Math.max(1,1/r));},0),
    currentPixels: nightlife.reduce((sum,[,m])=>sum+m.map.image.width*m.map.image.height,0),
    note: 'Previous pixels reconstructed from the committed 768px/clamped-ratio policy for the same material keys; not a before GPU memory measurement.'
  };
  result.checks.presets = LOCATIONS.map((l,index)=>({index,safe:l.eye[1]>15 || !pointBlocked({x:l.eye[0],z:l.eye[2]},w.district.colliders,.22)}));
  require(result.checks.presets.every(p=>p.safe),'Camera preset blocked');
  let badMatrices=0; w.district.group.traverse(n=>{if(n.isInstancedMesh&&!n.instanceMatrix.array.every(Number.isFinite))badMatrices++;});
  require(badMatrices===0,'Non-finite district instances');
  const gl=w.renderer.getContext();
  result.checks.failedShaderLinks=w.renderer.info.programs.filter(p=>!gl.getProgramParameter(p.program,gl.LINK_STATUS)).length;
  require(result.checks.failedShaderLinks===0,'Failed shader links');
  w.setTime(3);
  w.activity.update(0,3,w.camera.position);
  result.checks.overnight={storeOpen:w.district.materials.signs.userData.openStates.value[3],cafeOpen:w.district.materials.signs.userData.openStates.value[1],trainVisible:w.activity.rail.group.visible};
  require(result.checks.overnight.storeOpen===1 && result.checks.overnight.cafeOpen<.1 && !result.checks.overnight.trainVisible,'Overnight schedule regression');
  w.setWeather('dry');require(!w.reflections.surface.visible,'Dry surface reflection still visible');w.setWeather('damp');w.setReflections(false);require(!w.reflections.surface.visible,'Explicit reflection-off failed');w.setReflections(true);
  result.checks.surfaceControls=true;

  const sim=new CitySimulation({seed:8412,bounds:w.district.colliders,doors:w.district.doors});
  let wallHits=0,unmarkedRoad=0,vehicleOverlaps=0,exits=0,maxCrossing=0;const crossingStarts=new Map();
  for(let step=0;step<18000;step++){
    const previous=sim.vehicles.map(c=>({active:c.active,s:c.s}));
    sim.update(1/30,18.5+4.5*step/18000);
    for(const c of sim.vehicles)if(previous[c.id]?.active&&(!c.active||c.s<previous[c.id].s))exits++;
    for(const p of sim.pedestrians)if(p.active){
      if(pointBlocked(p,w.district.colliders,.16))wallHits++;
      if(!p.crossing&&(Math.abs(p.x)<3.5||(p.z>6.5&&p.z<17.5)))unmarkedRoad++;
      if(p.crossing){if(!crossingStarts.has(p.id))crossingStarts.set(p.id,sim.clock);maxCrossing=Math.max(maxCrossing,sim.clock-crossingStarts.get(p.id));}else crossingStarts.delete(p.id);
      for(const c of sim.vehicles)if(c.active){const dx=p.x-c.x,dz=p.z-c.z,profile=VEHICLE_PROFILES[c.kind];if(Math.abs(dx*Math.sin(c.yaw)+dz*Math.cos(c.yaw))<profile.length/2+.25 && Math.abs(dx*Math.cos(c.yaw)-dz*Math.sin(c.yaw))<profile.width/2+.25)vehicleOverlaps++;}
    }
  }
  result.checks.generatedWorld={seconds:600,wallHits,unmarkedRoad,vehicleOverlaps,exits,maxCrossingSeconds:maxCrossing,buildings:w.district.stats.buildings};
  require(!wallHits&&!unmarkedRoad&&!vehicleOverlaps&&exits>70&&maxCrossing<25,'Generated-world safety/liveness regression');
  const perf=await(await fetch('/quality/captures/konbini-perf-before.json')).json();
  w.teleport(0);w.controller.teleport(new THREE.Vector3(...perf.eye),new THREE.Vector3(...framing(perf).target));w.setFov(perf.fov);w.setTime(perf.hour);w.setPlaying(false);
  result.performance=await w.measurePerformance(5);
  return result;
}
