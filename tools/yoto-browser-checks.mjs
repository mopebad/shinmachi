import * as THREE from 'three';
import {save} from './rail-district-browser-checks.mjs';
import {pcmCapture,dataUrl,save as saveMedia} from './behavior-browser-checks.mjs';
import {venueBodyBlocked} from '../src/world/generation/YotoVenueLayout.ts';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
export const views=[
 ['street','nightlife',21],['day','nightlife',13],
 ['entertainment','nightlife',21,{eye:[9.1,1.82,-24.9],target:[19.1,3.8,-27.7],fov:66}],
 ['bar-alley','nightlife',21,{eye:[-18.8,1.82,-25],target:[-8,2.4,-24.7],fov:58}],
 ['facade','nightlife',21,{eye:[17.0,1.82,-24.2],target:[18.7,4.8,-28.1],fov:70}],
 ['entrance','nightlife',21,{eye:[19.5,1.82,-25.9],target:[19.5,.4,-29.3],fov:65}],
 ['stair','nightlife',21,{eye:[19.5,.31,-29.98],target:[19.5,-1.5,-34.5],fov:64}],
 ['interior','nightlife',21,{eye:[19.6,-1.24,-33.4],target:[18.7,-1.4,-37.8],fov:68}],
 ['bar-counter','nightlife',21,{eye:[19.65,-1.24,-36.7],target:[17.8,-1.2,-35.2],fov:66}],
 ['exit','nightlife',21,{eye:[19.6,-1.24,-36.9],target:[19.5,-.7,-30.7],fov:66}],
 ['overview','overview',13,{eye:[35,28,-14],target:[12,0,-30],fov:65}],
];
export async function captureSet(stage='after'){
 const w=window.__shinmachi;await w.assetsReady;w.setReviewPaused(true);w.setPlaying(false);w.setTime(21);w.setWeather('damp');w.setReflections(true);w.setContactShading(true);
 if(w.activity.simulation.clock>300.001)throw new Error('Reload review URL before capture');while(w.activity.simulation.clock<300-1e-7)w.activity.simulation.update(1/30,21);
 for(const [name,view,hour,frame]of views)await w.captureBenchmark('yoto3a-'+name+'-'+stage,view,hour,frame);
 w.setWeather('dry');await w.captureBenchmark('yoto3a-dry-'+stage,'nightlife',21);w.setWeather('damp');
 await w.captureBenchmark('yoto3a-day-'+stage,'nightlife',13);
 const cost=await(await import('./skyline-browser-checks.mjs')).renderCost(w);await save('yoto3a-'+stage+'-measurements',{cost,clock:w.activity.simulation.clock,venue:w.nightlife.venue,views:views.map(v=>v[0])});return{captures:views.length+1,cost};
}
export async function audit(){
 const w=window.__shinmachi;await w.assetsReady;const base=await(await fetch('/quality/yoto3a-before-measurements.json')).json(),v=w.nightlife.venue,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),s=w.activity.simulation;
 const {CitySimulation}=await import('../src/world/simulation/CitySimulation.ts');const original=new CitySimulation({seed:8412,bounds:base.contracts.colliders,doors:base.contracts.doors,station:base.contracts.station});
 const expected=structuredClone(base.contracts.colliders),parcelCorrections=[];
 for(const p of w.district.group.userData.neighborhoods.parcels.filter(p=>p.rngDepth)){const i=expected.findIndex(b=>Math.abs(b.minX-p.footprint.minX)<1e-6&&Math.abs(b.minZ-p.footprint.minZ)<1e-6&&Math.abs(b.maxZ-p.footprint.maxZ)<1e-6);if(i<0)throw new Error('Original parcel missing');parcelCorrections.push({original:expected[i],updated:p.footprint,reason:'Clear the new flagship frontage and shaft while preserving its street entrance.'});expected[i]=p.footprint;}
 const result={doors:same(base.contracts.doors,w.district.doors),station:same(base.contracts.station,w.district.station),originalColliders:same(expected,w.district.colliders.slice(0,-1)),parcelCorrections,navigation:same(original.navigation.nodes,s.navigation.nodes)&&same([...original.navigation.edges],[...s.navigation.edges]),parts:0,triangles:0,routeHits:[],headHits:[],trainHits:[],shaderErrors:0,assets:w.nightlife.assets.errors,walk:[],maxRiser:0};
 const points=[];for(const [id,list]of s.navigation.edges)for(const e of list){const a=s.navigation.nodes[id],b=s.navigation.nodes[e.to],n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.12);for(let i=0;i<=n;i++){const t=i/n;points.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});}}
 const c=w.controller;c.keys.clear();c.setMode('walk');c.teleport(new THREE.Vector3(19.5,1.82,-26.8),new THREE.Vector3(19.5,1.82,-40));c.keys.add('w');let last=c.camera.position.y;
 for(let i=0;i<250;i++){c.update(1/60);const p={x:c.camera.position.x,y:c.camera.position.y-1.705,z:c.camera.position.z};result.maxRiser=Math.max(result.maxRiser,Math.abs(c.camera.position.y-last));last=c.camera.position.y;if(venueBodyBlocked(v,p.x,p.z,p.y))throw new Error('Player entered solid box');result.walk.push(p);}
 result.bottomReached=c.camera.position.z< -37&&Math.abs(c.camera.position.y-1.705-v.floorY)<1e-6;c.keys.clear();c.keys.add('s');for(let i=0;i<270;i++)c.update(1/60);c.keys.clear();result.returned=c.camera.position.z> -27&&Math.abs(c.camera.position.y-1.82)<1e-6;
 const matrix=new THREE.Matrix4(),boxes=[];w.nightlife.group.updateMatrixWorld(true);w.nightlife.group.traverse(mesh=>{if(!mesh.isInstancedMesh)return;mesh.geometry.computeBoundingBox();for(let i=0;i<mesh.count;i++){const section=mesh.userData.sections?.[i];if(!section?.startsWith('yoto:'))continue;mesh.getMatrixAt(i,matrix);if(!matrix.elements.every(Number.isFinite)||matrix.determinant()<=0)throw new Error('Invalid instance');const b=mesh.geometry.boundingBox.clone().applyMatrix4(matrix.clone().premultiply(mesh.matrixWorld));boxes.push({b,section});result.parts++;result.triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;
  for(const p of points)if(p.x>b.min.x-.25&&p.x<b.max.x+.25&&p.z>b.min.z-.25&&p.z<b.max.z+.25&&p.y+.22<b.max.y&&p.y+1.65>b.min.y){result.routeHits.push({section,p,min:b.min,max:b.max});break;}
  for(const p of result.walk)if(p.x>b.min.x-.23&&p.x<b.max.x+.23&&p.z>b.min.z-.23&&p.z<b.max.z+.23&&p.y+.22<b.max.y&&p.y+1.65>b.min.y){result.headHits.push({section,p,min:b.min,max:b.max});break;}
  if(b.min.z< -55.35&&b.max.z> -58.65&&b.max.y>6.98&&b.min.y<11.05)result.trainHits.push({section,min:b.min,max:b.max});
 }});
 const {venueOwnsReservation}=await import('../src/world/generation/YotoVenueLayout.ts');result.buildingHits=[];
 for(const {b,section}of boxes)if(section==='yoto:venue'&&b.max.y>.3)for(const other of w.district.colliders){if(venueOwnsReservation(v,other))continue;if(b.min.x<other.maxX&&b.max.x>other.minX&&b.min.z<other.maxZ&&b.max.z>other.minZ)result.buildingHits.push({min:b.min,max:b.max,other});}
 const gl=w.renderer.getContext();result.shaderErrors=w.renderer.info.programs.filter(p=>!gl.getProgramParameter(p.program,gl.LINK_STATUS)).length;
 // Actual surface ray at the stair entry must hit the descending tread, never the old asphalt slab.
 const ray=new THREE.Raycaster(new THREE.Vector3(19.5,1,-29),new THREE.Vector3(0,-1,0));result.treadRay=ray.intersectObjects(w.scene.children,true).filter(h=>h.object.isMesh&&!h.object.material?.transparent).slice(0,3).map(h=>({y:h.point.y,name:h.object.name}));
 await save('yoto3a-spatial-audit',result);w.teleport(7);
 if(!result.doors||!result.station||!result.originalColliders||!result.navigation||!result.bottomReached||!result.returned||result.routeHits.length||result.headHits.length||result.buildingHits.length||result.trainHits.length||result.shaderErrors||result.assets.length||!result.treadRay.length||result.treadRay[0].y>-.7)throw new Error('Yoto spatial audit failed '+JSON.stringify({...result,walk:undefined}));
 return{...result,walk:result.walk.length,treadRay:result.treadRay};
}
export async function recordWalk(){
 const w=window.__shinmachi;await w.assetsReady;await w.audio.start();w.setTime(21);w.setWeather('damp');w.setReviewPaused(false);w.setPlaying(false);
 const c=w.controller;c.setMode('walk');c.teleport(new THREE.Vector3(19.5,1.82,-25.3),new THREE.Vector3(19.5,.7,-33));w.setFov(65);c.keys.clear();
 const stream=w.renderer.domElement.captureStream(30),audio=w.audio.recordingStream;if(audio)for(const t of audio.getAudioTracks())stream.addTrack(t);
 const mime=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp8,opus'].find(t=>MediaRecorder.isTypeSupported(t)&&document.createElement('video').canPlayType(t));
 const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4800000,audioBitsPerSecond:96000}),chunks=[],samples=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const stopped=new Promise(r=>recorder.onstop=r),stopPCM=pcmCapture(w.audio);
 const sample=phase=>samples.push({phase,clock:w.activity.simulation.clock,eye:c.camera.position.toArray(),foot:c.camera.position.y-1.705,audio:structuredClone(w.audio.diagnostics)});
 const until=async(test,phase)=>{const start=performance.now();while(!test()){if(document.hidden||performance.now()-start>15000)throw new Error('Walking blocked or hidden at '+phase);sample(phase);await wait(120);}};
 let pcm;recorder.start(1000);
 try{
  sample('street');await wait(1500);c.keys.add('w');await until(()=>c.camera.position.z< -33.5,'descent');c.pitch=0;await until(()=>c.camera.position.z< -37.5,'inside');c.keys.clear();await wait(600);sample('bar');
  const yaw=c.yaw;for(let i=0;i<=30;i++){c.yaw=yaw+Math.PI*i/30;await wait(60);}await wait(1200);sample('looking-back');c.pitch=.17;c.keys.add('w');await until(()=>c.camera.position.z> -25.2,'ascent');c.keys.clear();await wait(900);sample('street-return');
 }finally{c.keys.clear();w.setReviewPaused(true);recorder.stop();await stopped;pcm=stopPCM();for(const t of stream.getVideoTracks())t.stop();}
 const blob=new Blob(chunks,{type:mime.startsWith('video/mp4')?'video/mp4':'video/webm'});const result={method:'Real live WebGL and Web Audio; controller walk input only after the initial street framing, no traversal teleport/fly mode.',mime,bytes:blob.size,samples,pcm:pcm?{frames:pcm.frames,rate:pcm.rate,seconds:pcm.seconds}:null};
 await saveMedia('yoto3a-walk-sequence',result,await dataUrl(blob),pcm?await dataUrl(pcm.blob):undefined);return{bytes:blob.size,samples:samples.length,pcm:result.pcm,returned:samples.at(-1)?.eye};
}
export async function playbackTest(){
 const w=window.__shinmachi;await w.audio.start();const result=[];
 for(const [name,eye,target]of [['outside',[19.5,1.82,-26.9],[19.5,1,-29]],['through-wall',[17.8,1.82,-26.9],[19.5,1,-29]],['stairs',[19.5,.29,-30.0],[19.5,-1,-34]],['inside',[19.6,-1.24,-35],[19,-1,-38]],['outside-return',[19.5,1.82,-26.9],[19.5,1,-29]]]){
  w.controller.teleport(new THREE.Vector3(...eye),new THREE.Vector3(...target));await wait(800);result.push({name,eye:w.camera.position.toArray(),audio:structuredClone(w.audio.diagnostics)});
 }
 const state=w.audio.diagnostics;w.audio.toggle();await wait(1200);const muted=structuredClone(w.audio.diagnostics);await w.audio.start();
 const voices=result.flatMap(r=>r.audio.music);if(voices.some(v=>v.paused||v.error||v.readyState<3||v.starts!==1)||result.at(-1).audio.music[0].time<=result[0].audio.music[0].time||muted.rms>.0001)throw new Error('Recorded music playback/mute failed');
 await save('yoto3a-playback-test',{result,muted,actualDecodedStreams:true});return result.map(r=>({name:r.name,rms:r.audio.rms,music:r.audio.music}));
}
export async function simulationTest(){
 const w=window.__shinmachi,{CitySimulation}=await import('../src/world/simulation/CitySimulation.ts'),{passengerAudit}=await import('./station3c-validation.mjs');
 const s=new CitySimulation({seed:8412,bounds:w.district.colliders,doors:w.district.doors,station:w.district.station}),audit=passengerAudit(s);let ordinaryWallHits=0;
 const {pointBlocked}=await import('../src/world/simulation/Navigation.ts');
 for(let i=0;i<36000;i++){s.update(1/30,i<18000?21:3);audit.sample();if(i%30===0)for(const p of s.pedestrians)if(p.active&&!p.rail&&(!p.station||p.station.state==='approaching')&&pointBlocked(p,w.district.colliders,.16))ordinaryWallHits++;if(i%900===0)await wait(0);}
 const result={openSeconds:600,drainSeconds:600,...audit.result,ordinaryWallHits,station:s.stationTraffic.metrics,passengers:s.railPassengers.metrics,remaining:s.pedestrians.filter(p=>p.station||p.rail).length,reservations:s.stationTraffic.owners.size,trainActive:s.train.snapshot.active};
 await save('yoto3a-simulation-audit',result);if(result.invalidPositions||result.unsafeCrossings||result.overlaps||result.unsafeDepartures||result.capacityViolations||result.gateConflicts||result.wallHits||result.vehicleOverlaps||ordinaryWallHits||result.remaining||result.reservations||result.trainActive||result.station.started!==result.station.completed)throw new Error('Actual-world regression failed');return result;
}
export async function validateCaptures(){const result=[];for(const name of ['street','day']){const a=await(await fetch('/quality/captures/yoto3a-'+name+'-before.json')).json(),b=await(await fetch('/quality/captures/yoto3a-'+name+'-after.json')).json(),conditions={};for(const key of ['eye','quaternion','fov','hour','seed','simulationClock','surface','reflections','contactShading','renderConditions','people','vehicles','train']){conditions[key]=JSON.stringify(a[key])===JSON.stringify(b[key]);if(!conditions[key])throw new Error('Capture mismatch '+name+' '+key);}result.push({name,conditions});}await save('yoto3a-capture-audit',{result});return result;}
