// Explicit one-time asset intake. Runtime uses local files and requires no remote service.
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='https://incompetech.com/music/royalty-free/',catalog=await(await fetch(base+'pieces.json')).json();
const tracks=[];await mkdir('public/assets/music',{recursive:true});
for(const [title,file]of [['Backbay Lounge','backbay-lounge.mp3'],['EDM Detection Mode','edm-detection-mode.mp3']]){
 const entry=catalog.find(p=>p.title===title);if(!entry)throw new Error('Missing catalog entry '+title);
 const source=base+'mp3-royaltyfree/'+encodeURIComponent(entry.filename),response=await fetch(source);if(!response.ok)throw new Error(source+' '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<100000)throw new Error('Invalid music asset');
 await writeFile('public/assets/music/'+file,bytes);tracks.push({title,author:'Kevin MacLeod',file,source,trackPage:base+'index.html?isrc='+entry.isrc,isrc:entry.isrc,duration:entry.length,license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',licensePage:base+'licenses/',attribution:`"${title}" Kevin MacLeod (incompetech.com) — Licensed under Creative Commons: By Attribution 4.0 License. https://creativecommons.org/licenses/by/4.0/`,modifications:'Original MP3 file unchanged; playback gain, filtering, spatialization and looping are applied in the game.',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 console.log(title+': '+bytes.length+' bytes');
}
await writeFile('public/assets/music/provenance.json',JSON.stringify({retrieved:new Date().toISOString(),catalogSource:base+'pieces.json',licenseVerification:'The artist catalog page generates CC BY 4.0 credits for these catalog entries; the licensing page offers the attribution-based Creative Commons option.',tracks},null,2)+'\n');
