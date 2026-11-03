import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type NightlifeAsset = 'paper-lantern' | 'ac-condenser' | 'twin-street-lamp';
export interface AssetPlacement { asset: NightlifeAsset; position: THREE.Vector3; yaw: number; scale: number }

/** Imported model parts are flattened once by material, then shared across all placements. */
export class NightlifeAssets {
  readonly group = new THREE.Group();
  readonly errors: string[] = [];
  readonly ready: Promise<void>;
  loaded = 0;
  private readonly luminous: { material: THREE.MeshStandardMaterial; intensity: number }[] = [];
  constructor(placements: AssetPlacement[]) {
    const loader = new GLTFLoader(); this.group.name = 'Instanced original GLB street props';
    this.ready = Promise.all((['paper-lantern', 'ac-condenser', 'twin-street-lamp'] as const).map(async asset => {
      try {
        const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}assets/nightlife/${asset}.glb`); gltf.scene.updateMatrixWorld(true);
        const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
        gltf.scene.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return;
          if (Array.isArray(object.material)) throw new Error('Street assets require one material per primitive');
          let geometry = object.geometry.clone().applyMatrix4(object.matrixWorld); if (geometry.index) geometry = geometry.toNonIndexed();
          for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name);
          const list = byMaterial.get(object.material); if (list) list.push(geometry); else byMaterial.set(object.material, [geometry]);
        });
        const selected = placements.filter(p => p.asset === asset), matrix = new THREE.Matrix4();
        for (const [material, geometries] of byMaterial) {
          const geometry = mergeGeometries(geometries); geometries.forEach(g => g.dispose()); if (!geometry) throw new Error('Model merge failed');
          const mesh = new THREE.InstancedMesh(geometry, material, selected.length);
          selected.forEach((p, i) => { matrix.compose(p.position, new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, p.yaw), new THREE.Vector3().setScalar(p.scale)); mesh.setMatrixAt(i, matrix); });
          if (material instanceof THREE.MeshStandardMaterial && material.emissiveIntensity > 0) this.luminous.push({ material, intensity: material.emissiveIntensity });
          mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere(); mesh.name = `${asset} / ${material.name}`; this.group.add(mesh);
        }
        this.loaded++;
      } catch (error) { this.errors.push(`${asset}: ${String(error)}`); }
    })).then(() => {});
  }
  setLighting(night: number, open: boolean): void { this.luminous.forEach(({ material, intensity }) => { material.emissiveIntensity = intensity * (.025 + night * .975) * (open ? 1 : .035); }); }
}
