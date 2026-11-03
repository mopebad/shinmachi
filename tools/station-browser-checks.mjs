// Development-only review. Run in the live Vite browser; this module is not imported by the production app.
import * as THREE from 'three';
import { LOCATIONS } from '/src/world/CityWorld.ts';
import { stationSupport, stationBodyBlocked, STATION } from '/src/world/generation/StationLayout.ts';
import { CitySimulation, VEHICLE_PROFILES } from '/src/world/simulation/CitySimulation.ts';
import { pointBlocked } from '/src/world/simulation/Navigation.ts';
const require=(ok,message)=>{if(!ok)throw new Error(message);};

export async function review(){
  const w=window.__shinmachi;await w.assetsReady;const s=w.district.station;
  const result={seed:8412,captures:[],station:{surfaces:s.surfaces.length,flights:s.flights.length,risers:s.flights.reduce((sum,f)=>sum+f.risers,0),gates:s.gates.length,platformY:STATION.platformY,platformLength:STATION.platformMaxX-STATION.platformMinX}};
  const views=[
    ['entrance',null,12],
    ['concourse',{eye:[18.6,1.82,-46.8],target:[12.3,1.5,-48.6],fov:65},12],
    ['gates',{eye:[12.3,1.82,-46.8],target:[12.3,1.2,-50.4],fov:65},12],
    ['stairs',{eye:[14.1,1.82,-49.9],target:[23.2,3.6,-49.9],fov:65},12],
    ['rest',{eye:[19.05,3.567619,-49.9],target:[23.2,4.1,-49.9],fov:65},12],
    ['landing',{eye:[24.21,5.49,-50.1],target:[18.3,6.1,-52.2],fov:70},12],
    ['upper-landing',{eye:[14.2,9.16,-52.2],target:[20,8.6,-54],fov:65},12],
    ['platform',{eye:[32,9.16,-53.9],target:[59,8.9,-53.9],fov:65},12],
    ['exterior',{eye:[34,15,-33],target:[25,5,-51],fov:58},12],
    ['entrance-night',null,20.5],
    ['platform-night',{eye:[32,9.16,-53.9],target:[59,8.9,-53.9],fov:65},20.5],
  ];
  for(const [name,framing,hour]of views){w.activity.update(0,hour,w.camera.position);result.captures.push(await w.captureBenchmark('station1-'+name+'-after','station',hour,framing??undefined));}
  result.captures.push(await w.captureBenchmark('station1-railway-after','elevatedRail',20.5));
  const debugImage=new Image();debugImage.src='/quality/station1-layout.svg';await debugImage.decode();
  const debug=document.createElement('canvas');debug.width=1500;debug.height=1130;debug.getContext('2d').drawImage(debugImage,0,0);
  await fetch('/__review/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'station1-layout',png:debug.toDataURL('image/png'),metadata:{kind:'Debug diagram rasterized from authored SVG',source:'quality/station1-layout.svg',width:1500,height:1130}})});
  // Exercise the actual controller without teleporting between individual waypoints.
  const c=w.controller;let ticks=0;
  for(const route of [s.journey,[...s.journey].reverse()]){
    c.setMode('walk');c.teleport(new THREE.Vector3(route[0].x,route[0].y+1.705,route[0].z),new THREE.Vector3(route[1].x,route[0].y+1.705,route[1].z));
    for(const target of route.slice(1)){
      let n=0;while(Math.hypot(c.camera.position.x-target.x,c.camera.position.z-target.z)>.04&&n++<600){
        const dx=target.x-c.camera.position.x,dz=target.z-c.camera.position.z;c.yaw=Math.atan2(-dx,-dz);c.pitch=0;c.keys.add('w');c.update(1/60);ticks++;
      }
      c.keys.clear();require(n<600,'Actual walking controller stalled at '+JSON.stringify(target));
    }c.velocity.set(0,0,0);require(Math.abs(c.camera.position.y-(route.at(-1).y+1.705))<.01,'Wrong destination elevation');
  }
  result.playerWalk={completedBothWays:true,updateTicks:ticks,end:c.camera.position.toArray()};
  // Check headroom against actual rendered opaque geometry, not only the authored rectangles.
  w.scene.updateMatrixWorld(true);let minimumHeadroom=Infinity,raySamples=0;
  for(const p of s.journey){
    const y=stationSupport(s,p.x,p.z,p.y)??p.y;
    const ray=new THREE.Raycaster(new THREE.Vector3(p.x,y+.025,p.z),new THREE.Vector3(0,1,0),0,4);
    const hit=ray.intersectObject(w.district.group,true).find(h=>!h.object.material?.transparent);
    if(hit){minimumHeadroom=Math.min(minimumHeadroom,hit.distance+.025);require(hit.distance+.025>2.1,'Rendered headroom obstruction at '+JSON.stringify(p));}raySamples++;
  }
  result.renderedHeadroom={raySamples,minimumMetres:minimumHeadroom};
  result.cameraPresets=LOCATIONS.map((l,index)=>({index,safe:l.eye[1]>15||!pointBlocked({x:l.eye[0],z:l.eye[2]},w.district.colliders,.25)}));
  require(result.cameraPresets.every(p=>p.safe),'Blocked original camera preset');
  result.platformBuildingOverlaps=w.district.playerColliders.filter(b=>b.minX<STATION.platformMaxX&&b.maxX>STATION.platformMinX&&b.minZ<STATION.platformRearZ&&b.maxZ>STATION.platformEdgeZ);
  require(result.platformBuildingOverlaps.length===0,'Station platform crosses an existing building');
  const stationOnlyBounds=[...s.npcReservation,...s.boxes.filter(b=>b.collision&&b.minY<.3)];
  result.missingPlayerCityObstacles=w.district.colliders.filter(b=>!w.district.playerColliders.includes(b)&&!stationOnlyBounds.some(a=>['minX','maxX','minZ','maxZ'].every(k=>a[k]===b[k])));
  require(result.missingPlayerCityObstacles.length===0,'Existing city obstacle missing from player collision');
  const sim=new CitySimulation({seed:8412,bounds:w.district.colliders,doors:w.district.doors});let walls=0,unmarked=0,overlaps=0,exits=0;
  for(let i=0;i<18000;i++){
    const previous=sim.vehicles.map(v=>({active:v.active,s:v.s}));sim.update(1/30,18.5+4.5*i/18000);
    for(const v of sim.vehicles)if(previous[v.id]?.active&&(!v.active||v.s<previous[v.id].s))exits++;
    for(const p of sim.pedestrians)if(p.active){
      if(pointBlocked(p,w.district.colliders,.16))walls++;
      if(!p.crossing&&(Math.abs(p.x)<3.5||p.z>6.5&&p.z<17.5))unmarked++;
      for(const v of sim.vehicles)if(v.active){const dx=p.x-v.x,dz=p.z-v.z,shape=VEHICLE_PROFILES[v.kind];if(Math.abs(dx*Math.sin(v.yaw)+dz*Math.cos(v.yaw))<shape.length/2+.25&&Math.abs(dx*Math.cos(v.yaw)-dz*Math.sin(v.yaw))<shape.width/2+.25)overlaps++;}
    }
  }
  result.generatedWorld={seconds:600,walls,unmarkedRoadSamples:unmarked,pedestrianVehicleOverlaps:overlaps,vehicleExits:exits};
  require(!walls&&!unmarked&&!overlaps&&exits>70,'Generated-world safety/liveness regression');
  const gl=w.renderer.getContext();result.failedShaderLinks=w.renderer.info.programs.filter(p=>!gl.getProgramParameter(p.program,gl.LINK_STATUS)).length;
  require(!result.failedShaderLinks,'Failed WebGL shader link');
  result.assets={loaded:w.nightlife.assets.loaded,errors:w.nightlife.assets.errors};
  w.teleport(2);w.setTime(20.5);w.setPlaying(false);
  const size=w.renderer.getSize(new THREE.Vector2()),ratio=w.renderer.getPixelRatio(),aspect=w.camera.aspect;
  try{w.renderer.setPixelRatio(1);w.composer.setPixelRatio(1);w.renderer.setSize(1920,1080,false);w.composer.setSize(1920,1080);w.camera.aspect=16/9;w.camera.updateProjectionMatrix();result.performance=await w.measurePerformance(5);}
  catch(error){result.performance={unavailable:String(error),note:'No timing claim is made when the review tab becomes hidden.'};}
  finally{w.renderer.setPixelRatio(ratio);w.composer.setPixelRatio(ratio);w.renderer.setSize(size.x,size.y,false);w.composer.setSize(size.x,size.y);w.camera.aspect=aspect;w.camera.updateProjectionMatrix();}
  window.__stationReviewResult=result;return result;
}
