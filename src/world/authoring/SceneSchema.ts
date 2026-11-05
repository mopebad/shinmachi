export type Vec3=[number,number,number];
export interface Transform {position:Vec3;rotation:Vec3;scale:Vec3}
export interface SceneNode extends Transform{
 id:string;label:string;parent?:string;anchor?:string;asset?:string;prefab?:string;
 material?:Record<string,MaterialConfig>;
 light?:{color:string;intensity:number;distance:number};
 collision?:{reservation:string};interaction?:{binding:string;point?:Vec3};
 edit?:{min:Vec3;max:Vec3;rotationMin:Vec3;rotationMax:Vec3;scaleMin:Vec3;scaleMax:Vec3};
}
export interface MaterialConfig {finish?:string;color?:string;roughness?:number;metalness?:number;emissiveIntensity?:number}
export interface SceneDocument {version:1;id:string;label:string;coordinateSystem:'metres-y-up-radians';nodes:SceneNode[]}
export interface AssetDefinition {path:string;dimensions:Vec3;source:string;license:string;materials?:Record<string,MaterialConfig>}
export interface AssetCatalog {version:1;assets:Record<string,AssetDefinition>;prefabs:Record<string,{nodes:SceneNode[]}>}
const idPattern=/^[a-z][a-z0-9-]{0,79}$/;
function assert(condition:unknown,message:string):asserts condition{if(!condition)throw Error(message);}
function tuple(value:unknown,label:string,min=-10000,max=10000):asserts value is Vec3{assert(Array.isArray(value)&&value.length===3&&value.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max),'Invalid '+label);}
export function validateCatalog(catalog:AssetCatalog){
 assert(catalog.version===1&&catalog.assets&&catalog.prefabs,'Invalid asset catalog');
 for(const [id,a]of Object.entries(catalog.assets)){assert(idPattern.test(id)&&/^assets\/[a-zA-Z0-9/_-]+\.glb$/.test(a.path),'Asset must reference a local GLB');tuple(a.dimensions,id+' dimensions',.0001,1000);assert(Boolean(a.source&&a.license),'Asset provenance required');}
 for(const [id,p]of Object.entries(catalog.prefabs)){assert(idPattern.test(id),'Invalid prefab ID');validateScene({version:1,id,label:id,coordinateSystem:'metres-y-up-radians',nodes:p.nodes},catalog);}
 const visit=(id:string,ancestors:Set<string>)=>{assert(!ancestors.has(id),'Prefab cycle');const next=new Set(ancestors).add(id);for(const n of catalog.prefabs[id].nodes)if(n.prefab)visit(n.prefab,next);};for(const id of Object.keys(catalog.prefabs))visit(id,new Set());
}
/** Shared browser/server validation. Assets and files are catalog references, never request paths. */
export function validateScene(value:unknown,catalog?:AssetCatalog):asserts value is SceneDocument{
 assert(value&&typeof value==='object'&&!Array.isArray(value),'Scene must be an object');const d=value as SceneDocument;
 assert(d.version===1&&idPattern.test(d.id)&&typeof d.label==='string'&&d.label.length<160&&d.coordinateSystem==='metres-y-up-radians','Unsupported scene identity/version/units');
 assert(Object.keys(d).every(k=>['version','id','label','coordinateSystem','nodes'].includes(k)),'Unknown scene field');
 assert(Array.isArray(d.nodes)&&d.nodes.length<=300,'Invalid scene node count');const ids=new Set<string>();
 for(const n of d.nodes){
  assert(n&&typeof n==='object'&&idPattern.test(n.id)&&!ids.has(n.id),'Duplicate or invalid stable ID');ids.add(n.id);
  assert(typeof n.label==='string'&&n.label.length<160,'Invalid node label');
  assert(Object.keys(n).every(k=>['id','label','position','rotation','scale','parent','anchor','asset','prefab','material','light','collision','interaction','edit'].includes(k)),'Unknown node field');
  tuple(n.position,n.id+' position');tuple(n.rotation,n.id+' rotation',-Math.PI*2,Math.PI*2);tuple(n.scale,n.id+' scale',.01,100);
  assert(!n.asset||!n.prefab,'Choose asset or prefab');assert(!n.parent||!n.anchor,'Choose parent or generated anchor');
  if(n.asset)assert(idPattern.test(n.asset)&&(!catalog||catalog.assets[n.asset]),'Unknown asset '+n.asset);
  if(n.prefab)assert(idPattern.test(n.prefab)&&(!catalog||catalog.prefabs[n.prefab]),'Unknown prefab '+n.prefab);
  if(n.anchor)assert(/^[a-z0-9:-]+$/.test(n.anchor),'Invalid generated anchor');
  if(n.collision)assert(Object.keys(n.collision).length===1&&/^[a-z0-9.-]+$/.test(n.collision.reservation),'Invalid collision binding');
  if(n.interaction){assert(Object.keys(n.interaction).every(k=>['binding','point'].includes(k))&&idPattern.test(n.interaction.binding),'Invalid interaction binding');if(n.interaction.point)tuple(n.interaction.point,'local interaction point');}
  if(n.light){assert(Object.keys(n.light).every(k=>['color','intensity','distance'].includes(k)),'Unknown light field');assert(/^#[0-9a-f]{6}$/i.test(n.light.color),'Invalid light colour');assert(Number.isFinite(n.light.intensity)&&n.light.intensity>=0&&n.light.intensity<=100&&Number.isFinite(n.light.distance)&&n.light.distance>.1&&n.light.distance<=50,'Invalid light range');}
  if(n.edit){for(const k of ['min','max','rotationMin','rotationMax','scaleMin','scaleMax'] as const)tuple(n.edit[k],n.id+' edit limit');
   for(let i=0;i<3;i++)for(const [v,lo,hi]of [[n.position,n.edit.min,n.edit.max],[n.rotation,n.edit.rotationMin,n.edit.rotationMax],[n.scale,n.edit.scaleMin,n.edit.scaleMax]])assert(v[i]>=lo[i]-1e-7&&v[i]<=hi[i]+1e-7,'Outside edit envelope: '+n.id);
  }
  if(n.material)for(const [key,m]of Object.entries(n.material)){assert(key!=='__proto__'&&key.length<160,'Invalid material key');assert(Object.keys(m).every(k=>['finish','color','roughness','metalness','emissiveIntensity'].includes(k)),'Unknown material setting');if(m.color)assert(/^#[0-9a-f]{6}$/i.test(m.color),'Invalid material colour');if(m.finish)assert(['walnut','leather'].includes(m.finish),'Unknown material finish');for(const p of ['roughness','metalness','emissiveIntensity']as const)if(m[p]!==undefined)assert(Number.isFinite(m[p])&&m[p]!>=0&&m[p]!<=(p==='emissiveIntensity'?3:1),'Invalid material value');}
 }
 const byId=new Map(d.nodes.map(n=>[n.id,n]));
 for(const n of d.nodes){const seen=new Set<string>([n.id]);let parent=n.parent;while(parent){assert(byId.has(parent)&&!seen.has(parent),'Missing parent or cycle at '+n.id);seen.add(parent);parent=byId.get(parent)!.parent;}}
}
export function serializeScene(document:SceneDocument){validateScene(document);return JSON.stringify(document,null,2)+'\n';}
/** Editor saves may adjust transforms/light/materials only. Structure and safety limits stay on disk. */
export function validateSavedEdit(current:SceneDocument,next:unknown,catalog?:AssetCatalog):asserts next is SceneDocument{
 validateScene(next,catalog);assert(next.id===current.id&&next.nodes.length===current.nodes.length,'Scene structure changed');
 const immutable=(d:SceneDocument)=>({...d,nodes:d.nodes.map(n=>{const {position,rotation,scale,light,material,...rest}=n;return rest;})});
 assert(JSON.stringify(immutable(current))===JSON.stringify(immutable(next)),'Editor cannot change IDs, references, hierarchy or limits');
 current.nodes.forEach((old,i)=>{const n=next.nodes[i];if(!old.edit)assert(JSON.stringify(old)===JSON.stringify(n),'Locked node '+old.id);assert(Boolean(old.light)===Boolean(n.light),'Light component changed');});
}
