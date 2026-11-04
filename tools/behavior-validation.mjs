import {CitySimulation,VEHICLE_PROFILES} from '../src/world/simulation/CitySimulation.ts';
import {createStationLayout} from '../src/world/generation/StationLayout.ts';
import {pointBlocked} from '../src/world/simulation/Navigation.ts';

export function auditStreets(sim,seconds=600,hour=18.5) {
  const result={ticks:0,wallHits:0,roadSteps:0,vehicleHits:0,pedestrianOverlaps:0,first:[],maxPedestrianSpeed:0,minPedestrianSeparation:Infinity};
  for(let i=0;i<seconds*30;i++) {
    sim.update(1/30,hour);result.ticks++;
    const people=sim.pedestrians.filter(p=>p.active),cars=sim.vehicles.filter(c=>c.active);
    const fail=(kind,p,c)=>{result[kind]++;if(result.first.length<12)result.first.push({kind,clock:sim.clock,id:p.id,x:p.x,y:p.y,z:p.z,node:p.node,next:p.path[p.next],station:p.station?.state,crossing:p.crossing,car:c?{id:c.id,x:c.x,z:c.z,kind:c.kind,speed:c.speed}:null});};
    for(const p of people) {
      if(p.motion)result.maxPedestrianSpeed=Math.max(result.maxPedestrianSpeed,p.motion.speed);
      if(!p.rail&&(!p.station||p.station.state==='approaching')&&pointBlocked(p,sim.bounds,.16))fail('wallHits',p);
      if(p.y<2&&!p.crossing&&(Math.abs(p.x)<3.5||p.z>6.5&&p.z<17.5))fail('roadSteps',p);
      if(p.y<2)for(const c of cars){const dx=p.x-c.x,dz=p.z-c.z,v=VEHICLE_PROFILES[c.kind];if(Math.abs(dx*Math.sin(c.yaw)+dz*Math.cos(c.yaw))<v.length/2+.25&&Math.abs(dx*Math.cos(c.yaw)-dz*Math.sin(c.yaw))<v.width/2+.25)fail('vehicleHits',p,c);}
    }
    for(let a=0;a<people.length;a++)for(let b=a+1;b<people.length;b++)if(Math.abs(people[a].y-people[b].y)<1.5){const d=Math.hypot(people[a].x-people[b].x,people[a].z-people[b].z);result.minPedestrianSeparation=Math.min(result.minPedestrianSeparation,d);if(d<.50){result.pedestrianOverlaps++;if(result.first.length<12)result.first.push({clock:sim.clock,a:people[a].id,b:people[b].id,distance:d,ax:people[a].x,az:people[a].z,bx:people[b].x,bz:people[b].z,astate:people[a].station?.state,bstate:people[b].station?.state});}}
  }
  return result;
}
if(typeof process!=='undefined'&&process.argv[1]?.replaceAll('\\','/').endsWith('/behavior-validation.mjs')) {
  if(process.argv.includes('--crossing')) {
    const sim=new CitySimulation({seed:8412}),began=new Map();
    for(let i=0;i<18000;i++){
      sim.update(1/30,i<9000?8:22);
      for(const p of sim.pedestrians){
        if(!p.crossing){began.delete(p.id);continue;}if(!began.has(p.id))began.set(p.id,sim.clock);
        if(sim.clock-began.get(p.id)>21){
          const brief=q=>({id:q.id,x:q.x,z:q.z,node:q.node,next:q.path[q.next],crossing:q.crossing,idle:q.motion.idleSeconds,speed:q.motion.speed,travel:q.motion.travelSpeed,yaw:q.yaw});
          console.log(JSON.stringify({clock:sim.clock,p:brief(p),from:sim.navigation.nodes[p.node],to:sim.navigation.nodes[p.path[p.next]],neighbors:sim.pedestrians.filter(q=>q.active&&q!==p&&Math.hypot(q.x-p.x,q.z-p.z)<2).map(brief)},null,2));process.exit(0);
        }
      }
    }
    console.log('All crossings cleared');process.exit(0);
  }
  const station=createStationLayout(),bounds=[...station.npcReservation,...station.boxes.filter(b=>b.collision&&b.minY<.3)];
  const sim=new CitySimulation({seed:Number(process.argv[2]??8412),station,bounds});
  if(process.argv.includes('--closure')) {
    for(let i=0;i<18000;i++)sim.update(1/30,18.5);
    for(let i=0;i<18000;i++)sim.update(1/30,3);
    console.log(JSON.stringify({metrics:sim.stationTraffic.metrics,owners:[...sim.stationTraffic.owners],stuck:sim.pedestrians.filter(p=>p.station).map(p=>({id:p.id,x:p.x,z:p.z,node:p.node,next:p.path[p.next],visit:p.station,near:sim.pedestrians.filter(q=>q!==p&&q.active&&Math.hypot(q.x-p.x,q.z-p.z)<1.5).map(q=>({id:q.id,x:q.x,z:q.z,node:q.node,next:q.path[q.next],station:q.station?.state}))}))},null,2));process.exit(0);
  }
  console.log(JSON.stringify({audit:auditStreets(sim),station:sim.stationTraffic.metrics,rail:sim.railPassengers.metrics,
    stopped:sim.pedestrians.filter(p=>p.active&&!p.rail&&p.motion.idleSeconds>20).slice(0,10).map(p=>({id:p.id,x:p.x,z:p.z,node:p.node,goal:p.path[p.next],idle:p.motion.idleSeconds,station:p.station?.state,crossing:p.crossing}))},null,2));
}
