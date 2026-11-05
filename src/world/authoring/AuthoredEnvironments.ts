import * as THREE from 'three';
import catalog from './catalog.json';
import shindo from './scenes/shindo.json';
import yoto from './scenes/yoto.json';
import {AssetRegistry} from './AssetRegistry';
import {AuthoredScene} from './AuthoredScene';
import type {AssetCatalog,SceneDocument} from './SceneSchema';
import type {NightlifeMaterials} from '../generation/NightlifeMaterials';
import type {YotoVenueSpatial} from '../generation/YotoVenueLayout';
export const migratedShindoAssets=new Set(['turntable','amplifier','speaker','rocks','bar-tools']);
/** Small bridge: generated anchors/reservations remain authoritative; visuals come from scene data. */
export class AuthoredEnvironments{
 readonly registry:AssetRegistry;readonly scenes=new Map<string,AuthoredScene>();readonly ready:Promise<void>;
 constructor(materials:NightlifeMaterials,parent:THREE.Group,venue:YotoVenueSpatial,anchors:Record<string,{position:[number,number,number];rotation?:[number,number,number]}>,fallbacks:Map<string,THREE.Group>,legacyReady:Promise<void>,onShindoFailure:()=>Promise<void>){
  this.registry=new AssetRegistry(catalog as unknown as AssetCatalog,{walnut:materials.walnut,leather:materials.leather});
  // Hide only the four stool primitives tagged in the existing shared batch.
  const hidden:{mesh:THREE.InstancedMesh;index:number;matrix:THREE.Matrix4}[]=[];parent.traverse(o=>{if(!(o instanceof THREE.InstancedMesh))return;o.userData.sections?.forEach((section:string,i:number)=>{if(section==='shindo:stools'){const matrix=new THREE.Matrix4();o.getMatrixAt(i,matrix);hidden.push({mesh:o,index:i,matrix});}});});
  const stools=(show:boolean)=>{for(const h of hidden){h.mesh.setMatrixAt(h.index,show?h.matrix:new THREE.Matrix4().makeScale(0,0,0));h.mesh.instanceMatrix.needsUpdate=true;h.mesh.computeBoundingSphere();}};
  this.ready=legacyReady.then(async()=>{
   const a=new AuthoredScene(shindo as SceneDocument,this.registry,{'shindo-floor':{position:[0,venue.floorY,0]}},()=>{stools(true);return onShindoFailure();},()=>stools(false));
   const b=new AuthoredScene(yoto as SceneDocument,this.registry,anchors,()=>{for(const g of fallbacks.values())g.visible=true;},()=>{for(const g of fallbacks.values())g.visible=false;});
   for(const s of [a,b]){this.scenes.set(s.document.id,s);parent.add(s.group);}await Promise.all([a.ready,b.ready]);
  });
 }
 setLighting(night:number,open:boolean){this.registry.setLighting(night,open);for(const scene of this.scenes.values())scene.setLighting(night,open);}
}
