import * as THREE from 'three';
import {save} from './rail-district-browser-checks.mjs';
export const views=[
 ['top',[19.5,1.82,-27.1],[19.5,-1.2,-31.3],64],
 ['mid',[19.5,.29,-30.0],[19.5,-1.6,-33.35],64],
 ['bottom',[19.5,-1.24,-32.95],[18.75,-1.4,-37.2],68],
 ['interior',[19.25,-1.24,-34.5],[17.6,-1.35,-38.8],64],
];
export async function prepare(){
 const w=window.__shinmachi;await w.assetsReady;w.setReviewPaused(true);w.setPlaying(false);w.setTime(21);w.setWeather('damp');w.setReflections(true);w.setContactShading(true);
 if(w.activity.simulation.clock>300.001)throw Error('Reload with review=1');while(w.activity.simulation.clock<300-1e-7)w.activity.simulation.update(1/30,21);return w;
}
export async function captureSet(stage){
 const w=await prepare();if(stage==='before')await save('shindo3e-baseline',{clock:w.activity.simulation.clock,colliders:w.district.colliders,doors:w.district.doors,station:w.district.station,venue:w.nightlife.venue});
 for(const [name,eye,target,fov]of views)await w.captureBenchmark('shindo3e-'+name+'-'+stage,'nightlife',21,{eye,target,fov});return{captures:views.length,clock:w.activity.simulation.clock};
}
export async function diagnostics(){
 const w=await prepare(),[,eye,target,fov]=views[1];
 w.setContactShading(false);await w.captureBenchmark('shindo3e-mid-diagnostic-no-ao','nightlife',21,{eye,target,fov});
 const meshes=[];w.scene.traverse(o=>{if(o.isMesh){meshes.push([o,o.castShadow,o.receiveShadow]);o.castShadow=o.receiveShadow=false;}});w.renderer.shadowMap.needsUpdate=true;
 try{await w.captureBenchmark('shindo3e-mid-diagnostic-no-shadows','nightlife',21,{eye,target,fov});}
 finally{for(const [o,cast,receive]of meshes){o.castShadow=cast;o.receiveShadow=receive;}w.renderer.shadowMap.needsUpdate=true;w.setContactShading(true);}
 return{captures:2};
}
export function frame(name){const w=window.__shinmachi,[,eye,target,fov]=views.find(v=>v[0]===name);w.controller.setMode('walk');w.controller.teleport(new THREE.Vector3(...eye),new THREE.Vector3(...target));w.setFov(fov);}

export async function audit(){
 const w=window.__shinmachi,v=w.nightlife.venue,result={wallRays:[],slabFaces:[],grips:[],comparisons:[]};w.scene.updateMatrixWorld(true);
 const solids=[];w.scene.traverse(o=>{if(o.isMesh&&!o.material?.transparent)solids.push(o);});const ray=new THREE.Raycaster();
 // Sample both former slab bands. The first visible surface must be plaster, never an asphalt/terrain cut face.
 for(const z of [-28.55,-29.25,-30.35,-31.65])for(const y of [-.12,-.32])for(const side of [-1,1]){
  ray.set(new THREE.Vector3(19.5,y,z),new THREE.Vector3(side,0,0));ray.far=1.3;
  const hit=ray.intersectObjects(solids,false)[0];if(!hit||hit.object.material!==w.nightlife.materials.shindoWall)throw Error('Exposed slab or fitting at wall sample '+JSON.stringify({z,y,side,material:hit?.object.material?.color}));
  result.wallRays.push({z,y,side,x:hit.point.x});
 }
 for(const [name,root]of [['city',w.district.group],['backdrop',w.backdrop.group]])root.traverse(mesh=>{
  if(!mesh.isInstancedMesh)return;mesh.geometry.computeBoundingBox();const matrix=new THREE.Matrix4();
  for(let i=0;i<mesh.count;i++){
   mesh.getMatrixAt(i,matrix);const b=mesh.geometry.boundingBox.clone().applyMatrix4(matrix.clone().premultiply(mesh.matrixWorld));
   if(name==='city'&&Math.abs(b.min.y+.22)<.001&&Math.abs(b.max.y+.02)<.001||name==='backdrop'&&mesh.userData.sections?.[i]==='ground')result.slabFaces.push({name,min:b.min.toArray(),max:b.max.toArray()});
  }
 });
 for(const name of ['city','backdrop']){
  const slabs=result.slabFaces.filter(b=>b.name===name),c=v.slabOpening;if(slabs.length!==4)throw Error('Missing split slabs');
  for(const [index,axis,value]of [[0,0,c.minX],[1,0,c.maxX],[2,2,c.minZ],[3,2,c.maxZ]])if(Math.abs((index%2?slabs[index].min:slabs[index].max)[axis]-value)>.001)throw Error('Slab aperture differs from shared contract');
 }
 w.nightlife.group.traverse(mesh=>{if(!mesh.isInstancedMesh||mesh.material!==w.nightlife.materials.brass||mesh.geometry.type!=='CylinderGeometry')return;const matrix=new THREE.Matrix4(),scale=new THREE.Vector3();
  for(let i=0;i<mesh.count;i++){if(mesh.userData.sections?.[i]!=='shindo:stair-fittings')continue;mesh.getMatrixAt(i,matrix);scale.setFromMatrixScale(matrix);if(scale.y>5)result.grips.push({x:matrix.elements[12],length:scale.y,radius:scale.x});}
 });
 if(result.grips.length!==2)throw Error('Duplicate/missing long handrails');
 for(const [name]of views){const a=await(await fetch('/quality/captures/shindo3e-'+name+'-before.json')).json(),b=await(await fetch('/quality/captures/shindo3e-'+name+'-after.json')).json();
  for(const key of ['eye','quaternion','fov','seed','hour','simulationClock','surface','reflections','contactShading','width','height','pixelRatio','renderConditions'])if(JSON.stringify(a[key])!==JSON.stringify(b[key]))throw Error('Capture condition changed: '+name+' '+key);result.comparisons.push(name);
 }
 if(!w.contactShading.enabled||w.camera.near!==.08)throw Error('Rendering workaround detected');
 const {spatialCheck}=await import('./shindo3c-browser-checks.mjs');result.walk=await spatialCheck('shindo3e');await save('shindo3e-validation',result);return{wallRays:result.wallRays.length,slabFaces:result.slabFaces.length,grips:result.grips,comparisons:result.comparisons,walk:result.walk};
}

export async function recordWalk(){
 const w=window.__shinmachi;await w.assetsReady;w.setReviewPaused(true);w.setPlaying(false);w.setTime(21);w.setContactShading(true);
 const c=w.controller;c.setMode('walk');c.teleport(new THREE.Vector3(19.5,1.82,-26.95),new THREE.Vector3(19.5,-1.1,-31.4));w.setFov(64);
 const stream=w.renderer.domElement.captureStream(30),mime='video/mp4;codecs=avc1.42001E',recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4500000}),chunks=[],samples=[];
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const stopped=new Promise(resolve=>recorder.onstop=resolve);recorder.start();
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 try{
  await wait(500);c.keys.add('w');const start=performance.now();
  while(c.camera.position.z> -33.7){if(performance.now()-start>8000)throw Error('Descent blocked/hidden');samples.push({eye:c.camera.position.toArray()});await wait(60);}
  c.keys.clear();await wait(600);c.pitch=0;await wait(600);
  c.keys.add('s');while(c.camera.position.z< -26.8){if(performance.now()-start>15000)throw Error('Return blocked/hidden');samples.push({eye:c.camera.position.toArray()});await wait(60);}c.keys.clear();await wait(400);
 }finally{c.keys.clear();recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());}
 const {dataUrl}=await import('./behavior-browser-checks.mjs'),blob=new Blob(chunks,{type:'video/mp4'}),metadata={method:'Actual walking controller + live WebGL, 64 degree gameplay lens; no traversal teleports. Silent recording, personal music not exported.',mime,bytes:blob.size,samples};
 const response=await fetch('/__review/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'shindo3e-descent-motion',mp4:await dataUrl(blob),metadata})});if(!response.ok)throw Error('Recording save failed');return{bytes:blob.size,samples:samples.length,returned:c.camera.position.toArray()};
}
