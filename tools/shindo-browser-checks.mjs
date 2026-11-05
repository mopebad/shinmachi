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
 ['detail',[17.85,-1.24,-38.22],[16.25,-1.22,-36.78],56],
];
export async function prepare(){
 const w=window.__shinmachi;await w.assetsReady;w.setReviewPaused(true);w.setPlaying(false);w.setTime(21);w.setWeather('damp');w.setReflections(true);
 const baseline=await(await fetch('/quality/captures/shindo3b-entrance-before.json')).json();
 if(w.activity.simulation.clock>baseline.simulationClock+.001)throw new Error('Reload with review=1');
 while(w.activity.simulation.clock<baseline.simulationClock-1e-7)w.activity.simulation.update(1/30,21);
 return w;
}
export async function captureSet(){
 const w=await prepare();for(const [name,eye,target,fov]of views)await w.captureBenchmark('shindo3b-'+name+'-after','nightlife',21,{eye,target,fov});
 const comparisons=[];
 for(const name of ['entrance','stairs','overview']){
  const a=await(await fetch('/quality/captures/shindo3b-'+name+'-before.json')).json(),b=await(await fetch('/quality/captures/shindo3b-'+name+'-after.json')).json();
  const keys=['eye','quaternion','fov','seed','hour','simulationClock','surface','reflections','contactShading','width','height','pixelRatio','renderConditions'];
  for(const key of keys)if(JSON.stringify(a[key])!==JSON.stringify(b[key]))throw new Error('Capture condition changed: '+name+' '+key);
  comparisons.push({name,identicalConditions:keys});
 }
 const [,eye,target,fov]=views[3];w.controller.teleport(new THREE.Vector3(...eye),new THREE.Vector3(...target));w.setFov(fov);w.activity.update(0,21,w.camera.position);
 const cost=await(await import('./skyline-browser-checks.mjs')).renderCost(w);await save('shindo3b-after-metrics',{cost,comparisons,clock:w.activity.simulation.clock});return{captures:views.length,cost,comparisons};
}
export async function spatialCheck(){
 const w=window.__shinmachi;await w.assetsReady;const v=w.nightlife.venue,c=w.controller,baseline=await(await fetch('/quality/shindo3b-before-metrics.json')).json();
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
 const result={contracts,area:(v.room.maxX-v.room.minX)*(v.room.maxZ-v.room.minZ),rear,lounge,returned,samples,shaderErrors,assets:w.nightlife.assets.errors};await save('shindo3b-spatial-check',result);return{...result,samples:samples.length};
}
/** Run after enabling sound via a real UI gesture; validates actual media decoding and the shared mix. */
export async function audioCheck(){
 const w=window.__shinmachi,p=w.audio.venuePlayer,result={};await p.refresh();if(p.state.tracks.length!==2)throw new Error('Two local validation tracks expected');
 await w.audio.controlVenueMusic('select',0);await p.play();await wait(650);result.first=structuredClone(p.state);
 await w.audio.controlVenueMusic('next');await wait(650);result.next=structuredClone(p.state);
 await w.audio.controlVenueMusic('previous');await wait(400);result.previous=structuredClone(p.state);
 await w.audio.controlVenueMusic('toggle');const pausedAt=p.element.currentTime;await wait(350);result.paused=structuredClone(p.state);
 w.audio.toggle();await w.audio.start();await wait(350);result.unmuted=structuredClone(p.state);
 if(!p.element.paused||Math.abs(pausedAt-p.element.currentTime)>.05)throw new Error('Pause did not survive global mute/unmute');
 await w.audio.controlVenueMusic('toggle');await wait(300);p.element.currentTime=p.element.duration-.2;await wait(900);result.automatic=structuredClone(p.state);
 if(result.first.index!==0||result.next.index!==1||result.previous.index!==0||result.automatic.index!==1||p.element.paused||p.element.readyState<3||p.state.error)throw new Error('Local track transport/automatic progression failed');
 result.zones=[];
 for(const [name,eye]of [['street',[19.5,1.82,-26.9]],['stairs',[19.5,.29,-30]],['inside',[18.85,-1.24,-38.3]],['leave',[19.5,1.82,-26.9]]]){
  w.controller.teleport(new THREE.Vector3(...eye),new THREE.Vector3(19,-1,-40));await wait(850);result.zones.push({name,eye:w.camera.position.toArray(),audio:structuredClone(w.audio.diagnostics)});
 }
 if(result.zones[2].audio.rms<=.00001||result.zones[2].audio.music[0].gainInside<.2||result.zones[3].audio.music[0].gainInside>.01)throw new Error('Spatial music transition failed');
 await save('shindo3b-audio-check',result);return{tracks:p.state.tracks,first:result.first.index,next:result.next.index,previous:result.previous.index,paused:result.paused.paused,pauseSurvivesMute:result.unmuted.paused,automatic:result.automatic.index,zones:result.zones.map(z=>({name:z.name,rms:z.audio.rms,mix:z.audio.music[0].mix}))};
}
