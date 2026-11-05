import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {worldTexture} from './Materials';
import type {NightlifeMaterials} from './NightlifeMaterials';
import {YOTO_VENUE} from './YotoVenueLayout';
import {equipmentGraphics} from './ShindoEquipmentGraphics';

type Placement={asset:string;position:[number,number,number];scale:[number,number,number];yaw:number};
/** Local, licensed GLBs; static parts consolidated by material, repeated bottles instanced. */
export class ShindoAssets{
 readonly group=new THREE.Group();readonly ready:Promise<void>;readonly errors:string[]=[];
 readonly inventory:{asset:string;instances:number;triangles:number;draws:number;bounds:number[]}[]=[];
 constructor(materials:NightlifeMaterials,filter:(asset:string)=>boolean=()=>true,graphics=true){
  this.group.name='SHINDO / licensed and Blender-finished assets';if(graphics)this.group.add(equipmentGraphics());const f=YOTO_VENUE.floorY,placements:Placement[]=[];
  const put=(asset:string,position:Placement['position'],scale:Placement['scale']=[1,1,1],yaw=0)=>{if(filter(asset))placements.push({asset,position,scale,yaw});};
  put('turntable',[17.82,f+1.06,-40.48]);
  put('amplifier',[18.67,f+1.06,-40.5]);
  for(const x of [16.45,20])put('speaker',[x,f+.5625,-40.685],[2.2,2.2,1.42],Math.atan2(18.25-x,4.5));
  const rows=[[-34.15,-34.4,-34.9,-35.12,-35.37,-35.95,-36.2,-36.46],[-34.08,-34.34,-34.6,-35.18,-35.42,-35.68,-36.2,-36.46,-37.15,-37.43],[-34.3,-34.58,-35.2,-35.48,-36.2,-36.46,-37.12]];
  for(const [row,height]of [.97,1.52,2.04].entries())for(const [i,z]of rows[row].entries()){
   const s=[.86,1,.92,.82][(i+row)%4];put('bottle-'+((i+row)%4),[16.18+i%2*.025,f+height+.0325,z],[s,s,s],Math.PI/2+(i%3-1)*.12);
  }
  for(const [i,z]of [-34.55,-35.65,-36.75].entries())put(['highball','water-glass','rocks'][i],[17.56,f+1.1185,z]);
  for(const [x,z]of [[17.18,-34.92],[17.16,-37.12]])put('bar-tools',[x,f+1.105,z]);
  for(const z of [-36.64,-36.8,-36.96])put('empty-glass',[16.22,f+1.021,z]);
  this.group.userData.placements=placements;
  const loader=new GLTFLoader(),textures=new THREE.TextureLoader(),base=import.meta.env.BASE_URL+'assets/shindo/';
  const finish=async(material:THREE.MeshStandardMaterial,id:string,scale:number,tint:number)=>{
   const [map,normal,rough]=await Promise.all(['diff','normal','roughness'].map(k=>textures.loadAsync(base+id+'-'+k+'.jpg')));
   for(const t of [map,normal,rough]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;}
   map.colorSpace=THREE.SRGBColorSpace;material.map=map;material.bumpMap=null;material.normalMap=normal;material.normalScale.setScalar(.24);material.roughnessMap=rough;material.roughness=.75;material.color.setHex(tint);worldTexture(material,scale);material.needsUpdate=true;
  };
  this.ready=Promise.all([
   finish(materials.walnut,'black_walnut_veneer_01',.7,0xada090),
   finish(materials.leather,'brown_leather',3,0x704b45),
   ...[...new Set(placements.map(p=>p.asset))].map(async asset=>{
    const gltf=await loader.loadAsync(base+asset+'.glb');gltf.scene.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(gltf.scene),byMaterial=new Map<THREE.Material,THREE.BufferGeometry[]>();
    gltf.scene.traverse(o=>{
     if(!(o instanceof THREE.Mesh))return;if(Array.isArray(o.material))throw Error('Unexpected multi-material primitive '+asset);
     const g=o.geometry.clone().applyMatrix4(o.matrixWorld),material=o.material as THREE.MeshStandardMaterial;
     // Only the common vertex channels are needed by this static asset pipeline.
     for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);
     if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));
     if(material.map)material.map.anisotropy=8;
     if(material instanceof THREE.MeshPhysicalMaterial&&material.transmission>0){material.thickness=.003;material.ior=1.46;material.envMapIntensity=1.4;if(material.name.startsWith('Optical'))material.roughness=.018;}
     const list=byMaterial.get(material)??[];list.push(g);byMaterial.set(material,list);
    });
    const selected=placements.filter(p=>p.asset===asset),matrix=new THREE.Matrix4();let triangles=0;
    for(const [material,geometries]of byMaterial){
     const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!geometry)throw Error('Merge failed '+asset);
     const mesh=new THREE.InstancedMesh(geometry,material,selected.length);
     selected.forEach((p,i)=>{matrix.compose(new THREE.Vector3(...p.position),new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP,p.yaw),new THREE.Vector3(...p.scale));mesh.setMatrixAt(i,matrix);});
     mesh.name=asset+' / '+material.name;mesh.castShadow=!(material instanceof THREE.MeshPhysicalMaterial&&material.transmission>0);mesh.receiveShadow=true;mesh.computeBoundingSphere();this.group.add(mesh);triangles+=(geometry.index!.count/3)*selected.length;
    }
    this.inventory.push({asset,instances:selected.length,triangles,draws:byMaterial.size,bounds:bounds.getSize(new THREE.Vector3()).toArray()});
   })
  ]).then(()=>{
   this.group.traverse(o=>{if(!(o instanceof THREE.Mesh)||Array.isArray(o.material))return;const mat=o.material as THREE.MeshStandardMaterial;
    if(!mat.name.includes('Satin walnut'))return;
    mat.map=materials.walnut.map;mat.normalMap=materials.walnut.normalMap;mat.normalScale.setScalar(.16);mat.roughnessMap=materials.walnut.roughnessMap;mat.color.setHex(0xa28a72);mat.roughness=.8;worldTexture(mat,.7);mat.needsUpdate=true;
   });this.group.userData.inventory=this.inventory;
  }).catch(error=>{this.errors.push(String(error));throw error;});
 }
}
