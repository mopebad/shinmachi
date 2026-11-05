import * as THREE from 'three';
import {prepare} from './shindo3e-browser-checks.mjs';
import {save} from './rail-district-browser-checks.mjs';
export const views=[
 ['exterior',[20.6,1.82,-24.9],[19.35,1.35,-27.9],64],
 ['top',[19.5,1.82,-27.1],[19.5,-1.2,-31.3],64],
 ['bottom',[19.5,-1.24,-33.65],[19.5,.1,-29.6],66],
 ['door-zone',[18.85,-1.24,-35.75],[19.32,-1.52,-32.92],66],
 ['door-detail',[18.95,-1.24,-34.42],[20.26,-1.35,-33.29],58],
 ['context',[18.9,-1.24,-38.25],[19.4,-1.5,-33.15],68],
];
export async function captureSet(stage){
 const w=await prepare();
 if(stage==='before')await save('shindo4c-baseline',{clock:w.activity.simulation.clock,colliders:w.district.colliders,doors:w.district.doors,station:w.district.station,venue:w.nightlife.venue});
 for(const [name,eye,target,fov]of views)await w.captureBenchmark('shindo4c-'+name+'-'+stage,'nightlife',21,{eye,target,fov});
 return {captures:views.length,clock:w.activity.simulation.clock};
}
export async function validate(){
 const comparisons=[];
 for(const [name]of views){
  const a=await(await fetch('/quality/captures/shindo4c-'+name+'-before.json')).json(),b=await(await fetch('/quality/captures/shindo4c-'+name+'-after.json')).json();
  for(const key of ['eye','quaternion','fov','seed','hour','simulationClock','surface','reflections','contactShading','width','height','pixelRatio','renderConditions'])if(JSON.stringify(a[key])!==JSON.stringify(b[key]))throw Error('Capture conditions differ: '+name+' '+key);
  comparisons.push(name);
 }
 const w=window.__shinmachi,scene=w.nightlife.authored.scenes.get('shindo');
 if(scene.errors.length)throw Error(scene.errors.join(';'));
 const {spatialCheck}=await import('./shindo3c-browser-checks.mjs');
 const walk=await spatialCheck('shindo4c');
 // Check the rendered route across its width, not just the player's centre line.
 const solids=[];w.scene.updateMatrixWorld(true);w.scene.traverse(o=>{if(o.isMesh&&!o.material?.transparent)solids.push(o);});
 const ray=new THREE.Raycaster(),clearance=[];
 for(const s of w.nightlife.venue.surfaces.filter(s=>s.id.startsWith('tread'))){
  const z=(s.minZ+s.maxZ)/2;
  for(const x of [19.1,19.5,19.9]){
   ray.set(new THREE.Vector3(x,s.y+.13,z),new THREE.Vector3(0,-1,0));ray.far=.3;
   const hit=ray.intersectObjects(solids,false)[0];if(!hit||Math.abs(hit.point.y-s.y)>.008)throw Error('Tread support changed');
   ray.set(new THREE.Vector3(x,s.y+1.705,z),new THREE.Vector3(0,1,0));ray.far=4;
   const ceiling=ray.intersectObjects(solids,false)[0];if(ceiling&&ceiling.distance<.4)throw Error('Stair headroom obstructed');
   clearance.push({x,z,headroom:ceiling?ceiling.point.y-s.y:null});
  }
 }
 for(const x of [19.1,19.5,19.9])for(const height of [.3,1.1,1.8,2.1]){
  ray.set(new THREE.Vector3(x,w.nightlife.venue.floorY+height,-34.0),new THREE.Vector3(0,0,1));ray.far=1.3;
  if(ray.intersectObjects(solids,false).length)throw Error('Public landing throat obstructed');
 }
 const signs=[];
 w.nightlife.group.traverse(mesh=>{
  if(!mesh.isInstancedMesh||!mesh.material.userData.signTheme)return;
  const matrix=new THREE.Matrix4(),p=new THREE.Vector3();
  for(let i=0;i<mesh.count;i++){
   mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);p.setFromMatrixPosition(matrix);
   if(p.y<-.3&&p.x>=15.95&&p.x<=20.4&&p.z>=-41.05&&p.z<=-32.64){
    const theme=mesh.material.userData.signTheme;
    if(!theme.startsWith('shindo-'))throw Error('Foreign/fallback interior sign: '+theme);
    signs.push({theme,position:p.toArray(),normal:new THREE.Vector3(0,0,1).transformDirection(matrix).toArray()});
   }
  }
 });
 const exit=signs.find(s=>s.theme==='shindo-exit'),arrival=signs.find(s=>s.theme==='shindo-arrival');
 if(!exit||!arrival||exit.normal[2]>-.99||arrival.normal[2]<.99)throw Error('Entry/exit wayfinding reversed');
 const railBounds=[];
 w.nightlife.group.traverse(mesh=>{
  if(!mesh.isInstancedMesh||!mesh.userData.sceneOwners)return;
  const matrix=new THREE.Matrix4(),p=new THREE.Vector3();
  mesh.userData.sceneOwners.forEach((id,i)=>{
   if(!/stair-lamp-|stair-dado/.test(id))return;
   mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);
   const a=mesh.geometry.attributes.position;
   for(let j=0;j<a.count;j++){
    p.fromBufferAttribute(a,j).applyMatrix4(matrix);
    if(p.x>18.742&&p.x<20.258)throw Error('Wall fitting enters protected stair aisle');
   }
   railBounds.push(id);
  });
 });
 const result={comparisons,walk,clearance,signs,railFittings:[...new Set(railBounds)],authoredErrors:scene.errors};await save('shindo4c-validation',result);return result;
}
