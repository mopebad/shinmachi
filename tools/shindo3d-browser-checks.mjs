import * as THREE from 'three';
import {views as previousViews} from './shindo3c-browser-checks.mjs';
import {SHINDO_CONTROLS,SHINDO_PANEL} from '../src/world/generation/ShindoConsole.ts';
import {YOTO_VENUE} from '../src/world/generation/YotoVenueLayout.ts';
import {save} from './rail-district-browser-checks.mjs';
export {spatialCheck,audioCheck,recordMotion} from './shindo3c-browser-checks.mjs';
export const views=[...previousViews,
 ['signage',[18.9,-1.24,-39.7],[18.96,-1.065,-40.79],48],
 ['drinks',[18.78,-1.24,-35.05],[17.56,-1.69,-34.55],43],
 ['interaction',[18.94,-1.24,-39.3],[18.94,YOTO_VENUE.floorY+.81,-40.012],60],
];
export function aim(action='toggle',z=-39.3){
 const w=window.__shinmachi,button=SHINDO_CONTROLS.find(c=>c.action===action),f=YOTO_VENUE.floorY;
 w.controller.setMode('walk');w.controller.teleport(new THREE.Vector3(button.x,f+1.705,z),new THREE.Vector3(button.x,f+SHINDO_PANEL.yAboveFloor,SHINDO_PANEL.z));w.setFov(60);w.renderer.domElement.focus();
}
export function obstruction(){
 const w=window.__shinmachi,o=new THREE.Mesh(new THREE.BoxGeometry(.9,.8,.08),new THREE.MeshBasicMaterial({color:0x3d332a}));
 o.name='temporary interaction regression obstruction';o.position.set(18.94,YOTO_VENUE.floorY+1.1,-39.8);w.scene.add(o);return o;
}
export function projected(action){
 const w=window.__shinmachi,o=w.nightlife.shindo.controls.find(c=>c.userData.shindoAction===action),p=o.position.clone().project(w.camera),r=w.renderer.domElement.getBoundingClientRect();
 return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};
}
export async function captureSet(){
 const w=window.__shinmachi;await w.assetsReady;w.setReviewPaused(true);w.setPlaying(false);w.setTime(21);w.setWeather('damp');w.setReflections(true);
 const baseline=await(await fetch('/quality/shindo3d-baseline.json')).json();
 if(w.activity.simulation.clock>baseline.clock+.001)throw Error('Reload with review=1');
 while(w.activity.simulation.clock<baseline.clock-1e-7)w.activity.simulation.update(1/30,21);
 for(const [name,eye,target,fov]of views)await w.captureBenchmark('shindo3d-'+name+'-after','nightlife',21,{eye,target,fov});
 const comparisons=[];
 for(const name of ['overview','bar','music','hero']){
  const a=await(await fetch('/quality/captures/shindo3d-'+name+'-before.json')).json(),b=await(await fetch('/quality/captures/shindo3d-'+name+'-after.json')).json();
  const keys=['eye','quaternion','fov','seed','hour','simulationClock','surface','reflections','contactShading','width','height','pixelRatio','renderConditions'];
  for(const key of keys)if(JSON.stringify(a[key])!==JSON.stringify(b[key]))throw Error('Capture condition changed: '+name+' '+key);
  comparisons.push({name,identicalConditions:keys});
 }
 const [,eye,target,fov]=views[3];w.controller.teleport(new THREE.Vector3(...eye),new THREE.Vector3(...target));w.setFov(fov);w.activity.update(0,21,w.camera.position);
 const cost=await(await import('./skyline-browser-checks.mjs')).renderCost(w);await save('shindo3d-after-metrics',{cost,comparisons,clock:w.activity.simulation.clock});
 return{captures:views.length,cost};
}
