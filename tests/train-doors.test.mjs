import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainOperation } from '../src/world/simulation/TrainOperation.ts';
import { TrainDoors, TRAIN_DOOR, trainDoorDefinitions } from '../src/world/simulation/TrainDoors.ts';
import { RAIL_PLATFORM } from '../src/world/simulation/RailGeometry.ts';
import { STATION, createStationLayout, stationBodyBlocked, stationSupport } from '../src/world/generation/StationLayout.ts';

const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const advance = (train, predicate, hour = 12) => {
  for (let i = 0; i < 30000; i++) { if (predicate(train.snapshot)) return; train.update(1 / 30, hour); }
  assert.fail('Train door timeout: ' + train.snapshot.state);
};
const platformDoors = train => train.doors.filter(d => d.platformSide);

test('all twelve stable doorways expose world-space openings and supported future platform anchors', () => {
  const train = new TrainOperation(), layout = createStationLayout();
  advance(train, s => s.state === 'DWELLING');
  assert.equal(train.doors.length, 12); assert.equal(platformDoors(train).length, 6);
  assert.equal(new Set(train.doors.map(d => d.id)).size, 12);
  for (const d of train.doors) {
    const { opening: o, boarding: b } = d;
    near(o.maxX - o.minX, 1.06); near(o.topY - o.bottomY, 1.85); near(o.bottomY, STATION.platformY);
    near((o.minX + o.maxX) / 2, train.x + d.localX); assert.equal(o.normal.z, d.side);
    near(o.z, STATION.trackZ + d.side * TRAIN_DOOR.sillOuterZ);
    assert.equal(b.npcBoardingEnabled, b.passengerAccess, 'NPC permission follows conditional physical access');
    if (d.platformSide) {
      assert.equal(d.state, 'OPEN'); near(d.fraction, 1); near(d.clearOpening.width, 1.06);
      assert.ok(b.aligned && b.doorPassable && b.passengerAccess && b.approach.clear); assert.equal(b.platformBarrier, 'OPEN_PLATFORM');
      assert.ok(o.minX > RAIL_PLATFORM.minX && o.maxX < RAIL_PLATFORM.maxX);
      near(stationSupport(layout, b.platformPoint.x, b.platformPoint.z, b.platformPoint.y), b.platformPoint.y);
      assert.equal(stationBodyBlocked(layout, b.platformPoint.x, b.platformPoint.z, b.platformPoint.y), false);
      assert.ok(b.interiorPoint.z < b.thresholdPoint.z && b.thresholdPoint.z < b.platformPoint.z);
    } else {
      assert.equal(d.state, 'CLOSED'); near(d.fraction, 0); near(d.clearOpening.width, 0);
      assert.equal(b.platformPoint, null); assert.equal(b.doorPassable, false); assert.equal(b.passengerAccess, false);
    }
  }
});

test('configurable opening, full-open dwell, warning and closing consume simulation time before departure', () => {
  const train = new TrainOperation({ doorOpeningSeconds: 2, dwellSeconds: 4, departureWarningSeconds: 1, doorClosingSeconds: 3 });
  advance(train, s => s.state === 'DOOR OPENING');
  train.update(1 - train.snapshot.stateElapsed, 12);
  for (const d of platformDoors(train)) { near(d.fraction, .5); near(d.leafSpeed, .4125); }
  assert.equal(train.requestDeparture(), false);
  train.update(1, 12); assert.equal(train.snapshot.state, 'DWELLING');
  train.update(3.99, 12); assert.equal(train.snapshot.state, 'DWELLING');
  assert.ok(platformDoors(train).every(d => d.fraction === 1));
  train.update(.01, 12); assert.equal(train.snapshot.state, 'DEPARTURE WARNING');
  train.update(1, 12); assert.equal(train.snapshot.state, 'DOOR CLOSING');
  train.update(1.5, 12); assert.ok(platformDoors(train).every(d => Math.abs(d.fraction - .5) < 1e-8));
  assert.equal(train.requestDeparture(), false); near(train.snapshot.velocity, 0);
  train.update(1.5, 12); assert.equal(train.snapshot.state, 'PREPARING DEPARTURE');
  assert.ok(train.snapshot.allDoorsClosed); assert.equal(train.requestDeparture(), false, 'Preparation must finish too');
  train.update(train.config.preparationSeconds, 12); assert.equal(train.snapshot.state, 'ACCELERATING');
  train.update(.5, 12); assert.ok(train.snapshot.speed > 0 && train.snapshot.allDoorsClosed);
});

test('multiple cycles have smooth bounded door displacement, closed moving trains and zero wrong-side openings', () => {
  const train = new TrainOperation(); let old = train.snapshot, departures = 0, openEvents = 0;
  for (let i = 0; i < 45000 && departures < 6; i++) {
    train.update(1 / 30, 12); const s = train.snapshot;
    for (const [j, d] of s.doors.entries()) {
      assert.ok(d.fraction >= 0 && d.fraction <= 1);
      assert.ok(Math.abs(d.fraction - old.doors[j].fraction) <= 1.5 / train.config.doorOpeningSeconds / 30 + 1e-8);
      if (!d.platformSide) assert.ok(d.closedConfirmed && d.fraction === 0);
      if (d.fraction > 0) { near(s.velocity, 0); near(s.x, RAIL_PLATFORM.stopX); }
      if (s.speed > 0) assert.ok(d.closedConfirmed && d.state === 'CLOSED');
    }
    if (s.state === 'DWELLING' && old.state === 'DOOR OPENING') openEvents++;
    if (s.state === 'ACCELERATING' && old.state === 'PREPARING DEPARTURE') { departures++; assert.ok(s.allDoorsClosed); }
    old = s;
  }
  assert.equal(departures, 6); assert.equal(openEvents, 6); assert.equal(train.snapshot.doorCycles, 6);
});

test('moving, unaligned, inactive and offstage open requests and premature departure are refused', () => {
  const safety = { x: RAIL_PLATFORM.stopX, velocity: 0, active: true, atStation: true };
  for (const bad of [{ velocity: .00001 }, { x: safety.x + .051 }, { x: NaN }, { active: false }, { atStation: false }]) {
    const doors = new TrainDoors(); assert.equal(doors.open(2, { ...safety, ...bad }), false); assert.ok(doors.allClosed);
  }
  const train = new TrainOperation();
  assert.equal(train.requestDoorsOpen(), false); assert.equal(train.requestDeparture(), false);
  advance(train, s => s.state === 'APPROACHING');
  assert.equal(train.requestDoorsOpen(), false); assert.equal(train.requestDeparture(), false);
  assert.equal(train.setDoorObstructed('car-2-south-2', true), false);
  advance(train, s => s.state === 'STOPPED'); assert.equal(train.requestDoorsOpen(), false, 'Stop confirmation interval is mandatory');
  advance(train, s => s.state === 'DWELLING');
  assert.equal(train.requestDoorsOpen(), false); assert.equal(train.requestDeparture(), false);
  assert.equal(train.setDoorObstructed('unknown', true), false); assert.equal(train.setDoorObstructed('car-2-north-2', true), false);
  const copy = train.doors; copy[0].fraction = 1; assert.equal(train.doors[0].fraction, 0, 'Snapshots cannot change authority');
});

test('an interrupted close reopens without a position jump, stays held while blocked and retries safely after clearing', () => {
  const train = new TrainOperation({ dwellSeconds: 2, departureWarningSeconds: 1 });
  advance(train, s => s.state === 'DOOR CLOSING' && s.doors.find(d => d.id === 'car-2-south-2').fraction < .6);
  const before = train.doors.find(d => d.id === 'car-2-south-2').fraction;
  assert.equal(train.setDoorObstructed('car-2-south-2', true), true);
  train.update(1 / 30, 12); const after = train.doors.find(d => d.id === 'car-2-south-2');
  assert.equal(train.snapshot.state, 'DOOR OPENING'); assert.ok(after.fraction >= before && after.fraction - before < .01);
  for (let i = 0; i < 1800; i++) { train.update(1 / 30, 12); near(train.x, RAIL_PLATFORM.stopX); near(train.snapshot.velocity, 0); }
  assert.ok(train.snapshot.doorReopenings >= 3); assert.equal(train.snapshot.doorCycles, 0);
  assert.equal(train.requestDeparture(), false);
  assert.equal(train.setDoorObstructed('car-2-south-2', false), true);
  advance(train, s => s.state === 'ACCELERATING'); assert.ok(train.snapshot.allDoorsClosed);
  assert.equal(train.snapshot.doorCycles, 1);
});

test('late closed-limit obstruction and service closure cannot bypass door locks or hide an open train', () => {
  const train = new TrainOperation({ dwellSeconds: 1 });
  advance(train, s => s.state === 'PREPARING DEPARTURE');
  assert.equal(train.setDoorObstructed('car-1-south-1', true), true);
  assert.equal(train.snapshot.allDoorsClosed, false); assert.equal(train.requestDeparture(), false);
  train.update(1 / 30, 1); assert.equal(train.snapshot.state, 'DOOR OPENING');
  train.update(20, 1); assert.ok(train.snapshot.active); near(train.snapshot.velocity, 0);
  train.setDoorObstructed('car-1-south-1', false);
  advance(train, s => !s.active, 1); assert.ok(train.snapshot.allDoorsClosed); assert.equal(train.snapshot.completedStops, 1);
  const x = train.x; train.update(0, 5); near(train.x, x); near(train.snapshot.speed, 0); assert.ok(train.snapshot.allDoorsClosed);
});

test('door timing and actuator updates reject invalid values without unsafe transitions', () => {
  for (const config of [{ doorOpeningSeconds: 0 }, { doorClosingSeconds: -1 }, { departureWarningSeconds: NaN }]) assert.throws(() => new TrainOperation(config));
  const doors = new TrainDoors(), safety = { x: RAIL_PLATFORM.stopX, velocity: 0, active: true, atStation: true };
  assert.equal(doors.open(0, safety), false); assert.throws(() => doors.close(Infinity)); assert.throws(() => doors.update(-1));
  assert.equal(trainDoorDefinitions().length, 12); assert.ok(doors.allClosed);
});
