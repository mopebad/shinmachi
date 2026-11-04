import * as THREE from 'three';
export const views=[
 ['platform-night','overview',20.5,{eye:[42,9.16,-50.3],target:[12,10,-75],fov:64}],
 ['platform-day','overview',13,{eye:[42,9.16,-50.3],target:[12,10,-75],fov:64}],
 ['approach-night','overview',20.5,{eye:[-48,12.2,-63],target:[35,8.5,-53],fov:64}],
 ['rail-street-night','commercial',20.5,{eye:[4.65,1.82,-43],target:[-18,4.7,-57],fov:68}],
 ['entrance-night','station',20.5],['entrance-day','station',13],
 ['overview-day','overview',13,{eye:[65,68,10],target:[4,5,-60],fov:65}],
 ['overview-night','overview',20.5,{eye:[65,68,10],target:[4,5,-60],fov:65}],
 ['hero-night','heroStreet',20.5],
];
export async function save(name,metadata){const r=await fetch('/__review/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,metadata})});if(!r.ok)throw new Error('Save '+r.status);return r.json();}
export async function prepare(){const w=window.__shinmachi;await w.assetsReady;w.setReviewPaused(true);w.setPlaying(false);w.setTime(20.5);w.setWeather('damp');w.setReflections(true);w.setContactShading(true);if(w.activity.simulation.clock>300.001)throw new Error('Reload review URL');while(w.activity.simulation.clock<300-1e-7)w.activity.simulation.update(1/30,20.5);return w;}
export async function captureSet(stage){
 const w=await prepare(),result={stage,clock:w.activity.simulation.clock,captures:[],contracts:{colliders:w.district.colliders,playerColliders:w.district.playerColliders,doors:w.district.doors,shopfronts:w.district.shopfronts,station:w.district.station,lamps:w.district.lamps.map(p=>p.toArray()),navigation:{nodes:w.activity.simulation.navigation.nodes,edges:[...w.activity.simulation.navigation.edges]}},skyline:w.backdrop.group.userData};
 for(const [label,view,hour,framing]of views)result.captures.push(await w.captureBenchmark(`rail-district-${label}-${stage}`,view,hour,framing));
 w.teleport(2);w.setTime(20.5);w.activity.update(0,20.5,w.camera.position);
 const helper=await import('./skyline-browser-checks.mjs');result.cost=await helper.renderCost(w);await save(`rail-district-${stage}-measurements`,result);return{captures:result.captures.length,cost:result.cost,skyline:result.skyline};
}
export async function audit(){
 const w=window.__shinmachi,base=await(await fetch('/quality/rail-district-before-measurements.json')).json(),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),s=w.activity.simulation;
 const group=w.district.group.children.find(g=>g.userData.railDistrict),plan=group.userData.railDistrict;
 const result={contracts:{},parcels:plan.parcels.length,parts:0,triangles:0,trainHits:[],roadHits:[],routeHits:[],unreservedLowParts:[],bodySamples:0,shaderErrors:0};
 for(const key of ['doors','shopfronts','station']){result.contracts[key]=same(base.contracts[key],w.district[key]);if(!result.contracts[key])throw new Error('Changed '+key);}
 result.contracts.lamps=same(base.contracts.lamps,w.district.lamps.map(p=>p.toArray()));result.contracts.navigation=same(base.contracts.navigation,{nodes:s.navigation.nodes,edges:[...s.navigation.edges]});
 const {RAIL_DISTRICT}=await import('../src/world/generation/RailDistrictLayout.ts');
 const samples=[];
 const sample=(a,b)=>{const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/.1));for(let i=0;i<=n;i++){const t=i/n;samples.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});}};
 for(const [id,list]of s.navigation.edges)for(const edge of list)sample(s.navigation.nodes[id],s.navigation.nodes[edge.to]);
 for(const a of s.navigation.station.boardingApproaches)for(let i=1;i<a.path.length;i++)sample(a.path[i-1],a.path[i]);result.bodySamples=samples.length;
 const boxOf=(r)=>new THREE.Box3(new THREE.Vector3(r.minX,r.minY??.15,r.minZ),new THREE.Vector3(r.maxX,r.maxY??4.5,r.maxZ)),train=boxOf(RAIL_DISTRICT.train),roads=[boxOf(RAIL_DISTRICT.mainRoad),boxOf(RAIL_DISTRICT.residentialRoad)];
 const matrix=new THREE.Matrix4();group.updateMatrixWorld(true);
 const check=(box,section)=>{
  result.parts++;if(box.intersectsBox(train))result.trainHits.push({section,box:box.toArray?.()??{min:box.min,max:box.max}});
  if(roads.some(r=>box.intersectsBox(r)))result.roadHits.push({section,min:box.min,max:box.max});
  if(box.max.y>.2)for(const p of samples)if(p.x>box.min.x-.25&&p.x<box.max.x+.25&&p.z>box.min.z-.25&&p.z<box.max.z+.25&&p.y+.08<box.max.y&&p.y+1.75>box.min.y){result.routeHits.push({section,p,min:box.min,max:box.max});break;}
  if(box.min.y<1.8&&box.max.y>.15){
   const contained=w.district.colliders.some(c=>box.min.x>=c.minX-.005&&box.max.x<=c.maxX+.005&&box.min.z>=c.minZ-.005&&box.max.z<=c.maxZ+.005);
   const poster=section==='station-posters'||section.startsWith('Station area guide'),wall=w.district.station.boxes.find(b=>b.id==='ticket-wall');
   const wallAttached=poster&&box.min.x>=wall.minX&&box.max.x<=wall.maxX&&box.min.y>=wall.minY&&box.max.y<=wall.maxY&&box.min.z>=wall.minZ&&box.max.z<=wall.maxZ+.08;
   if(!contained&&!wallAttached)result.unreservedLowParts.push({section,min:box.min,max:box.max});
  }
 };
 group.traverse(mesh=>{if(!mesh.isMesh)return;mesh.geometry.computeBoundingBox();if(mesh.isInstancedMesh){result.triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*mesh.count;for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);if(!matrix.elements.every(Number.isFinite)||matrix.determinant()<=0)throw new Error('Invalid instance');check(mesh.geometry.boundingBox.clone().applyMatrix4(matrix.clone().premultiply(mesh.matrixWorld)),mesh.userData.sections[i]);}}else if(!mesh.name.startsWith('Measured sign'))check(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld),mesh.name);});
 group.traverse(mesh=>{if(!mesh.name.startsWith('Measured sign'))return;const a=mesh.geometry.attributes.position;result.triangles+=(mesh.geometry.index?.count??a.count)/3;for(let i=0;i<a.count;i+=4){const box=new THREE.Box3();for(let j=0;j<4;j++)box.expandByPoint(new THREE.Vector3().fromBufferAttribute(a,i+j).applyMatrix4(mesh.matrixWorld));check(box,'sign-face');}});
 w.district.group.updateMatrixWorld(true);w.district.group.traverse(mesh=>{if(!mesh.isInstancedMesh||mesh.parent===group)return;mesh.geometry.computeBoundingBox();for(let i=0;i<mesh.count;i++)if(mesh.userData.sections?.[i]?.startsWith('rail-pier-')){mesh.getMatrixAt(i,matrix);check(mesh.geometry.boundingBox.clone().applyMatrix4(matrix.clone().premultiply(mesh.matrixWorld)),mesh.userData.sections[i]);}});
 result.allNewCollidersPresent=plan.colliders.every(c=>w.district.colliders.some(b=>same(c,b))&&w.district.playerColliders.some(b=>same(c,b)));
 result.pierCollidersPresent=RAIL_DISTRICT.pierXs.every(x=>w.district.colliders.some(c=>Math.abs(c.minX-(x-.95))<1e-6&&Math.abs(c.maxX-(x+.95))<1e-6));
 result.doorApproaches=s.navigation.station.boardingApproaches.map(a=>({id:a.doorId,clear:a.clear,gap:a.gap,sillError:a.sillError}));
 const gl=w.renderer.getContext();result.shaderErrors=w.renderer.info.programs.filter(p=>!gl.getProgramParameter(p.program,gl.LINK_STATUS)).length;result.assets=w.nightlife.assets.errors;
 await save('rail-district-geometry-audit',result);
 if(Object.values(result.contracts).some(v=>!v)||!result.allNewCollidersPresent||!result.pierCollidersPresent||result.trainHits.length||result.roadHits.length||result.routeHits.length||result.unreservedLowParts.length||result.shaderErrors||result.assets.length||result.doorApproaches.some(a=>!a.clear))throw new Error('Rail district spatial validation failed: '+JSON.stringify(result));return result;
}
export async function exchange(){
 const w=window.__shinmachi,{CitySimulation}=await import('../src/world/simulation/CitySimulation.ts'),{exercisePassengers}=await import('./station3c-validation.mjs');
 const runs=[];for(const config of [{arrivingPassengers:6},{arrivingPassengers:12,stationDemand:.8}]){const sim=new CitySimulation({seed:8412,bounds:w.district.colliders,doors:w.district.doors,station:w.district.station,railPassengers:config});runs.push({config,...exercisePassengers(sim,{seconds:900,drainSeconds:900,hour:20.5})});}
 await save('rail-district-passenger-audit',{runs});return runs.map(({config,arrivals,departures,rail,station,minimumSeparation,wallHits,vehicleExits,remaining})=>({config,arrivals,departures,rail,station,minimumSeparation,wallHits,vehicleExits,remaining}));
}
export async function validateCaptures(){
 const result=[];for(const [label]of views){const a=await(await fetch(`/quality/captures/rail-district-${label}-before.json`)).json(),b=await(await fetch(`/quality/captures/rail-district-${label}-after.json`)).json(),conditions={};for(const key of ['eye','quaternion','fov','seed','hour','simulationClock','surface','reflections','contactShading','width','height','pixelRatio','renderConditions','train','railPassengers','stationPassengers','people','vehicles','driverStates','streetLife','assets']){conditions[key]=JSON.stringify(a[key])===JSON.stringify(b[key]);if(!conditions[key])throw new Error(label+' mismatch '+key);}result.push({label,conditions});}await save('rail-district-capture-audit',{views:result});return result;
}
export async function performanceReview(){
 const w=await prepare();w.teleport(2);w.activity.update(0,20.5,w.camera.position);
 const group=w.district.group.children.find(g=>g.userData.railDistrict),gl=w.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
 const size=w.renderer.getSize(new THREE.Vector2()),aspect=w.camera.aspect;w.renderer.setSize(1323,804,false);w.composer.setSize(1323,804);w.camera.aspect=1323/804;w.camera.updateProjectionMatrix();w.reflections.update(w.camera);
 const runs=[];
 try{for(let i=0;i<8;i++)for(const visible of i%2?[true,false]:[false,true]){
  group.visible=visible;for(let j=0;j<4;j++)w.composer.render(0);gl.finish();const query=ext?gl.createQuery():null;
  if(query)gl.beginQuery(ext.TIME_ELAPSED_EXT,query);const start=performance.now();w.renderer.info.reset();w.composer.render(0);if(query)gl.endQuery(ext.TIME_ELAPSED_EXT);gl.finish();const wallMs=performance.now()-start,stats={...w.stats};
  let gpuMs=null;if(query){for(let j=0;!gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE);j++){if(j>300)throw new Error('GPU timeout');await new Promise(requestAnimationFrame);}if(gl.getParameter(ext.GPU_DISJOINT_EXT))throw new Error('GPU disjoint');gpuMs=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;gl.deleteQuery(query);}runs.push({visible,wallMs,gpuMs,stats});
 }}finally{group.visible=true;w.renderer.setSize(size.x,size.y,false);w.composer.setSize(size.x,size.y);w.camera.aspect=aspect;w.camera.updateProjectionMatrix();}
 const summary=visible=>{const r=runs.filter(r=>r.visible===visible),med=key=>r.map(s=>s[key]).sort((a,b)=>a-b)[4];return{medianWallMs:med('wallMs'),medianGpuMs:ext?med('gpuMs'):null,drawCalls:r[0].stats.drawCalls,triangles:r[0].stats.triangles};};
 const result={viewport:[1323,804],clock:w.activity.simulation.clock,view:'station',hour:20.5,gpuTimerSupported:!!ext,withContext:summary(true),withoutContext:summary(false),runs,method:'Eight alternating on/off pairs; four warmups per sample. Current revised piers remain in both. Same simulation and camera; gl.finish wall cost and EXT_disjoint_timer_query_webgl2 GPU cost. Off is an isolation measurement, not the historic before scene.'};await save('rail-district-performance',result);return result;
}
