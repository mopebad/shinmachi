import * as THREE from 'three';
import {save,renderCost} from './skyline-browser-checks.mjs';
export const views=[
 ['shindo',[19.05,-1.24,-35.1],[17.5,-1.75,-36],62],
 ['music',[18.4,-1.24,-39.25],[18.2,-1.77,-40.48],50],
 ['yoto',[-14.5,1.82,-23.9],[-14.6,2.6,-27.6],72],
 ['yoto-detail',[-16.7,1.82,-24.7],[-17.25,1.8,-27.5],55],
];
export async function prepare(){const w=window.__shinmachi;await w.assetsReady;w.setReviewPaused(true);w.setPlaying(false);w.setTime(21);w.setWeather('damp');w.setReflections(true);w.setContactShading(true);while(w.activity.simulation.clock<300-1e-7)w.activity.simulation.update(1/30,21);return w;}
export async function capture(stage){const w=await prepare();if(stage==='before')await save('workflow2-baseline',{clock:w.activity.simulation.clock,colliders:w.district.colliders,doors:w.district.doors,station:w.district.station,venue:w.nightlife.venue});for(const [name,eye,target,fov]of views)await w.captureBenchmark('workflow2-'+name+'-'+stage,'nightlife',21,{eye,target,fov});const result={cost:await renderCost(w)};await save('workflow2-'+stage+'-metrics',result);return result;}
export async function validate(){
 const w=window.__shinmachi;await w.assetsReady;const yoto=w.authoredEnvironments.scenes.get('yoto'),ray=new THREE.Raycaster(),result={anchors:[],clearRoutes:0,placements:[],sourceCount:w.authoredEnvironments.registry.sourceCount};
 for(const [id,s]of w.authoredEnvironments.scenes){if(s.errors.length)throw Error(s.errors.join('\n'));s.group.updateMatrixWorld(true);for(const n of s.document.nodes)if(n.collision){w.validateAuthoringPlacement(s,n.id);result.placements.push(id+'/'+n.id);}for(const mesh of s.meshes){const m=new THREE.Matrix4();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);if(!m.elements.every(Number.isFinite)||m.determinant()<=0)throw Error('Invalid instance transform');}}}
 const route=(a,b)=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),length=start.distanceTo(end);ray.set(start,end.sub(start).normalize());ray.far=length;const hit=ray.intersectObjects(yoto.meshes,false).find(h=>!h.object.material.transparent);if(hit)throw Error('Authored geometry blocks approach '+JSON.stringify({a,b,owner:hit.object.userData.sceneOwners[hit.instanceId]}));result.clearRoutes++;};
 for(let i=0;i<2;i++){const generated=w.nightlife.group.userData.neighborhoods.frontages[i],origin=yoto.objects.get('frontage-'+i).getWorldPosition(new THREE.Vector3());if(origin.distanceTo(new THREE.Vector3(generated.x,0,generated.z))>.00001)throw Error('Generated parcel drift');result.anchors.push(origin.toArray());const door=w.district.doors.find(d=>Math.abs(d.x-(generated.x+generated.width*.23))<.001&&Math.abs(d.z-(generated.z+.87))<.001);if(!door)throw Error('Missing authoritative business entrance');for(const y of [.25,1.1,1.7])for(const offset of [-.23,0,.23])route([door.approachX+offset,y,door.approachZ],[door.x+offset,y,door.z]);}
 for(const y of [.25,1.1,1.7])for(const z of [-25.6,-25,-24.4])route([-19.6,y,z],[-9.9,y,z]);
 for(const g of w.nightlife.authoredFallbacks.values())if(g.visible)throw Error('Duplicate fallback geometry visible');await save('workflow2-placement-check',result);return result;
}
/** One-time conversion of the existing two procedural frontages into editable local GLBs. */
export async function freezeYoto(){
 const w=window.__shinmachi;await w.assetsReady;const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js'),{mergeGeometries}=await import('three/addons/utils/BufferGeometryUtils.js');const exporter=new GLTFExporter(),result=[];
 for(const [index,id,x]of [[0,'yoto-ramen',-17.2],[1,'yoto-izakaya',-12.3]]){
  const source=w.nightlife.authoredFallbacks.get('frontage-'+index),scene=new THREE.Group(),groups=new Map(),matrix=new THREE.Matrix4();source.updateMatrixWorld(true);
  const materials=w.nightlife.materials,tiled=new Set(['brick','plaster','darkTile','wood','metal','grille','cloth'].map(k=>materials[k]));
  source.traverse(o=>{if(!o.isInstancedMesh)return;for(let i=0;i<o.count;i++){
   o.getMatrixAt(i,matrix);const g=o.geometry.clone().applyMatrix4(matrix.clone().premultiply(o.matrixWorld));
   if(tiled.has(o.material)&&o.material.map){const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let j=0;j<p.count;j++){const xx=p.getX(j),yy=p.getY(j),zz=p.getZ(j);uv.setXY(j,Math.abs(n.getY(j))>.5?xx*.65:Math.abs(n.getX(j))>.5?zz*.65:xx*.65,Math.abs(n.getY(j))>.5?zz*.65:yy*.65);}}
   g.translate(-x,0,27.55);const geometry=g.index?g.toNonIndexed():g,list=groups.get(o.material)??[];list.push(geometry);groups.set(o.material,list);
  }});
  for(const [material,geometries]of groups){const mesh=new THREE.Mesh(mergeGeometries(geometries),material);mesh.name=material.name||'Existing Yoto finish';scene.add(mesh);}
  const binary=await exporter.parseAsync(scene,{binary:true}),bytes=new Uint8Array(binary);let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));
  const response=await fetch('/__authoring/snapshot/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({glb:btoa(s)})});if(!response.ok)throw Error('Snapshot failed '+response.status);result.push({id,bytes:bytes.length});
 }return result;
}
