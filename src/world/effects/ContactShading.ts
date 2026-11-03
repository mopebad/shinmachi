import * as THREE from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

/** Bounded half-resolution contact occlusion; transparent effects never write its depth. */
export class ContactShading extends GTAOPass {
  constructor(scene: THREE.Scene, camera: THREE.Camera, width: number, height: number) {
    super(scene, camera, Math.ceil(width / 2), Math.ceil(height / 2));
    this.blendIntensity = .55;
    this.updateGtaoMaterial({ radius: .8, thickness: .9, distanceExponent: 1.3, distanceFallOff: 1, scale: 1.2, samples: 12, screenSpaceRadius: false });
    this.updatePdMaterial({ samples: 8, radius: 4, depthPhi: 2, normalPhi: 4 });
  }
  override setSize(width: number, height: number): void { super.setSize(Math.max(1, Math.ceil(width / 2)), Math.max(1, Math.ceil(height / 2))); }
  override overrideVisibility(): void {
    super.overrideVisibility();
    this.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if ((object as THREE.Mesh & { isReflector?: boolean }).isReflector || materials.some(m => m.transparent || !m.depthWrite) || object.userData.noAmbientOcclusion) object.visible = false;
    });
  }
}
