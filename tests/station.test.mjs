import test from 'node:test';
import assert from 'node:assert/strict';
import { createStationLayout, STATION, stationSupport, stationBodyBlocked, inStationRect } from '../src/world/generation/StationLayout.ts';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('station has exact repeated risers, supported return landings and a door-sill-height platform',()=>{
  const s=createStationLayout();assert.equal(s.flights.length,4);
  close(s.flights[0].from.y,STATION.groundY);close(s.flights[3].to.y,STATION.platformY);
  close(s.flights[1].to.y,s.flights[2].from.y);
  assert.equal(s.flights.reduce((sum,f)=>sum+f.risers,0),42);
  for(const f of s.flights){
    assert.equal(f.treads.length,f.risers);assert.ok(f.to.y-f.from.y<3);assert.ok(f.rise>.16&&f.rise<.18);assert.ok(f.width>=1.8);
    close(Math.abs(f.to.x-f.from.x),f.going*f.risers);
    for(const [i,t]of f.treads.entries()){close(t.y,f.from.y+(i+1)*f.rise);close(t.maxX-t.minX,f.going);close(t.maxZ-t.minZ,f.width);}
    close(f.treads.at(-1).y,f.to.y);
  }
  const mid=s.surfaces.find(s=>s.id==='return-landing');close(mid.y,s.flights[1].to.y);
  assert.ok(mid.maxX-mid.minX>=2-1e-8);assert.ok(mid.minZ<=s.flights[2].from.z-.9&&mid.maxZ>=s.flights[1].to.z+.9);
  for(const id of ['lower-rest','upper-rest']){const r=s.surfaces.find(s=>s.id===id);assert.ok(r.maxX-r.minX>=1.5);}
  close(STATION.platformY,8.38-1.85/2);assert.ok(STATION.platformMaxX-STATION.platformMinX>52.1);
  assert.ok(STATION.platformEdgeZ-(-57+1.435)>.05);
});

test('the complete street-to-platform journey is supported, clear, reversible and bounded to ordinary steps',()=>{
  const s=createStationLayout();
  for(const route of [s.journey,[...s.journey].reverse()]){
    let foot=route[0].y;
    for(let i=1;i<route.length;i++){
      const a=route[i-1],b=route[i],n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.025));
      for(let j=1;j<=n;j++){
        const x=a.x+(b.x-a.x)*j/n,z=a.z+(b.z-a.z)*j/n,y=stationSupport(s,x,z,foot);
        assert.notEqual(y,null,`Unsupported route at ${x},${z}, previous ${foot}`);
        assert.ok(Math.abs(y-foot)<=.205,`Excessive step at ${x},${z}`);
        assert.equal(stationBodyBlocked(s,x,z,y),false,`Blocked route at ${x},${y},${z}`);
        foot=y;
      }
    }
    close(foot,route.at(-1).y);
  }
});

test('stairwell stays open and platform guards protect drops while the upper landing exit stays clear',()=>{
  const s=createStationLayout();
  for(const f of s.flights)for(const t of f.treads){const pos={x:(t.minX+t.maxX)/2,z:(t.minZ+t.maxZ)/2};assert.ok(!s.surfaces.some(s=>s.kind==='platform'&&inStationRect(pos,s)));}
  assert.equal(stationSupport(s,18,-52.2,STATION.platformY),null);
  assert.equal(stationBodyBlocked(s,30,STATION.platformEdgeZ+.1,STATION.platformY),true);
  assert.equal(stationBodyBlocked(s,14.2,-52.2,STATION.platformY),false);
  assert.equal(stationSupport(s,7.3,-54,STATION.platformY),null);
  assert.ok(s.boxes.some(b=>b.id==='return-east-guard'));
});

test('station metadata is finite, fully connected, dimensioned and within the authored station bounds',()=>{
  const s=createStationLayout();
  for(const r of [...s.surfaces,...s.boxes]){
    assert.ok([r.minX,r.maxX,r.minZ,r.maxZ].every(Number.isFinite));assert.ok(r.maxX>r.minX&&r.maxZ>r.minZ);
    assert.ok(r.minX>=s.bounds.minX-.001&&r.maxX<=s.bounds.maxX+.001&&r.minZ>=s.bounds.minZ-.001&&r.maxZ<=s.bounds.maxZ+.001);
  }
  for(const b of s.boxes)assert.ok(b.maxY>b.minY&&Number.isFinite(b.minY+b.maxY));
  const reached=new Set(['street']);for(const e of s.connections){assert.ok(s.nodes[e.from]&&s.nodes[e.to]);assert.ok(e.width>=.9);if(reached.has(e.from))reached.add(e.to);}
  assert.equal(reached.size,Object.keys(s.nodes).length);assert.ok(reached.has('waiting'));
  assert.equal(s.gates.length,3);assert.equal(s.platformEdges.length,1);assert.equal(s.areas.filter(a=>a.kind==='waiting').length,2);
  assert.ok(s.gates.some(g=>g.accessible&&g.width>=1));
});
