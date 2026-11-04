import { RAIL_PLATFORM, RAIL_VEHICLE, railGeometry } from '../src/world/simulation/RailGeometry.ts';
import { STATION } from '../src/world/generation/StationLayout.ts';
const require = (ok, message) => { if (!ok) throw new Error(message); };

/** Observe actual fixed-step state, including unrendered continuous turnbacks. */
export function exerciseTrain(sim, seconds = 1500) {
  const g = railGeometry(), result = { seconds, stops: [], transitions: [], samples: [],
    maxStopError: 0, maxVelocityStep: 0, maxAcceleration: 0, maxJerk: 0, maxDisplacement: 0,
    geometryCollisions: 0, passengerIntersections: 0, minimumPassengerClearance: Infinity };
  let old = sim.train.snapshot;
  for (let tick = 0; tick < seconds * 30; tick++) {
    sim.update(1 / 30, 12); const s = sim.train.snapshot;
    const { doors, ...operation } = s;
    const record = { simulationClock: sim.clock, ...operation, doors: doors.map(d => ({ id: d.id, state: d.state, fraction: d.fraction, closedConfirmed: d.closedConfirmed })) };
    result.maxVelocityStep = Math.max(result.maxVelocityStep, Math.abs(s.velocity - old.velocity));
    result.maxAcceleration = Math.max(result.maxAcceleration, Math.abs(s.acceleration));
    result.maxJerk = Math.max(result.maxJerk, Math.abs(s.acceleration - old.acceleration) * 30);
    result.maxDisplacement = Math.max(result.maxDisplacement, Math.abs(s.x - old.x));
    if (s.state !== old.state) result.transitions.push(record);
    if (tick % 30 === 0) result.samples.push(record);
    if (s.completedStops !== old.completedStops) {
      result.stops.push(record); result.maxStopError = Math.max(result.maxStopError, Math.abs(s.stoppingError));
      require(s.x - g.halfLength >= RAIL_PLATFORM.minX && s.x + g.halfLength <= RAIL_PLATFORM.maxX, 'Stopped train outside usable frontage');
    }
    if (s.state === 'DECELERATING') require(s.direction * (s.x - s.stopX) < 1e-7, 'Train overshot');
    const minX = s.x - g.halfLength, maxX = s.x + g.halfLength;
    for (const b of [...sim.navigation.station.layout.boxes, ...sim.navigation.station.layout.surfaces]) {
      if (maxX > b.minX && minX < b.maxX && STATION.trackZ + RAIL_VEHICLE.halfWidth > b.minZ && STATION.trackZ - RAIL_VEHICLE.halfWidth < b.maxZ) result.geometryCollisions++;
    }
    for (const p of sim.pedestrians.filter(p => p.active && p.y > 6.5)) {
      const clearance = p.z - .25 - (STATION.trackZ + RAIL_VEHICLE.halfWidth);
      result.minimumPassengerClearance = Math.min(result.minimumPassengerClearance, clearance);
      if (p.x + .25 > minX && p.x - .25 < maxX && clearance < 0) result.passengerIntersections++;
    }
    old = s;
  }
  require(result.stops.length >= 8 && new Set(result.stops.map(s => s.direction)).size === 2, 'Insufficient actual arrivals');
  require(result.maxStopError <= RAIL_PLATFORM.tolerance && result.maxVelocityStep <= .02500001 && result.maxAcceleration <= .75000001 && result.maxJerk <= .37500001 && result.maxDisplacement <= 4 / 30 + 1e-8, 'Discontinuous train kinematics');
  require(!result.geometryCollisions && !result.passengerIntersections, 'Train intersected station or pedestrians');
  const beforeClosure = sim.train.snapshot;
  for (let tick = 0; tick < 600 * 30; tick++) sim.update(1 / 30, 1);
  result.closure = { before: beforeClosure, after: sim.train.snapshot, simulationClock: sim.clock };
  require(!result.closure.after.active && result.closure.after.speed === 0, 'Train did not withdraw after 01:00');
  sim.update(0, 5); result.reopening = { simulationClock: sim.clock, ...sim.train.snapshot };
  require(result.reopening.active && result.reopening.x === result.closure.after.x && result.reopening.speed === 0, '05:00 departure jumped');
  return result;
}
