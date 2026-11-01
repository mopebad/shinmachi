import * as THREE from 'three';
import { Bounds } from '../types';

export type CameraMode = 'walk' | 'fly';
export class PlayerController {
  mode: CameraMode = 'walk';
  private readonly keys = new Set<string>();
  private readonly velocity = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly safe = new THREE.Vector3(4.7, 1.82, 43);
  private yaw = 0; private pitch = 0; private dragging = false;
  constructor(readonly camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement, private readonly colliders: Bounds[] = []) {
    canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'City view. Click to look; WASD to walk, F to fly, V to walk, Escape to release.');
    canvas.addEventListener('click', () => { canvas.focus(); if (document.pointerLockElement !== canvas) { const result = canvas.requestPointerLock(); if (result) result.catch(() => { /* Drag-to-look remains available. */ }); } });
    canvas.addEventListener('pointerdown', () => { this.dragging = true; }); window.addEventListener('pointerup', () => { this.dragging = false; });
    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement !== canvas && !this.dragging) return;
      this.yaw -= e.movementX * .002; this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * .002, -1.48, 1.48);
    });
    window.addEventListener('keydown', e => {
      if (e.target instanceof HTMLElement && e.target.matches('input,select,button,textarea')) return;
      const key = e.key.toLowerCase(); this.keys.add(key);
      if ([' ', 'arrowup', 'arrowdown'].includes(key)) e.preventDefault();
      if (!e.repeat && key === 'f') this.setMode('fly');
      if (!e.repeat && key === 'v') this.setMode('walk');
    });
    window.addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.velocity.set(0, 0, 0); this.dragging = false; });
    document.addEventListener('pointerlockchange', () => { this.dragging = false; if (!document.pointerLockElement) this.keys.clear(); });
  }
  setMode(mode: CameraMode): void {
    this.mode = mode; this.velocity.set(0, 0, 0);
    if (mode === 'walk') { if (this.blocked(this.camera.position.x, this.camera.position.z)) this.camera.position.copy(this.safe); this.camera.position.y = 1.82; }
  }
  teleport(position: THREE.Vector3, target: THREE.Vector3): void {
    this.camera.position.copy(position); this.camera.lookAt(target); this.camera.rotation.order = 'YXZ';
    this.yaw = this.camera.rotation.y; this.pitch = this.camera.rotation.x; this.velocity.set(0, 0, 0); this.keys.clear();
    if (!this.blocked(position.x, position.z) && this.mode === 'walk') this.safe.copy(position);
  }
  private blocked(x: number, z: number): boolean {
    return this.colliders.some(b => x > b.minX - .25 && x < b.maxX + .25 && z > b.minZ - .25 && z < b.maxZ + .25);
  }
  update(dt: number): void {
    const forward = Number(this.keys.has('w')) - Number(this.keys.has('s')), strafe = Number(this.keys.has('d')) - Number(this.keys.has('a'));
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.direction.set(strafe, 0, -forward).normalize();
    if (this.mode === 'fly') this.direction.applyEuler(this.camera.rotation); else this.direction.applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.yaw);
    if (this.mode === 'fly') this.direction.y += Number(this.keys.has(' ')) - Number(this.keys.has('shift'));
    const speed = this.mode === 'fly' ? 13 : this.keys.has('shift') ? 5 : 2.7;
    this.velocity.lerp(this.direction.multiplyScalar(speed), 1 - Math.exp(-12 * dt));
    const p = this.camera.position, dx = this.velocity.x * dt, dz = this.velocity.z * dt;
    if (this.mode === 'fly' || !this.blocked(p.x + dx, p.z)) p.x += dx;
    if (this.mode === 'fly' || !this.blocked(p.x, p.z + dz)) p.z += dz;
    p.y = this.mode === 'fly' ? THREE.MathUtils.clamp(p.y + this.velocity.y * dt, .6, 90) : 1.82;
    p.x = THREE.MathUtils.clamp(p.x, -66, 66); p.z = THREE.MathUtils.clamp(p.z, -66, 66);
    if (this.mode === 'walk' && !this.blocked(p.x, p.z)) this.safe.copy(p);
  }
}
