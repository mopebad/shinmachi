import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CityBackdrop } from '../src/world/generation/CityBackdrop.ts';
import { AKANE_TOWER,skylineLayout,skylineRoads,skylineFootprint,overlaps,PLAYABLE_ENVELOPE,RAIL_ENVELOPE,TOWER_ENVELOPE } from '../src/world/generation/SkylineLayout.ts';

test('background parcels replay by seed and respect blocks, roads, railway and tower across seeds',()=>{
  for(const seed of [8412,72831,1,77,99991]){
    const a=skylineLayout(seed);assert.deepEqual(a,skylineLayout(seed));assert.ok(a.length>300);
    const roads=skylineRoads(),boxes=a.map(skylineFootprint);
    for(let i=0;i<a.length;i++){
      for(const exclusion of [PLAYABLE_ENVELOPE,RAIL_ENVELOPE,TOWER_ENVELOPE,...roads])assert.ok(!overlaps(boxes[i],exclusion),JSON.stringify({seed,building:a[i],exclusion}));
      for(let j=0;j<i;j++)assert.ok(!overlaps(boxes[i],boxes[j]),'Overlapping parcels');
    }
    assert.ok(a.filter(s=>s.layer===0).length>90);assert.ok(a.filter(s=>s.layer===2).length>70);assert.equal(new Set(a.map(s=>s.family)).size,7);
    assert.ok(new Set(a.map(s=>s.floors)).size>20);assert.ok(new Set(a.map(s=>s.width.toFixed(1))).size>100);
    const offices=a.filter(s=>s.family===5),residential=a.filter(s=>s.family===1);
    assert.ok(offices.reduce((n,s)=>n+s.floors,0)/offices.length>residential.reduce((n,s)=>n+s.floors,0)/residential.length+5);
  }
  assert.notDeepEqual(skylineLayout(1),skylineLayout(2));
});
test('actual instanced background geometry is finite, bounded and clear of protected space',()=>{
  const backdrop=new CityBackdrop(new THREE.Scene(),8412);backdrop.group.updateMatrixWorld(true);
  let buildings=0,parts=0,triangles=0;const matrix=new THREE.Matrix4();
  backdrop.group.traverse(mesh=>{
    if(!mesh.isInstancedMesh)return;assert.equal(mesh.castShadow,false);mesh.geometry.computeBoundingBox();
    triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*mesh.count;
    for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));assert.ok(matrix.determinant()>0);parts++;
      const box=mesh.geometry.boundingBox.clone().applyMatrix4(matrix.clone().premultiply(mesh.matrixWorld)),rect={minX:box.min.x,maxX:box.max.x,minZ:box.min.z,maxZ:box.max.z};
      if(mesh.userData.sections[i].startsWith('building:')){
        buildings++;for(const exclusion of [PLAYABLE_ENVELOPE,RAIL_ENVELOPE,TOWER_ENVELOPE,...skylineRoads()])assert.ok(!overlaps(rect,exclusion),'Rendered part crosses an exclusion');
      }
      if(mesh.userData.sections[i]==='landmark')assert.ok(box.min.x>=TOWER_ENVELOPE.minX&&box.max.x<=TOWER_ENVELOPE.maxX&&box.min.z>=TOWER_ENVELOPE.minZ&&box.max.z<=TOWER_ENVELOPE.maxZ,'Tower exceeds its reserved foundation');
    }
  });
  // Allow the complete roadside/rail continuity within a bounded scenery budget.
  assert.ok(buildings>10000);assert.ok(parts<100000);assert.ok(triangles<275000);
  const bounds=new THREE.Box3().setFromObject(backdrop.towerGroup);assert.ok(Math.abs(bounds.max.y-AKANE_TOWER.height)<.001);assert.equal(backdrop.towerGroup.position.x,AKANE_TOWER.x);assert.equal(backdrop.towerGroup.position.z,AKANE_TOWER.z);
});
test('landmark lighting follows time while fixed geometry and urban identity remain unchanged',()=>{
  const backdrop=new CityBackdrop(new THREE.Scene(),8412),positions=backdrop.towerGroup.matrix.clone(),materials=[];
  backdrop.towerGroup.traverse(m=>{if(m.isMesh)materials.push(m.material);});
  const energy=()=>materials.reduce((n,m)=>n+m.emissiveIntensity,0);
  backdrop.update(13,0);const day=energy();backdrop.update(20.5,1);const evening=energy();backdrop.update(3,1);const late=energy();assert.ok(evening>day+2);assert.ok(late<evening-2);
  assert.deepEqual(backdrop.towerGroup.matrix,positions);assert.equal(backdrop.group.userData.visualOnly,true);assert.equal(backdrop.group.userData.seed,8412);
});
