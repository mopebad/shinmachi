import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {validateScene,validateCatalog,validateSavedEdit,serializeScene} from '../src/world/authoring/SceneSchema.ts';
import {AssetRegistry} from '../src/world/authoring/AssetRegistry.ts';
import {AuthoredScene} from '../src/world/authoring/AuthoredScene.ts';
const read=async file=>JSON.parse(await readFile(new URL('../src/world/authoring/'+file,import.meta.url),'utf8'));
const catalog=await read('catalog.json'),shindo=await read('scenes/shindo.json'),yoto=await read('scenes/yoto.json');
test('both production pilot files have stable IDs, explicit units, valid parents and licensed local assets',()=>{
 validateCatalog(catalog);for(const d of [shindo,yoto]){validateScene(d,catalog);assert.deepEqual(JSON.parse(serializeScene(d)),d);}
 assert.equal(yoto.nodes.filter(n=>n.prefab==='lantern-mount').length,2);assert.equal(shindo.nodes.filter(n=>n.prefab==='bar-stool').length,3);
});
test('scene validation rejects invalid IDs, parent cycles, non-finite values, mirrored scale and unknown references',()=>{
 for(const mutate of [d=>d.nodes.push(d.nodes[0]),d=>d.nodes[0].parent=d.nodes[1].id,d=>d.nodes[1].position[0]=NaN,d=>d.nodes[1].scale[0]=-1,d=>d.nodes[1].asset='not-registered']){const d=structuredClone(shindo);mutate(d);assert.throws(()=>validateScene(d,catalog));}
 const c=structuredClone(catalog);c.assets.stool.path='../outside.glb';assert.throws(()=>validateCatalog(c));const cycle=structuredClone(catalog);cycle.prefabs['bar-stool'].nodes[0].prefab='bar-stool';delete cycle.prefabs['bar-stool'].nodes[0].asset;assert.throws(()=>validateCatalog(cycle));
});
test('saved edits allow bounded transforms and light changes while protecting hierarchy, reservations and fixed bindings',()=>{
 const d=structuredClone(shindo);d.nodes.find(n=>n.id==='stool-0').position[0]=18.22;d.nodes.find(n=>n.id==='music-light').light.intensity=2.4;validateSavedEdit(shindo,d,catalog);
 for(const mutate of [d=>d.nodes[1].position[0]+=.1,d=>d.nodes[3].asset='rocks',d=>d.nodes[3].collision.reservation='stool-0',d=>d.nodes[3].edit.max[0]+=1,d=>d.nodes.find(n=>n.id==='stool-0').position[0]+=2]){const d=structuredClone(shindo);mutate(d);assert.throws(()=>validateSavedEdit(shindo,d,catalog));}
});
test('registry loads each source once across scenes, shares geometry, and scene reload is transactional without duplicate meshes',async()=>{
 const c={version:1,assets:{box:{path:'assets/test.glb',dimensions:[1,1,1],source:'original test fixture',license:'Project-original'}},prefabs:{pair:{nodes:[{id:'child',label:'child',parent:'joint',asset:'box',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},{id:'joint',label:'joint',position:[0,1,0],rotation:[0,0,0],scale:[1,1,1]}]}}};
 const registry=new AssetRegistry(c,{});let loads=0;registry.loader.loadAsync=async()=>{loads++;const scene=new THREE.Group();scene.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()));return{scene};};
 const d={version:1,id:'test',label:'test',coordinateSystem:'metres-y-up-radians',nodes:[{id:'parent',label:'parent',anchor:'parcel',position:[1,0,0],rotation:[0,0,0],scale:[1,1,1]},{id:'a',label:'a',parent:'parent',prefab:'pair',position:[0,0,2],rotation:[0,0,0],scale:[1,1,1]},{id:'b',label:'b',asset:'box',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}]};
 const a=new AuthoredScene(d,registry,{parcel:{position:[10,0,0]}},()=>assert.fail('unexpected fallback'),()=>{});await a.ready;const b=new AuthoredScene(d,registry,{parcel:{position:[20,0,0]}},()=>{},()=>{});await b.ready;
 assert.equal(loads,1);assert.equal(a.meshes.length,1);assert.equal(a.meshes[0].count,2);assert.equal(a.meshes[0].geometry,b.meshes[0].geometry);assert.deepEqual(a.objects.get('a/child').getWorldPosition(new THREE.Vector3()).toArray(),[11,1,2]);assert.deepEqual(a.meshes[0].userData.sceneOwners,['a','b']);
 await a.load(d);assert.equal(a.group.children.length,1);assert.equal(a.meshes.length,1);const prior=a.group.children[0];const invalid=structuredClone(d);invalid.nodes[0].anchor='missing';await assert.rejects(a.load(invalid));assert.equal(a.group.children[0],prior);assert.equal(loads,1);
});
test('failed source loads activate a procedural fallback and can be retried',async()=>{
 const c={version:1,assets:{box:{path:'assets/test.glb',dimensions:[1,1,1],source:'fixture',license:'original'}},prefabs:{}};const registry=new AssetRegistry(c,{});let fail=true;registry.loader.loadAsync=async()=>{if(fail)throw Error('unavailable');const scene=new THREE.Group();scene.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()));return{scene};};
 const doc={version:1,id:'fallback',label:'fallback',coordinateSystem:'metres-y-up-radians',nodes:[{id:'box',label:'box',asset:'box',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}]};let fallback=0;const s=new AuthoredScene(doc,registry,{},()=>fallback++,()=>{});await s.ready;assert.equal(fallback,1);assert.equal(s.errors.length,1);fail=false;await s.load(doc);assert.equal(s.meshes.length,1);
});
