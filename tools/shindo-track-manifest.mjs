import {readdir} from 'node:fs/promises';
import {resolve} from 'node:path';

export const trackFolder='public/assets/audio/nightlife/shindo';
/** Flat local playlist, naturally sorted. No directory traversal, recursive scan or external URLs. */
export async function shindoTrackManifest(root){
 let entries;try{entries=await readdir(resolve(root,trackFolder),{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return{tracks:[]};throw error;}
 return{tracks:entries.filter(e=>e.isFile()&&!e.name.startsWith('.')&&/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(e.name))
  .sort((a,b)=>a.name.localeCompare(b.name,'en',{numeric:true,sensitivity:'base'})||a.name.localeCompare(b.name,'en'))
  .map(e=>({file:e.name,title:e.name.replace(/\.[^.]+$/,'').replace(/[_]+/g,' ')}))};
}
export function shindoTrackPlugin(){
 let root;
 return{name:'shindo-local-tracks',configResolved(config){root=config.root;},
  configureServer(server){server.middlewares.use('/assets/audio/nightlife/shindo/tracks.json',async(request,response)=>{
   if(request.method!=='GET'){response.statusCode=405;response.end();return;}
   try{response.setHeader('Content-Type','application/json');response.setHeader('Cache-Control','no-store');response.end(JSON.stringify(await shindoTrackManifest(root)));}
   catch{response.statusCode=500;response.end('Cannot read Shindo track folder');}
  });},
  async generateBundle(){this.emitFile({type:'asset',fileName:'assets/audio/nightlife/shindo/tracks.json',source:JSON.stringify(await shindoTrackManifest(root))});},
 };
}
