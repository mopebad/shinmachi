import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {AssetCatalog,MaterialConfig} from './SceneSchema';
import {validateCatalog} from './SceneSchema.ts';
export interface AssetPart {geometry:THREE.BufferGeometry;material:THREE.MeshStandardMaterial}
/** One registry per world, shared by every authored scene. Scenes never own shared GPU resources. */
export class AssetRegistry{
 readonly catalog:AssetCatalog;readonly cache=new Map<string,Promise<AssetPart[]>>();
 private readonly sources=new Map<string,Promise<THREE.Group>>();private readonly loader=new GLTFLoader();
 private readonly finishes:Record<string,THREE.MeshStandardMaterial>;
 constructor(catalog:AssetCatalog,finishes:Record<string,THREE.MeshStandardMaterial>){validateCatalog(catalog);this.catalog=catalog;this.finishes=finishes;}
 load(id:string,variation:Record<string,MaterialConfig>={}):Promise<AssetPart[]>{
  const definition=this.catalog.assets[id];if(!definition)throw Error('Unknown asset '+id);const key=id+JSON.stringify(variation);const old=this.cache.get(key);if(old)return old;
  const result=(async()=>{
   const path=(import.meta.env?.BASE_URL??'/')+definition.path;let source=this.sources.get(path);if(!source){source=this.loader.loadAsync(path).then(g=>g.scene);this.sources.set(path,source);source.catch(()=>this.sources.delete(path));}
   const scene=await source;scene.updateMatrixWorld(true);const groups=new Map<THREE.Material,THREE.BufferGeometry[]>();
   scene.traverse(o=>{if(!(o instanceof THREE.Mesh))return;if(Array.isArray(o.material))throw Error('One material per GLB primitive required');
    let g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(g.index)g=g.toNonIndexed();for(const a of Object.keys(g.attributes))if(!['position','normal','uv'].includes(a))g.deleteAttribute(a);
    if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    const parts=groups.get(o.material)??[];parts.push(g);groups.set(o.material,parts);
   });
   return [...groups].map(([original,geometries])=>{
    const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!geometry)throw Error('Cannot consolidate '+id);
    const material=(original as THREE.MeshStandardMaterial).clone(),config={...definition.materials?.['*'],...definition.materials?.[material.name],...variation['*'],...variation[material.name]};
    if(config.finish){const finish=this.finishes[config.finish];if(!finish)throw Error('Missing finish '+config.finish);material.map=finish.map;material.normalMap=finish.normalMap;material.roughnessMap=finish.roughnessMap;material.bumpMap=null;material.normalScale.copy(finish.normalScale);material.onBeforeCompile=finish.onBeforeCompile;material.customProgramCacheKey=finish.customProgramCacheKey;}
    if(config.color)material.color.set(config.color);for(const p of ['roughness','metalness','emissiveIntensity']as const)if(config[p]!==undefined)material[p]=config[p]!;
    if(material.map)material.map.anisotropy=8;
    if(material instanceof THREE.MeshPhysicalMaterial&&material.transmission>0){material.thickness=.003;material.ior=1.46;material.envMapIntensity=1.4;if(material.name.startsWith('Optical'))material.roughness=.018;}
    material.userData.authoredEmission=material.emissiveIntensity;return{geometry,material};
   });
  })();this.cache.set(key,result);result.catch(()=>this.cache.delete(key));return result;
 }
 get sourceCount(){return this.sources.size;}
 setLighting(night:number,open:boolean){for(const promise of this.cache.values())void promise.then(parts=>{for(const {material}of parts)material.emissiveIntensity=material.userData.authoredEmission*(.045+night*.955)*(open?1:.025);}).catch(()=>{});}
}
