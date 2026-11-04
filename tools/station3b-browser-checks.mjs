import * as THREE from 'three';
import { CitySimulation } from '../src/world/simulation/CitySimulation.ts';
import { RAIL_PLATFORM, RAIL_VEHICLE, railGeometry } from '../src/world/simulation/RailGeometry.ts';
import { TRAIN_DOOR } from '../src/world/simulation/TrainDoors.ts';
import { STATION, stationBodyBlocked, stationSupport } from '../src/world/generation/StationLayout.ts';
import { exerciseStation } from './station2-validation.mjs';
const require = (ok, message) => { if (!ok) throw new Error(message); };
const observedDoor = 'car-2-south-2';
const summary = sim => {
  const s = sim.train.snapshot;
  return { simulationClock: sim.clock, state: s.state, stateElapsed: s.stateElapsed, x: s.x, velocity: s.velocity,
    stoppingError: s.stoppingError, completedStops: s.completedStops, allDoorsClosed: s.allDoorsClosed,
    doorCycles: s.doorCycles, doorReopenings: s.doorReopenings, warningLampOn: s.warningLampOn,
    doors: s.doors.map(d => ({ id: d.id, state: d.state, fraction: d.fraction, leafSpeed: d.leafSpeed, closedConfirmed: d.closedConfirmed, obstructed: d.obstructed })) };
};

function exerciseDoors(sim, seconds = 1200) {
  const result = { seconds, stops: 0, departures: 0, openingEvents: 0, transitions: [], maxLeafStep: 0,
    maxLeafSpeed: 0, movingDoorViolations: 0, wrongSideViolations: 0, unsafeOpeningViolations: 0 };
  let old = sim.train.snapshot;
  for (let tick = 0; tick < seconds * 30; tick++) {
    sim.update(1 / 30, 12); const s = sim.train.snapshot;
    if (s.state !== old.state) result.transitions.push(summary(sim));
    if (s.completedStops > old.completedStops) result.stops++;
    if (s.state === 'DWELLING' && old.state === 'DOOR OPENING') result.openingEvents++;
    if (s.state === 'ACCELERATING' && old.state === 'PREPARING DEPARTURE') result.departures++;
    for (const [i, d] of s.doors.entries()) {
      result.maxLeafStep = Math.max(result.maxLeafStep, TRAIN_DOOR.leafTravel * Math.abs(d.fraction - old.doors[i].fraction));
      result.maxLeafSpeed = Math.max(result.maxLeafSpeed, Math.abs(d.leafSpeed));
      if (s.speed > 0 && !d.closedConfirmed) result.movingDoorViolations++;
      if (!d.platformSide && !d.closedConfirmed) result.wrongSideViolations++;
      if (d.fraction > 0 && (!d.boarding.aligned || s.velocity !== 0)) result.unsafeOpeningViolations++;
    }
    old = s;
  }
  require(result.departures >= 6 && !result.movingDoorViolations && !result.wrongSideViolations && !result.unsafeOpeningViolations, 'Train-door cycle regression');
  require(result.maxLeafStep <= .55 * 1.5 / sim.train.config.doorOpeningSeconds / 30 + 1e-8, 'Door position jumped');
  return result;
}

function renderedGeometry(w, train) {
  train.updateMatrixWorld(true);
  const doors = w.activity.simulation.train.doors;
  const result = { leafInstances: 0, maxLeafPositionError: 0, movingStaticIntersections: 0,
    openApertureRays: 0, blockedApertureRays: 0, floorRays: 0, maxFloorError: 0, supportedBoardingAnchors: 0 };
  const staticParts = [], movingParts = [], matrix = new THREE.Matrix4();
  train.traverse(mesh => {
    if (!mesh.isInstancedMesh) return;
    mesh.geometry.computeBoundingBox();
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      const metadata = mesh.userData.trainDoorParts?.[i];
      const localX = matrix.elements[12];
      const box = mesh.geometry.boundingBox.clone().applyMatrix4(matrix.clone().premultiply(mesh.matrixWorld));
      if (metadata) {
        movingParts.push({ box, ...metadata }); result.leafInstances++;
        if (metadata.part === 'panel') {
          const d = doors.find(d => d.id === metadata.doorId);
          const expected = d.localX + metadata.leaf * (TRAIN_DOOR.leafWidth / 2 + TRAIN_DOOR.leafTravel * d.fraction);
          result.maxLeafPositionError = Math.max(result.maxLeafPositionError, Math.abs(localX - expected));
        }
      } else staticParts.push(box);
    }
  });
  // AABB boxes are exact for the box-kit shell, panel, stripe, frames and handles.
  for (const p of movingParts) for (const b of staticParts) {
    const overlap = Math.min(p.box.max.x, b.max.x) - Math.max(p.box.min.x, b.min.x);
    if (overlap <= 1e-5) continue;
    if (Math.min(p.box.max.y, b.max.y) - Math.max(p.box.min.y, b.min.y) > 1e-5 &&
      Math.min(p.box.max.z, b.max.z) - Math.max(p.box.min.z, b.min.z) > 1e-5) result.movingStaticIntersections++;
  }
  for (const d of doors.filter(d => d.state === 'OPEN')) {
    const x = (d.opening.minX + d.opening.maxX) / 2;
    for (const dx of [-.4, 0, .4]) for (const dy of [.15, .7, 1.35, 1.72]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(x + dx, d.opening.bottomY + dy, d.opening.z + .005), new THREE.Vector3(0, 0, -1), 0, .8);
      const hits = ray.intersectObject(train, true);
      result.openApertureRays++; if (hits.length) result.blockedApertureRays++;
    }
    const p = d.boarding.platformPoint;
    require(stationSupport(w.district.station, p.x, p.z, p.y) !== null && !stationBodyBlocked(w.district.station, p.x, p.z, p.y), 'Unsafe future boarding anchor');
    result.supportedBoardingAnchors++;
  }
  for (const center of railGeometry().centers) for (const dx of [-4, -1.5, 0, 1.35, 4]) for (const z of [-1.05, -.6, 0, .6, 1.05]) {
    const ray = new THREE.Raycaster(new THREE.Vector3(train.position.x + center + dx, 7.7, STATION.trackZ + z), new THREE.Vector3(0, -1, 0), 0, .4);
    const hit = ray.intersectObject(train, true)[0]; require(hit, 'Missing cabin floor');
    result.floorRays++; result.maxFloorError = Math.max(result.maxFloorError, Math.abs(hit.point.y - RAIL_VEHICLE.sillY));
  }
  require(result.maxLeafPositionError < 1e-5 && !result.movingStaticIntersections && !result.blockedApertureRays && result.maxFloorError < .002, 'Rendered door/body collision or blocked aperture: ' + JSON.stringify(result));
  return result;
}

export async function review() {
  const w = window.__shinmachi; await w.assetsReady;
  w.setReviewPaused(true); w.setPlaying(false); w.setTime(12); w.activity.setStationDebug(false);
  const config = { seed: 8412, bounds: w.district.colliders, doors: w.district.doors, station: w.district.station };
  const result = { seed: 8412, configuration: w.activity.simulation.train.config, captures: [], observations: [], geometrySamples: [] };
  result.cycles = exerciseDoors(new CitySimulation(config));
  result.pedestrianRegression = exerciseStation(new CitySimulation(config));
  const sim = w.activity.simulation, train = w.scene.getObjectByName('Three-car stainless Shinmachi Line train');
  const advance = predicate => {
    for (let tick = 0; tick < 30000; tick++) { if (predicate(sim.train.snapshot)) return; sim.update(1 / 30, 12); }
    throw new Error('Timed out awaiting live doors: ' + sim.train.snapshot.state);
  };
  const sampleGeometry = () => { w.activity.update(0, 12); const record = { ...summary(sim), rendered: renderedGeometry(w, train) }; result.geometrySamples.push(record); };
  const capture = async (name, framing) => {
    w.activity.update(0, 12); const record = { name, ...summary(sim), observedDoor: sim.train.doors.find(d => d.id === observedDoor) };
    result.observations.push(record); result.captures.push(await w.captureBenchmark(name, 'station', 12, framing));
  };
  advance(s => s.state === 'STOPPED' && s.direction === 1);
  const d = sim.train.doors.find(d => d.id === observedDoor), x = (d.opening.minX + d.opening.maxX) / 2;
  const closeup = { eye: [x + 1.4, 9.6, -53.1], target: [x, 8.6, -55.68], fov: 60 };
  await capture('station3b-doors-closed', closeup); sampleGeometry();
  advance(s => s.state === 'DOOR OPENING' && s.doors.find(d => d.id === observedDoor).fraction > .42);
  await capture('station3b-doors-opening', closeup); sampleGeometry();
  advance(s => s.state === 'DWELLING' && s.stateElapsed > 2);
  await capture('station3b-doors-open', closeup); sampleGeometry();
  result.boardingInterface = sim.train.doors;
  await capture('station3b-open-interior', { eye: [x, 8.4, -56.9], target: [x, 8.35, -54.5], fov: 76 });
  advance(s => s.state === 'DEPARTURE WARNING' && s.warningLampOn);
  await capture('station3b-departure-warning', closeup);
  advance(s => s.state === 'DOOR CLOSING' && s.doors.find(d => d.id === observedDoor).fraction < .58);
  await capture('station3b-doors-closing', closeup); sampleGeometry();
  advance(s => s.state === 'PREPARING DEPARTURE'); sampleGeometry();
  result.closedInterlock = summary(sim);
  advance(s => s.state === 'ACCELERATING' && s.speed > 1);
  await capture('station3b-departing', { eye: [35, 28, -72], target: [34.75, 8.3, -55], fov: 70 });
  advance(s => s.state === 'RUNNING' && s.destination === 'turnback' && s.motion === 'cruise'); result.running = summary(sim);
  // Interrupt the next real closing cycle; an authoritative sensor input, never a posed mesh.
  advance(s => s.state === 'DOOR CLOSING' && s.doors.find(d => d.id === observedDoor).fraction < .6);
  result.obstruction = { before: summary(sim), inputAccepted: sim.train.setDoorObstructed(observedDoor, true) };
  const position = sim.train.x;
  for (let i = 0; i < 60 * 30; i++) { sim.update(1 / 30, 12); require(sim.train.x === position && sim.train.snapshot.velocity === 0, 'Blocked door allowed departure'); }
  result.obstruction.held = summary(sim); require(result.obstruction.held.doorReopenings > 0, 'No obstruction recovery');
  sim.train.setDoorObstructed(observedDoor, false);
  advance(s => s.state === 'ACCELERATING'); result.obstruction.recovered = summary(sim);
  require(result.obstruction.recovered.allDoorsClosed, 'Departure without closed limits');
  const gl = w.renderer.getContext();
  result.failedShaderLinks = w.renderer.info.programs.filter(p => !gl.getProgramParameter(p.program, gl.LINK_STATUS)).length;
  result.pageErrors = window.__station3bErrors ?? []; result.assets = { loaded: w.nightlife.assets.loaded, errors: w.nightlife.assets.errors };
  require(!result.pageErrors.length && !result.failedShaderLinks && !result.assets.errors.length, 'Browser rendering failure');
  const saved = await fetch('/__review/capture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'station3b-measurements', metadata: result }) });
  require(saved.ok, 'Could not save door measurements'); window.__station3bReview = result; return result;
}
