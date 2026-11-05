import * as THREE from 'three';
import {save,renderCost} from './skyline-browser-checks.mjs';
export const views=[
 ['music',[18.4,-1.24,-39.25],[18.2,-1.77,-40.48],50],
 ['bar',[18.65,-1.24,-35.2],[17.05,-1.55,-35.8],54],
 ['drinks',[18.22,-1.24,-36.12],[17.48,-1.72,-36.75],42],
 ['deck',[17.93,-1.24,-39.95],[17.82,-1.78,-40.48],42],
 ['speaker',[19.4,-1.24,-39.65],[19.98,-1.95,-40.65],44],
];
export async function prepare(){const w=window.__shinmachi;await w.assetsReady;w.setReviewPaused(true);w.setPlaying(false);w.setTime(21);w.setWeather('damp');w.setReflections(true);w.setContactShading(true);while(w.activity.simulation.clock<300-1e-7)w.activity.simulation.update(1/30,21);return w;}
export async function capture(stage){const w=await prepare();
 if(stage==='before')await save('shindo-assets-baseline',{clock:w.activity.simulation.clock,colliders:w.district.colliders,doors:w.district.doors,station:w.district.station,venue:w.nightlife.venue});
 for(const [name,eye,target,fov]of views)await w.captureBenchmark('shindo-assets-'+name+'-'+stage,'nightlife',21,{eye,target,fov});
 const result={cost:await renderCost(w),clock:w.activity.simulation.clock};await save('shindo-assets-'+stage+'-metrics',result);return result;
}
export async function compare(){const comparisons=[];for(const [name]of views){const a=await(await fetch('/quality/captures/shindo-assets-'+name+'-before.json')).json(),b=await(await fetch('/quality/captures/shindo-assets-'+name+'-after.json')).json();for(const key of ['eye','quaternion','fov','seed','hour','simulationClock','surface','reflections','contactShading','width','height','pixelRatio','renderConditions'])if(JSON.stringify(a[key])!==JSON.stringify(b[key]))throw Error(name+' changed '+key);comparisons.push(name);}await save('shindo-assets-comparisons',{comparisons});return comparisons;}
export async function assetsCheck(){
 const w=window.__shinmachi;await w.assetsReady;const group=w.scene.getObjectByName('SHINDO / licensed and Blender-finished assets'),bounds=new Map(),v=new THREE.Vector3(),instance=new THREE.Matrix4(),matrix=new THREE.Matrix4();let triangles=0;
 group.updateMatrixWorld(true);
 group.traverse(o=>{if(!o.isInstancedMesh)return;const asset=o.name.split(' / ')[0];triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*o.count;
  for(let i=0;i<o.count;i++){o.getMatrixAt(i,instance);matrix.multiplyMatrices(o.matrixWorld,instance);if(!matrix.elements.every(Number.isFinite)||matrix.determinant()<=0)throw Error('Invalid asset transform');const key=asset+':'+i,box=bounds.get(key)??new THREE.Box3();
   const p=o.geometry.attributes.position;for(let n=0;n<p.count;n++){v.fromBufferAttribute(p,n).applyMatrix4(matrix);if(!v.toArray().every(Number.isFinite))throw Error('Invalid geometry');box.expandByPoint(v);}bounds.set(key,box);
  }
 });
 const checks=[];for(const asset of new Set(group.userData.placements.map(p=>p.asset))){const placements=group.userData.placements.filter(p=>p.asset===asset);for(const [i,p]of placements.entries()){
  const box=bounds.get(asset+':'+i),gap=box.min.y-p.position[1];if(Math.abs(gap)>.003)throw Error('Asset floating or clipping its support '+asset+' '+gap);
  if(box.min.x<16.04||box.max.x>20.30||box.min.z< -40.976||box.max.y>-.42)throw Error('Asset clips room bounds '+asset+JSON.stringify(box));
  checks.push({asset,instance:i,supportGapMetres:gap,min:box.min.toArray(),max:box.max.toArray()});
 }}
 const result={inventory:group.userData.inventory,checks,triangles,webglErrors:w.renderer.getContext().getError(),textures:performance.getEntriesByType('resource').filter(r=>r.name.includes('/assets/shindo/')).map(r=>({url:r.name.split('/assets/shindo/')[1],bytes:r.decodedBodySize,ms:r.duration}))};
 if(result.webglErrors)throw Error('WebGL error');await save('shindo-assets-validation',result);return{assets:result.inventory.length,placements:checks.length,triangles,webglErrors:0};
}
