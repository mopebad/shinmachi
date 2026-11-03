import * as THREE from 'three';
import { BUSINESSES, signBusiness } from '../simulation/WorldRules';

type Batch = { geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[]; colors: THREE.Color[] };

/** Static kit parts are uploaded as instanced batches, not thousands of scene objects. */
export class CityBatch {
  private readonly batches = new Map<string, Batch>();
  private readonly box = new THREE.BoxGeometry(1, 1, 1);
  private readonly cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
  private readonly sphere = new THREE.SphereGeometry(1, 8, 6);
  private readonly torus = new THREE.TorusGeometry(1, .055, 4, 16);
  private readonly triangle = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-.5, .4), new THREE.Vector2(0, -.5), new THREE.Vector2(.5, .4), new THREE.Vector2(-.5, .4)]));
  private readonly object = new THREE.Object3D();
  private readonly transform = new THREE.Matrix4();
  private readonly signPositions: number[] = []; private readonly signUVs: number[] = [];
  private readonly signIndices: number[] = []; private readonly wirePositions: number[] = [];
  private readonly signBusinesses: number[] = [];
  instances = 0;

  origin(x = 0, z = 0, rotation = 0, y = 0): void {
    this.transform.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation), new THREE.Vector3(1, 1, 1));
  }
  part(shape: 'box' | 'cylinder' | 'sphere' | 'torus' | 'triangle', material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0, tint = 0xffffff): void {
    const key = shape + material.uuid;
    let batch = this.batches.get(key);
    if (!batch) { batch = { geometry: this[shape], material, matrices: [], colors: [] }; this.batches.set(key, batch); }
    this.object.position.set(x, y, z); this.object.scale.set(sx, sy, sz); this.object.rotation.set(rx, ry, rz); this.object.updateMatrix();
    batch.matrices.push(new THREE.Matrix4().multiplyMatrices(this.transform, this.object.matrix)); batch.colors.push(new THREE.Color(tint)); this.instances++;
  }
  b(material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, ry = 0): void { this.part('box', material, x, y, z, w, h, d, 0, ry); }
  rod(material: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, radius: number): void {
    const midpoint = a.clone().add(b).multiplyScalar(.5), delta = b.clone().sub(a);
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()));
    this.part('cylinder', material, midpoint.x, midpoint.y, midpoint.z, radius, delta.length(), radius, e.x, e.y, e.z);
  }
  sign(index: number, x: number, y: number, z: number, w: number, h: number, rotation = 0): void {
    const start = this.signPositions.length / 3;
    const matrix = new THREE.Matrix4().multiplyMatrices(this.transform, new THREE.Matrix4().makeRotationY(rotation).setPosition(x, y, z));
    for (const [vx, vy] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) {
      const p = new THREE.Vector3(vx, vy, 0).applyMatrix4(matrix); this.signPositions.push(p.x, p.y, p.z);
      this.signBusinesses.push(BUSINESSES.indexOf(signBusiness(index)));
    }
    const slot = index + (w / h > 2.2 ? 0 : w / h < .3 ? 96 : w / h < .65 ? 64 : 32);
    const u = slot % 16 / 16, v = 1 - (Math.floor(slot / 16) + 1) / 8, e = .0007;
    this.signUVs.push(u + e, v + e, u + .0625 - e, v + e, u + .0625 - e, v + .125 - e, u + e, v + .125 - e);
    this.signIndices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  cable(a: THREE.Vector3, b: THREE.Vector3, sag = .7): void {
    let last = a.clone();
    for (let i = 1; i <= 18; i++) {
      const t = i / 18, p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * sag;
      this.wirePositions.push(...last.toArray(), ...p.toArray()); last = p;
    }
  }
  finish(signMaterial: THREE.Material): THREE.Group {
    const group = new THREE.Group(); group.name = 'Instanced district kit';
    for (const batch of this.batches.values()) {
      const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
      batch.matrices.forEach((matrix, i) => { mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, batch.colors[i]); });
      mesh.castShadow = batch.geometry !== this.torus; mesh.receiveShadow = true; mesh.computeBoundingSphere(); group.add(mesh);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.signPositions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.signUVs, 2)); geometry.setIndex(this.signIndices); geometry.computeVertexNormals();
    geometry.setAttribute('aBusiness', new THREE.Float32BufferAttribute(this.signBusinesses, 1));
    group.add(new THREE.Mesh(geometry, signMaterial));
    const wires = new THREE.BufferGeometry(); wires.setAttribute('position', new THREE.Float32BufferAttribute(this.wirePositions, 3)); group.add(new THREE.LineSegments(wires, new THREE.LineBasicMaterial({ color: 0x20272b })));
    return group;
  }
}
