import * as THREE from 'three';

export interface Bounds { minX: number; maxX: number; minZ: number; maxZ: number }
export interface Doorway { x: number; z: number; sidewalkX: number }
export interface District {
  group: THREE.Group;
  colliders: Bounds[];
  doors: Doorway[];
  lamps: THREE.Vector3[];
  materials: {
    signs: THREE.MeshStandardMaterial;
    windows: THREE.MeshStandardMaterial;
    warmWindows: THREE.MeshStandardMaterial;
    lamps: THREE.MeshStandardMaterial;
    shop: THREE.MeshStandardMaterial;
  };
  stats: { buildings: number; instances: number };
}

export const DISTRICT = {
  seed: 8412,
  extent: 68,
  roadHalfWidth: 3.7,
  sidewalkX: 4.8,
  crossingZ: 21.4,
  avenueZ: 12,
  railwayZ: -57,
};
