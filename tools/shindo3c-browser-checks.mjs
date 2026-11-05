import * as THREE from 'three';
import {save} from './rail-district-browser-checks.mjs';
import {venueBodyBlocked} from '../src/world/generation/YotoVenueLayout.ts';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export const views=[
 ['entrance',[19.5,1.82,-25.9],[19.5,.4,-29.3],65],
 ['stairs',[19.5,.31,-29.98],[19.5,-1.5,-34.5],64],
 ['landing',[19.5,-1.24,-32.98],[18.75,-1.35,-37.2],68],
 ['overview',[19.6,-1.24,-33.4],[18.7,-1.4,-37.8],68],
 ['bar',[19.05,-1.24,-35.1],[16.25,-1.35,-35.8],68],
 ['music',[18.85,-1.24,-38.3],[18.35,-1.65,-40.55],65],
 ['seating',[18.77,-1.24,-37.8],[16.3,-1.9,-39.45],65],
 ['hero',[19.25,-1.24,-34.5],[17.6,-1.35,-38.8],64],
];
export async function prepare(){
 const w=window.__shinmachi;await w.assetsReady;w.setReviewPaused(true);w.setPlaying(false);w.setTime(21);w.setWeather('damp');w.setReflections(true);
 const baseline=await(await fetch('/quality/shindo3c-baseline.json')).json();
 if(w.activity.simulation.clock>baseline.clock+.001)throw new Error('Reload with review=1');
 while(w.activity.simulation.clock<baseline.clock-1e-7)w.activity.simulation.update(1/30,21);return w;
}
export async function captureSet(){
 const w=await prepare();for(const [name,eye,target,fov]of views)await w.captureBenchmark('shindo3c-'+name+'-after','nightlife',21,{eye,target,fov});
 const comparisons=[];
 for(const name of ['stairs','overview','bar','music']){
  const a=await(await fetch('/quality/captures/shindo3c-'+name+'-before.json')).json(),b=await(await fetch('/quality/captures/shindo3c-'+name+'-after.json')).json();
  const keys=['eye','quaternion','fov','seed','hour','simulationClock','surface','reflections','contactShading','width','height','pixelRatio','renderConditions'];
  for(const key of keys)if(JSON.stringify(a[key])!==JSON.stringify(b[key]))throw new Error('Capture condition changed: '+name+' '+key);
  comparisons.push({name,identicalConditions:keys});
 }
 const [,eye,target,fov]=views[3];w.controller.teleport(new THREE.Vector3(...eye),new THREE.Vector3(...target));w.setFov(fov);w.activity.update(0,21,w.camera.position);
 const cost=await(await import('./skyline-browser-checks.mjs')).renderCost(w);await save('shindo3c-after-metrics',{cost,comparisons,clock:w.activity.simulation.clock});return{captures:views.length,cost};
}
export async function spatialCheck(prefix='shindo3c'){
 const w=window.__shinmachi;await w.assetsReady;const v=w.nightlife.venue,c=w.controller,baseline=await(await fetch('/quality/'+prefix+'-baseline.json')).json();
 const contracts={};for(const key of ['colliders','doors','station']){contracts[key]=JSON.stringify(w.district[key])===JSON.stringify(baseline[key]);if(!contracts[key])throw new Error('City contract changed '+key);}
 const geometry=[];w.scene.updateMatrixWorld(true);w.scene.traverse(o=>{if(o.isMesh&&!o.material?.transparent&&o.material?.visible!==false)geometry.push(o);});
 const ray=new THREE.Raycaster(),samples=[];
 c.setMode('walk');c.teleport(new THREE.Vector3(19.5,1.82,-26.8),new THREE.Vector3(19.5,1.82,-40));
 const steps=(key,n)=>{c.keys.clear();c.keys.add(key);for(let i=0;i<n;i++){
  c.update(1/60);const p=c.camera.position,foot=p.y-1.705;
  if(venueBodyBlocked(v,p.x,p.z,foot))throw new Error('Walk through solid furniture/wall');
  if(i%10===0){ray.set(new THREE.Vector3(p.x,p.y,p.z),new THREE.Vector3(0,-1,0));const floor=ray.intersectObjects(geometry,false)[0];const tolerance=p.z> -26.65?.115:.035;if(!floor||Math.abs(floor.point.y-foot)>tolerance){c.keys.clear();throw new Error('Rendered floor does not match walking support '+JSON.stringify({eye:p.toArray(),foot,hit:floor?.point,section:floor?.object.userData.sections?.[floor.instanceId]}));}
   ray.set(new THREE.Vector3(p.x,p.y,p.z),new THREE.Vector3(0,1,0));const ceiling=ray.intersectObjects(geometry,false)[0];if(ceiling&&ceiling.distance<.39)throw new Error('Insufficient rendered headroom');samples.push({eye:p.toArray(),floor:floor.point.y,ceiling:ceiling?.point.y});}
 }};
 steps('w',285);const rear=c.camera.position.toArray();steps('a',30);const lounge=c.camera.position.toArray();steps('d',30);steps('s',305);c.keys.clear();const returned=c.camera.position.toArray();
 if(rear[2]>-39||lounge[0]>18.4||returned[2]<-27)throw new Error('Incomplete real walking route');
 const gl=w.renderer.getContext();const shaderErrors=w.renderer.info.programs.filter(p=>!gl.getProgramParameter(p.program,gl.LINK_STATUS)).length;
 if(shaderErrors||w.nightlife.assets.errors.length)throw new Error('Rendering/asset errors');
 const result={contracts,area:(v.room.maxX-v.room.minX)*(v.room.maxZ-v.room.minZ),rear,lounge,returned,samples,shaderErrors,assets:w.nightlife.assets.errors};await save(prefix+'-spatial-check',result);return{...result,samples:samples.length};
}
export async function audioCheck(prefix='shindo3c'){
 const w=window.__shinmachi,p=w.audio.venuePlayer,original=structuredClone(p.state),result={transport:[],motion:[],zones:[]};
 await w.audio.start();await p.play();await wait(600);
 for(const action of ['next','previous']){const before=p.state.index;await w.audio.controlVenueMusic(action);await wait(500);if(p.state.index!==(before+(action==='next'?1:-1)+p.state.tracks.length)%p.state.tracks.length||p.state.error)throw Error('Track switching failed');result.transport.push({action,index:p.state.index,ready:p.element.readyState});}
 const selected=p.state.index,time=p.state.time;await p.refresh();if(p.state.index!==selected||p.state.time<time-.1)throw Error('Refresh reset the current track');
 w.controller.teleport(new THREE.Vector3(18.85,-1.24,-38.3),new THREE.Vector3(18.35,-1.65,-40.55));
 for(let i=0;i<12;i++){await wait(100);result.motion.push({...w.nightlife.shindo.group.userData.playback,levels:structuredClone(w.audio.venuePlayback)});}
 const a=result.motion[0],b=result.motion.at(-1);if(!b.playing||Math.abs(b.angle-a.angle)<1||!result.motion.some(s=>s.level>.005))throw Error('Playback-driven motion/meter missing');
 p.pause();await wait(450);const paused={...w.nightlife.shindo.group.userData.playback};await wait(250);if(paused.angle!==w.nightlife.shindo.group.userData.playback.angle||w.nightlife.shindo.group.userData.playback.level>.03)throw Error('Paused animation kept running');
 w.audio.toggle();await w.audio.start();if(!p.state.paused)throw Error('Pause did not survive global unmute');result.pause={angle:paused.angle,level:paused.level,survivesMute:true};await p.play();
 for(const [name,eye]of [['street',[19.5,1.82,-26.9]],['stairs',[19.5,.29,-30]],['inside',[18.85,-1.24,-38.3]],['leave',[19.5,1.82,-26.9]]]){
  w.controller.teleport(new THREE.Vector3(...eye),new THREE.Vector3(19,-1,-40));await wait(1000);result.zones.push({name,audio:structuredClone(w.audio.diagnostics)});
 }
 const inside=result.zones[2].audio,outside=result.zones[3].audio,voice=inside.music[0];if(voice.speakerGains.some(v=>v<.01)||voice.roomReflections<.01||inside.ambientTransmission>.14||outside.ambientTransmission<.95||outside.music[0].roomReflections>.003||inside.rms<.00001)throw Error('Speaker/room/ambience mix failed');
 await save(prefix+'-audio-check',result);await p.select(original.index);if(Number.isFinite(original.time))p.element.currentTime=original.time;if(original.paused)p.pause();else await p.play();
 return{tracks:p.state.tracks.length,transport:result.transport,pause:result.pause,motion:result.motion.length,zones:result.zones.map(z=>({name:z.name,ambient:z.audio.ambientTransmission,rms:z.audio.rms,speakers:z.audio.music[0].speakerGains,reflections:z.audio.music[0].roomReflections}))};
}
export async function recordMotion(prefix='shindo3c'){
 const w=window.__shinmachi;await w.audio.start();await w.audio.venuePlayer.play();w.controller.teleport(new THREE.Vector3(18.85,-1.24,-38.3),new THREE.Vector3(18.35,-1.65,-40.55));w.setFov(65);
 const canvas=w.renderer.domElement,stream=canvas.captureStream(30),mime=MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42001E')?'video/mp4;codecs=avc1.42001E':'video/webm',recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4500000}),chunks=[];
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const stopped=new Promise(resolve=>recorder.onstop=resolve);recorder.start();await wait(6000);recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
 const blob=new Blob(chunks,{type:mime.startsWith('video/mp4')?'video/mp4':'video/webm'}),{dataUrl}=await import('./behavior-browser-checks.mjs');
 const metadata={seconds:6,mime,bytes:blob.size,method:'Actual WebGL canvas stream, playback-driven record rotation, level meters and now-playing display. Silent capture; user music is not exported.'};
 const response=await fetch('/__review/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:prefix+'-playback-motion',metadata,[mime.startsWith('video/mp4')?'mp4':'webm']:await dataUrl(blob)})});if(!response.ok)throw Error('Motion capture failed');return metadata;
}
