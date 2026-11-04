import * as THREE from 'three';

export const views = [
  ['hero-night','heroStreet',20.5], ['hero-day','heroStreet',13],
  ['tower-night','tower',20.5], ['tower-day','tower',13],
  ['railway-night','elevatedRail',20.5], ['overview-night','overview',20.5],
  ['overview-day','overview',13],
  ['occlusion-night','commercial',20.5,{eye:[-4.6,1.82,-16],target:[-10,12,-200],fov:58}],
];
export async function save(name,metadata){const r=await fetch('/__review/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,metadata})});if(!r.ok)throw new Error('Save '+r.status);return r.json();}
export async function prepare(){const w=window.__shinmachi;await w.assetsReady;w.setReviewPaused(true);w.setPlaying(false);w.setWeather('damp');w.setReflections(true);w.setContactShading(true);w.setTime(20.5);w.teleport(8);const sim=w.activity.simulation;if(sim.clock>300.001)throw new Error('Reload review URL before replay');while(sim.clock<300-1e-7)sim.update(1/30,20.5);w.activity.update(0,20.5,w.camera.position);return w;}
export async function renderCost(w){
  const size=w.renderer.getSize(new THREE.Vector2()),aspect=w.camera.aspect;
  w.renderer.setSize(1323,804,false);w.composer.setSize(1323,804);w.camera.aspect=1323/804;w.camera.updateProjectionMatrix();w.reflections.update(w.camera);
  const gl=w.renderer.getContext(),values=[];for(let i=0;i<38;i++){gl.finish();const t=performance.now();w.renderer.info.reset();w.composer.render(0);gl.finish();if(i>=8)values.push(performance.now()-t);}
  values.sort((a,b)=>a-b);const result={viewport:w.renderer.getSize(new THREE.Vector2()).toArray(),pixelRatio:w.renderer.getPixelRatio(),medianMs:values[15],p95Ms:values[28],stats:w.stats,method:'30 synchronous composite renders after 8 warmups, gl.finish; CPU+GPU composite wall time, not GPU-only'};
  w.renderer.setSize(size.x,size.y,false);w.composer.setSize(size.x,size.y);w.camera.aspect=aspect;w.camera.updateProjectionMatrix();return result;
}
export async function captureSet(stage){
  const w=await prepare(),captures=[];
  for(const [label,view,hour,framing]of views)captures.push(await w.captureBenchmark(`skyline-${label}-${stage}`,view,hour,framing));
  w.teleport(8);w.setTime(20.5);w.activity.update(0,20.5,w.camera.position);
  const result={stage,clock:w.activity.simulation.clock,captures,cost:await renderCost(w),backdrop:w.backdrop.group.userData,contracts:{colliders:w.district.colliders,playerColliders:w.district.playerColliders,doors:w.district.doors,shopfronts:w.district.shopfronts,lamps:w.district.lamps.map(p=>p.toArray()),station:w.district.station,stats:w.district.stats},actors:{people:w.activity.simulation.pedestrians,vehicles:w.activity.simulation.vehicles}};
  // Keep actor snapshots finite and independent of object graphs.
  result.actors={people:result.actors.people.map(p=>({active:p.active,id:p.id,x:p.x,y:p.y,z:p.z})),vehicles:result.actors.vehicles.map(c=>({active:c.active,spawn:c.spawn,x:c.x,z:c.z,speed:c.speed}))};
  await save(`skyline-${stage}-measurements`,result);return{stage,captures:captures.length,cost:result.cost};
}
export async function validate(){
  const w=window.__shinmachi,baseline=await(await fetch('/quality/skyline-before-measurements.json')).json(),after=await(await fetch('/quality/skyline-after-measurements.json')).json(),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),result={contracts:{},actors:same(baseline.actors,after.actors),captures:[],geometry:{parts:0,buildingParts:0,railParts:0,triangles:0,intersections:[]},shaderErrors:0};
  for(const key of Object.keys(baseline.contracts)){result.contracts[key]=same(baseline.contracts[key],after.contracts[key]);if(!result.contracts[key])throw new Error('Contract changed '+key);}
  for(const [label]of views){const before=await(await fetch(`/quality/captures/skyline-${label}-before.json`)).json(),final=await(await fetch(`/quality/captures/skyline-${label}-after.json`)).json();const conditions={};for(const key of ['eye','quaternion','fov','seed','hour','simulationClock','surface','reflections','contactShading','width','height','pixelRatio','renderConditions']){conditions[key]=same(before[key],final[key]);if(!conditions[key])throw new Error('Capture mismatch '+label+' '+key);}result.captures.push({label,conditions});}
  const matrix=new THREE.Matrix4();w.backdrop.group.updateMatrixWorld(true);
  w.backdrop.group.traverse(mesh=>{if(!mesh.isInstancedMesh)return;mesh.geometry.computeBoundingBox();result.geometry.triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*mesh.count;
    for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);if(!matrix.elements.every(Number.isFinite)||matrix.determinant()<=0)throw new Error('Invalid matrix');result.geometry.parts++;const section=mesh.userData.sections[i];if(section==='rail-continuation')result.geometry.railParts++;if(!section.startsWith('building:'))continue;result.geometry.buildingParts++;const box=mesh.geometry.boundingBox.clone().applyMatrix4(matrix.clone().premultiply(mesh.matrixWorld));for(const c of w.district.colliders)if(box.min.x<c.maxX&&box.max.x>c.minX&&box.min.z<c.maxZ&&box.max.z>c.minZ)result.geometry.intersections.push({section,collider:c});}
  });
  const gl=w.renderer.getContext();result.shaderErrors=w.renderer.info.programs.filter(p=>!gl.getProgramParameter(p.program,gl.LINK_STATUS)).length;result.assets=w.nightlife.assets.errors;result.backdrop=w.backdrop.group.userData;
  if(result.geometry.intersections.length||result.shaderErrors||result.assets.length||!result.actors)throw new Error('Geometry, assets, shaders or deterministic actor replay failed');await save('skyline-validation',result);return{contracts:result.contracts,actors:result.actors,captures:result.captures.length,geometry:result.geometry,shaderErrors:result.shaderErrors,backdrop:result.backdrop};
}
export async function gpuCost(){
  const w=window.__shinmachi,gl=w.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');if(!ext){await save('skyline-gpu-cost',{supported:false});return{supported:false};}
  w.setReviewPaused(true);const samples=[];
  for(let i=0;i<12;i++){const query=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,query);w.composer.render(0);gl.endQuery(ext.TIME_ELAPSED_EXT);for(let attempt=0;!gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE);attempt++){if(attempt>300)throw new Error('GPU query timeout');await new Promise(resolve=>requestAnimationFrame(resolve));}if(gl.getParameter(ext.GPU_DISJOINT_EXT))throw new Error('Disjoint GPU timing');samples.push(gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6);gl.deleteQuery(query);}
  samples.sort((a,b)=>a-b);const result={supported:true,medianMs:samples[6],p95Ms:samples[11],samples,viewport:w.renderer.getSize(new THREE.Vector2()).toArray(),pixelRatio:w.renderer.getPixelRatio(),clock:w.activity.simulation.clock,method:'EXT_disjoint_timer_query_webgl2, 12 whole composer GPU queries; no disjoint samples'};await save('skyline-gpu-cost',result);return result;
}
