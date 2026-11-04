import * as THREE from 'three';
import { TRAIN_DOOR, trainDoorDefinitions } from './TrainDoors';
import type { TrainDoorSnapshot } from './TrainDoors';

interface DoorPart { matrix: THREE.Matrix4; doorId: string; leaf: -1 | 1; part: string }
interface DoorMaterials { steel: THREE.Material; panel: THREE.Material; green: THREE.Material; dark: THREE.Material }

/** Bounded dynamic instance pools. Fractions/lamps come exclusively from train state. */
export class TrainDoorPresentation {
  private readonly pools: { mesh: THREE.InstancedMesh; parts: DoorPart[] }[] = [];
  private readonly matrix = new THREE.Matrix4();
  private readonly warning = new THREE.MeshStandardMaterial({ color: 0x453215, emissive: 0xffb52d, emissiveIntensity: 0 });
  constructor(parent: THREE.Group, materials: DoorMaterials) {
    const group = new THREE.Group(); group.name = 'Sliding passenger doors'; parent.add(group);
    const pools = new Map<THREE.Material, DoorPart[]>(), geometry = new THREE.BoxGeometry(1, 1, 1);
    const glass = new THREE.MeshStandardMaterial({ color: 0x83a39d, transparent: true, opacity: .48, roughness: .18, metalness: .2, depthWrite: false });
    const lamps: THREE.Matrix4[] = [];
    for (const d of trainDoorDefinitions()) {
      for (const leaf of [-1, 1] as const) {
        const center = d.localX + leaf * TRAIN_DOOR.leafWidth / 2;
        const box = (material: THREE.Material, part: string, dx: number, y: number, z: number, w: number, h: number, depth: number) => {
          const matrix = new THREE.Matrix4().compose(new THREE.Vector3(center + dx, y, d.side * z), new THREE.Quaternion(), new THREE.Vector3(w, h, depth));
          const list = pools.get(material) ?? []; list.push({ matrix, doorId: d.id, leaf, part }); pools.set(material, list);
        };
        // Real glazed apertures: passenger silhouettes are not painted onto moving leaves.
        const bottom = TRAIN_DOOR.centerY - TRAIN_DOOR.height / 2, top = bottom + TRAIN_DOOR.height;
        box(materials.panel, 'panel', 0, (bottom + 8.39) / 2, TRAIN_DOOR.panelZ, TRAIN_DOOR.leafWidth, 8.39 - bottom, TRAIN_DOOR.panelDepth);
        box(materials.panel, 'header', 0, (9.17 + top) / 2, TRAIN_DOOR.panelZ, TRAIN_DOOR.leafWidth, top - 9.17, TRAIN_DOOR.panelDepth);
        for (const sign of [-1, 1]) {
          box(materials.panel, 'stile', sign * .22375, 8.78, TRAIN_DOOR.panelZ, .0825, .78, TRAIN_DOOR.panelDepth);
          box(materials.dark, 'window-jamb', sign * .1925, 8.78, 1.396, .02, .82, .012);
        }
        for (const y of [8.38, 9.18]) box(materials.dark, 'window-trim', 0, y, 1.396, .405, .02, .012);
        box(materials.green, 'stripe', 0, 7.98, 1.398, .525, .38, .014);
        box(glass, 'window', 0, 8.78, 1.3875, .365, .78, .005);
        box(materials.dark, 'seal', -leaf * (TRAIN_DOOR.leafWidth / 2 - .006), TRAIN_DOOR.centerY, 1.42, .012, TRAIN_DOOR.height, .015);
        box(materials.steel, 'handle', -leaf * .125, 8.13, 1.435, .025, .15, .02);
      }
      if (d.side === 1) lamps.push(new THREE.Matrix4().compose(new THREE.Vector3(d.localX, 9.46, 1.39), new THREE.Quaternion(), new THREE.Vector3(.14, .055, .025)));
    }
    for (const [material, parts] of pools) {
      const mesh = new THREE.InstancedMesh(geometry, material, parts.length);
      mesh.name = 'Train door leaf parts'; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.userData.trainDoorParts = parts.map(({ doorId, leaf, part }) => ({ doorId, leaf, part }));
      parts.forEach((p, i) => mesh.setMatrixAt(i, p.matrix));
      mesh.computeBoundingSphere(); mesh.boundingSphere!.radius += TRAIN_DOOR.leafTravel;
      mesh.receiveShadow = true; group.add(mesh); this.pools.push({ mesh, parts });
    }
    const lamp = new THREE.InstancedMesh(geometry, this.warning, lamps.length);
    lamp.name = 'Platform-side departure warning lamps'; lamps.forEach((m, i) => lamp.setMatrixAt(i, m)); group.add(lamp);
  }
  update(doors: readonly TrainDoorSnapshot[], warningLampOn: boolean): void {
    const fractions = new Map(doors.map(d => [d.id, d.fraction]));
    for (const { mesh, parts } of this.pools) {
      parts.forEach((p, i) => {
        this.matrix.copy(p.matrix); this.matrix.elements[12] += p.leaf * TRAIN_DOOR.leafTravel * (fractions.get(p.doorId) ?? 0);
        mesh.setMatrixAt(i, this.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    this.warning.color.setHex(warningLampOn ? 0xffc35b : 0x453215); this.warning.emissiveIntensity = warningLampOn ? 2 : 0;
  }
}
