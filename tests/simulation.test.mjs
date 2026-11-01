import test from 'node:test';
import assert from 'node:assert/strict';
import { CitySimulation, VEHICLE_PROFILES } from '../src/world/simulation/CitySimulation.ts';
import { businessOpen, dayState, laneRoute, sampleLane, railServiceOpen, signalState } from '../src/world/simulation/WorldRules.ts';
import { Navigation, segmentClear } from '../src/world/simulation/Navigation.ts';

test('lanes are left-hand traffic and turns join the correct outgoing lane', () => {
  for (const [entry, expected] of [['N', [1.8, -60]], ['S', [-1.8, 60]], ['E', [60, 14.2]], ['W', [-60, 9.8]]]) {
    const p = sampleLane(laneRoute(entry, false), 10); assert.ok(Math.abs(p.x - expected[0]) < .001 && Math.abs(p.z - expected[1]) < .001);
    const turn = laneRoute(entry, true), end = sampleLane(turn, turn.length); assert.ok(Math.abs(end.x) === 70 || Math.abs(end.z) === 70);
    for (let s = 0; s < turn.length - .1; s += .1) { const a = sampleLane(turn, s), b = sampleLane(turn, s + .1); assert.ok(Math.hypot(a.x - b.x, a.z - b.z) <= .101); }
  }
});

test('signals have clearance and occupancy interlocks, never conflicting greens', () => {
  for (let t = 0; t < 160; t += .05) { const s = signalState(t); assert.ok(!(s.ns === 'green' && s.ew === 'green')); assert.ok(!s.walk || (s.ns === 'red' && s.ew === 'red')); }
  assert.equal(signalState(5, true).ns, 'red'); assert.equal(signalState(32, false, true).ew, 'red'); assert.equal(signalState(55, false, true).walk, false);
});

test('navigation never joins the main sidewalk across the avenue without a zebra crossing', () => {
  const nav = new Navigation([], []);
  const from = nav.nodes.find(n => n.x === 4.55 && n.z === 2.6), to = nav.nodes.find(n => n.x === 4.55 && n.z === 21.4);
  const path = nav.path(from.id, to.id);
  assert.ok(path.some((id, i) => i > 0 && nav.edges.get(path[i - 1]).some(e => e.to === id && e.crossing)));
  assert.equal(segmentClear({ x: 0, z: 0 }, { x: 10, z: 0 }, [{ minX: 4, maxX: 6, minZ: -1, maxZ: 1 }]), false);
});

test('day/night and business hours agree at midnight, dawn and evening', () => {
  assert.equal(dayState(0).daylight, 0); assert.equal(dayState(12).night, 0); assert.equal(dayState(24).hour, 0);
  assert.equal(businessOpen('restaurant', .5), true); assert.equal(businessOpen('restaurant', 3), false);
  assert.equal(businessOpen('cafe', 22), false); assert.equal(businessOpen('convenience', 3), true);
  assert.equal(railServiceOpen(3), false); assert.equal(railServiceOpen(.5), true); assert.equal(railServiceOpen(6), true);
});

test('multi-cycle simulation obeys stop lines and prevents cars entering pedestrian crossings', () => {
  const sim = new CitySimulation({ seed: 12 });
  let turns = 0, crossings = 0;
  for (let step = 0; step < 16000; step++) {
    const previous = sim.vehicles.map(c => ({ active: c.active, committed: c.committed, s: c.s, id: c.id }));
    const waiting = sim.pedestrians.map(p => p.crossing);
    sim.update(1 / 30, step < 8000 ? 8 : 21);
    for (const c of sim.vehicles.filter(c => c.active)) {
      const old = previous.find(p => p.id === c.id), light = c.route.axis === 'NS' ? sim.signals.ns : sim.signals.ew;
      if (old?.active && !old.committed && c.committed) assert.equal(light, 'green');
      if (sim.signals.walk) assert.ok(!c.committed || Math.abs(c.x) >= 13 || c.z <= -4 || c.z >= 28);
      const stop = c.route.stopLine - VEHICLE_PROFILES[c.kind].length / 2 - .35;
      if (!c.committed && light !== 'green') assert.ok(c.s <= stop + .001);
      if (c.route.turn && c.s > c.route.stopLine + 12) turns++;
    }
    for (const p of sim.pedestrians.filter(p => p.active)) if (!waiting[p.id] && p.crossing) { assert.equal(sim.signals.walk, true); crossings++; }
  }
  assert.ok(turns > 0); assert.ok(crossings > 0);
});

test('seeded simulation is reproducible for the same update sequence', () => {
  const a = new CitySimulation({ seed: 42 }), b = new CitySimulation({ seed: 42 });
  for (let i = 0; i < 100; i++) { a.update(.1, 17); b.update(.1, 17); }
  assert.deepEqual(a.vehicles, b.vehicles); assert.deepEqual(a.pedestrians, b.pedestrians);
});

test('crossings clear and the junction remains live through a rush-hour to night transition', () => {
  const sim = new CitySimulation({ seed: 8412 }), began = new Map();
  let exits = 0, maxCrossing = 0;
  for (let i = 0; i < 18000; i++) {
    const previous = sim.vehicles.map(c => ({ active: c.active, s: c.s }));
    sim.update(1 / 30, i < 9000 ? 8 : 22);
    for (const c of sim.vehicles) if (previous[c.id]?.active && (!c.active || c.s < previous[c.id].s)) exits++;
    for (const p of sim.pedestrians) {
      if (p.active && p.crossing) { if (!began.has(p.id)) began.set(p.id, sim.clock); maxCrossing = Math.max(maxCrossing, sim.clock - began.get(p.id)); }
      else began.delete(p.id);
    }
  }
  assert.ok(maxCrossing < 25, `A pedestrian blocked a crossing for ${maxCrossing.toFixed(1)}s`);
  assert.ok(exits > 70, `Traffic stopped flowing: only ${exits} vehicles exited in ten minutes`);
});

test('vehicle footprints stay separated through queues, merges and left turns', () => {
  const sim = new CitySimulation({ seed: 193 });
  const overlap = (a, b) => {
    const pa = VEHICLE_PROFILES[a.kind], pb = VEHICLE_PROFILES[b.kind];
    const af = [Math.sin(a.yaw), Math.cos(a.yaw)], ar = [Math.cos(a.yaw), -Math.sin(a.yaw)], bf = [Math.sin(b.yaw), Math.cos(b.yaw)], br = [Math.cos(b.yaw), -Math.sin(b.yaw)];
    for (const axis of [af, ar, bf, br]) {
      const dot = v => Math.abs(v[0] * axis[0] + v[1] * axis[1]);
      const radius = dot(af) * pa.length / 2 + dot(ar) * pa.width / 2 + dot(bf) * pb.length / 2 + dot(br) * pb.width / 2;
      if (Math.abs((a.x - b.x) * axis[0] + (a.z - b.z) * axis[1]) >= radius - .04) return false;
    }
    return true;
  };
  for (let step = 0; step < 12000; step++) {
    sim.update(1 / 30, 18);
    const cars = sim.vehicles.filter(c => c.active);
    for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
      if (Math.hypot(cars[i].x - cars[j].x, cars[i].z - cars[j].z) > 7) continue;
      assert.ok(!overlap(cars[i], cars[j]), `Vehicle overlap at ${sim.clock.toFixed(2)}s: ${cars[i].route.entry}/${cars[i].route.exit} and ${cars[j].route.entry}/${cars[j].route.exit}`);
    }
  }
});
