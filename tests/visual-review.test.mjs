import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHumanGeometry } from '../src/world/simulation/HumanGeometry.ts';
import { skylineLayout, SKYLINE_FAMILIES, skylineFootprint, overlaps, PLAYABLE_ENVELOPE, RAIL_ENVELOPE, TOWER_ENVELOPE } from '../src/world/generation/SkylineLayout.ts';
import { ContactShading } from '../src/world/effects/ContactShading.ts';
import { pedestrianSurfaceHeight } from '../src/world/simulation/CharacterPose.ts';

test('human meshes retain adult proportions and lengths required by the walking joints', () => {
  const meshes = createHumanGeometry();
  const size = key => meshes[key].boundingBox.getSize(new THREE.Vector3());
  assert.ok(Math.abs(size('head').x - .16) < .001); assert.ok(Math.abs(size('head').y - .23) < .001);
  assert.ok(size('torso').x / size('head').x > 2.5);
  for (const key of ['upperLeg', 'lowerLeg']) assert.ok(Math.abs(size(key).y - .34) < .001);
  assert.ok(Math.abs(size('upperArm').y - .25) < .001); assert.ok(Math.abs(size('forearm').y - .23) < .001);
  for (const g of Object.values(meshes)) { assert.ok([...g.attributes.position.array].every(Number.isFinite)); assert.ok([...g.attributes.normal.array].every(Number.isFinite)); assert.ok(g.boundingSphere.radius > 0); g.dispose(); }
});
test('background layouts are deterministic, varied and outside protected playable/landmark space', () => {
  const a = skylineLayout(), b = skylineLayout(); assert.deepEqual(a, b); assert.ok(a.length > 60); assert.equal(new Set(a.map(s => s.family)).size, SKYLINE_FAMILIES.length);
  assert.ok(new Set(a.map(s => s.floors)).size > 12); assert.ok(a.some(s => s.yaw !== 0));
  for (const s of a) {
    const hx = (Math.abs(Math.cos(s.yaw)) * s.width + Math.abs(Math.sin(s.yaw)) * s.depth) / 2, hz = (Math.abs(Math.cos(s.yaw)) * s.depth + Math.abs(Math.sin(s.yaw)) * s.width) / 2;
    assert.ok(!(s.x - hx < 66 && s.x + hx > -66 && s.z - hz < 68 && s.z + hz > -68));
    for(const protectedSpace of [PLAYABLE_ENVELOPE,RAIL_ENVELOPE,TOWER_ENVELOPE])assert.ok(!overlaps(skylineFootprint(s),protectedSpace));
  }
});
test('contact depth excludes glass/effects and restores every original visibility state', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(), geometry = new THREE.BoxGeometry();
  const opaque = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()), glass = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ transparent: true })), reflector = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()), hidden = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  reflector.isReflector = true; hidden.visible = false; scene.add(opaque, glass, reflector, hidden);
  const pass = new ContactShading(scene, camera, 1920, 1080); pass.setSize(1920, 1080); assert.equal(pass.width, 960); assert.equal(pass.height, 540);
  pass.overrideVisibility(); assert.equal(opaque.visible, true); assert.equal(glass.visible, false); assert.equal(reflector.visible, false); assert.equal(hidden.visible, false);
  pass.restoreVisibility(); assert.equal(opaque.visible, true); assert.equal(glass.visible, true); assert.equal(reflector.visible, true); assert.equal(hidden.visible, false);
  pass.dispose();
});
test('rendered foot height follows alley asphalt and continuous crossing curb approaches', () => {
  assert.equal(pedestrianSurfaceHeight(-16, -25), .012); assert.equal(pedestrianSurfaceHeight(28.15, 40), .012); assert.equal(pedestrianSurfaceHeight(4.55, 40), .115);
  let previous = .03;
  for (let x = 3.3; x <= 4.4; x += .01) { const h = pedestrianSurfaceHeight(x, 21.4); assert.ok(h >= previous - 1e-8); assert.ok(h - previous < .002); previous = h; }
  assert.ok(Math.abs(pedestrianSurfaceHeight(4.4, 21.4) - .115) < 1e-8);
});
