import * as THREE from 'three';
import { BUSINESSES, signBusiness } from '../simulation/WorldRules';
import { createSignAtlas } from './SignTextures';
import { faceKey, signAtlasUv } from './SignLayout.ts';
import type { SignFace } from './SignLayout.ts';

type Batch = { geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[]; colors: THREE.Color[]; sections: string[] };

/** Static kit parts are uploaded as instanced batches, not thousands of scene objects. */
export class CityBatch {
  private readonly batches = new Map<string, Batch>();
  private readonly box = new THREE.BoxGeometry(1, 1, 1);
  private readonly plane = new THREE.PlaneGeometry(1, 1);
  private readonly cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
  private readonly sphere = new THREE.SphereGeometry(1, 8, 6);
  private readonly torus = new THREE.TorusGeometry(1, .055, 4, 16);
  private readonly triangle = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-.5, .4), new THREE.Vector2(0, -.5), new THREE.Vector2(.5, .4), new THREE.Vector2(-.5, .4)]));
  private readonly rice = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-.5, -.5), new THREE.Vector2(.5, -.5), new THREE.Vector2(0, .5), new THREE.Vector2(-.5, -.5)]), { depth: 1, bevelEnabled: false }).translate(0, 0, -.5);
  private readonly object = new THREE.Object3D();
  private readonly transform = new THREE.Matrix4();
  private readonly signPositions: number[] = []; private readonly wirePositions: number[] = [];
  private readonly signBusinesses: number[] = [];
  private readonly signFaces: SignFace[] = [];
  instances = 0;
  private sectionName = '';
  private muted=0;
  /** Preserve legacy placement RNG draws while replacing an architectural presentation. */
  withoutGeometry(action:()=>void):void {this.muted++;try{action();}finally{this.muted--;}}
  /** Semantic attribution for spatial review; does not change batching or rendering. */
  section(name = ''): void { this.sectionName = name; }

  origin(x = 0, z = 0, rotation = 0, y = 0): void {
    this.transform.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation), new THREE.Vector3(1, 1, 1));
  }
  part(shape: 'box' | 'plane' | 'rice' | 'cylinder' | 'sphere' | 'torus' | 'triangle', material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0, tint = 0xffffff): void {
    if(this.muted)return;
    const key = shape + material.uuid;
    let batch = this.batches.get(key);
    if (!batch) { batch = { geometry: this[shape], material, matrices: [], colors: [], sections: [] }; this.batches.set(key, batch); }
    this.object.position.set(x, y, z); this.object.scale.set(sx, sy, sz); this.object.rotation.set(rx, ry, rz); this.object.updateMatrix();
    batch.matrices.push(new THREE.Matrix4().multiplyMatrices(this.transform, this.object.matrix)); batch.colors.push(new THREE.Color(tint)); batch.sections.push(this.sectionName); this.instances++;
  }
  b(material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, ry = 0): void { this.part('box', material, x, y, z, w, h, d, 0, ry); }
  panel(material: THREE.Material, x: number, y: number, z: number, w: number, h: number, ry = 0): void { this.part('plane', material, x, y, z, w, h, 1, 0, ry); }
  rod(material: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, radius: number): void {
    const midpoint = a.clone().add(b).multiplyScalar(.5), delta = b.clone().sub(a);
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()));
    this.part('cylinder', material, midpoint.x, midpoint.y, midpoint.z, radius, delta.length(), radius, e.x, e.y, e.z);
  }
  sign(index: number, x: number, y: number, z: number, w: number, h: number, rotation = 0, business = signBusiness(index >= 32 ? 12 : index)): void {
    if(this.muted)return;
    const matrix = new THREE.Matrix4().multiplyMatrices(this.transform, new THREE.Matrix4().makeRotationY(rotation).setPosition(x, y, z));
    for (const [vx, vy] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) {
      const p = new THREE.Vector3(vx, vy, 0).applyMatrix4(matrix); this.signPositions.push(p.x, p.y, p.z);
      this.signBusinesses.push(BUSINESSES.indexOf(business));
    }
    this.signFaces.push({ index, width: w, height: h, business: BUSINESSES.indexOf(business) });
  }
  cable(a: THREE.Vector3, b: THREE.Vector3, sag = .7): void {
    if(this.muted)return;
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
      mesh.userData.sections = batch.sections;
      mesh.castShadow = batch.geometry !== this.torus && !batch.material.transparent; mesh.receiveShadow = true; mesh.computeBoundingSphere(); group.add(mesh);
    }
    const atlas = createSignAtlas(this.signFaces), entries = new Map(atlas.entries.map(e => [e.key, e]));
    const positions = this.signPositions, businesses = this.signBusinesses;
    atlas.textures.forEach((texture, page) => {
      const p: number[] = [], uv: number[] = [], ids: number[] = [], indices: number[] = [];
      this.signFaces.forEach((face, i) => {
        const e = entries.get(faceKey(face))!; if (e.page !== page) return;
        const start = p.length / 3;
        p.push(...positions.slice(i * 12, i * 12 + 12)); ids.push(...businesses.slice(i * 4, i * 4 + 4));
        uv.push(...signAtlasUv(e, texture.image.width, texture.image.height)); indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
      });
      const material = (signMaterial as THREE.MeshStandardMaterial).clone();
      material.userData.openStates = signMaterial.userData.openStates;
      material.map = material.emissiveMap = texture; material.onBeforeCompile = signMaterial.onBeforeCompile; material.customProgramCacheKey = signMaterial.customProgramCacheKey;
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setAttribute('aBusiness', new THREE.Float32BufferAttribute(ids, 1)); geometry.setIndex(indices); geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material); mesh.name = `Measured sign faces / page ${page}`;
      mesh.userData.faces = this.signFaces;
      mesh.onBeforeRender = () => { material.emissiveIntensity = (signMaterial as THREE.MeshStandardMaterial).emissiveIntensity; };
      group.add(mesh);
    });
    const wires = new THREE.BufferGeometry(); wires.setAttribute('position', new THREE.Float32BufferAttribute(this.wirePositions, 3)); group.add(new THREE.LineSegments(wires, new THREE.LineBasicMaterial({ color: 0x20272b })));
    return group;
  }
}
