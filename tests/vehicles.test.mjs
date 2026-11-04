import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { VEHICLE_KINDS, VEHICLE_PROFILES, selectVehicle } from '../src/world/simulation/VehicleCatalog.ts';
import { createVehicleModel } from '../src/world/simulation/VehicleGeometry.ts';
import { CitySimulation } from '../src/world/simulation/CitySimulation.ts';
import { seededRandom } from '../src/world/simulation/WorldRules.ts';

test('all family meshes and steered wheels fit their authoritative metre-scale footprints at both LODs',()=>{
  const signatures=new Set();
  for(const kind of VEHICLE_KINDS) {
    const p=VEHICLE_PROFILES[kind],near=createVehicleModel(kind),far=createVehicleModel(kind,false);
    assert.ok(p.wheelbase<p.length-.45);assert.ok(p.width>p.bodyWidth);
    assert.ok(near.triangles<22000,kind+' exceeded geometry budget');assert.ok(far.triangles<near.triangles*.8);
    signatures.add([p.length,p.height,p.frontBase,p.frontRoof,p.rearRoof,p.style].join(':'));
    for(const model of [near,far]) {
      for(const key of ['paint','glass','trim','chrome','head','tail','plate'])assert.ok(model.body.has(key),kind+' missing '+key);
      const bounds=new THREE.Box3();for(const g of model.body.values())bounds.union(g.boundingBox);
      for(const steer of [-.5,0,.5])for(const side of [-1,1])for(const axle of [-1,1])for(const g of model.wheel.values()) {
        const transform=new THREE.Matrix4().compose(new THREE.Vector3(side*(p.bodyWidth/2-.13),p.wheelRadius,axle*p.wheelbase/2),new THREE.Quaternion().setFromEuler(new THREE.Euler(1.3,axle>0?steer:0,0,'YXZ')),new THREE.Vector3(1,1,1));
        const point=new THREE.Vector3(),positions=g.getAttribute('position');
        for(let i=0;i<positions.count;i++)bounds.expandByPoint(point.fromBufferAttribute(positions,i).applyMatrix4(transform));
      }
      assert.ok(bounds.min.x>=-p.width/2-.003&&bounds.max.x<=p.width/2+.003,kind+' mirror/wheel width '+JSON.stringify(bounds));
      assert.ok(bounds.min.z>=-p.length/2-.003&&bounds.max.z<=p.length/2+.003,kind+' length '+JSON.stringify(bounds));
      assert.ok(bounds.min.y>=-.003&&bounds.max.y<=p.height+.003,kind+' height '+JSON.stringify(bounds));
      for(const g of [...model.body.values(),...model.wheel.values()]) {
        assert.ok([...g.attributes.position.array,...g.attributes.normal.array].every(Number.isFinite));g.dispose();
      }
    }
  }
  assert.equal(signatures.size,VEHICLE_KINDS.length);
});

test('painted body shells have real wheel openings instead of hiding tires behind solid panels',()=>{
  const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  for(const kind of VEHICLE_KINDS) {
    const p=VEHICLE_PROFILES[kind],model=createVehicleModel(kind),mesh=new THREE.Mesh(model.body.get('paint'),material);mesh.updateMatrixWorld();
    for(const axle of [-1,1])for(const dz of [-.5,0,.5]) {
      const ray=new THREE.Raycaster(new THREE.Vector3(p.bodyWidth,p.wheelRadius*1.42,axle*p.wheelbase/2+dz*p.wheelRadius),new THREE.Vector3(-1,0,0),0,p.bodyWidth*2);
      assert.equal(ray.intersectObject(mesh).length,0,kind+' painted over wheel arch');
    }
    for(const g of [...model.body.values(),...model.wheel.values()])g.dispose();
  }
  material.dispose();
});

test('seeded roster favours ordinary Japanese traffic, caps premium occupancy and avoids identical appearances',()=>{
  const random=seededRandom(8412),active=[],counts=Object.fromEntries(VEHICLE_KINDS.map(k=>[k,0]));
  for(let i=0;i<10000;i++) {
    if(active.length===20)active.shift();
    const leader=active.at(-1)?.kind,c=selectVehicle(random(),i,active,leader);
    assert.notEqual(c.kind,leader);assert.ok(!active.some(v=>v.kind===c.kind&&v.color===c.color&&v.variant===c.variant));
    active.push(c);counts[c.kind]++;
    assert.ok(active.filter(c=>VEHICLE_PROFILES[c.kind].family==='premium').length<=2);
  }
  assert.ok(Object.values(counts).every(n=>n>20));
  const premium=VEHICLE_KINDS.filter(k=>VEHICLE_PROFILES[k].family==='premium').reduce((n,k)=>n+counts[k],0);
  assert.ok(premium<1100&&premium>200);assert.ok(counts.coupe<300);assert.ok(counts.kei+counts.van+counts.truck>3500);
});

test('the full vehicle roster remains deterministic across rendering frame rates and body/appearance state stays authoritative',()=>{
  const a=new CitySimulation({seed:73}),b=new CitySimulation({seed:73});
  for(let i=0;i<180*144;i++)a.update(1/144,20.5);
  for(let i=0;i<180*30;i++)b.update(1/30,20.5);
  assert.deepEqual(a.vehicles,b.vehicles);assert.equal(a.clock,b.clock);
  assert.ok(a.vehicles.every(c=>VEHICLE_KINDS.includes(c.kind)&&Number.isInteger(c.spawn)&&Number.isInteger(c.variant)));
});
