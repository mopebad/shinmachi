import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {createYotoVenue,venueSupport,venueBodyBlocked,YOTO_VENUE,yotoParcelDepth} from '../src/world/generation/YotoVenueLayout.ts';
import {PlayerController} from '../src/world/controls/PlayerController.ts';
import {venueMusicMix} from '../src/world/audio/VenueMusicMix.ts';
import {CityBackdrop} from '../src/world/generation/CityBackdrop.ts';
const v=createYotoVenue();
test('ground-cut faces are buried in retaining walls instead of z-fighting with the visible shaft lining',()=>{
 const c=v.slabOpening,west=v.boxes.find(b=>b.id==='shaft-west'),east=v.boxes.find(b=>b.id==='shaft-east'),rear=v.boxes.find(b=>b.id==='stair-rear-closure');
 assert.ok(c.minX>west.minX+.04&&c.minX<west.maxX-.04);
 assert.ok(c.maxX>east.minX+.04&&c.maxX<east.maxX-.04);
 assert.ok(c.minZ>rear.minZ+.04&&c.minZ<rear.maxZ-.04);
 assert.equal(c.maxZ,v.surfaces.find(s=>s.id==='entrance').minZ);
 assert.equal(west.minZ,east.minZ);assert.equal(east.minZ,v.boxes.find(b=>b.id==='room-east').maxZ);
 // Validate actual uploaded Float32 terrain geometry as well as the authored contract.
 const backdrop=new CityBackdrop(new THREE.Scene(),8412),pieces=[],matrix=new THREE.Matrix4();backdrop.group.updateMatrixWorld(true);
 backdrop.group.traverse(mesh=>{if(!mesh.isInstancedMesh)return;mesh.geometry.computeBoundingBox();for(let i=0;i<mesh.count;i++)if(mesh.userData.sections[i]==='ground'){mesh.getMatrixAt(i,matrix);pieces.push(mesh.geometry.boundingBox.clone().applyMatrix4(matrix.clone().premultiply(mesh.matrixWorld)));}});
 assert.equal(pieces.length,4);assert.ok(Math.abs(pieces[0].max.x-c.minX)<.001);assert.ok(Math.abs(pieces[1].min.x-c.maxX)<.001);assert.ok(Math.abs(pieces[2].max.z-c.minZ)<.001);assert.ok(Math.abs(pieces[3].min.z-c.maxZ)<.001);
 for(const b of pieces)assert.ok(!(b.min.x<v.shaft.maxX-.001&&b.max.x>v.shaft.minX+.001&&b.min.z<c.maxZ-.001&&b.max.z>v.shaft.minZ+.001));
});
test('alternate-seed deep parcels preserve a real shaft service gap without modifying unrelated frontages',()=>{
 for(let x=6.25;x<=6.96;x+=.1)for(let depth=9;depth<13.01;depth+=.2){const d=yotoParcelDepth(x,-31.3,6.5,depth);assert.ok(d<=depth&&d>=8.5||d===depth);assert.ok(x+d<=15.5+1e-8);}
 assert.equal(yotoParcelDepth(6.44,-31.3,6.5,9),9);assert.equal(yotoParcelDepth(6.44,34,6.5,13),13);assert.equal(yotoParcelDepth(-6.44,-31.3,6.5,13),13);
});
function controller(){const c=Object.create(PlayerController.prototype);Object.assign(c,{camera:new THREE.PerspectiveCamera(),velocity:new THREE.Vector3(),direction:new THREE.Vector3(),safe:new THREE.Vector3(),keys:new Set(),mode:'walk',colliders:[v.exteriorReservation,v.npcReservation],venue:v,yaw:0,pitch:0});c.teleport(new THREE.Vector3(19.5,1.82,-26.8),new THREE.Vector3(19.5,1.82,-40));return c;}
test('eighteen supported descending treads join the street to a bounded real basement with clear headroom',()=>{
 assert.equal(v.surfaces.filter(s=>s.id.startsWith('tread')).length,18);assert.ok(Math.abs(v.floorY+2.945)<1e-9);let y=v.groundY;
 for(const p of v.journey){const support=venueSupport(v,p.x,p.z,y);if(support!==undefined){assert.notEqual(support,null);assert.ok(Math.abs(p.y-support)<1e-8);assert.ok(!venueBodyBlocked(v,p.x,p.z,support));y=support;}}
 assert.ok(v.boxes.find(b=>b.id==='ceiling').minY-v.floorY>2.5);
 assert.equal(venueSupport(v,19.5,-25,v.floorY),null);assert.equal(venueSupport(v,19.5,-29,v.groundY),null);
 assert.ok(venueBodyBlocked(v,17.4,-35,v.floorY));assert.ok(venueBodyBlocked(v,20.45,-35,v.floorY));
 assert.equal(v.tenants.map(t=>t.floor).join(','),'B1,1F,2F,3F');assert.equal(v.tenants.filter(t=>t.enterable).length,2);
});
test('stair hardware reservations protect both wall-side grips without narrowing the central walking route',()=>{
 const rails=v.boxes.filter(b=>b.id.startsWith('stair-rail-'));assert.equal(rails.length,2);assert.ok(rails[1].minX-rails[0].maxX>1.5);
 for(const s of v.surfaces.filter(s=>s.id.startsWith('tread'))){const z=(s.minZ+s.maxZ)/2;
  assert.ok(venueBodyBlocked(v,18.9,z,s.y));assert.ok(venueBodyBlocked(v,20.1,z,s.y));
  for(const x of [19.05,19.5,19.95])assert.ok(!venueBodyBlocked(v,x,z,s.y));
 }
});
test('actual walking controller descends, explores and returns without teleportation, wall penetration or lost floor support',()=>{
 const c=controller();let maxStep=0,previous=c.camera.position.clone();c.keys.add('w');
 for(let i=0;i<250;i++){c.update(1/60);maxStep=Math.max(maxStep,Math.abs(c.camera.position.y-previous.y));assert.ok(!venueBodyBlocked(v,c.camera.position.x,c.camera.position.z,c.footY));previous.copy(c.camera.position);}
 assert.ok(c.camera.position.z< -37);assert.ok(Math.abs(c.footY-v.floorY)<1e-9);assert.ok(maxStep<=.17000001);
 c.keys.clear();c.keys.add('s');for(let i=0;i<270;i++)c.update(1/60);assert.ok(c.camera.position.z> -27);assert.ok(Math.abs(c.footY-v.groundY)<1e-9);
});
test('walking cannot cross retaining walls, furniture or the street slab beside the real entrance',()=>{
 const c=controller();c.keys.add('w');for(let i=0;i<200;i++)c.update(1/60);c.keys.clear();c.keys.add('d');for(let i=0;i<120;i++)c.update(1/60);
 assert.ok(c.camera.position.x<=20.151);assert.ok(!venueBodyBlocked(v,c.camera.position.x,c.camera.position.z,c.footY));
 assert.equal(c.blocked(19.5,-41.3),true);assert.equal(c.blocked(17.4,-35),true);assert.equal(c.blocked(20.6,-34),true);
});
test('expanded basement and sealed stair soffit retain usable headroom, ground above and an accessible lounge',()=>{
 assert.ok((v.room.maxX-v.room.minX)*(v.room.maxZ-v.room.minZ)>37);
 const c=controller();c.keys.add('w');for(let i=0;i<285;i++)c.update(1/60);c.keys.clear();c.keys.add('a');for(let i=0;i<30;i++)c.update(1/60);c.keys.clear();
 assert.ok(c.camera.position.x<18.4&&c.camera.position.z< -39);
 assert.ok(!venueBodyBlocked(v,c.camera.position.x,c.camera.position.z,c.footY));
 for(const s of v.surfaces.filter(s=>s.id.startsWith('tread'))){const soffit=v.boxes.find(b=>b.id==='soffit-'+s.id);assert.ok(soffit.minY-s.y>2.6);}
 assert.ok(v.boxes.find(b=>b.id==='stair-rear-closure').maxY>=2.9);
 assert.equal(venueSupport(v,18.0,-40,v.groundY),undefined);
});
test('music follows the physical doorway, increases during descent, retains stereo inside and attenuates through closed portals',()=>{
 const outside=venueMusicMix({x:19.5,y:1.82,z:-26.9},'shindo',21),wall=venueMusicMix({x:17,y:1.82,z:-29},'shindo',21),inside=venueMusicMix({x:19.5,y:v.floorY+1.705,z:-35},'shindo',21);
 assert.ok(outside.outside>0&&outside.inside===0);assert.equal(wall.zone,'through-wall');assert.ok(wall.cutoff<outside.cutoff);assert.equal(inside.zone,'basement');assert.ok(inside.inside>.2&&inside.outside===0&&inside.cutoff>16000);
 let previous=0;for(const s of v.surfaces.filter(s=>s.id.startsWith('tread'))){const mix=venueMusicMix({x:19.5,y:s.y+1.705,z:(s.minZ+s.maxZ)/2},'shindo',21);assert.ok(mix.inside>=previous);previous=mix.inside;}
 const closed=venueMusicMix({x:19.5,y:1.82,z:-26.9},'shindo',21,false);assert.ok(closed.outside<outside.outside*.1);assert.ok(closed.cutoff<outside.cutoff);
 for(const kind of ['shindo','jazz']){const silent=venueMusicMix({x:19.5,y:1.82,z:-26.9},kind,3);assert.equal(silent.inside+silent.outside,0);assert.equal(venueMusicMix({x:60,y:1.82,z:60},kind,21).outside,0);}
});
test('local music recordings match artist-source hashes and ship with distribution credits',async()=>{
 const record=JSON.parse(await readFile(new URL('../public/assets/music/provenance.json',import.meta.url)));assert.equal(record.tracks.length,2);
 for(const track of record.tracks){const bytes=await readFile(new URL('../public/assets/music/'+track.file,import.meta.url));assert.equal(bytes.length,track.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),track.sha256);assert.equal(track.license,'CC BY 4.0');assert.ok(track.source.startsWith('https://incompetech.com/'));assert.ok(track.attribution.includes('Kevin MacLeod'));}
 const credits=await readFile(new URL('../public/assets/music/CREDITS.html',import.meta.url),'utf8');assert.ok(credits.includes('creativecommons.org/licenses/by/4.0/'));
 assert.equal(JSON.stringify(createYotoVenue()),JSON.stringify(v));
});
