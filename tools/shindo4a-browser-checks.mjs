import {prepare} from './shindo3e-browser-checks.mjs';
import {save} from './rail-district-browser-checks.mjs';
import * as THREE from 'three';
export const views=[
 ['overall',[19.6,-1.24,-33.4],[18.7,-1.4,-37.8],68],
 ['counter',[19.05,-1.24,-35.1],[17.1,-1.65,-35.8],62],
 ['backbar',[17.0,-1.24,-37.6],[16.12,-1.32,-35.55],66],
 ['music',[18.85,-1.24,-38.3],[18.35,-1.65,-40.55],65],
 ['lounge',[18.77,-1.24,-37.8],[16.3,-1.9,-39.45],65],
 ['entrance',[19.5,-1.24,-32.95],[18.75,-1.4,-37.2],68],
];
export async function captureSet(stage){
 const w=await prepare();
 if(stage==='before')await save('shindo4a-baseline',{clock:w.activity.simulation.clock,colliders:w.district.colliders,doors:w.district.doors,station:w.district.station,venue:w.nightlife.venue});
 for(const [name,eye,target,fov]of views)await w.captureBenchmark('shindo4a-'+name+'-'+stage,'nightlife',21,{eye,target,fov});
 return {captures:views.length,clock:w.activity.simulation.clock};
}
export async function compare(){
 const comparisons=[];
 for(const [name]of views){
  const a=await(await fetch('/quality/captures/shindo4a-'+name+'-before.json')).json(),b=await(await fetch('/quality/captures/shindo4a-'+name+'-after.json')).json();
  for(const key of ['eye','quaternion','fov','seed','hour','simulationClock','surface','reflections','contactShading','width','height','pixelRatio','renderConditions'])if(JSON.stringify(a[key])!==JSON.stringify(b[key]))throw Error('Capture conditions differ: '+name+' '+key);
  comparisons.push({name,identicalConditions:true});
 }
 const w=window.__shinmachi,errors=[...w.nightlife.authored.scenes.values()].flatMap(s=>s.errors);
 if(errors.length)throw Error(errors.join(';'));
 const {spatialCheck}=await import('./shindo3c-browser-checks.mjs');
 const walk=await spatialCheck('shindo4a');
 // Validate the actual transformed vertices, including piped upholstery and duct covers.
 const scene=w.nightlife.authored.scenes.get('shindo'),bounds={};
 for(const mesh of scene.meshes){
  const matrix=new THREE.Matrix4(),p=new THREE.Vector3();
  mesh.userData.sceneOwners.forEach((id,i)=>{
   if(!/cushion|duct-collar|service-cabinets/.test(id))return;
   mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);
   const box=bounds[id]??new THREE.Box3();
   const vertices=mesh.geometry.attributes.position;
   for(let j=0;j<vertices.count;j++)box.expandByPoint(p.fromBufferAttribute(vertices,j).applyMatrix4(matrix));
   bounds[id]=box;
  });
 }
 const f=w.nightlife.venue.floorY;
 for(const [id,box]of Object.entries(bounds)){
  if(id.includes('cushion')){
   const east=id.startsWith('east'),lo=east?19.80:16.02,hi=east?20.34:16.59;
   if(box.min.x<lo||box.max.x>hi||box.min.y<f+.4)throw Error('Upholstery outside fixed furniture footprint: '+id);
  }
  if(id.startsWith('duct-collar')&&box.min.y<f+2.1)throw Error('Duct fitting below required headroom');
  if(id==='service-cabinets'&&box.max.x>16.45)throw Error('Service fittings obstruct staff aisle');
 }
 // The sink aperture must expose the real basin, rather than the old solid lower shelf.
 const solids=[];w.scene.traverse(o=>{if(o.isMesh&&!o.material?.transparent)solids.push(o);});
 const ray=new THREE.Raycaster(new THREE.Vector3(16.19,f+1.15,-37.25),new THREE.Vector3(0,-1,0),0,.5);
 const basin=ray.intersectObjects(solids,false)[0];
 if(!basin||basin.point.y>f+.92||basin.point.y<f+.86)throw Error('Inset basin aperture blocked');
 const result={comparisons,walk,authoredErrors:errors,sources:w.nightlife.authored.registry.sourceCount,bounds,basinY:basin.point.y};
 await save('shindo4a-validation',result);return result;
}
