import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { Navigation } from '../src/world/simulation/Navigation.ts';
import { PlayerController } from '../src/world/controls/PlayerController.ts';
import { legPose } from '../src/world/simulation/CharacterPose.ts';

test('original GLBs load with finite metre-scale geometry and shared material budgets', async () => {
  for (const file of ['paper-lantern', 'ac-condenser', 'twin-street-lamp']) {
    const bytes = await readFile(new URL(`../public/assets/nightlife/${file}.glb`, import.meta.url));
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const size = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3()), materials = new Set(); let meshes = 0;
    gltf.scene.traverse(o => { if (!o.isMesh) return; meshes++; assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite)); materials.add(o.material.uuid); });
    assert.ok(meshes > 10); assert.equal(materials.size, 4); assert.ok(Math.max(size.x, size.y, size.z) < 1.5); assert.ok(size.length() > .5);
  }
});
test('alley destinations connect to their own side and never cut across the main road', () => {
  const doors = [{ x: -12, z: -23.3, sidewalkX: -4.55, business: 'restaurant', area: 'alley', approachX: -12, approachZ: -25 }, { x: 12, z: -26.7, sidewalkX: 4.55, business: 'restaurant', area: 'alley', approachX: 12, approachZ: -25 }];
  const nav = new Navigation([], doors);
  for (const door of doors) {
    const end = nav.nodes.find(n => n.door === door), start = nav.nodes.find(n => n.area === 'alley' && Math.sign(n.x) === Math.sign(door.x) && !n.door);
    const path = nav.path(start.id, end.id); assert.ok(path.length >= 3); assert.ok(path.every(id => Math.sign(nav.nodes[id].x) === Math.sign(door.x)));
  }
});
test('first teleport faces its target correctly even when starting due east', () => {
  // Exercise the real controller method without registering browser input listeners.
  const controller = Object.create(PlayerController.prototype); controller.camera = new THREE.PerspectiveCamera(); controller.velocity = new THREE.Vector3(); controller.keys = new Set(); controller.safe = new THREE.Vector3(); controller.colliders = []; controller.mode = 'walk';
  const position = new THREE.Vector3(-18.8, 1.82, -25), target = new THREE.Vector3(16, 3.8, -25);
  controller.teleport(position, target);
  const direction = controller.camera.getWorldDirection(new THREE.Vector3()), expected = target.sub(position).normalize(); assert.ok(direction.dot(expected) > .99999);
});
test('walking joints maintain upper and lower limb lengths through a complete stride', () => {
  for (let phase = 0; phase < Math.PI * 2; phase += .05) for (const side of [-1, 1]) {
    const p = legPose(Math.sin(phase) * .46, side);
    assert.ok(Math.abs(Math.hypot(p.hip.y - p.knee.y, p.hip.z - p.knee.z) - .34) < 1e-10);
    assert.ok(Math.abs(Math.hypot(p.knee.y - p.ankle.y, p.knee.z - p.ankle.z) - .34) < 1e-10);
    assert.ok(p.ankle.y > .09 && p.ankle.y < .25);
  }
});
