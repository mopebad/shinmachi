import test from 'node:test';
import assert from 'node:assert/strict';
import { CitySimulation, VEHICLE_PROFILES } from '../src/world/simulation/CitySimulation.ts';
import { Navigation, pointBlocked } from '../src/world/simulation/Navigation.ts';
import { createStationLayout, inStationRect } from '../src/world/generation/StationLayout.ts';
import { stationPositionValid, stationFootSurface } from '../src/world/simulation/StationNavigation.ts';
import { stationStairPose } from '../src/world/simulation/StationPose.ts';

const layout=createStationLayout();
const bounds=[...layout.npcReservation,...layout.boxes.filter(b=>b.collision&&b.minY<.3)];
const create=seed=>new CitySimulation({seed,station:layout,bounds});
const outbound=['approaching','entering','gate-in','paid','ascending','platform','waiting','boarding','riding'];
const inbound=['riding','alighting','returning','descending','paid','gate-out','exiting'];

test('station graph has surface-validated 3D lanes, all four tread flights, gated boundaries and distinct waiting destinations',()=>{
  const nav=new Navigation(bounds,[],layout),s=nav.station;
  assert.ok(s.validation.edges>200&&s.validation.samples>4000);assert.ok(s.waiting.length>=8);
  assert.equal(s.entranceGates.length,2);assert.equal(s.exitGate,'wide-gate');
  assert.equal(nav.nodes[s.anchor].x,layout.nodes.forecourt.x);
  for(const id of s.nodeIds)assert.ok(stationPositionValid(layout,nav.nodes[id]),`Unsupported node ${id}`);
  for(const slot of s.waiting){
    assert.ok(inStationRect(nav.nodes[slot.node],layout.areas.find(a=>a.id==='waiting-east'),.2));
    for(const gate of s.entranceGates){
      const route=[...s.inbound.get(gate),...slot.inbound.slice(1),...slot.outbound.slice(1)];
      assert.equal(route.at(-1),s.exitAnchor);
      const flights=new Set();let paid=false,entries=0,exits=0;
      for(let i=1;i<route.length;i++){
        const edge=nav.edges.get(route[i-1]).find(e=>e.to===route[i])?.station;assert.ok(edge,'Missing real traversal edge');
        if(edge.flight)flights.add(edge.flight);
        const goal=nav.nodes[route[i]];
        if(goal.station===gate+':paid'){paid=true;entries++;}
        if(goal.station==='exit-gate-unpaid'){paid=false;exits++;}
        if(goal.y>.4)assert.equal(paid,true,'Elevation reachable without passing a gate');
      }
      assert.equal(entries,1);assert.equal(exits,1);assert.equal(flights.size,4);assert.equal(paid,false);
    }
  }
});

test('600 seconds of station journeys retain continuous circulation, gate reservations, stairs and traffic safety',()=>{
  const sim=create(8412);let wallHits=0,roadSteps=0,overlaps=0,exits=0,climbs=0,descents=0,maxVerticalStep=0;
  assert.ok(sim.pedestrians.every(p=>!p.station&&p.y<=.115),'No passengers may spawn upstairs');
  for(let i=0;i<18000;i++){
    const before=sim.pedestrians.map(p=>({x:p.x,y:p.y,z:p.z,visit:p.station?.id,state:p.station?.state}));
    const oldCars=sim.vehicles.map(c=>({active:c.active,s:c.s,committed:c.committed}));
    sim.update(1/30,18.5);
    for(const c of sim.vehicles){
      if(oldCars[c.id]?.active&&(!c.active||c.s<oldCars[c.id].s))exits++;
      if(oldCars[c.id]?.active&&!oldCars[c.id].committed&&c.committed)assert.equal(c.route.axis==='NS'?sim.signals.ns:sim.signals.ew,'green');
    }
    const inside=sim.pedestrians.filter(p=>p.active&&p.station&&p.station.state!=='approaching');
    for(const p of sim.pedestrians.filter(p=>p.active)){
      const old=before[p.id];
      if(p.station&&p.station.state!=='approaching'&&!p.rail){
        assert.ok(stationPositionValid(layout,p),`Station body hit at ${sim.clock}: ${JSON.stringify(p)}`);
        if(old?.visit===p.station.id&&old.state!=='approaching'){
          assert.ok(Math.hypot(p.x-old.x,p.y-old.y,p.z-old.z)<=p.speed/30+1e-7,'Disconnected movement/teleport');
          maxVerticalStep=Math.max(maxVerticalStep,Math.abs(p.y-old.y));
          if(p.y>old.y+1e-5)climbs++;if(p.y<old.y-1e-5)descents++;
        }
        if(p.station.state==='waiting'){
          assert.ok(p.y===layout.nodes.upperLanding.y);assert.ok(p.z-layout.platformEdges[0].a.z>1.2);
          assert.ok(inStationRect(p,layout.areas.find(a=>a.id==='waiting-east'),.2));
        }
        if(p.station.flight&&i%15===0){
          const scale=p.scale*1.08*(p.style===4?.96:1),pose=stationStairPose(layout,p,scale);assert.ok(pose);
          assert.ok(pose.feet.some(f=>f.grounded),'Stair walking always has a stance foot');
          for(const leg of pose.legs){assert.ok(Math.abs(Math.hypot(leg.hip.y-leg.knee.y,leg.hip.z-leg.knee.z)-.34)<1e-8);assert.ok(Math.abs(Math.hypot(leg.knee.y-leg.ankle.y,leg.knee.z-leg.ankle.z)-.34)<1e-8);}
          for(const f of pose.feet.filter(f=>f.grounded))assert.ok(Math.abs(stationFootSurface(layout,f.x,f.z,f.y)-f.y)<1e-8,'Stance foot must touch a real tread or landing');
        }
      }else if(!p.rail&&pointBlocked(p,bounds,.16))wallHits++;
      if(p.y<2&&!p.crossing&&(Math.abs(p.x)<3.5||p.z>6.5&&p.z<17.5))roadSteps++;
      if(p.y<2)for(const c of sim.vehicles.filter(c=>c.active)){
        const dx=p.x-c.x,dz=p.z-c.z,v=VEHICLE_PROFILES[c.kind];
        if(Math.abs(dx*Math.sin(c.yaw)+dz*Math.cos(c.yaw))<v.length/2+.25&&Math.abs(dx*Math.cos(c.yaw)-dz*Math.sin(c.yaw))<v.width/2+.25)overlaps++;
      }
    }
    for(let a=0;a<inside.length;a++)for(let b=a+1;b<inside.length;b++)if(Math.abs(inside[a].y-inside[b].y)<1.5)assert.ok(Math.hypot(inside[a].x-inside[b].x,inside[a].z-inside[b].z)>.50,'Passengers overlap');
    for(const gate of layout.gates){
      const occupants=inside.filter(p=>Math.abs(p.x-gate.center.x)<.3&&Math.abs(p.z-gate.center.z)<gate.depth/2);
      assert.ok(occupants.length<=1,'Multiple pedestrians in one gate lane');
      if(occupants.length)assert.equal(sim.stationTraffic.owners.get('gate:'+gate.id),occupants[0].id);
    }
  }
  const m=sim.stationTraffic.metrics;assert.ok(m.completed>=6);assert.ok(m.maxActive>=4);assert.ok(m.maxWaiting>=2);assert.equal(m.failures,0);assert.equal(m.invalidMoves,0);
  assert.ok(m.maxMovingWait<35);assert.ok(climbs>100&&descents>100);assert.ok(maxVerticalStep<.03);
  assert.equal(wallHits,0);assert.equal(roadSteps,0);assert.equal(overlaps,0);assert.ok(exits>70);
  for(const v of sim.stationTraffic.completed){
    assert.ok((v.journey==='inbound'?inbound:outbound).every(s=>v.states.includes(s)));
    if(v.journey==='outbound'){assert.ok(!sim.navigation.nodes[v.originNode].door);assert.equal(v.destination,'rail');}
    else {assert.equal(v.rejoinedNode,sim.navigation.station.exitAnchor);assert.equal(v.destination,'city');}
    assert.notEqual(v.entranceGate,v.exitGate);
  }
  const started=m.started;
  for(let i=0;i<18000;i++)sim.update(1/30,3);
  assert.equal(m.started,started,'Closed service must not accept new visits');assert.equal(m.completed,started,'Every active visitor must leave without respawning/teleporting');
  assert.ok(sim.pedestrians.every(p=>!p.station));assert.equal(sim.stationTraffic.owners.size,0);
});

test('station journeys remain deterministic and clear after closing across additional population seeds',()=>{
  for(const seed of [42,193]){
    const a=create(seed),b=create(seed);
    for(let i=0;i<18000;i++){a.update(1/30,8);b.update(1/30,8);}
    assert.deepEqual(a.pedestrians,b.pedestrians);assert.deepEqual(a.vehicles,b.vehicles);assert.deepEqual(a.stationTraffic.metrics,b.stationTraffic.metrics);
    assert.ok(a.stationTraffic.metrics.completed>=5);
    for(let i=0;i<18000;i++)a.update(1/30,3);
    assert.equal(a.stationTraffic.metrics.started,a.stationTraffic.metrics.completed);assert.equal(a.stationTraffic.metrics.failures,0);assert.equal(a.stationTraffic.owners.size,0);
  }
});
