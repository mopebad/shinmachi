import * as THREE from 'three';

export interface Bounds { minX: number; maxX: number; minZ: number; maxZ: number }
export interface Doorway { x: number; z: number; sidewalkX: number; business?: import('./simulation/WorldRules').Business }
export interface Shopfront { x: number; z: number; rotation: number; width: number; business: import('./simulation/WorldRules').Business }
export interface District {
  group: THREE.Group;
  colliders: Bounds[];
  doors: Doorway[];
  shopfronts: Shopfront[];
  lamps: THREE.Vector3[];
  materials: {
    signs: THREE.MeshStandardMaterial;
    windows: THREE.MeshStandardMaterial;
    warmWindows: THREE.MeshStandardMaterial;
    lamps: THREE.MeshStandardMaterial;
    shop: THREE.MeshStandardMaterial;
    lantern: THREE.MeshStandardMaterial;
    businesses: Record<import('./simulation/WorldRules').Business, { surface: THREE.MeshStandardMaterial; light: THREE.MeshStandardMaterial; window: THREE.MeshStandardMaterial }>;
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
