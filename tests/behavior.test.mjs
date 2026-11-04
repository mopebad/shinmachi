import test from 'node:test';
import assert from 'node:assert/strict';
import {pedestrianIdentity,driverIdentity} from '../src/world/simulation/AgentIdentity.ts';
import {walkingDistance,beginLocomotion,finishLocomotion} from '../src/world/simulation/Locomotion.ts';
import {CitySimulation} from '../src/world/simulation/CitySimulation.ts';
import {VEHICLE_KINDS} from '../src/world/simulation/VehicleCatalog.ts';
import {walkingPose} from '../src/world/simulation/WalkingPose.ts';
import {updateVehicleLights} from '../src/world/simulation/Driving.ts';
import {pointBlocked,segmentClear} from '../src/world/simulation/Navigation.ts';

test('optional frontage activities reserve clear pockets, preserve routes, finish and never occupy roads or station space',()=>{
  const doors=[{x:6,z:33,sidewalkX:4.55,business:'restaurant'},{x:6,z:40,sidewalkX:4.55,business:'convenience'},{x:-6,z:31,sidewalkX:-4.55,business:'retail'},{x:-6,z:-12,sidewalkX:-4.55,business:'cafe'}];
  const bounds=[{minX:6.4,maxX:12,minZ:27,maxZ:44}];
  const sim=new CitySimulation({seed:42,doors,bounds}),saved=new Map();let actions=0,pairs=0,minSeparation=Infinity;
  assert.equal(sim.streetLife.zones.length,4);
  for(const zone of sim.streetLife.zones)for(const spot of zone.spots){assert.ok(!pointBlocked(spot,bounds,.29));assert.ok(segmentClear(sim.navigation.nodes[zone.anchor],spot,bounds,.29));}
  for(let i=0;i<18000;i++){
    sim.update(1/30,20.5);
    const people=sim.pedestrians.filter(p=>p.active);
    for(const p of people){
      if(p.companion)pairs++;
      if(!p.activity){saved.delete(p.identity.uid);continue;}actions++;
      assert.ok(!p.crossing&&!p.station&&!p.rail&&Math.abs(p.x)>4.05&&(p.z<6.5||p.z>17.5));
      const path={path:p.path,next:p.next};if(saved.has(p.identity.uid))assert.deepEqual(path,saved.get(p.identity.uid));else saved.set(p.identity.uid,structuredClone(path));
      if(p.activity.state==='acting'){const z=sim.streetLife.zones[p.activity.zone],s=z.spots[p.activity.spot];assert.ok(Math.hypot(p.x-s.x,p.z-s.z)<.04);}
    }
    for(let a=0;a<people.length;a++)for(let b=a+1;b<people.length;b++)minSeparation=Math.min(minSeparation,Math.hypot(people[a].x-people[b].x,people[a].z-people[b].z));
  }
  assert.ok(actions>100&&pairs>100);assert.ok(sim.streetLife.metrics.completed>0);assert.ok(minSeparation>=.5);
  assert.ok(sim.streetLife.events.some(e=>e.state==='acting')&&sim.streetLife.events.some(e=>e.state==='completed'));
  for(let i=0;i<1800;i++)sim.update(1/30,3);
  assert.ok(sim.pedestrians.every(p=>!p.activity||sim.streetLife.zones[p.activity.zone].business==='convenience'));
});

test('driver acceleration, braking, speed and steering stay within bounded profiles over real signal cycles',()=>{
  const sim=new CitySimulation({seed:193});let braking=0,indicating=0,maxEmergency=0;
  for(let i=0;i<6000;i++){
    sim.update(1/30,20.5);
    for(const c of sim.vehicles.filter(c=>c.active)){
      assert.ok(c.speed>=0&&c.speed<=c.driver.preferredSpeed+1e-8);
      assert.ok(c.acceleration<=c.driver.acceleration+1e-7);
      maxEmergency=Math.max(maxEmergency,-c.acceleration-c.driver.braking);
      if(c.acceleration<-.2){braking++;assert.ok(c.lights.brake);}
      if(c.lights.indicator!=='none'){indicating++;assert.ok(c.route.turn);}
      assert.ok(Math.abs(c.steering)<=.5);assert.equal(c.lights.headlights,true);
    }
  }
  assert.ok(braking>500&&indicating>100);assert.ok(maxEmergency<.01,`braking outside comfort bound: ${maxEmergency}`);
});

test('indicators precede the actual bend, persist through it and cancel afterwards; lamps follow weather/time',()=>{
  const sim=new CitySimulation(),c=sim.vehicles.find(c=>c.route.turn);
  assert.ok(c);const start=c.route.distances[1],end=c.route.distances.at(-2);
  c.s=start-12;updateVehicleLights(c,10,13,false,1/30);assert.equal(c.lights.indicator,'left');assert.equal(c.lights.headlights,false);
  c.s=(start+end)/2;updateVehicleLights(c,10.4,13,true,1/30);assert.equal(c.lights.indicator,'left');assert.equal(c.lights.headlights,true);
  c.s=end+5;updateVehicleLights(c,11,22,false,1/30);assert.equal(c.lights.indicator,'none');assert.equal(c.lights.blink,false);assert.equal(c.lights.taillights,true);
});

test('birth traits are bounded, immutable, diverse and reproducible independently of route or presentation draws',()=>{
  const people=Array.from({length:300},(_,i)=>pedestrianIdentity(8412,i));
  for(const p of people){assert.deepEqual(p,pedestrianIdentity(8412,p.uid));assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.appearance));assert.ok(p.preferredSpeed>=.94&&p.preferredSpeed<=1.5);assert.ok(p.strideLength>=.48&&p.strideLength<=.68);}
  assert.equal(new Set(people.map(p=>p.purpose)).size,7);assert.ok(new Set(people.map(p=>p.preferredSpeed)).size>290);assert.ok(new Set(people.map(p=>p.appearance.shirt)).size>7);
  const van=Array.from({length:100},(_,i)=>driverIdentity(72,i,'van')),sport=Array.from({length:100},(_,i)=>driverIdentity(72,i,'coupe'));
  assert.ok(Math.max(...van.map(v=>v.acceleration))<Math.min(...sport.map(v=>v.acceleration)));
  for(const kind of VEHICLE_KINDS)for(let i=0;i<40;i++){const p=driverIdentity(7,i,kind);assert.ok(Object.isFrozen(p));assert.ok(p.preferredSpeed<=6.1&&p.turnSpeed<4);assert.deepEqual(p,driverIdentity(7,i,kind));}
});

test('street locomotion ramps within personal limits and gait/footfalls follow distance rather than idle time',()=>{
  const p=new CitySimulation().pedestrians[0];p.station=undefined;p.rail=undefined;const identity=p.identity;
  let old=0;
  for(let i=0;i<90;i++){const distance=walkingDistance(p,1/30,20);assert.ok(p.motion.travelSpeed-old<=p.identity.acceleration/30+1e-9);old=p.motion.travelSpeed;beginLocomotion(p);p.z+=distance;finishLocomotion(p,1/30,i/30);}
  assert.ok(p.motion.speed<=p.speed+1e-7&&p.motion.footfalls>1);const phase=p.phase,steps=p.motion.footfalls;
  for(let i=0;i<60;i++){beginLocomotion(p);finishLocomotion(p,1/30,4+i/30);}
  assert.equal(p.phase,phase);assert.equal(p.motion.footfalls,steps);assert.equal(p.identity,identity);assert.ok(p.motion.blend<1e-5);
});

test('profiles, gait and vehicle movement replay identically at 144 Hz and 30 Hz',()=>{
  const a=new CitySimulation({seed:73}),b=new CitySimulation({seed:73});
  for(let i=0;i<120*144;i++)a.update(1/144,20.5);for(let i=0;i<120*30;i++)b.update(1/30,20.5);
  assert.deepEqual(a.pedestrians,b.pedestrians);assert.deepEqual(a.vehicles,b.vehicles);
});

test('flat-ground stance feet remain planted and articulated legs retain their physical length',()=>{
  const p=new CitySimulation().pedestrians[0];p.x=4.55;p.z=35;p.y=.115;p.yaw=0;p.station=undefined;p.rail=undefined;let planted=0,previous=[];
  for(let i=0;i<300;i++){
    beginLocomotion(p);if(i<240)p.z+=walkingDistance(p,1/30,20);finishLocomotion(p,1/30,i/30);
    const scale=p.scale*1.08*(p.style===4?.96:1),pose=walkingPose(p,scale);assert.ok(pose);
    for(const [j,leg]of pose.legs.entries()){
      for(const [a,b]of [[leg.hip,leg.knee],[leg.knee,leg.ankle]])assert.ok(Math.abs(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)-.34*scale)<1e-7);
      const f=p.motion.feet[j],old=previous[j];if(f.grounded&&old?.grounded&&f.lastPhase>=old.lastPhase){assert.equal(f.x,old.x);assert.equal(f.z,old.z);planted++;}
    }
    previous=structuredClone(p.motion.feet);
  }
  assert.ok(planted>100);
  for(const f of p.motion.feet)assert.ok(Math.hypot(f.x-p.x,f.z-p.z)<.15,'Stopped feet settle underneath the body by lifting, then remain planted');
});

test('optional actions and companion formation replay across frame partitions with real shop destinations',()=>{
  const config={seed:8412,doors:[{x:6,z:33,sidewalkX:4.55,business:'restaurant'},{x:6,z:40,sidewalkX:4.55,business:'convenience'}]},a=new CitySimulation(config),b=new CitySimulation(config);
  for(let i=0;i<120*30;i++)a.update(1/30,20.5);for(let i=0;i<120*144;i++)b.update(1/144,20.5);
  assert.deepEqual(a.pedestrians,b.pedestrians);assert.deepEqual(a.streetLife.events,b.streetLife.events);assert.deepEqual(a.streetLife.metrics,b.streetLife.metrics);assert.ok(a.streetLife.metrics.started>0);
});
