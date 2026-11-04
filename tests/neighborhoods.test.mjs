import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {neighborhoodAt,neighborhoodDestinationWeight,neighborhoodOptionalWeight,neighborhoodBuilding,neighborhoodParcel,fitNeighborhoodParcel,neighborhoodFootprint,NEIGHBORHOOD_RAIL_CLEARANCE,RESIDENTIAL_FAMILIES} from '../src/world/Neighborhoods.ts';
import {CitySimulation} from '../src/world/simulation/CitySimulation.ts';
import {Navigation} from '../src/world/simulation/Navigation.ts';

const baseline=JSON.parse(fs.readFileSync(new URL('../quality/neighborhood-before-measurements.json',import.meta.url))).contracts;
const audit=JSON.parse(fs.readFileSync(new URL('../quality/neighborhood-geometry-audit.json',import.meta.url)));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const revised=structuredClone(baseline);
for(const p of audit.parcels.filter(p=>p.rendered.railAdjusted||p.rendered.cornerAdjusted||p.rendered.parcelAdjusted)){
 for(const key of ['colliders','playerColliders']){const i=revised[key].findIndex(b=>same(b,p.originalFootprint));assert.ok(i>=0);if(p.rendered.renderable)revised[key][i]=p.footprint;else revised[key].splice(i,1);}
 const i=revised.shopfronts.findIndex(f=>f.x===p.x&&f.z===p.z);if(p.rendered.renderable)revised.shopfronts[i]={...revised.shopfronts[i],z:p.rendered.z,width:p.rendered.width};else revised.shopfronts.splice(i,1);
}

test('district identity follows existing streets and blends continuously with normalized bounded weights',()=>{
 for(const [p,id]of [[{x:4.7,z:43},'commercial'],[{x:17,z:-46},'station'],[{x:28.15,z:40},'residential'],[{x:-16,z:-25},'nightlife']])assert.equal(neighborhoodAt(p).id,id);
 assert.equal(neighborhoodAt({x:30,z:12}).id,'commercial');
 for(let z=-76;z<70;z+=3)for(let x=-74;x<78;x+=3){const a=neighborhoodAt({x,z}),b=neighborhoodAt({x:x+.1,z});assert.ok(Math.abs(Object.values(a.weights).reduce((n,w)=>n+w,0)-1)<1e-12);for(const key of Object.keys(a.weights)){assert.ok(a.weights[key]>=0&&a.weights[key]<=1);assert.ok(Math.abs(a.weights[key]-b.weights[key])<.06);}}
});
test('activity preferences use the same smooth geography, keep residential streets quieter and favour real evening restaurant destinations',()=>{
 const main={x:4.55,z:40},home={x:28.15,z:40},alley={x:16,z:-25};
 assert.ok(neighborhoodDestinationWeight(main,20.5,'shopper','retail')>neighborhoodDestinationWeight(home,20.5,'shopper','retail'));
 assert.ok(neighborhoodDestinationWeight(alley,20.5,'restaurant','restaurant')>neighborhoodDestinationWeight(alley,13,'restaurant','restaurant'));
 assert.ok(neighborhoodOptionalWeight(home)<neighborhoodOptionalWeight(main));
 for(const hour of [0,3,8,13,18.5,20.5,23])for(const p of [main,home,alley,{x:17,z:-46}])assert.ok(neighborhoodDestinationWeight(p,hour,'commuter','office')>=.65&&neighborhoodDestinationWeight(p,hour,'commuter','office')<=1.4);
});
test('actual parcel identities replay independently of placement RNG and retain four coherent housing families',()=>{
 const homes=audit.parcels.filter(p=>p.kind==='apartment'&&p.x>25&&p.x<35);assert.equal(homes.length,13);assert.deepEqual(new Set(homes.map(p=>p.identity.style)),new Set(RESIDENTIAL_FAMILIES));
 for(const p of audit.parcels)assert.deepEqual(neighborhoodBuilding(p.rendered,8412),p.identity);
 const input=structuredClone(audit.parcels);
 for(const seed of [8412,1,77,72831,99991])for(const p of audit.parcels){const a=neighborhoodBuilding(p.rendered,seed);if(homes.includes(p))assert.ok(a.floors>=2&&a.floors<=4&&a.signage==='entry-plaque');}
 assert.deepEqual(audit.parcels,input);assert.ok(new Set([1,2,3,4,5,6,7,8].map(seed=>neighborhoodBuilding(homes[0].rendered,seed).variant)).size>=4);
});
test('rail, corner and backland corrections stay within their original lots and remove physical building overlaps',()=>{
 const corrected=audit.parcels.filter(p=>p.rendered.railAdjusted||p.rendered.cornerAdjusted||p.rendered.parcelAdjusted);assert.equal(corrected.length,8);
 for(const p of corrected){const a=p.footprint,b=p.originalFootprint;assert.ok(a.minX>=b.minX-1e-6&&a.maxX<=b.maxX+1e-6&&a.minZ>=b.minZ-1e-6&&a.maxZ<=b.maxZ+1e-6);if(p.rendered.railAdjusted)assert.ok(a.maxZ<NEIGHBORHOOD_RAIL_CLEARANCE.minZ||a.minZ>NEIGHBORHOOD_RAIL_CLEARANCE.maxZ);}
 const physical=p=>{const s=p.rendered,c=Math.cos(s.rotation),sn=Math.sin(s.rotation),points=[[-s.width/2,0],[s.width/2,0],[-s.width/2,-s.depth],[s.width/2,-s.depth]].map(([x,z])=>({x:s.x+c*x+sn*z,z:s.z-sn*x+c*z}));return{minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z))};};
 // Test the solid building cores, not conservative side reservations left by the older kit.
 const bodies=audit.parcels.filter(p=>p.rendered.renderable).map(physical);
 for(let i=0;i<bodies.length;i++)for(let j=0;j<i;j++){const a=bodies[i],b=bodies[j];assert.ok(Math.min(a.maxX,b.maxX)-Math.max(a.minX,b.minX)<.001||Math.min(a.maxZ,b.maxZ)-Math.max(a.minZ,b.minZ)<.001,`Intersecting buildings ${i}/${j}`);}
 // A wholly occupied hypothetical backland parcel is omitted rather than forced into another lot.
 const source={x:60,z:-57,width:9,depth:12,floors:10,kind:'office',palette:2,rotation:-Math.PI/2};assert.equal(neighborhoodParcel(source).renderable,false);
 const p=neighborhoodParcel({...source,z:35});assert.equal(fitNeighborhoodParcel(p,[{minX:50,maxX:80,minZ:20,maxZ:50}]).renderable,false);
});
test('all original public routes, business entrances, station gates and six boarding approaches remain connected',()=>{
 const nav=new Navigation(revised.colliders,revised.doors,revised.station);assert.deepEqual(JSON.parse(JSON.stringify(nav.nodes)),baseline.navigation.nodes);assert.deepEqual(JSON.parse(JSON.stringify([...nav.edges])),baseline.navigation.edges);assert.equal(nav.station.boardingApproaches.length,6);assert.ok(nav.station.boardingApproaches.every(a=>a.clear));
});
test('district-aware real populations remain deterministic across irregular frame partitions',()=>{
 const config={seed:8412,bounds:revised.colliders,doors:revised.doors,station:revised.station},a=new CitySimulation(config),b=new CitySimulation(config);
 for(let i=0;i<3600;i++)a.update(1/30,20.5);const chunks=[1/144,1/8,.017,1/60];let elapsed=0,index=0;while(elapsed<120-1e-10){const dt=Math.min(120-elapsed,chunks[index++%chunks.length]);b.update(dt,20.5);elapsed+=dt;}
 const snapshot=s=>({people:s.pedestrians.map(p=>({id:p.id,x:p.x,y:p.y,z:p.z,path:p.path,next:p.next,activity:p.activity,station:p.station,rail:p.rail})),cars:s.vehicles,train:s.train.snapshot,streetLife:s.streetLife.metrics});assert.deepEqual(snapshot(a),snapshot(b));
});
