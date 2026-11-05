import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const files={shindo:'src/world/authoring/scenes/shindo.json',yoto:'src/world/authoring/scenes/yoto.json'};
export const sceneRevision=text=>createHash('sha256').update(text).digest('hex');
export function sceneAuthoringPlugin(){const writing=new Set();return{name:'local-scene-authoring',configureServer(server){
 server.middlewares.use('/__authoring',async(req,res)=>{
  const send=(code,body)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));};
  let locked;try{
   if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host||req.headers['sec-fetch-site']==='cross-site')return send(403,{error:'Same-origin authoring only'});
   const path=req.url?.split('?')[0]??'',id=path.split('/')[2];
   if(path==='/snapshot/yoto-ramen'||path==='/snapshot/yoto-izakaya'){
    if(req.method!=='POST')return send(405,{error:'POST required'});let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>14000000)return send(413,{error:'Snapshot too large'});}
    const bytes=Buffer.from(JSON.parse(raw).glb,'base64');if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)return send(400,{error:'Invalid GLB'});
    const directory=resolve(server.config.root,'assets-source/workflow2');await mkdir(directory,{recursive:true});await writeFile(resolve(directory,id+'.glb'),bytes);return send(200,{saved:id});
   }
   if(!Object.hasOwn(files,id)||path!=='/scene/'+id)return send(404,{error:'Unknown permitted scene'});
   if(req.method==='PUT'){if(writing.has(id))return send(409,{error:'Save already in progress'});writing.add(id);locked=id;}
   const file=resolve(server.config.root,files[id]),text=await readFile(file,'utf8'),revision=sceneRevision(text);
   if(req.method==='GET')return send(200,{document:JSON.parse(text),revision});
   if(req.method!=='PUT')return send(405,{error:'GET or PUT required'});
   if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON required'});
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>262144)return send(413,{error:'Scene too large'});}
   const body=JSON.parse(raw);if(body.revision!==revision)return send(409,{error:'Scene changed on disk; reload before saving'});
   const {validateSavedEdit,serializeScene}=await server.ssrLoadModule('/src/world/authoring/SceneSchema.ts');
   const catalog=JSON.parse(await readFile(resolve(server.config.root,'src/world/authoring/catalog.json'),'utf8'));
   validateSavedEdit(JSON.parse(text),body.document,catalog);const next=serializeScene(body.document);await writeFile(file+'.tmp',next);await rename(file+'.tmp',file);return send(200,{revision:sceneRevision(next),document:body.document});
  }catch(error){return send(400,{error:String(error)});}finally{if(locked)writing.delete(locked);}
 });
}};}
