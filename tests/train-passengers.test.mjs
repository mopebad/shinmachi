import test from 'node:test';
import assert from 'node:assert/strict';
import { CitySimulation } from '../src/world/simulation/CitySimulation.ts';
import { createStationLayout, STATION } from '../src/world/generation/StationLayout.ts';
import { TrainOperation } from '../src/world/simulation/TrainOperation.ts';
import { Navigation } from '../src/world/simulation/Navigation.ts';
import { trainBerths, passengerTransferPath, passengerPositionValid } from '../src/world/simulation/RailPassengerGeometry.ts';
import { exercisePassengers } from '../tools/station3c-validation.mjs';

const station=createStationLayout();
const create=(options={})=>new CitySimulation({station,bounds:station.npcReservation,...options});
const advance=(sim,predicate,hour=18.5)=>{for(let i=0;i<45000;i++){if(predicate())return;sim.update(1/30,hour);}assert.fail('Passenger timeout '+JSON.stringify(sim.railPassengers.snapshot));};

test('all twelve standing berths and six continuous two-way exchange paths are physically inside their own carriage and doorway',()=>{
  const train=new TrainOperation(),nav=new Navigation(station.npcReservation,[],station);
  for(let i=0;i<10000&&train.snapshot.state!=='DWELLING';i++)train.update(1/30,18.5);
  const berths=trainBerths();assert.equal(berths.length,12);
  for(const b of berths) {
    const d=train.doors.find(d=>d.id===b.doorId),wait=nav.nodes[nav.station.waiting[0].node];
    const path=passengerTransferPath(station,d,wait,b,train.x);
    for(const route of [path,[...path].reverse()])for(let i=1;i<route.length;i++) {
      const a=route[i-1],c=route[i],n=Math.max(1,Math.ceil(Math.hypot(c.x-a.x,c.z-a.z)/.025));
      for(let j=0;j<=n;j++)assert.ok(passengerPositionValid(station,{x:a.x+(c.x-a.x)*j/n,y:STATION.platformY,z:a.z+(c.z-a.z)*j/n},d,b,train.x),b.id);
    }
    assert.ok(Math.abs(path.at(-1).z+57)<1.075);assert.equal(path.at(-1).x,train.x+b.localX);
  }
});

test('real city visitors board, ride off-map and arriving riders exit through the existing stairs and fare gates over multiple cycles',()=>{
  const sim=create({railPassengers:{arrivingPassengers:6}}),r=exercisePassengers(sim);
  assert.ok(r.arrivals>=6&&r.departures>=6);assert.ok(r.rail.boarded>=15&&r.rail.alighted>=30);
  assert.equal(r.boardingThresholdCrossings,r.rail.boarded);assert.equal(r.alightingThresholdCrossings,r.rail.alighted);
  assert.equal(Object.keys(r.rail.doorAlightings).length,6);assert.ok(r.movingRiderSamples>1000);assert.ok(r.minimumSeparation>=.5);
  assert.ok(sim.stationTraffic.completed.some(v=>v.journey==='inbound'&&v.destination==='city'&&v.states.includes('gate-out')));
  assert.ok(sim.stationTraffic.completed.some(v=>v.journey==='outbound'&&v.destination==='rail'&&v.states.includes('boarding')));
  for(const e of r.events.filter(e=>e.event==='origin'||e.event==='delivered'))assert.ok(Math.abs(e.x)>90,'Only off-map rail lifecycle changes');
  assert.ok(r.vehicleExits>100);assert.ok(r.station.maxMovingWait<90);
});

test('empty and maximum-load services respect capacity, backpressure and closure without stranded passengers',()=>{
  for(const config of [{arrivingPassengers:0,capacityPerDoor:1,stationDemand:1},{arrivingPassengers:12,stationDemand:.8}]) {
    const sim=create({seed:193,railPassengers:config}),r=exercisePassengers(sim,{seconds:900,drainSeconds:900,hour:8});
    assert.ok(r.rail.boarded>0);assert.ok(r.rail.maxOnboard<=sim.railPassengers.berths.length);
    if(config.arrivingPassengers===12){assert.equal(r.rail.maxOnboard,12);assert.ok(r.rail.capacityRefusals>0);}
    assert.equal(r.station.started,r.station.completed);assert.equal(sim.railPassengers.snapshot.transfers.length,0);
  }
});

test('an external obstruction during a real threshold crossing holds the train and the person, then recovers continuously',()=>{
  const sim=create({railPassengers:{arrivingPassengers:6,stationDemand:0}});
  advance(sim,()=>sim.railPassengers.active.some(p=>Math.abs(p.z+55.555)<.12));
  const p=sim.railPassengers.active.find(p=>Math.abs(p.z+55.555)<.12),id=p.rail.doorId,position={x:p.x,y:p.y,z:p.z};
  assert.ok(sim.train.setDoorObstructed(id,true));
  for(let i=0;i<1800;i++) {
    sim.update(1/30,3);assert.equal(sim.train.snapshot.velocity,0);
    assert.deepEqual({x:p.x,y:p.y,z:p.z},position);assert.ok(sim.train.doors.find(d=>d.id===id).obstructionSources.includes('external'));
    assert.equal(sim.train.requestDeparture(),false);
  }
  assert.ok(sim.train.setDoorObstructed(id,false));
  const before={x:p.x,y:p.y,z:p.z};sim.update(1/30,3);
  assert.ok(Math.hypot(p.x-before.x,p.y-before.y,p.z-before.z)<=p.speed/30+1e-8);
  advance(sim,()=>sim.train.snapshot.state==='ACCELERATING'&&sim.train.snapshot.destination==='turnback',3);
  assert.ok(sim.train.snapshot.allDoorsClosed);assert.equal(sim.railPassengers.active.length,0);
});

test('reserved traversals extend dwell and late passenger holds reopen safely without bypassing existing sensors',()=>{
  const train=new TrainOperation({dwellSeconds:1});
  for(let i=0;i<10000&&train.snapshot.state!=='DWELLING';i++)train.update(1/30,18.5);
  assert.ok(train.setPassengerHold('physical-transfer',true));train.update(60,18.5);
  assert.equal(train.snapshot.state,'DWELLING');assert.equal(train.snapshot.velocity,0);assert.ok(train.doors.filter(d=>d.platformSide).every(d=>d.fraction===1));
  train.setPassengerHold('physical-transfer',false);
  for(let i=0;i<300&&train.snapshot.state!=='DOOR CLOSING';i++)train.update(1/30,18.5);
  train.update(1,18.5);const before=train.doors.find(d=>d.platformSide).fraction;
  train.setPassengerHold('late-transfer',true);train.update(1/30,18.5);
  assert.equal(train.snapshot.state,'DOOR OPENING');assert.ok(train.doors.find(d=>d.platformSide).fraction>=before);
  train.setDoorObstructed('car-1-south-1',true,'external');train.setDoorObstructed('car-1-south-1',true,'passenger');train.setDoorObstructed('car-1-south-1',false,'passenger');
  assert.deepEqual(train.doors.find(d=>d.id==='car-1-south-1').obstructionSources,['external']);
  train.setDoorObstructed('car-1-south-1',false);train.setPassengerHold('late-transfer',false);
  for(let i=0;i<1000&&train.snapshot.state!=='ACCELERATING';i++)train.update(1/30,18.5);
  assert.equal(train.snapshot.state,'ACCELERATING');assert.equal(train.setPassengerHold('moving',true),false);
});

test('passenger positions, queues, interlocks and events replay identically at 144 Hz, 30 Hz, 2 Hz and irregular frame intervals',()=>{
  const run=pattern=>{
    const sim=create({seed:42,railPassengers:{arrivingPassengers:6}});let elapsed=0,i=0;
    while(elapsed<600-1e-9){const dt=Math.min(pattern[i++%pattern.length],600-elapsed);sim.update(dt,18.5);elapsed+=dt;}
    return {train:sim.train.snapshot,people:sim.pedestrians,metrics:sim.stationTraffic.metrics,rail:sim.railPassengers.snapshot,events:sim.railPassengers.events};
  };
  const baseline=run([1/30]);
  for(const frames of [[1/144],[.5],[.013,.211,.005,.9,.071]])assert.deepEqual(run(frames),baseline);
});
