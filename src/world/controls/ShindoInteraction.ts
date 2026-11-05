import * as THREE from 'three';
import {canUseShindoControl,SHINDO_PANEL} from '../generation/ShindoConsole.ts';
import type {ShindoAction} from '../generation/ShindoConsole.ts';
import type {ShindoPresentation} from '../generation/ShindoPresentation';
import {YOTO_VENUE} from '../generation/YotoVenueLayout.ts';

/** Proximity + actual mesh picking. Works with pointer lock, drag-look and a hidden HUD. */
export class ShindoInteraction {
 private readonly ray=new THREE.Raycaster();
 private readonly center=new THREE.Vector2();
 private readonly panel=new THREE.Vector3(18.94,YOTO_VENUE.floorY+.865,-40.012);
 private readonly prompt=document.createElement('div');
 private readonly aim=document.createElement('span');
 private camera:THREE.Camera;private scene:THREE.Scene;private canvas:HTMLCanvasElement;private presentation:ShindoPresentation;
 private action:(action:ShindoAction)=>Promise<unknown>;private isOpen:()=>boolean;
 private busy=false;private accumulator=0;
 constructor(camera:THREE.Camera,scene:THREE.Scene,canvas:HTMLCanvasElement,presentation:ShindoPresentation,action:(action:ShindoAction)=>Promise<unknown>,isOpen:()=>boolean){
  this.camera=camera;this.scene=scene;this.canvas=canvas;this.presentation=presentation;this.action=action;this.isOpen=isOpen;
  this.prompt.className='shindo-interaction';this.prompt.hidden=true;this.prompt.setAttribute('role','status');this.prompt.setAttribute('aria-live','polite');
  this.aim.className='shindo-aim';this.aim.hidden=true;document.body.append(this.prompt,this.aim);
  window.addEventListener('keydown',e=>{
   if(e.key.toLowerCase()!=='e'||e.repeat||e.target instanceof HTMLElement&&e.target.closest('input,select,button,textarea,[contenteditable]'))return;
   const hit=this.pick(this.center);if(hit){e.preventDefault();this.activate(hit);}
  });
  // Capture phase prevents a successful music click from also requesting pointer lock.
  canvas.addEventListener('click',e=>{
   const rect=canvas.getBoundingClientRect(),point=document.pointerLockElement===canvas?this.center:new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
   const hit=this.pick(point);if(!hit)return;e.preventDefault();e.stopImmediatePropagation();canvas.focus();this.activate(hit);
  },true);
 }
 private nearby(){return this.isOpen()&&this.camera.position.distanceTo(this.panel)<2.65;}
 private pick(point:THREE.Vector2){
  if(!this.nearby())return null;
  this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld();this.ray.near=0;this.ray.far=SHINDO_PANEL.reach;this.ray.setFromCamera(point,this.camera);
  const hit=this.ray.intersectObjects(this.presentation.controls,false)[0];if(!hit)return null;
  // Check rendered solids as well as distance. Controls cannot be used through a wall, floor or the cabinet.
  this.ray.far=hit.distance-.008;
  const blocker=this.ray.intersectObject(this.scene,true).find(h=>{
   const mesh=h.object as THREE.Mesh;const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
   return h.object.visible&&materials.some(m=>m&&m.visible&&!m.transparent);
  });
  return canUseShindoControl(hit.distance,blocker?.distance)?hit.object:null;
 }
 private activate(hit:THREE.Object3D){
  if(this.busy)return;this.busy=true;
  void this.action(hit.userData.shindoAction).catch(()=>{this.prompt.textContent='Playback unavailable · check the music panel';}).finally(()=>{this.busy=false;});
 }
 update(dt:number){
  this.accumulator+=dt;if(this.accumulator<.08)return;this.accumulator=0;
  const nearby=this.nearby(),hit=nearby?this.pick(this.center):null;
  this.prompt.hidden=!nearby;this.aim.hidden=!hit;this.presentation.highlight(hit);
  if(nearby){const action=hit?.userData.shindoAction as ShindoAction|undefined;
   const text=action?`E · ${action==='next'?'Next track':action==='previous'?'Previous track':'Play / pause'}`:'Music console · look at a button and press E, or click it';
   if(this.prompt.textContent!==text)this.prompt.textContent=text;
  }
 }
}
