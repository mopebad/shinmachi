import test from 'node:test';
import assert from 'node:assert/strict';
import { createStationLayout, STATION, stationBodyBlocked, stationSupport } from '../src/world/generation/StationLayout.ts';
import { Navigation } from '../src/world/simulation/Navigation.ts';
import { stationPositionValid } from '../src/world/simulation/StationNavigation.ts';
import { stationBoardingApproach, BOARDING_CLEARANCE } from '../src/world/simulation/StationBoardingAccess.ts';
import { TrainDoors, trainDoorDefinitions, TRAIN_DOOR } from '../src/world/simulation/TrainDoors.ts';
import { TrainOperation } from '../src/world/simulation/TrainOperation.ts';
import { RAIL_PLATFORM, RAIL_VEHICLE } from '../src/world/simulation/RailGeometry.ts';

const near = (a,b) => assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const safety = { x: RAIL_PLATFORM.stopX, velocity: 0, active: true, atStation: true };
const opening = (d, offset=0) => ({minX:safety.x+d.localX+offset-TRAIN_DOOR.width/2,maxX:safety.x+d.localX+offset+TRAIN_DOOR.width/2,
  bottomY:RAIL_VEHICLE.sillY,topY:RAIL_VEHICLE.sillY+TRAIN_DOOR.height,z:STATION.trackZ+TRAIN_DOOR.sillOuterZ});
const south = trainDoorDefinitions().filter(d=>d.side===1);

test('open frontage shares rendered obstacle bounds, retains fall guards, and excludes ordinary navigation from the edge hazard',()=>{
  const s=createStationLayout(), f=s.boardingFrontage;
  assert.equal(f.barrier,'OPEN_PLATFORM'); assert.equal(f.npcBoardingEnabled,true);
  near(f.minX,9); near(f.maxX,60.5); near(f.maxX-f.minX,51.5);
  assert.ok(!s.boxes.some(b=>b.id==='track-edge-screen'));
  for(const d of south)assert.equal(stationBodyBlocked(s,safety.x+d.localX,STATION.platformEdgeZ+.11,STATION.platformY),false);
  for(const id of ['track-end-return-west','track-end-return-east','rear-guard','platform-end-8','platform-end-61.5',
    'well-east-guard','well-west-lower-guard','well-guard--53.1','well-guard--49','return-east-guard','return-guard--53.1','return-guard--49']) {
    const b=s.boxes.find(b=>b.id===id); assert.ok(b?.collision,id); assert.ok(b.maxY-b.minY>=1);
  }
  near(f.tactileWidth,.3); assert.ok(f.edgeZ<f.tactileCenterZ-f.tactileWidth/2);
  assert.ok(f.tactileCenterZ+f.tactileWidth/2<f.safeWaitingMinZ);
  const edge={x:38.35,y:f.y,z:f.edgeZ+.1};
  assert.equal(stationBodyBlocked(s,edge.x,edge.z,edge.y),false,'No invisible wall');
  assert.equal(stationPositionValid(s,edge),false,'Ordinary NPC walking excludes the edge hazard');
  assert.equal(stationSupport(s,edge.x,f.edgeZ-.01,f.y),null,'Track space is not a general walking surface');
});

test('all six approaches connect an existing waiting destination to the correct sill with pedestrian clearance throughout the stop tolerance',()=>{
  const s=createStationLayout(), nav=new Navigation(s.npcReservation,[],s), station=nav.station;
  assert.equal(station.boardingApproaches.length,6);
  for(const d of south)for(const offset of [-RAIL_PLATFORM.tolerance,0,RAIL_PLATFORM.tolerance]) {
    const o=opening(d,offset), a=stationBoardingApproach(s,o);
    assert.ok(a.clear,`${d.id}: ${a.reason}`); near(a.gap,.055); near(a.sillError,0);
    assert.ok(station.waiting.some(w=>{const p=nav.nodes[w.node];return Math.hypot(p.x-a.waitingPoint.x,p.y-a.waitingPoint.y,p.z-a.waitingPoint.z)<1e-8;}));
    assert.ok(stationPositionValid(s,a.waitingPoint)); assert.ok(stationPositionValid(s,a.platformPoint));
    near(a.thresholdPoint.z,o.z); near(a.edgePoint.z,STATION.platformEdgeZ);
    assert.ok(o.maxX-o.minX>2*BOARDING_CLEARANCE.radius+.5);
    for(let i=1;i<a.path.length;i++) {
      const p=a.path[i-1],q=a.path[i],steps=Math.max(1,Math.ceil(Math.hypot(q.x-p.x,q.z-p.z)/.01));
      for(let n=0;n<=steps;n++) {
        const t=n/steps,x=p.x+(q.x-p.x)*t,z=p.z+(q.z-p.z)*t;
        assert.equal(stationBodyBlocked(s,x,z,STATION.platformY,.25),false,d.id);
        if(z>=STATION.platformEdgeZ)near(stationSupport(s,x,z,STATION.platformY),STATION.platformY);
        else { assert.ok(z>=o.z-1e-8); near(x,(o.minX+o.maxX)/2); }
      }
    }
  }
  assert.ok(station.boardingApproaches.every(a=>a.clear&&a.enabled));
  for(const id of station.nodeIds)assert.ok(stationPositionValid(s,nav.nodes[id]),'No boarding edge was added to the active graph');
});

test('approach validation rejects hidden screens, mast obstructions, absent support, mismatched sills and excessive track gaps',()=>{
  const o=opening(south[3]), s=createStationLayout();
  const screen={id:'accidental-screen',material:'glass',collision:true,minX:o.minX,maxX:o.maxX,minZ:-55.4,maxZ:-55.35,minY:STATION.platformY,maxY:STATION.platformY+1.12};
  s.boxes.push(screen); assert.equal(stationBoardingApproach(s,o).reason,'BLOCKED_APPROACH'); s.boxes.pop();
  s.boxes.push({...screen,id:'misplaced-mast',minX:38.31,maxX:38.39,minZ:-54.74,maxZ:-54.66,maxY:11.6});
  assert.equal(stationBoardingApproach(s,o).reason,'BLOCKED_APPROACH'); s.boxes.pop();
  assert.equal(stationBoardingApproach(s,{...o,bottomY:o.bottomY+.03}).reason,'SILL_MISMATCH');
  assert.equal(stationBoardingApproach(s,{...o,z:STATION.platformEdgeZ-.081}).reason,'INVALID_GAP');
  assert.equal(stationBoardingApproach(s,{...o,z:STATION.platformEdgeZ+.001}).reason,'INVALID_GAP');
  assert.equal(stationBoardingApproach(s,{...o,maxX:o.minX+.55}).reason,'NARROW_OPENING');
  assert.equal(stationBoardingApproach(s,{...o,minX:8}).reason,'OUTSIDE_FRONTAGE');
  assert.equal(stationBoardingApproach(s,{...o,z:NaN}).clear,false);
  s.surfaces=s.surfaces.filter(f=>f.id!=='platform-trackside');
  assert.equal(stationBoardingApproach(s,o).reason,'UNSUPPORTED_APPROACH');
});

test('physical and NPC access are exposed only at a safe full-open limit',()=>{
  const doors=new TrainDoors();
  const access=()=>doors.snapshots(safety).filter(d=>d.platformSide);
  assert.ok(access().every(d=>d.boarding.approach.clear&&!d.boarding.passengerAccess));
  assert.ok(doors.open(2,safety)); doors.update(1);
  assert.ok(access().every(d=>!d.boarding.passengerAccess)); doors.update(1);
  assert.ok(access().every(d=>d.boarding.passengerAccess));
  for(const bad of [{velocity:.00001},{x:safety.x+.051},{active:false},{atStation:false}])
    assert.ok(doors.snapshots({...safety,...bad}).every(d=>!d.boarding.passengerAccess));
  assert.ok(doors.snapshots(safety).filter(d=>!d.platformSide).every(d=>!d.boarding.passengerAccess&&d.boarding.platformBarrier==='NO_PLATFORM'));
  const id=south[0].id; doors.setObstructed(id,true,safety);
  assert.equal(access().find(d=>d.id===id).boarding.passengerAccess,false); doors.setObstructed(id,false,safety);
  const copy=access()[0].boarding.approach; copy.clear=false; copy.path[0].z=-57;
  assert.ok(access()[0].boarding.approach.clear); near(access()[0].boarding.approach.path[0].z,-54.15);
  doors.close(2); doors.update(.1); assert.ok(access().every(d=>!d.boarding.passengerAccess));
  assert.ok(doors.snapshots(safety).every(d=>d.boarding.npcBoardingEnabled===d.boarding.passengerAccess));
});

test('six arrivals expose exactly six accessible openings and secure all of them before each departure',()=>{
  const train=new TrainOperation(); let arrivals=0,departures=0,old=train.snapshot.state;
  for(let tick=0;tick<45000&&departures<6;tick++) {
    train.update(1/30,12); const s=train.snapshot;
    if(s.state==='DWELLING'&&old==='DOOR OPENING') {arrivals++;assert.equal(s.doors.filter(d=>d.boarding.passengerAccess).length,6);}
    for(const d of s.doors)if(d.boarding.passengerAccess) {
      assert.equal(s.velocity,0); near(s.x,RAIL_PLATFORM.stopX); assert.equal(d.state,'OPEN'); assert.ok(d.boarding.approach.clear);
    }
    if(s.state==='ACCELERATING'&&old==='PREPARING DEPARTURE') {departures++;assert.ok(s.allDoorsClosed);assert.ok(s.doors.every(d=>!d.boarding.passengerAccess));}
    assert.ok(s.doors.every(d=>d.boarding.npcBoardingEnabled===d.boarding.passengerAccess)); old=s.state;
  }
  assert.equal(arrivals,6); assert.equal(departures,6);
});
