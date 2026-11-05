import * as THREE from 'three';
import {AssetRegistry} from './AssetRegistry.ts';
import type {AssetPart} from './AssetRegistry';
import {validateScene} from './SceneSchema.ts';
import type {SceneDocument,SceneNode,Vec3} from './SceneSchema';
type Anchor={position:Vec3;rotation?:Vec3};
export class AuthoredScene{
 readonly group=new THREE.Group();readonly objects=new Map<string,THREE.Group>();document:SceneDocument;
 readonly errors:string[]=[];ready:Promise<void>;private batches:{mesh:THREE.InstancedMesh;owners:THREE.Group[]}[]=[];
 private lights:{light:THREE.PointLight;node:SceneNode}[]=[];private night=1;private open=true;
 readonly registry:AssetRegistry;readonly anchors:Record<string,Anchor>;private readonly fallback:()=>void|Promise<void>;private readonly readyFallback:()=>void;
 constructor(document:SceneDocument,registry:AssetRegistry,anchors:Record<string,Anchor>,fallback:()=>void|Promise<void>,readyFallback:()=>void){
  this.registry=registry;this.anchors=anchors;this.fallback=fallback;this.readyFallback=readyFallback;
  this.document=structuredClone(document);this.group.name='Authored scene / '+document.id;this.ready=this.load(document).catch(async e=>{this.errors.push(String(e));await fallback();});
 }
 async load(document:SceneDocument){
  validateScene(document,this.registry.catalog);const staging=new THREE.Group(),objects=new Map<string,THREE.Group>(),entries:{owner:THREE.Group;parts:AssetPart[]}[]=[];const lights:typeof this.lights=[];
  const build=async(n:SceneNode,parent:THREE.Object3D,id:string,selection:string,depth=0):Promise<void>=>{
   if(depth>8)throw Error('Prefab nesting too deep');const group=new THREE.Group();group.name=n.label;group.userData.sceneObjectId=selection;group.position.fromArray(n.position);group.rotation.set(...n.rotation);group.scale.fromArray(n.scale);parent.add(group);objects.set(id,group);
   if(n.anchor){const a=this.anchors[n.anchor];if(!a)throw Error('Missing generated anchor '+n.anchor);const frame=new THREE.Group();frame.position.fromArray(a.position);frame.rotation.set(...(a.rotation??[0,0,0]));parent.remove(group);parent.add(frame);frame.add(group);}
   if(n.asset)entries.push({owner:group,parts:await this.registry.load(n.asset,n.material)});
   if(n.light){const light=new THREE.PointLight(n.light.color,n.light.intensity,n.light.distance,2);group.add(light);lights.push({light,node:n});}
   if(n.prefab){const pending=[...this.registry.catalog.prefabs[n.prefab].nodes];while(pending.length){const i=pending.findIndex(child=>!child.parent||objects.has(id+'/'+child.parent));if(i<0)throw Error('Invalid prefab parent graph');const child=pending.splice(i,1)[0];await build(child,child.parent?objects.get(id+'/'+child.parent)!:group,id+'/'+child.id,selection,depth+1);}}
  };
  // Parent-first evaluation works independently of JSON row order.
  const pending=[...document.nodes];while(pending.length){const i=pending.findIndex(n=>!n.parent||objects.has(n.parent));if(i<0)throw Error('Invalid parent graph');const n=pending.splice(i,1)[0];await build(n,n.parent?objects.get(n.parent)!:staging,n.id,n.id);}
  const grouped=new Map<AssetPart,{owners:THREE.Group[]}>();for(const e of entries)for(const part of e.parts){const batch=grouped.get(part)??{owners:[]};batch.owners.push(e.owner);grouped.set(part,batch);}
  const batches:typeof this.batches=[];for(const [part,{owners}]of grouped){const mesh=new THREE.InstancedMesh(part.geometry,part.material,owners.length);mesh.name='Authored / '+part.material.name;mesh.userData.sceneId=document.id;mesh.userData.sceneOwners=owners.map(o=>o.userData.sceneObjectId);mesh.castShadow=!(part.material instanceof THREE.MeshPhysicalMaterial&&part.material.transmission>0);mesh.receiveShadow=true;staging.add(mesh);batches.push({mesh,owners});}
  for(const b of this.batches)b.mesh.dispose();this.group.clear();this.group.add(staging);this.objects.clear();objects.forEach((o,id)=>this.objects.set(id,o));this.batches=batches;this.lights=lights;this.document=structuredClone(document);this.sync();this.setLighting(this.night,this.open);this.readyFallback();
 }
 sync(){this.group.updateMatrixWorld(true);const inverse=this.group.children[0]?.matrixWorld.clone().invert();if(!inverse)return;const m=new THREE.Matrix4();for(const {mesh,owners}of this.batches){owners.forEach((o,i)=>mesh.setMatrixAt(i,m.multiplyMatrices(inverse,o.matrixWorld)));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();} }
 updateNode(id:string,node:SceneNode){const candidate=structuredClone(this.document),i=candidate.nodes.findIndex(n=>n.id===id);if(i<0)throw Error('Unknown object');candidate.nodes[i]=structuredClone(node);validateScene(candidate,this.registry.catalog);
  const object=this.objects.get(id)!;object.position.fromArray(node.position);object.rotation.set(...node.rotation);object.scale.fromArray(node.scale);this.document=candidate;
  for(const entry of this.lights)if(entry.node.id===id){entry.node=node;entry.light.color.set(node.light!.color);entry.light.distance=node.light!.distance;}
  this.sync();this.setLighting(this.night,this.open);
 }
 setLighting(night:number,open:boolean){this.night=night;this.open=open;for(const {light,node}of this.lights)light.intensity=node.light!.intensity*night*(open?1:.04);}
 get meshes(){return this.batches.map(b=>b.mesh);}
}
