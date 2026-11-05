import * as THREE from 'three';
import {CitySimulation,VEHICLE_PROFILES} from '../src/world/simulation/CitySimulation.ts';
import {pointBlocked,segmentClear} from '../src/world/simulation/Navigation.ts';
import {passengerAudit} from './station3c-validation.mjs';

const wait=ms=>new Promise(r=>setTimeout(r,ms));
export async function save(name,metadata,media,wav){
  const response=await fetch('/__review/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,metadata,wav,webm:media?.startsWith('data:video/webm')?media:undefined,mp4:media?.startsWith('data:video/mp4')?media:undefined})});
  if(!response.ok)throw new Error('Capture failed '+response.status);return response.json();
}
export function snapshot(w){
  const sim=w.activity.simulation;
  return {clock:sim.clock,hour:sim.hour,eye:w.camera.position.toArray(),quaternion:w.camera.quaternion.toArray(),fov:w.camera.fov,wet:sim.wet,
    people:sim.pedestrians.filter(p=>p.active).map(p=>({uid:p.identity.uid,id:p.id,x:p.x,y:p.y,z:p.z,speed:p.motion.speed,phase:p.phase,footfalls:p.motion.footfalls,purpose:p.identity.purpose,activity:p.activity,companion:p.companion,station:p.station?.state,rail:p.rail?.state})),
    vehicles:sim.vehicles.filter(c=>c.active).map(c=>({id:c.id,spawn:c.spawn,kind:c.kind,x:c.x,z:c.z,s:c.s,speed:c.speed,acceleration:c.acceleration,lights:c.lights,steering:c.steering})),train:sim.train.snapshot.state,streetLife:sim.streetLife.metrics,audio:w.audio.diagnostics};
}
export async function generatedAudit(w){
  const sim=new CitySimulation({seed:8412,bounds:w.district.colliders,doors:w.district.doors,station:w.district.station}),passenger=passengerAudit(sim);
  const result={seconds:600,drainSeconds:600,wallHits:0,roadSteps:0,pedestrianOverlaps:0,minimumSeparation:Infinity,activitySamples:0,invalidActivities:0,maxSpeed:0,maxDriverBrakeExcess:0,exits:0,first:[],cpuMs:0};
  const old=new Set(),saved=new Map();
  const start=performance.now();
  for(let tick=0;tick<36000;tick++){
    sim.update(1/30,tick<18000?20.5:3);passenger.sample();
    const people=sim.pedestrians.filter(p=>p.active),cars=sim.vehicles.filter(c=>c.active);
    for(const spawn of old)if(!cars.some(c=>c.spawn===spawn)){result.exits++;old.delete(spawn);}for(const c of cars){old.add(c.spawn);result.maxDriverBrakeExcess=Math.max(result.maxDriverBrakeExcess,-c.acceleration-c.driver.braking);}
    const fail=(key,p)=>{result[key]++;if(result.first.length<8)result.first.push({key,clock:sim.clock,id:p.id,x:p.x,z:p.z,node:p.node,next:p.path[p.next],state:p.station?.state});};
    for(const p of people){
      if(!p.rail&&(!p.station||p.station.state==='approaching')&&pointBlocked(p,w.district.colliders,.16))fail('wallHits',p);
      if(p.y<2&&!p.crossing&&(Math.abs(p.x)<3.5||p.z>6.5&&p.z<17.5))fail('roadSteps',p);
      if(!p.rail)result.maxSpeed=Math.max(result.maxSpeed,p.motion.speed);
      if(p.activity){result.activitySamples++;if(p.station||p.crossing||p.rail||Math.abs(p.x)<4.05)fail('invalidActivities',p);}
      saved.set(p.identity.uid,p.motion.distance);
    }
    for(let a=0;a<people.length;a++)for(let b=a+1;b<people.length;b++)if(Math.abs(people[a].y-people[b].y)<1.5){const d=Math.hypot(people[a].x-people[b].x,people[a].z-people[b].z);result.minimumSeparation=Math.min(result.minimumSeparation,d);if(d<.5){result.pedestrianOverlaps++;if(result.first.length<8)result.first.push({clock:sim.clock,a:people[a].id,b:people[b].id,d,astate:people[a].station?.state,bstate:people[b].station?.state,ax:people[a].x,az:people[a].z,bx:people[b].x,bz:people[b].z});}}
    if(tick%900===0)await wait(0);
  }
  result.cpuMs=performance.now()-start;result.station=sim.stationTraffic.metrics;result.rail=sim.railPassengers.metrics;result.passengers=passenger.result;result.streetLife=sim.streetLife.metrics;
  result.remainingStation=sim.pedestrians.filter(p=>p.station||p.rail).length;result.reservations=sim.stationTraffic.owners.size;
  result.zones=sim.streetLife.zones.map(z=>({...z,clear:z.spots.every(s=>!pointBlocked(s,w.district.colliders,.29)&&segmentClear(sim.navigation.nodes[z.anchor],s,w.district.colliders,.29))}));
  await save('behavior-generated-audit',result);return result;
}

export function frame(w,eye,target,fov=56){w.controller.teleport(new THREE.Vector3(...eye),new THREE.Vector3(...target));w.setFov(fov);w.camera.updateMatrixWorld();}
export const dataUrl=blob=>new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(blob);});
export function pcmCapture(audio){
  const ctx=audio.context;if(!ctx)return ()=>null;
  // Dev-only, bounded PCM tap avoids the host browser's missing Opus decoder.
  const processor=ctx.createScriptProcessor(2048,2,1),sink=ctx.createGain(),chunks=[];sink.gain.value=0;
  audio.analyser.connect(processor);processor.connect(sink).connect(ctx.destination);
  processor.onaudioprocess=e=>{if(chunks.length*2048>ctx.sampleRate*60)return;const a=e.inputBuffer.getChannelData(0),b=e.inputBuffer.numberOfChannels>1?e.inputBuffer.getChannelData(1):a,data=new Float32Array(a.length);for(let i=0;i<data.length;i++)data[i]=(a[i]+b[i])*.5;chunks.push(data);};
  return ()=>{audio.analyser.disconnect(processor);processor.disconnect();sink.disconnect();processor.onaudioprocess=null;
    const frames=chunks.reduce((n,c)=>n+c.length,0),buffer=new ArrayBuffer(44+frames*2),v=new DataView(buffer),str=(offset,s)=>{for(let i=0;i<s.length;i++)v.setUint8(offset+i,s.charCodeAt(i));};
    str(0,'RIFF');v.setUint32(4,36+frames*2,true);str(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,ctx.sampleRate,true);v.setUint32(28,ctx.sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,frames*2,true);
    let index=44;for(const c of chunks)for(const sample of c){v.setInt16(index,Math.round(Math.max(-1,Math.min(1,sample))*32767),true);index+=2;}
    return {blob:new Blob([buffer],{type:'audio/wav'}),frames,rate:ctx.sampleRate,seconds:frames/ctx.sampleRate};};
}
export async function record(w,name,seconds=20,{follow,followKind}={}){
  if(document.hidden)throw new Error('Recording requires the shared tab visible');
  await w.assetsReady;w.setPlaying(false);w.setReviewPaused(true);
  const canvas=w.renderer.domElement,stream=canvas.captureStream(30),audio=w.audio.recordingStream;
  if(audio)for(const track of audio.getAudioTracks())stream.addTrack(track);
  const mime=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t)&&document.createElement('video').canPlayType(t));
  const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2300000,audioBitsPerSecond:96000}),chunks=[],samples=[];
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  const stopped=new Promise(resolve=>recorder.onstop=resolve);
  let running=true,start=0;const mode=w.cameraMode,eye=w.camera.position.toArray(),target=new THREE.Vector3(0,0,-1).applyQuaternion(w.camera.quaternion).add(w.camera.position).toArray(),fov=w.camera.fov;
  const events=['keydown','keyup','mousemove','pointermove','pointerdown','pointerup','click','wheel'],block=e=>{e.preventDefault();e.stopImmediatePropagation();};
  events.forEach(event=>document.addEventListener(event,block,{capture:true,passive:false}));w.controller.setMode('fly');w.controller.keys.clear();
  let stopPCM=()=>null;
  const present=()=>{
    if(follow===undefined&&!followKind)frame(w,eye,target,fov);
    if(follow!==undefined){const p=w.activity.simulation.pedestrians.find(p=>p.active&&p.identity.uid===follow);if(p){w.controller.setMode('fly');frame(w,[p.x-Math.sign(p.x)*2.1,1.7,p.z+3.4],[p.x,1.05,p.z],54);}}
    if(followKind){const c=w.activity.simulation.vehicles.find(c=>c.active&&c.spawn===followKind.spawn);if(c)frame(w,[c.x+4,2.6,c.z+6],[c.x,.8,c.z],58);}
  };
  const sample=()=>{
    if(!running)return;present();
    if(!samples.length||performance.now()-start>samples.length*500)samples.push(structuredClone(snapshot(w)));
    requestAnimationFrame(sample);
  };
  let pcm;
  try{
    // Flush a frame queued before fast-forwarding, and render the current state before encoding.
    present();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    stopPCM=pcmCapture(w.audio);start=performance.now();recorder.start(1000);w.setReviewPaused(false);sample();await wait(seconds*1000);running=false;w.setReviewPaused(true);recorder.stop();await stopped;
  }
  finally{running=false;w.setReviewPaused(true);pcm=stopPCM();events.forEach(event=>document.removeEventListener(event,block,true));w.controller.setMode(mode);}
  for(const track of stream.getVideoTracks())track.stop();
  const blob=new Blob(chunks,{type:mime.startsWith('video/mp4')?'video/mp4':'video/webm'}),media=await dataUrl(blob),wav=pcm?await dataUrl(pcm.blob):undefined;
  const metadata={name,method:'Actual WebGL canvas captureStream(30), live fixed-step simulation, own spatial Web Audio output and synchronized PCM sidecar; no microphone. Navigation input is locked only during capture.',seconds,bytes:blob.size,mime,recordedAudio:!!audio,pcm:pcm?{frames:pcm.frames,rate:pcm.rate,seconds:pcm.seconds,bytes:pcm.blob.size}:null,samples};
  await save(name,metadata,media,wav);return {name,bytes:blob.size,samples:samples.length,start:samples[0]?.clock,end:samples.at(-1)?.clock,audio:metadata.recordedAudio,pcm:metadata.pcm,footEvents:samples.at(-1)?.audio.footEvents,indicatorEvents:samples.at(-1)?.audio.indicatorEvents};
}

/** Replays natural opportunities, then records eight real-time cases without staging actors. */
export async function recordSuite(w){
  const sim=w.activity.simulation,out=window.__behaviorRecordProgress=[];
  w.setReviewPaused(true);w.setPlaying(false);w.teleport(8);await w.assetsReady;
  if(sim.clock>300+1e-7)throw new Error('Reload ?view=8&seed=8412&review=1 before the suite');
  while(sim.clock<300-1e-7)sim.update(1/30,20.5);
  await w.captureBenchmark('behavior-hero-after','heroStreet',20.5);out.push(await record(w,'behavior-hero-sequence',22));
  const find=async(predicate,hour=20.5)=>{for(let i=0;i<36000;i++){sim.update(1/30,hour);const actor=predicate();if(actor)return actor;if(i%900===0)await wait(0);}throw new Error('No natural recording opportunity');};
  let p=await find(()=>sim.pedestrians.find(p=>p.active&&p.activity?.kind==='phone'&&p.activity.state==='approaching'&&p.z>23&&p.z<50));
  out.push({uid:p.identity.uid,...await record(w,'behavior-phone-sequence',22,{follow:p.identity.uid})});
  p=await find(()=>sim.pedestrians.find(p=>p.active&&p.activity?.kind==='conversation'&&p.activity.state==='approaching'));
  out.push({uid:p.identity.uid,partner:p.activity.partner,...await record(w,'behavior-conversation-sequence',24,{follow:p.identity.uid})});
  let c=await find(()=>sim.vehicles.find(c=>c.active&&c.route.turn&&c.route.entry==='W'&&sim.signals.ew==='red'&&c.s>c.route.distances[1]-18&&c.s<c.route.distances[1]-10&&c.speed>3));
  w.controller.setMode('fly');frame(w,[c.x+4,2.6,c.z+6],[c.x,.8,c.z],58);
  out.push({spawn:c.spawn,kind:c.kind,...await record(w,'behavior-traffic-braking-sequence',18,{followKind:{spawn:c.spawn}})});
  c=await find(()=>sim.vehicles.find(c=>c.active&&c.route.turn&&c.route.entry==='W'&&!c.committed&&c.speed<.1&&c.s>c.route.distances[1]-13&&c.s<c.route.distances[1]&&sim.signals.phase>=24&&sim.signals.phase<28));
  frame(w,[c.x+4,2.6,c.z+6],[c.x,.8,c.z],58);
  out.push({spawn:c.spawn,kind:c.kind,...await record(w,'behavior-traffic-turn-sequence',24,{followKind:{spawn:c.spawn}})});
  w.setTime(13);w.setWeather('dry');
  p=await find(()=>sim.pedestrians.find(p=>p.active&&!p.station&&!p.activity&&p.companion&&p.motion.speed>.4&&p.z>23&&p.z<55&&sim.pedestrians.some(q=>q.identity.uid===p.companion.uid&&!q.station&&!q.activity&&q.motion.speed>.4&&Math.hypot(q.x-p.x,q.z-p.z)<1.5)),13);
  out.push({uid:p.identity.uid,partner:p.companion.uid,...await record(w,'behavior-companions-day-sequence',16,{follow:p.identity.uid})});
  await find(()=>sim.pedestrians.find(p=>p.active&&p.station?.flight&&p.moving));
  w.teleport(2);w.setTime(20.5);w.setWeather('damp');await w.captureBenchmark('behavior-station-night','station',20.5);
  out.push(await record(w,'behavior-station-sequence',22));
  w.teleport(4);w.setTime(13);w.setWeather('dry');await w.captureBenchmark('behavior-residential-day','residential',13);
  const residential=record(w,'behavior-residential-time-sequence',18);await wait(9000);w.setTime(3);w.setWeather('damp');out.push(await residential);
  await w.captureBenchmark('behavior-residential-night','residential',3);
  await save('behavior-recording-index',{recordings:out});w.teleport(8);return out;
}
