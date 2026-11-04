import { stationPositionValid } from '../src/world/simulation/StationNavigation.ts';
import { RAIL_VEHICLE, railGeometry } from '../src/world/simulation/RailGeometry.ts';
import { passengerPositionValid } from '../src/world/simulation/RailPassengerGeometry.ts';
import { VEHICLE_PROFILES } from '../src/world/simulation/CitySimulation.ts';
import { pointBlocked } from '../src/world/simulation/Navigation.ts';
const require=(ok,message)=>{if(!ok)throw new Error(message);};

export function passengerAudit(sim) {
  const r={ticks:0,arrivals:0,departures:0,boardingThresholdCrossings:0,alightingThresholdCrossings:0,movingRiderSamples:0,
    maxPositionStep:0,maxTransferStep:0,maxRiderOffsetError:0,minimumSeparation:Infinity,invalidPositions:0,unsafeCrossings:0,
    overlaps:0,unsafeDepartures:0,capacityViolations:0,gateConflicts:0,wallHits:0,vehicleOverlaps:0,vehicleExits:0,trainCycles:[]};
  let oldTrain=sim.train.snapshot,oldPeople=new Map(),oldCars=[];
  return {result:r,sample() {
    const s=sim.train.snapshot,layout=sim.navigation.station.layout,people=sim.pedestrians.filter(p=>p.active),elevated=people.filter(p=>p.y>6);
    r.ticks++;
    if(s.completedStops>oldTrain.completedStops)r.arrivals++;
    if(s.state==='ACCELERATING'&&oldTrain.state==='PREPARING DEPARTURE'){r.departures++;r.trainCycles.push({clock:sim.clock,stop:s.completedStops,x:s.x,allDoorsClosed:s.allDoorsClosed,holds:s.passengerHolds});}
    const riders=people.filter(p=>p.rail),berths=new Set(riders.map(p=>p.rail.berthId));
    if(riders.length>sim.railPassengers.berths.length||berths.size!==riders.length)r.capacityViolations++;
    if(s.speed>0&&(!s.allDoorsClosed||s.passengerExchangeBusy||riders.some(p=>p.rail.state!=='riding')))r.unsafeDepartures++;
    for(const p of people) {
      const old=oldPeople.get(p.id);
      if(old&&old.visit===p.station?.id) {
        const distance=Math.hypot(p.x-old.x,p.y-old.y,p.z-old.z);r.maxPositionStep=Math.max(r.maxPositionStep,distance);
        if(p.rail?.state==='riding'&&old.railState==='riding')require(distance<=Math.abs(s.x-oldTrain.x)+1e-7,'Rider moved independently of train');
        else if(p.station&&p.station.state!=='approaching') {r.maxTransferStep=Math.max(r.maxTransferStep,distance);require(distance<=p.speed/30+1e-7,'Passenger teleported');}
        if(p.rail||old.railState==='alighting'||old.railState==='boarding') {
          const d=s.doors.find(d=>d.id===(p.rail?.doorId??old.doorId));
          if(d&&((old.z-d.opening.z)*(p.z-d.opening.z)<0 || Math.abs(p.z-d.opening.z)<.005&&Math.abs(old.z-d.opening.z)>=.005)) {
            if(s.speed!==0||!d.boarding.aligned||d.state!=='OPEN'||Math.abs(p.x-(d.opening.minX+d.opening.maxX)/2)>.28+1e-8)r.unsafeCrossings++;
            if(p.rail?.kind==='outbound')r.boardingThresholdCrossings++;else r.alightingThresholdCrossings++;
          }
        }
      }
      if(p.rail?.state==='riding') {
        const b=sim.railPassengers.berths.find(b=>b.id===p.rail.berthId);
        r.maxRiderOffsetError=Math.max(r.maxRiderOffsetError,Math.abs(p.x-s.x-b.localX),Math.abs(p.y-RAIL_VEHICLE.sillY),Math.abs(p.z-(-57+b.localZ)));
        if(s.speed>0)r.movingRiderSamples++;
      } else if(p.rail) {
        const d=s.doors.find(d=>d.id===p.rail.doorId),b=sim.railPassengers.berths.find(b=>b.id===p.rail.berthId);
        if(!passengerPositionValid(layout,p,d,b,s.x))r.invalidPositions++;
        require(s.speed===0&&d.state==='OPEN','Physical transfer continued without stationary open doors');
      } else if(p.station&&p.station.state!=='approaching') {if(!stationPositionValid(layout,p))r.invalidPositions++;}
      else if(pointBlocked(p,sim.bounds??[],.16))r.wallHits++;
      if(p.y<2)for(const c of sim.vehicles.filter(c=>c.active)) {
        const dx=p.x-c.x,dz=p.z-c.z,v=VEHICLE_PROFILES[c.kind];
        if(Math.abs(dx*Math.sin(c.yaw)+dz*Math.cos(c.yaw))<v.length/2+.25&&Math.abs(dx*Math.cos(c.yaw)-dz*Math.sin(c.yaw))<v.width/2+.25)r.vehicleOverlaps++;
      }
    }
    for(let i=0;i<elevated.length;i++)for(let j=i+1;j<elevated.length;j++) {
      const a=elevated[i],b=elevated[j];if(Math.abs(a.y-b.y)>1.5)continue;
      const distance=Math.hypot(a.x-b.x,a.z-b.z);r.minimumSeparation=Math.min(r.minimumSeparation,distance);if(distance<.5-1e-7)r.overlaps++;
    }
    for(const g of layout.gates) {
      const occupants=people.filter(p=>p.station&&p.y<1&&Math.abs(p.x-g.center.x)<.3&&Math.abs(p.z-g.center.z)<g.depth/2);
      if(occupants.length>1)r.gateConflicts++;
      if(occupants.length)require(sim.stationTraffic.owners.get('gate:'+g.id)===occupants[0].id,'Lost gate reservation');
    }
    for(const c of sim.vehicles)if(oldCars[c.id]?.active&&(!c.active||c.s<oldCars[c.id].s))r.vehicleExits++;
    oldCars=sim.vehicles.map(c=>({active:c.active,s:c.s}));oldTrain=s;
    oldPeople=new Map(people.map(p=>[p.id,{x:p.x,y:p.y,z:p.z,visit:p.station?.id,railState:p.rail?.state,doorId:p.rail?.doorId}]));
  }};
}

export function exercisePassengers(sim,{seconds=1200,drainSeconds=600,hour=18.5}={}) {
  const audit=passengerAudit(sim);
  for(let tick=0;tick<seconds*30;tick++){sim.update(1/30,hour);audit.sample();}
  const open=structuredClone(sim.railPassengers.metrics),started=sim.stationTraffic.metrics.started;
  for(let tick=0;tick<drainSeconds*30;tick++){sim.update(1/30,3);audit.sample();}
  const r={...audit.result,seconds,drainSeconds,hour,open,rail:{...sim.railPassengers.metrics},station:structuredClone(sim.stationTraffic.metrics),
    remaining:sim.pedestrians.filter(p=>p.station||p.rail).map(p=>({id:p.id,state:p.station?.state,rail:p.rail?.state})),reservations:[...sim.stationTraffic.owners],events:[...sim.railPassengers.events]};
  require(!r.invalidPositions&&!r.unsafeCrossings&&!r.overlaps&&!r.unsafeDepartures&&!r.capacityViolations&&!r.gateConflicts&&!r.wallHits&&!r.vehicleOverlaps,
    'Passenger exchange regression: '+JSON.stringify({...r,events:undefined,trainCycles:undefined}));
  require(sim.stationTraffic.metrics.started===started&&sim.stationTraffic.metrics.completed===started&&!r.remaining.length&&!r.reservations.length&&!sim.train.snapshot.active,'Service closure did not drain passenger journeys');
  require(r.rail.boarded===r.rail.delivered&&r.maxRiderOffsetError<1e-8,'Rider lifecycle lost passengers');
  for(const stop of new Set(r.events.map(e=>e.stop))) {
    const events=r.events.filter(e=>e.stop===stop),first=events.find(e=>e.event==='boarding'),last=events.filter(e=>e.event==='alighted').at(-1);
    if(first&&last)require(first.clock>=last.clock,'Boarding bypassed alighting priority');
  }
  return r;
}
