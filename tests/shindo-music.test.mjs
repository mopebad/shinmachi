import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,sep} from 'node:path';
import {shindoTrackManifest,trackFolder,shindoTrackPlugin} from '../tools/shindo-track-manifest.mjs';
import {shindoRoom,shindoImpulse} from '../src/world/audio/ShindoAcoustics.ts';
import {venueMusicMix} from '../src/world/audio/VenueMusicMix.ts';
import {vinylAngle} from '../src/world/generation/ShindoPresentation.ts';
import {createYotoVenue,venueBodyBlocked} from '../src/world/generation/YotoVenueLayout.ts';
import {SHINDO_CONTROLS,SHINDO_PANEL,canUseShindoControl} from '../src/world/generation/ShindoConsole.ts';

test('local folder scanner naturally sorts supported files, ignores directories and emits the same production playlist',async()=>{
 const root=await mkdtemp(join(tmpdir(),'shindo-music-test-'));
 try{
  assert.deepEqual(await shindoTrackManifest(root),{tracks:[]});const folder=resolve(root,trackFolder);await mkdir(folder,{recursive:true});
  for(const file of ['10_evening.MP3','02_深度.wav','01_arrival.ogg','README.md','.hidden.mp3','poster.png'])await writeFile(join(folder,file),'fixture');
  await mkdir(join(folder,'03_directory.mp3'));const manifest=await shindoTrackManifest(root);
  assert.deepEqual(manifest.tracks.map(t=>t.file),['01_arrival.ogg','02_深度.wav','10_evening.MP3']);assert.equal(manifest.tracks[0].title,'01 arrival');
  const plugin=shindoTrackPlugin();plugin.configResolved({root});let emitted;await plugin.generateBundle.call({emitFile(asset){emitted=asset;}});
  assert.equal(emitted.fileName,'assets/audio/nightlife/shindo/tracks.json');assert.deepEqual(JSON.parse(emitted.source),manifest);
 }finally{assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep)&&root.includes('shindo-music-test-'));await rm(root,{recursive:true,force:true});}
});
test('basement acoustics blend continuously from the last tread, isolate street sound and retain interior sound behind a closed portal',()=>{
 const v=createYotoVenue(),ear=v.floorY+1.705;
 const above=shindoRoom({x:19,y:1.82,z:-37}),inside=shindoRoom({x:19,y:ear,z:-37});assert.equal(above.ambience,1);assert.ok(inside.ambience<.13);
 let last;for(let z=-32.5;z>-34.1;z-=.005){const mix=venueMusicMix({x:19.5,y:ear,z},'shindo',21);if(last){assert.ok(Math.abs(mix.inside-last.inside)<.002);assert.ok(Math.abs(mix.cutoff-last.cutoff)<100);}last=mix;}
 const open=venueMusicMix({x:19,y:ear,z:-37},'shindo',21),closed=venueMusicMix({x:19,y:ear,z:-37},'shindo',21,false);assert.equal(closed.inside,open.inside);
 const impulse=shindoImpulse(48000);assert.deepEqual(impulse,shindoImpulse(48000));assert.equal(impulse[0].length,15360);assert.notDeepEqual(impulse[0],impulse[1]);
 const energy=(a,start,end)=>a.slice(start,end).reduce((n,x)=>n+x*x,0);assert.ok(energy(impulse[0],0,4800)>energy(impulse[0],10000,15360)*20);
 assert.equal(vinylAngle(0),0);assert.ok(Math.abs(vinylAngle(1.8)-Math.PI*2)<1e-10);assert.equal(vinylAngle(NaN),0);
});
test('listening monitors clear the shortened bench and open door/lining bounds preserve the central walking route',()=>{
 const v=createYotoVenue(),bench=v.boxes.find(b=>b.id==='lounge-bench'),speaker=v.boxes.find(b=>b.id==='speaker-16.45');assert.ok(speaker.maxZ<bench.minZ);
 for(const source of v.soundSystem.speakers){const box=v.boxes.find(b=>b.id==='speaker-'+source.x);assert.ok(source.y>box.minY&&source.y<box.maxY&&source.z>box.minZ&&source.z<box.maxZ);}
 assert.ok(venueBodyBlocked(v,20.05,-33.3,v.floorY));for(let z=-33;z>-39.8;z-=.05)assert.ok(!venueBodyBlocked(v,19.5,z,v.floorY));
});

test('physical music controls are reachable from a clear standing position and reject distant or obstructed use',()=>{
 const v=createYotoVenue();assert.deepEqual(SHINDO_CONTROLS.map(c=>c.action),['previous','toggle','next']);
 for(const control of SHINDO_CONTROLS){
  const eye={x:control.x,y:v.floorY+1.705,z:-39.3};
  assert.equal(venueBodyBlocked(v,eye.x,eye.z,v.floorY),false);
  const distance=Math.hypot(eye.y-(v.floorY+SHINDO_PANEL.yAboveFloor),eye.z-SHINDO_PANEL.z);
  assert.ok(canUseShindoControl(distance));assert.ok(!canUseShindoControl(distance,distance-.1));
 }
 assert.ok(canUseShindoControl(SHINDO_PANEL.reach));
 for(const distance of [-1,NaN,Infinity,SHINDO_PANEL.reach+.001])assert.equal(canUseShindoControl(distance),false);
});
