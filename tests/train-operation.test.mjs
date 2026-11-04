import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainOperation, TRAIN_DEFAULTS } from '../src/world/simulation/TrainOperation.ts';
import { RAIL_PLATFORM, RAIL_VEHICLE, railGeometry, stoppingEnvelope } from '../src/world/simulation/RailGeometry.ts';
import { createStationLayout, STATION } from '../src/world/generation/StationLayout.ts';
import { CitySimulation } from '../src/world/simulation/CitySimulation.ts';

const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const advance = (train, predicate, hour = 12) => {
  for (let ticks = 0; ticks < 30000; ticks++) {
    if (predicate(train.snapshot)) return train.snapshot;
    train.update(1 / 30, hour);
  }
  assert.fail('Timed out waiting for train ' + JSON.stringify(train.snapshot));
};

test('rendered consist, projecting details and every door fit the usable frontage with a safe stop envelope', () => {
  const old = stoppingEnvelope(4), g = railGeometry(), e = stoppingEnvelope();
  near(old.length, 52.225); assert.equal(old.fits, false);
  near(g.length, 39.125); near(g.centers[1] - g.centers[0], 13.1);
  near(RAIL_VEHICLE.pitch - RAIL_VEHICLE.carLength, .3);
  near(e.minCenterX, 28.5625); near(e.maxCenterX, 40.9375);
  assert.equal(g.cars, 3); assert.equal(g.doors.length, 6); assert.ok(e.fits);
  for (const x of [RAIL_PLATFORM.stopX - .05, RAIL_PLATFORM.stopX + .05]) {
    assert.ok(x - g.halfLength >= RAIL_PLATFORM.minX && x + g.halfLength <= RAIL_PLATFORM.maxX);
    for (const d of g.doors) assert.ok(x + d - RAIL_VEHICLE.doorWidth / 2 > RAIL_PLATFORM.minX && x + d + RAIL_VEHICLE.doorWidth / 2 < RAIL_PLATFORM.maxX);
  }
  near(RAIL_VEHICLE.sillY, STATION.platformY);
  assert.ok(STATION.platformEdgeZ - STATION.trackZ - RAIL_VEHICLE.halfWidth > .05);
  const layout = createStationLayout(), minZ = STATION.trackZ - RAIL_VEHICLE.halfWidth, maxZ = STATION.trackZ + RAIL_VEHICLE.halfWidth;
  // Swept train band never overlaps a station box/floor in plan, even during approach/departure.
  for (const b of [...layout.boxes, ...layout.surfaces]) assert.ok(maxZ < b.minZ || minZ > b.maxZ, `Train band intersects ${b.id}`);
});

test('eight actual arrivals stop precisely in both directions with continuous velocity, acceleration and position', () => {
  const train = new TrainOperation(); let previous = train.snapshot, stops = 0;
  let maxAcceleration = 0, maxVelocityStep = 0, maxJerk = 0, maxDisplacement = 0;
  const directions = new Set(), sequence = [], stopTimes = [];
  for (let ticks = 0; ticks < 90000 && stops < 8; ticks++) {
    train.update(1 / 30, 12); const s = train.snapshot;
    maxVelocityStep = Math.max(maxVelocityStep, Math.abs(s.velocity - previous.velocity));
    maxAcceleration = Math.max(maxAcceleration, Math.abs(s.acceleration));
    maxJerk = Math.max(maxJerk, Math.abs(s.acceleration - previous.acceleration) * 30);
    maxDisplacement = Math.max(maxDisplacement, Math.abs(s.x - previous.x));
    assert.ok(Math.abs(s.x - previous.x) <= TRAIN_DEFAULTS.cruiseSpeed / 30 + 1e-8, 'Position jumped');
    assert.ok(Math.abs(s.velocity - previous.velocity) <= .75 / 30 + 1e-8, 'Velocity jumped');
    assert.ok(s.speed <= TRAIN_DEFAULTS.cruiseSpeed + 1e-9);
    if (s.state !== previous.state) sequence.push(s.state);
    if (s.state === 'RUNNING' && previous.state === 'ACCELERATING' && s.destination === 'turnback') {
      const g = railGeometry();
      assert.ok(s.x - g.halfLength > -71 && s.x + g.halfLength < 71, 'Departure reaches normal running beyond the rendered track');
    }
    if (s.state === 'DECELERATING') assert.ok(s.direction * (s.x - RAIL_PLATFORM.stopX) <= 1e-8, 'Station overshoot');
    if (['STOPPED', 'DOOR OPENING', 'DWELLING', 'DEPARTURE WARNING', 'DOOR CLOSING', 'PREPARING DEPARTURE'].includes(s.state)) { near(s.x, RAIL_PLATFORM.stopX); near(s.velocity, 0); }
    if (s.velocity !== 0) assert.ok(s.allDoorsClosed && s.doors.every(d => d.closedConfirmed));
    if (s.completedStops > stops) {
      stops = s.completedStops; stopTimes.push(ticks / 30); directions.add(s.direction); near(s.lastStopError, 0);
      assert.ok(Math.abs(s.stoppingError) <= RAIL_PLATFORM.tolerance);
    }
    previous = s;
  }
  assert.equal(stops, 8); assert.equal(directions.size, 2);
  assert.ok(sequence.join('|').includes('APPROACHING|DECELERATING|STOPPED|DOOR OPENING|DWELLING|DEPARTURE WARNING|DOOR CLOSING|PREPARING DEPARTURE|ACCELERATING|RUNNING'));
  assert.ok(maxAcceleration <= .75 + 1e-9 && maxVelocityStep < .026 && maxDisplacement <= 4 / 30 + 1e-8 && maxJerk <= .375 + 1e-8);
  for (let i = 2; i < stopTimes.length; i++) near(stopTimes[i] - stopTimes[i - 2], stopTimes[2] - stopTimes[0], 1 / 30 + 1e-8);
});

test('dwell is configurable and consumes simulation seconds while the daylight clock is held', () => {
  const train = new TrainOperation({ dwellSeconds: 7 });
  advance(train, s => s.state === 'DWELLING');
  const start = train.snapshot;
  train.update(6.9 - start.stateElapsed, 12); assert.equal(train.snapshot.state, 'DWELLING'); near(train.snapshot.velocity, 0);
  train.update(.1, 12); assert.equal(train.snapshot.state, 'DEPARTURE WARNING');
  train.update(train.config.departureWarningSeconds, 12); assert.equal(train.snapshot.state, 'DOOR CLOSING');
  train.update(train.config.doorClosingSeconds, 12); assert.equal(train.snapshot.state, 'PREPARING DEPARTURE');
  train.update(3, 12); assert.equal(train.snapshot.state, 'ACCELERATING'); near(train.snapshot.speed, 0);
  train.update(4, 12); near(train.snapshot.speed, 2);
});

test('fixed-step city train is identical across 144 Hz, 30 Hz, low FPS, camera positions and population seeds', () => {
  const configs = [[1 / 144], [1 / 30], [.5], [.006, .071, .013, .38, .15]];
  for (const hourRate of [0, .06]) {
    const snapshots = configs.map((frames, index) => {
      const sim = new CitySimulation({ seed: 42 + index }); let time = 0, i = 0;
      sim.update(0, hourRate ? .99 : 12);
      while (time < 140 - 1e-9) { const dt = Math.min(frames[i++ % frames.length], 140 - time); sim.update(dt, sim.hour, { x: index * 14, y: index * 5, z: -50 }, hourRate); time += dt; }
      return { clock: sim.clock, hour: sim.hour, train: sim.train.snapshot };
    });
    for (const s of snapshots.slice(1)) assert.deepEqual(s, snapshots[0]);
    assert.ok(snapshots[0].train.completedStops >= 1);
    if (hourRate) near(snapshots[0].hour, .99 + 140 * .06);
  }
});

test('01:00 closure drains every station phase without hiding, snapping or admitting another arrival; 05:00 restarts from rest', () => {
  for (const phase of ['APPROACHING', 'DECELERATING', 'STOPPED', 'DOOR OPENING', 'DWELLING', 'DEPARTURE WARNING', 'DOOR CLOSING', 'PREPARING DEPARTURE', 'ACCELERATING', 'RUNNING']) {
    const train = new TrainOperation();
    advance(train, s => s.state === phase && (phase !== 'ACCELERATING' && phase !== 'RUNNING' || s.completedStops === 1));
    let previous = train.snapshot;
    const admittedStops = previous.completedStops + (['APPROACHING', 'DECELERATING'].includes(phase) ? 1 : 0);
    for (let i = 0; i < 18000 && train.snapshot.active; i++) {
      train.update(1 / 30, 1); const s = train.snapshot;
      assert.ok(Math.abs(s.x - previous.x) <= 4 / 30 + 1e-8);
      assert.ok(Math.abs(s.velocity - previous.velocity) <= .02500001);
      if (!s.active) { near(s.speed, 0); assert.ok(s.x === TRAIN_DEFAULTS.westTurnbackX || s.x === TRAIN_DEFAULTS.eastTurnbackX); }
      previous = s;
    }
    assert.equal(train.snapshot.active, false, phase); assert.equal(train.snapshot.completedStops, admittedStops);
    const parked = train.snapshot.x;
    train.update(600, 4.999); near(train.snapshot.x, parked); near(train.snapshot.speed, 0);
    train.update(0, 5); assert.equal(train.snapshot.active, true); near(train.snapshot.x, parked); near(train.snapshot.speed, 0);
    advance(train, s => s.completedStops === admittedStops + 1); near(train.snapshot.lastStopError, 0);
  }
  const closed = new TrainOperation(); closed.update(3600, 3); assert.equal(closed.snapshot.active, false); assert.equal(closed.snapshot.completedStops, 0);
  closed.update(0, 24.5); assert.equal(closed.snapshot.active, true);
});

test('invalid train geometry/timing is rejected before movement', () => {
  for (const config of [{ dwellSeconds: -1 }, { cruiseSpeed: 0 }, { brakingSeconds: NaN }, { eastTurnbackX: 80 }]) assert.throws(() => new TrainOperation(config));
});
