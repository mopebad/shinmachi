import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createHumanGeometry } from './HumanGeometry';
import { legPose } from './CharacterPose';
import { stationStairPose } from './StationPose';
import { stationFootSurface } from './StationNavigation';
import type { CitySimulation } from './CitySimulation';

function cloth(): THREE.MeshStandardMaterial {
  const c = document.createElement('canvas'); c.width = c.height = 128; const p = c.getContext('2d')!, d = p.createImageData(128, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const i = (y * 128 + x) * 4, v = 224 + (x % 2 + y % 2) * 7 + ((x * 31 + y * 17) % 7); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } p.putImageData(d, 0, 0);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(4, 4);
  const bump = map.clone(); bump.colorSpace = THREE.NoColorSpace;
  return new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: .0015, roughness: .94 });
}

/** Metre-scale tailored forms and connected joints, shared through bounded instanced pools. */
export class HumanPresentation {
  readonly group = new THREE.Group();
  private readonly pools = new Map<string, THREE.InstancedMesh>();
  private readonly object = new THREE.Object3D(); private readonly color = new THREE.Color();
  private readonly torso: THREE.InstancedMesh; private readonly pelvis: THREE.InstancedMesh; private readonly head: THREE.InstancedMesh; private readonly neck: THREE.InstancedMesh;
  private readonly hair: THREE.InstancedMesh; private readonly upperLeg: THREE.InstancedMesh; private readonly lowerLeg: THREE.InstancedMesh;
  private readonly upperArm: THREE.InstancedMesh; private readonly forearm: THREE.InstancedMesh; private readonly hand: THREE.InstancedMesh; private readonly shoe: THREE.InstancedMesh; private readonly skirt: THREE.InstancedMesh;
  private readonly features: THREE.InstancedMesh; private readonly details: THREE.InstancedMesh; private readonly contacts: THREE.InstancedMesh;
  private readonly joints: THREE.InstancedMesh;
  private pedestrianId = -1;
  constructor(parent: THREE.Group) {
    const geometry = createHumanGeometry(), fabric = cloth(), skin = new THREE.MeshStandardMaterial({ roughness: .72 }), hair = new THREE.MeshStandardMaterial({ roughness: .93 }), leather = new THREE.MeshStandardMaterial({ roughness: .6 });
    this.group.name = 'Clothed human presentation'; parent.add(this.group);
    this.torso = this.pool('torso', geometry.torso, fabric, 88); this.pelvis = this.pool('pelvis', geometry.pelvis, fabric, 88);
    this.head = this.pool('head', geometry.head, skin, 88); this.neck = this.pool('neck', geometry.neck, skin, 88); this.hair = this.pool('hair', geometry.hair, hair, 88);
    this.upperLeg = this.pool('upper trousers', geometry.upperLeg, fabric, 176); this.lowerLeg = this.pool('lower trousers', geometry.lowerLeg, fabric, 176);
    this.upperArm = this.pool('sleeves', geometry.upperArm, fabric, 176); this.forearm = this.pool('forearms', geometry.forearm, fabric, 176);
    this.hand = this.pool('hands', geometry.hand, skin, 176); this.shoe = this.pool('shoes', geometry.shoe, leather, 176); this.skirt = this.pool('skirts', geometry.skirt, fabric, 88);
    this.features = this.pool('features', new THREE.SphereGeometry(1, 10, 8), skin, 88 * 12);
    this.details = this.pool('garment details and bags', new RoundedBoxGeometry(1, 1, 1, 2, .07), fabric, 88 * 20);
    this.joints = this.pool('sleeve and trouser joints', new THREE.SphereGeometry(1, 12, 8), fabric, 88 * 6);
    this.contacts = this.pool('contacts', new THREE.CircleGeometry(.5, 20), new THREE.MeshBasicMaterial({ color: 0x070a0c, transparent: true, opacity: .16, depthWrite: false }), 176);
  }
  private pool(name: string, geometry: THREE.BufferGeometry, material: THREE.Material, capacity: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity); mesh.name = name; mesh.count = 0; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.receiveShadow = true; this.group.add(mesh); this.pools.set(name, mesh); return mesh;
  }
  private put(mesh: THREE.InstancedMesh, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: number, yaw: number, pitch = 0, roll = 0): void {
    this.object.position.set(x, y, z); this.object.scale.set(sx, sy, sz); this.object.rotation.set(pitch, yaw, roll, 'YXZ'); this.object.updateMatrix(); const index = mesh.count++; mesh.setMatrixAt(index, this.object.matrix); mesh.setColorAt(index, this.color.setHex(color));
    (mesh.userData.pedestrianIds??=[])[index]=this.pedestrianId;
  }
  update(simulation: CitySimulation, listener?: THREE.Vector3): void {
    this.pools.forEach(p => { p.count = 0; });
    // The same bounded pools render street pedestrians, physical transfers and moving train occupants.
    const presentedIds: number[] = []; this.group.userData.pedestrianIds=presentedIds;
    for (const p of simulation.pedestrians) {
      if (!p.active || (listener && Math.abs(p.y+1-listener.y)<1.5 && Math.hypot(p.x - listener.x, p.z - listener.z) < .65)) continue;
      presentedIds.push(p.id);
      this.pedestrianId=p.id;
      const scale = p.scale * 1.08 * (p.style === 4 ? .96 : 1), swing = p.moving ? Math.sin(p.phase) * .40 : 0;
      const stair=simulation.navigation.station?stationStairPose(simulation.navigation.station.layout,p,scale):null;
      const legs = stair?.legs??[legPose(swing, -1), legPose(swing, 1)], bounce = stair?0:.11 - Math.min(legs[0].ankle.y, legs[1].ankle.y);
      const surface = p.y, rootY = stair?.rootY??surface - .05 * scale;
      const skin = [0xbd9275, 0xd0aa89, 0xae8065][p.id % 3], hair = p.style === 4 ? 0x77736b : p.id % 3 ? 0x211f1c : 0x48372d;
      const shirt = p.style === 0 ? 0x343d45 : p.style === 2 ? 0x938675 : p.shirt, trousers = [0x30383f, 0x3d4245, 0x3b4853][p.id % 3];
      const part = (mesh: THREE.InstancedMesh, x: number, y: number, z: number, color: number, sx = 1, sy = 1, sz = 1, pitch = 0, roll = 0) => { const cs = Math.cos(p.yaw), sn = Math.sin(p.yaw); this.put(mesh, p.x + (x * cs + z * sn) * scale, rootY + (y + bounce) * scale, p.z + (z * cs - x * sn) * scale, sx * scale, sy * scale, sz * scale, color, p.yaw, pitch, roll); };
      part(this.torso, 0, 1.10, 0, shirt, p.style === 4 ? 1.04 : 1, 1, 1);
      part(this.pelvis, 0, .79, 0, trousers); part(this.neck, 0, 1.402, .003, skin); part(this.head, 0, 1.545, .004, skin); part(this.hair, 0, 1.545, .004, hair, 1, 1, p.style === 3 ? 1.04 : 1);
      for (const [i, side] of [-1, 1].entries()) {
        const { hip, knee, ankle, upperRotation, lowerRotation } = legs[i];
        part(this.upperLeg, side * .09, (hip.y + knee.y) / 2, (hip.z + knee.z) / 2, trousers, 1, 1, 1, upperRotation);
        part(this.lowerLeg, side * .09, (knee.y + ankle.y) / 2, (knee.z + ankle.z) / 2, trousers, 1, 1, 1, lowerRotation);
        part(this.joints, side * .09, knee.y, knee.z, trousers, .054, .055, .057);
        part(this.shoe, side * .09, ankle.y - .015, ankle.z, 0x22272a);
        const upper = side * swing * .65, lower = upper - .12, shoulderY = 1.285, elbowY = shoulderY - Math.cos(upper) * .25, elbowZ = -Math.sin(upper) * .25, wristY = elbowY - Math.cos(lower) * .23, wristZ = elbowZ - Math.sin(lower) * .23;
        part(this.upperArm, side * .225, (shoulderY + elbowY) / 2, elbowZ / 2, shirt, 1, 1, 1, upper);
        part(this.forearm, side * .225, (elbowY + wristY) / 2, (elbowZ + wristZ) / 2, shirt, 1, 1, 1, lower);
        part(this.joints, side * .225, shoulderY - .012, 0, shirt, .054, .069, .056);
        part(this.joints, side * .225, elbowY, elbowZ, shirt, .041, .045, .042);
        part(this.hand, side * .225, wristY - .072, wristZ + .008, skin, 1, 1, 1, lower);
        part(this.details, side * .225, wristY + .02, wristZ, 0xb4b1a2, .065, .025, .065, lower);
        part(this.features, side * .081, 1.53, .004, skin, .012, .023, .014);
        part(this.features, side * .031, 1.569, .082, 0x332e26, .008, .0035, .004);
        if (p.style === 0 || p.style === 4) part(this.details, side * .04, 1.355, .071, 0xbebcb0, .05, .05, .014, 0, side * .45);
      }
      part(this.details, 0, .875, .003, 0x252b2d, .30, .026, .206);
      for (let button = 0; button < 3; button++) part(this.features, 0, 1.0 + button * .11, .108, 0x6e7066, .006, .006, .004);
      if (p.style === 0) { part(this.details, 0, 1.20, .116, 0x656653, .034, .23, .009); for (const side of [-1, 1]) part(this.details, side * .065, 1.25, .11, 0x2c333b, .055, .20, .016, 0, side * .29); }
      if (p.style === 1 || p.style === 3) { part(this.details, 0, 1.10, -.17, 0x41483e, .25, .32, .13); for (const side of [-1, 1]) part(this.details, side * .13, 1.15, .09, 0x353b35, .023, .34, .022, 0, side * .06); }
      if (p.style === 2) { part(this.skirt, 0, .64, .005, trousers); part(this.details, .285, .66, .015, 0x735c45, .17, .23, .105); part(this.details, .285, .815, .015, 0x64523f, .115, .075, .022); part(this.details, 0, 1.52, -.077, hair, .14, .17, .055); }
      if(stair){for(const f of stair.feet){const ground=stationFootSurface(simulation.navigation.station!.layout,f.x,f.z,f.y);if(f.grounded&&ground!==null)this.put(this.contacts,f.x,ground+.003,f.z,.18*scale,.24*scale,1,0xffffff,p.yaw,-Math.PI/2);}}
      else this.put(this.contacts, p.x, surface + .003, p.z, .56 * scale, .68 * scale, 1, 0xffffff, p.yaw, -Math.PI / 2);
    }
    this.pools.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; });
  }
}
