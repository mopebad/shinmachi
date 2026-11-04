// Run in the existing Vite page. Advance the real simulation; never pose/replace the train.
import * as THREE from 'three';
import { CitySimulation } from '../src/world/simulation/CitySimulation.ts';
import { RAIL_PLATFORM, RAIL_VEHICLE, railGeometry, stoppingEnvelope } from '../src/world/simulation/RailGeometry.ts';
import { STATION } from '../src/world/generation/StationLayout.ts';
import { exerciseTrain } from './station3-validation.mjs';
import { exerciseStation } from './station2-validation.mjs';
const require = (ok, message) => { if (!ok) throw new Error(message); };

export async function review() {
  const w = window.__shinmachi; await w.assetsReady;
  w.setPlaying(false); w.setReviewPaused(true); w.setTime(12); w.activity.setStationDebug(false);
  const config = { seed: 8412, bounds: w.district.colliders, doors: w.district.doors, station: w.district.station };
  const result = { seed: 8412, geometry: { old: stoppingEnvelope(4), selected: stoppingEnvelope(), usablePlatform: RAIL_PLATFORM,
    sillY: RAIL_VEHICLE.sillY, platformY: STATION.platformY,
    doorCenters: railGeometry().doors.map(x => x + RAIL_PLATFORM.stopX) }, captures: [], observations: [] };
  // These bounded validation worlds retain the real generated walls, shops and gate routes.
  result.trainValidation = exerciseTrain(new CitySimulation(config));
  result.pedestrianRegression = exerciseStation(new CitySimulation(config));
  const sim = w.activity.simulation;
  const train = w.scene.getObjectByName('Three-car stainless Shinmachi Line train'); require(train, 'Actual train missing');
  const advance = predicate => {
    for (let tick = 0; tick < 30000; tick++) {
      if (predicate(sim.train.snapshot)) return;
      sim.update(1 / 30, 12);
    }
    throw new Error('Timed out awaiting capture ' + JSON.stringify(sim.train.snapshot));
  };
  const framing = { eye: [35, 28, -72], target: [34.75, 8.3, -55], fov: 70 };
  const capture = async (name, view = framing) => {
    w.activity.update(0, 12); train.updateMatrixWorld(true);
    const s = sim.train.snapshot, actual = new THREE.Box3().setFromObject(train);
    require(Math.abs(train.position.x - s.x) < 1e-10 && train.position.z === STATION.trackZ, 'Presentation differs from model');
    result.observations.push({ name, simulationClock: sim.clock, ...s, renderedBounds: { min: actual.min.toArray(), max: actual.max.toArray() } });
    result.captures.push(await w.captureBenchmark(name, 'station', 12, view));
  };
  // If the page has already run, follow the next complete eastbound arrival.
  const initialStops = sim.train.snapshot.completedStops;
  advance(s => s.direction === 1 && s.state === 'APPROACHING' && s.x > -10 && s.completedStops >= initialStops);
  await capture('station3-approaching', { eye: [-42, 17, -66], target: [12, 8, -56], fov: 72 });
  advance(s => s.state === 'DECELERATING' && s.speed < 2 && s.speed > 1);
  await capture('station3-decelerating');
  advance(s => s.state === 'STOPPED');
  await capture('station3-stopped');
  result.geometry.renderedLength = result.observations.at(-1).renderedBounds.max[0] - result.observations.at(-1).renderedBounds.min[0];
  result.geometry.renderedWidth = result.observations.at(-1).renderedBounds.max[2] - result.observations.at(-1).renderedBounds.min[2];
  require(Math.abs(result.geometry.renderedLength - railGeometry().length) < 1e-5, 'Rendered train length differs from shared contract');
  require(Math.abs(result.geometry.renderedWidth - RAIL_VEHICLE.halfWidth * 2) < 1e-5, 'Rendered train width differs from shared contract');
  advance(s => s.state === 'DWELLING' && s.stateElapsed > 10);
  await capture('station3-dwelling');
  await capture('station3-platform-alignment', { eye: [58, 9.05, -54.2], target: [30, 8.5, -56], fov: 68 });
  advance(s => s.state === 'PREPARING DEPARTURE'); await capture('station3-preparing');
  advance(s => s.state === 'ACCELERATING' && s.speed > 1 && s.speed < 2); await capture('station3-departing');
  advance(s => s.state === 'RUNNING' && s.destination === 'turnback' && s.motion === 'cruise');
  require(sim.train.snapshot.x + railGeometry().halfLength < 71, 'Normal running starts beyond rendered rail');
  await capture('station3-running', { eye: [48, 26, -72], target: [48, 8.3, -55], fov: 70 });
  // Three more actual arrivals in the same rendered world, with no state resets.
  const completed = sim.train.snapshot.completedStops;
  for (let stop = completed + 1; stop <= completed + 3; stop++) {
    advance(s => s.completedStops === stop && s.state === 'STOPPED');
    await capture('station3-repeat-' + (stop - completed));
  }
  const box = new THREE.Box3().setFromObject(train), matrix = new THREE.Matrix4();
  result.renderedStation = { checkedInstances: 0, intersections: 0, minimumHorizontalClearance: Infinity };
  // Inspect actual uploaded station-side instance bounds, including frame details outside metadata boxes.
  w.district.group.updateMatrixWorld(true);
  w.district.group.traverse(mesh => {
    if (!mesh.isInstancedMesh) return;
    mesh.geometry.computeBoundingBox();
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix); matrix.premultiply(mesh.matrixWorld);
      const b = mesh.geometry.boundingBox.clone().applyMatrix4(matrix);
      if (b.max.x < STATION.platformMinX || b.min.x > STATION.platformMaxX || b.min.z < STATION.platformEdgeZ - .001 || b.min.z > STATION.platformRearZ + .1 || b.max.y < box.min.y || b.min.y > box.max.y) continue;
      result.renderedStation.checkedInstances++;
      if (b.intersectsBox(box)) result.renderedStation.intersections++;
      result.renderedStation.minimumHorizontalClearance = Math.min(result.renderedStation.minimumHorizontalClearance, b.min.z - box.max.z);
    }
  });
  require(result.renderedStation.checkedInstances > 100 && !result.renderedStation.intersections && result.renderedStation.minimumHorizontalClearance > .05, 'Actual train/station instance collision');
  const gl = w.renderer.getContext();
  result.failedShaderLinks = w.renderer.info.programs.filter(p => !gl.getProgramParameter(p.program, gl.LINK_STATUS)).length;
  result.assets = { loaded: w.nightlife.assets.loaded, errors: w.nightlife.assets.errors };
  result.pageErrors = window.__station3Errors ?? [];
  require(!result.pageErrors.length, 'Browser page exception');
  require(!result.failedShaderLinks && !result.assets.errors.length, 'Render/assets failed');
  result.clockContract = '30 Hz simulation seconds; time-of-day controls admission only; held daylight still permits movement; hidden pages pause.';
  result.performance = { unavailable: 'Deterministic review pauses rAF simulation; no new performance claim.' };
  window.__station3Review = result;
  const saved = await fetch('/__review/capture', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'station3-measurements', metadata: result }) });
  require(saved.ok, 'Could not save browser measurements');
  return result;
}
