import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { railDistrictLayout, railPierObstacles, RAIL_DISTRICT, railRectsOverlap as overlap } from '../src/world/generation/RailDistrictLayout.ts';
import { Navigation } from '../src/world/simulation/Navigation.ts';
import { CitySimulation } from '../src/world/simulation/CitySimulation.ts';
import { exercisePassengers } from '../tools/station3c-validation.mjs';

const baseline=JSON.parse(fs.readFileSync(new URL('../quality/rail-district-before-measurements.json',import.meta.url))).contracts;
const plan=railDistrictLayout(8412,baseline.colliders);
const newBounds=[...plan.parcels.map(p=>p.collision),...plan.obstacles.filter(p=>p.kind!=='pier').map(({minX,maxX,minZ,maxZ})=>({minX,maxX,minZ,maxZ}))];
// Replace only the former eight viaduct footing reservations. All other original bounds survive.
const oldPier=b=>Math.abs(b.minZ+58.4)<.001&&Math.abs(b.maxZ+55.6)<.001&&Math.abs(b.maxX-b.minX-1.4)<.001;
const bounds=[...baseline.colliders.filter(b=>!oldPier(b)),...railPierObstacles(),...newBounds];

test('rail district parcels replay across seeds, retain distinct families and reserve streets, service lane and occupied lots',()=>{
  for(const seed of [8412,1,77,72831,99991]){
    const p=railDistrictLayout(seed,baseline.colliders);assert.deepEqual(p,railDistrictLayout(seed,baseline.colliders));
    assert.ok(p.parcels.length>=15);assert.equal(new Set(p.parcels.map(b=>b.family)).size,5);
    const lane={minX:-71,maxX:71,...RAIL_DISTRICT.serviceLane};
    for(const [i,b]of p.parcels.entries()){
      for(const r of [...baseline.colliders,RAIL_DISTRICT.mainRoad,RAIL_DISTRICT.residentialRoad,lane,...p.parcels.slice(0,i).map(p=>p.footprint)])assert.ok(!overlap(b.footprint,r),b.id);
      if(!b.bay)assert.ok(b.depth>=5.8&&b.floors>=2&&b.floors<=6);
    }
    for(const o of p.obstacles)for(const road of [RAIL_DISTRICT.mainRoad,RAIL_DISTRICT.residentialRoad])assert.ok(!overlap(o,road),o.id);
    assert.equal(p.obstacles.filter(o=>o.kind==='bicycle').length,3);
  }
  assert.notDeepEqual(railDistrictLayout(1),railDistrictLayout(2));
});
test('portal supports clear the full road and train envelopes and maintain bounded structural spans',()=>{
  const piers=railPierObstacles();assert.equal(piers.length,11);
  for(const p of piers){assert.ok(p.maxY<RAIL_DISTRICT.train.minY);for(const road of [RAIL_DISTRICT.mainRoad,RAIL_DISTRICT.residentialRoad])assert.ok(!overlap(p,road));}
  for(const p of RAIL_DISTRICT.portals){assert.ok(p.bottom>=4.95);assert.ok(p.top<RAIL_DISTRICT.train.minY);assert.ok(piers.some(c=>Math.abs((c.minX+c.maxX)/2-p.minX)<.001));assert.ok(piers.some(c=>Math.abs((c.minX+c.maxX)/2-p.maxX)<.001));}
  for(let i=1;i<piers.length;i++)assert.ok(piers[i].minX-piers[i-1].minX<=16+1e-9);
});
test('new collision reservations preserve every original city and station navigation edge and all six boarding approaches',()=>{
  assert.equal(baseline.colliders.filter(oldPier).length,8);
  const nav=new Navigation(bounds,baseline.doors,baseline.station);
  assert.deepEqual(JSON.parse(JSON.stringify(nav.nodes)),baseline.navigation.nodes);assert.deepEqual(JSON.parse(JSON.stringify([...nav.edges])),baseline.navigation.edges);
  assert.equal(nav.station.boardingApproaches.length,6);assert.ok(nav.station.boardingApproaches.every(a=>a.enabled&&a.clear));
});
test('actual district collision reservations support repeated passenger exchange, traffic and service-hour closure',()=>{
  const sim=new CitySimulation({seed:8412,bounds,doors:baseline.doors,station:baseline.station,railPassengers:{arrivingPassengers:6}});
  const r=exercisePassengers(sim,{seconds:900,drainSeconds:600,hour:20.5});
  assert.ok(r.arrivals>=5&&r.departures>=5);assert.ok(r.rail.boarded>=10&&r.rail.alighted>=24);assert.ok(r.vehicleExits>100);
  assert.equal(r.rail.boarded,r.rail.delivered);assert.equal(r.station.started,r.station.completed);
});
