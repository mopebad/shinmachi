import * as THREE from 'three';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import type {CityWorld} from '../CityWorld';
import type {AuthoredScene} from './AuthoredScene';
import type {SceneDocument,SceneNode} from './SceneSchema';

/** Loaded only by the development ?editor=1 entry point. No browser state is authoritative. */
export class SceneEditor{
 readonly panel=document.createElement('aside');readonly gizmo:TransformControls;
 private orbit:OrbitControls;private active=true;private scene!:AuthoredScene;private selected='';private revision='';
 private history:SceneDocument[]=[];private saved?:SceneDocument;private dragging=false;private suppressPick=false;
 constructor(private readonly world:CityWorld){
  const environments=world.authoredEnvironments;if(!environments)throw Error('Authored scenes disabled');
  this.panel.className='scene-editor';this.panel.innerHTML=`<style>
  .scene-editor{position:fixed;z-index:20;left:16px;top:16px;width:300px;max-height:calc(100vh - 32px);overflow:auto;padding:16px;background:#17201f;color:#e5decb;border:1px solid #8f8562;font:12px/1.5 system-ui;box-shadow:0 8px 30px #0007}.scene-editor h2{font-size:16px;margin:0 0 10px}.scene-editor label{display:block;margin:7px 0}.scene-editor select{width:100%;background:#253330;color:#fff}.scene-editor input{width:75px;background:#253330;color:#fff;border:1px solid #5c6b62;padding:5px}.scene-editor input[type=color]{height:28px}.scene-editor button{background:#35443d;color:#f2e5ca;border:1px solid #6d7963;padding:6px;margin:3px 3px 3px 0;cursor:pointer}.scene-editor button:disabled,.scene-editor input:disabled{opacity:.4}.scene-editor .axes{display:flex;gap:4px}.scene-editor output{display:block;margin-top:10px;overflow-wrap:anywhere;color:#e2c896}.scene-editor p{color:#acb7aa;font-size:11px}.scene-editor small{display:block;color:#a4bcb6}</style>
  <h2>Scene authoring · development</h2><label>Scene<select data-scene></select></label><label>Object<select data-object></select></label><small data-anchor></small>
  <div><button data-mode="translate">Move W</button><button data-mode="rotate">Rotate E</button><button data-mode="scale">Scale R</button><button data-frame>Frame object</button></div>
  <div data-fields></div><div data-light></div><div><button data-save>Save scene</button><button data-reload>Reload disk</button><button data-undo>Undo</button><button data-reset>Discard local</button></div><button data-play>Resume play</button>
  <p>Transforms are local, in metres; angles are degrees here. Right-drag orbits; wheel zooms. Furniture stays inside existing collision reservations. No city or simulation editing.</p><output aria-live="polite">Loading scene file…</output>`;
  document.body.append(this.panel);
  const canvas=world.renderer.domElement;this.gizmo=new TransformControls(world.camera,canvas);this.gizmo.setSpace('local');this.gizmo.setSize(.65);world.scene.add(this.gizmo.getHelper());this.orbit=new OrbitControls(world.camera,canvas);this.orbit.enableDamping=false;this.orbit.mouseButtons.LEFT=THREE.MOUSE.PAN;
  this.gizmo.addEventListener('dragging-changed',e=>{this.dragging=Boolean(e.value);this.orbit.enabled=this.active&&!this.dragging;});
  this.gizmo.addEventListener('mouseDown',()=>{this.history.push(structuredClone(this.scene.document));});
  this.gizmo.addEventListener('objectChange',()=>{const object=this.gizmo.object;if(!object||!this.selected||object!==this.scene.objects.get(this.selected))return;const n=this.node();if(!n.edit)return;this.change({...n,position:object.position.toArray(),rotation:[object.rotation.x,object.rotation.y,object.rotation.z],scale:object.scale.toArray()});});
  canvas.addEventListener('pointerdown',()=>{this.suppressPick=this.gizmo.axis!==null;},true);
  canvas.addEventListener('pointerup',e=>{if(!this.active||e.button!==0||this.suppressPick||this.dragging)return;const r=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),world.camera);const hit=ray.intersectObjects(this.scene.meshes,false)[0];if(hit){const id=hit.object.userData.sceneOwners[hit.instanceId!];this.select(id);}});
  const scenes=this.q<HTMLSelectElement>('[data-scene]');for(const [id,s]of environments.scenes)scenes.add(new Option(s.document.label,id));scenes.onchange=()=>void this.switchScene(scenes.value);
  this.q<HTMLSelectElement>('[data-object]').onchange=e=>this.select((e.target as HTMLSelectElement).value);
  this.panel.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.onclick=()=>this.gizmo.setMode(b.dataset.mode as 'translate'|'rotate'|'scale'));
  this.q<HTMLButtonElement>('[data-frame]').onclick=()=>this.frame();
  this.q<HTMLButtonElement>('[data-save]').onclick=()=>void this.save();this.q<HTMLButtonElement>('[data-reload]').onclick=()=>void this.reload();
  this.q<HTMLButtonElement>('[data-reset]').onclick=()=>{if(this.saved)void this.restore(this.saved);};
  this.q<HTMLButtonElement>('[data-undo]').onclick=()=>{const old=this.history.pop();if(old)void this.restore(old);};
  this.q<HTMLButtonElement>('[data-play]').onclick=()=>{this.active=!this.active;world.setAuthoring(this.active);this.orbit.enabled=this.active;this.gizmo.enabled=this.active;this.gizmo.getHelper().visible=this.active;this.q('[data-play]').textContent=this.active?'Resume play':'Return to editing';if(this.active)this.select(this.selected);else this.gizmo.detach();};
  window.addEventListener('keydown',e=>{if(!this.active)return;e.stopImmediatePropagation();if(e.target instanceof HTMLElement&&e.target.matches('input,select,textarea'))return;
   if(e.ctrlKey&&e.key.toLowerCase()==='z'){e.preventDefault();this.q<HTMLButtonElement>('[data-undo]').click();}else{const modes={w:'translate',e:'rotate',r:'scale'}as const;const mode=modes[e.key.toLowerCase()as keyof typeof modes];if(mode){e.preventDefault();this.gizmo.setMode(mode);}}
  },true);
  world.setAuthoring(true);void this.switchScene('shindo');
 }
 private q<T extends HTMLElement=HTMLElement>(selector:string){return this.panel.querySelector<T>(selector)!;}
 private status(text:string){this.q('output').textContent=text;}
 private node(){return this.scene.document.nodes.find(n=>n.id===this.selected)!;}
 private async switchScene(id:string){this.gizmo.detach();this.scene=this.world.authoredEnvironments!.scenes.get(id)!;this.history=[];await this.reload();this.select(this.scene.document.nodes.find(n=>n.edit)?.id??this.scene.document.nodes[0].id);this.frame();}
 private select(id:string){this.selected=id;const select=this.q<HTMLSelectElement>('[data-object]');select.replaceChildren(...this.scene.document.nodes.map(n=>new Option(n.label+(n.edit?'':' · fixed'),n.id)));select.value=id;this.gizmo.detach();const n=this.node();if(n.edit&&this.active)this.gizmo.attach(this.scene.objects.get(id)!);this.fields();}
 private fields(){const n=this.node();this.q('[data-anchor]').textContent=`${n.id} · parent ${n.parent??n.anchor??'scene origin'}`;
  const root=this.q('[data-fields]');root.replaceChildren();for(const key of ['position','rotation','scale']as const){const label=document.createElement('label');label.textContent=key==='rotation'?'Rotation (degrees)':key==='position'?'Local position (metres)':'Local scale';const row=document.createElement('div');row.className='axes';
   for(let i=0;i<3;i++){const input=document.createElement('input');input.type='number';input.step=key==='rotation'?'1':'.01';input.value=String(Number((n[key][i]*(key==='rotation'?180/Math.PI:1)).toFixed(5)));input.setAttribute('aria-label',key+' '+['X','Y','Z'][i]);input.disabled=!n.edit;input.onchange=()=>{if(this.selected!==n.id)return;if(!Number.isFinite(input.valueAsNumber)){this.status('Enter a finite number.');return;}const next=structuredClone(this.node());next[key][i]=input.valueAsNumber*(key==='rotation'?Math.PI/180:1);this.history.push(structuredClone(this.scene.document));this.change(next);};row.append(input);}label.append(row);root.append(label);
  }
  const lights=this.q('[data-light]');lights.replaceChildren();if(n.light){for(const key of ['color','intensity','distance']as const){const label=document.createElement('label');label.textContent='Light '+key;const input=document.createElement('input');input.type=key==='color'?'color':'number';input.step='.05';input.setAttribute('aria-label','Light '+key);input.value=String(n.light[key]);input.onchange=()=>{if(this.selected!==n.id)return;const next=structuredClone(this.node());if(key==='color')next.light!.color=input.value;else next.light![key]=input.valueAsNumber;this.history.push(structuredClone(this.scene.document));this.change(next);};label.append(input);lights.append(label);}}
 }
 private change(next:SceneNode){const old=structuredClone(this.node());try{this.scene.updateNode(this.selected,next);this.world.validateAuthoringPlacement(this.scene,this.selected);this.world.renderer.shadowMap.needsUpdate=true;this.status('Unsaved changes · '+this.selected);}catch(error){this.scene.updateNode(this.selected,old);this.status(String(error));}this.fields();}
 private frame(){const n=this.node(),object=this.scene.objects.get(n.id)!;object.updateWorldMatrix(true,false);const target=object.getWorldPosition(new THREE.Vector3());target.y+=n.light?0:.35;this.orbit.target.copy(target);this.world.camera.position.copy(target).add(new THREE.Vector3(.9,.7,1.6));this.orbit.update();}
 private async restore(d:SceneDocument){try{this.gizmo.detach();await this.scene.load(structuredClone(d));this.select(d.nodes.some(n=>n.id===this.selected)?this.selected:d.nodes.find(n=>n.edit)?.id??d.nodes[0].id);this.world.renderer.shadowMap.needsUpdate=true;this.status('Restored local scene; save to persist.');}catch(e){this.status(String(e));}}
 async reload(){try{const r=await fetch('/__authoring/scene/'+this.scene.document.id,{cache:'no-store'});const body=await r.json();if(!r.ok)throw Error(body.error);await this.restore(body.document);this.revision=body.revision;this.saved=structuredClone(body.document);this.status('Loaded from disk · '+this.revision.slice(0,8));}catch(e){this.status(String(e));}}
 async save(){try{const r=await fetch('/__authoring/scene/'+this.scene.document.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({document:this.scene.document,revision:this.revision})});const body=await r.json();if(!r.ok)throw Error(body.error);this.revision=body.revision;this.saved=structuredClone(this.scene.document);this.status('Saved to repository · '+this.revision.slice(0,8));}catch(e){this.status(String(e));}}
}
