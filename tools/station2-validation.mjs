// Browser-independent validation against a real CitySimulation and the generated district bounds.
import { pointBlocked } from '../src/world/simulation/Navigation.ts';
import { VEHICLE_PROFILES } from '../src/world/simulation/CitySimulation.ts';
import { stationPositionValid } from '../src/world/simulation/StationNavigation.ts';
const require=(ok,message)=>{if(!ok)throw new Error(message);};

export function exerciseStation(sim,{openSeconds=1200,drainSeconds=600,hour=18.5}={}){
  const station=sim.navigation.station,layout=station.layout;
  const result={openSeconds,drainSeconds,hour,wallHits:0,unmarkedRoadSamples:0,pedestrianVehicleOverlaps:0,vehicleExits:0,invalidPositions:0,gateConflicts:0,passengerOverlaps:0,maxVerticalStep:0,maxStep:0,minimumPassengerDistance:Infinity};
  const startClock=sim.clock;
  for(let i=0;i<openSeconds*30;i++){
    const before=sim.pedestrians.map(p=>({x:p.x,y:p.y,z:p.z,visit:p.station?.id,state:p.station?.state}));
    const cars=sim.vehicles.map(c=>({active:c.active,s:c.s}));sim.update(1/30,hour);
    for(const c of sim.vehicles)if(cars[c.id]?.active&&(!c.active||c.s<cars[c.id].s))result.vehicleExits++;
    const inside=sim.pedestrians.filter(p=>p.active&&p.station&&p.station.state!=='approaching');
    for(const p of sim.pedestrians.filter(p=>p.active)){
      if(p.station&&p.station.state!=='approaching'){
        if(!stationPositionValid(layout,p))result.invalidPositions++;
        const old=before[p.id];if(old?.visit===p.station.id&&old.state!=='approaching'){
          const d=Math.hypot(p.x-old.x,p.y-old.y,p.z-old.z);result.maxStep=Math.max(result.maxStep,d);result.maxVerticalStep=Math.max(result.maxVerticalStep,Math.abs(p.y-old.y));require(d<=p.speed/30+1e-7,'Station position jumped between edges');
        }
        require(p.y<6.5||p.z>layout.platformEdges[0].a.z+.8,'Passenger entered the railway envelope');
      }else if(pointBlocked(p,sim.bounds,.16))result.wallHits++;
      if(!p.crossing&&(Math.abs(p.x)<3.5||p.z>6.5&&p.z<17.5))result.unmarkedRoadSamples++;
      if(p.y<2)for(const c of sim.vehicles.filter(c=>c.active)){const dx=p.x-c.x,dz=p.z-c.z,v=VEHICLE_PROFILES[c.kind];if(Math.abs(dx*Math.sin(c.yaw)+dz*Math.cos(c.yaw))<v.length/2+.25&&Math.abs(dx*Math.cos(c.yaw)-dz*Math.sin(c.yaw))<v.width/2+.25)result.pedestrianVehicleOverlaps++;}
    }
    for(let a=0;a<inside.length;a++)for(let b=a+1;b<inside.length;b++)if(Math.abs(inside[a].y-inside[b].y)<1.5){const d=Math.hypot(inside[a].x-inside[b].x,inside[a].z-inside[b].z);result.minimumPassengerDistance=Math.min(result.minimumPassengerDistance,d);if(d<.5)result.passengerOverlaps++;}
    for(const g of layout.gates){const occupants=inside.filter(p=>Math.abs(p.x-g.center.x)<.3&&Math.abs(p.z-g.center.z)<g.depth/2);if(occupants.length>1)result.gateConflicts++;if(occupants.length===1)require(sim.stationTraffic.owners.get('gate:'+g.id)===occupants[0].id,'Unreserved fare-gate passage');}
  }
  result.open=structuredClone(sim.stationTraffic.metrics);const started=result.open.started;
  for(let i=0;i<drainSeconds*30;i++)sim.update(1/30,3);
  result.afterClosure=structuredClone(sim.stationTraffic.metrics);result.remainingVisitors=sim.pedestrians.filter(p=>p.station).map(p=>({id:p.id,state:p.station.state,blocked:p.station.blockedFor}));
  result.remainingReservations=[...sim.stationTraffic.owners];result.completedJourneys=structuredClone(sim.stationTraffic.completed);result.simulatedSeconds=sim.clock-startClock;
  require(!result.wallHits&&!result.unmarkedRoadSamples&&!result.pedestrianVehicleOverlaps&&!result.invalidPositions&&!result.gateConflicts&&!result.passengerOverlaps,'Generated-world station/safety regression: '+JSON.stringify(result));
  require(result.open.completed>=6&&result.open.maxActive>=4&&result.vehicleExits>openSeconds/8,'Insufficient station or city activity');
  require(result.afterClosure.started===started&&result.afterClosure.completed===started&&!result.remainingVisitors.length&&!result.remainingReservations.length,'Station did not drain after closing');
  require(!result.afterClosure.failures&&!result.afterClosure.invalidMoves&&result.afterClosure.maxMovingWait<45,'Invalid movement or persistent congestion');
  return result;
}
