import * as THREE from 'three';
import type { CityBatch } from './CityBatch';
import type { Materials } from './Materials';
import { createStationLayout, STATION } from './StationLayout';
import type { StationSpatial } from './StationLayout';
import { fittedRun } from './SignLayout';
import { drawRun, measureSignInk, signTextureSettings } from './SignTextures';

/** One station, rendered from the same surfaces and structural bounds exported to future navigation. */
export function stationDetails(b: CityBatch, m: Materials): { group: THREE.Group; spatial: StationSpatial } {
  const group = new THREE.Group(); group.name = 'Shinmachi station architecture';
  const spatial = createStationLayout(), c = STATION, p = c.platformY;
  const wall = new THREE.MeshStandardMaterial({ color: 0xc1c5bc, map: m.concreteMap, roughness: .9, emissive: 0x6a7872, emissiveIntensity: .07 });
  const materials = { wall, concrete: m.facades[1], steel: m.metal, glass: m.shopGlass, roof: m.metal, gate: m.metal, wood: m.wood };
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x,y,z);
  const rect = (material: THREE.Material, minX: number,maxX: number,minZ: number,maxZ: number,y: number,h: number) => b.b(material,(minX+maxX)/2,y-h/2,(minZ+maxZ)/2,maxX-minX,h,maxZ-minZ);
  const board = (id: string,x: number,y: number,z: number,w: number,h: number,draw: (ctx: CanvasRenderingContext2D,width: number,height: number)=>void,yaw=0,back=false) => {
    const source=document.createElement('canvas'); source.width=1024;source.height=Math.round(1024*h/w);const ctx=source.getContext('2d')!;draw(ctx,source.width,source.height);
    const map=signTextureSettings(new THREE.CanvasTexture(source)), material=new THREE.MeshStandardMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.24,roughness:.7});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);mesh.name=id;mesh.position.set(x,y,z);mesh.rotation.y=yaw;group.add(mesh);
    if(!back)b.b(m.dark,x-.025*Math.sin(yaw),y,z-.025*Math.cos(yaw),w+.07,h+.07,.045,yaw);
  };
  const direction = (id: string,x: number,y: number,z: number,w: number,h: number,title: string,sub: string,yaw=0,back=false) => board(id,x,y,z,w,h,(ctx,ww,hh)=>{
    ctx.fillStyle='#173e39';ctx.fillRect(0,0,ww,hh);ctx.fillStyle='#e4e8d8';
    drawRun(ctx,fittedRun(title,{x:ww*.04,y:hh*.07,width:ww*.92,height:hh*.56},hh*.47,(t,s)=>measureSignInk(ctx,t,s)));
    drawRun(ctx,fittedRun(sub,{x:ww*.04,y:hh*.68,width:ww*.92,height:hh*.22},hh*.19,(t,s)=>measureSignInk(ctx,t,s)));
  },yaw,back);

  for(const s of spatial.surfaces) {
    if(s.id==='lower-landing')continue; // Already part of the concourse floor, with separate semantic metadata.
    rect(s.kind==='tread'||s.id.startsWith('forecourt-')||s.id==='street-connection'?m.pavement:m.cream,s.minX,s.maxX,s.minZ,s.maxZ,s.y,s.thickness);
    if(s.kind==='tread'){
      const flight=spatial.flights.find(f=>s.id.startsWith(f.id))!,x=flight.to.x>flight.from.x?s.minX+.02:s.maxX-.02;
      b.b(m.yellow,x,s.y+.005,(s.minZ+s.maxZ)/2,.027,.01,s.maxZ-s.minZ-.12);
    }
  }
  for(const box of spatial.boxes){
    if(box.renderedByRailway)continue;
    rect(materials[box.material],box.minX,box.maxX,box.minZ,box.maxZ,box.maxY,box.maxY-box.minY);
    if(box.material==='glass'){
      const alongX=box.maxX-box.minX>box.maxZ-box.minZ,length=alongX?box.maxX-box.minX:box.maxZ-box.minZ;
      for(const y of [box.minY+.09,box.maxY])b.b(m.metal,(box.minX+box.maxX)/2,y,(box.minZ+box.maxZ)/2,alongX?length:.045,.045,alongX?.045:length);
      const count=Math.ceil(length/1.8);
      for(let i=0;i<=count;i++)b.b(m.metal,alongX?box.minX+length*i/count:(box.minX+box.maxX)/2,(box.minY+box.maxY)/2,alongX?(box.minZ+box.maxZ)/2:box.minZ+length*i/count,.045,box.maxY-box.minY,.045);
    }
    if(box.material==='gate'){
      const x=(box.minX+box.maxX)/2;
      b.b(m.dark,x,c.groundY+1.045,-48.12,.28,.045,.35);
      b.b(m.businesses.convenience.light,x,c.groundY+1.075,-48.1,.12,.018,.17);
      b.b(m.green,x,c.groundY+.9,-47.635,.18,.1,.018);
      b.b(m.yellow,x,c.groundY+1.065,-48.72,.13,.012,.17);
    }
  }
  for(const f of spatial.flights){
    const dx=f.to.x-f.from.x,dy=f.to.y-f.from.y,angle=Math.atan2(dy,Math.abs(dx))*Math.sign(dx),length=Math.hypot(dx,dy);
    b.part('box',m.facades[1],(f.from.x+f.to.x)/2,(f.from.y+f.to.y)/2-.11/Math.cos(angle),f.from.z,length,.22,f.width,0,0,angle);
    for(const side of [-1,1]){
      const z=f.from.z+side*f.width/2;
      for(const height of [.65,1.02])b.rod(m.metal,v(f.from.x,f.from.y+height,z),v(f.to.x,f.to.y+height,z),.026);
      for(let i=0;i<f.risers;i+=4){const s=f.treads[i];b.b(m.metal,(s.minX+s.maxX)/2,s.y+.5,z,.035,1,.035);}
    }
  }
  // Open platform: continuous tactile strip, with a separate safe-waiting boundary behind it.
  // Inset paving/paint sit flush with the supported deck; these are not 16mm-high obstacles under boarding feet.
  b.b(m.yellow,(c.platformMinX+c.platformMaxX)/2,p+.0005,c.tactileCenterZ,c.platformMaxX-c.platformMinX,.001,c.tactileWidth);
  b.b(m.marking,(c.platformMinX+c.platformMaxX)/2,p+.0004,c.safeWaitingMinZ,c.platformMaxX-c.platformMinX,.0008,.055);
  for(const [x,y,z] of [[14.5,c.groundY,-49.9],[14.5,p,-52.2]]){
    b.b(m.yellow,x,y+.009,z,.38,.018,1.58);
    for(let i=0;i<8;i++)for(let j=0;j<3;j++)b.part('cylinder',m.yellow,x-.12+j*.12,y+.022,z-.65+i*.18,.016,.012,.016);
  }
  for(const z of [-55.2,-47.5])b.b(m.dark,34.75,11.02,z,53.7,.2,.07);
  for(let x=8.5;x<62;x+=1.2)b.b(m.metal,x,11.062,-51.35,.025,.025,7.7);
  for(const x of [8.5,25.2,37.2,49.2,61]) {
    b.rod(m.metal,v(x,10.7,-53.35),v(x,10.15,-52.5),.045);
    b.rod(m.metal,v(x,10.7,-48.15),v(x,10.15,-49),.045);
    for(const z of [-53.6,-49.4])b.b(m.businesses.convenience.light,Math.min(x+1.2,c.platformMaxX-1),10.63,z,1.8,.035,.15);
  }
  for(const x of [13,17,21,24])b.b(m.businesses.convenience.light,x,3.99,-47.5,1.5,.035,.18);
  b.b(m.businesses.convenience.light,12.2,3.15,-50.8,1.5,.035,.18);
  // Glazed stair enclosure and cladding explain the mass below the canopy.
  for(const x of [15.23,18.05,20.9,23.68])b.b(m.metal,x,4.65,-48.98,.055,5.5,.07);
  b.panel(m.shopGlass,19.45,4.65,-48.94,8.4,5.5);
  b.b(m.metal,19.45,7.42,-48.98,8.5,.065,.09);
  // Ticket machines face the unpaid circulation space. Reuse existing surface/light materials.
  for(const x of [21.7,23.15]){
    b.b(m.dark,x,1.53,-48.265,.66,.62,.035);
    b.b(m.businesses.convenience.surface,x,1.53,-48.24,.51,.41,.02);
    b.b(m.yellow,x,1.11,-48.23,.27,.065,.02);b.b(m.dark,x,.85,-48.23,.44,.11,.02);
  }
  b.b(m.dark,24.6,1.63,-48.9,.93,.82,.04);b.b(m.shopGlass,24.6,1.63,-48.87,.86,.72,.02);
  b.b(m.metal,24.6,1.17,-48.72,1.01,.055,.4);
  direction('Ticket machines',22.45,2.67,-48.88,2.75,.45,'きっぷうりば','Tickets / IC charge');
  direction('Staff counter',24.6,2.55,-48.88,.95,.34,'駅係員','Staff');
  direction('Gate direction',12.35,2.64,-47.55,4.5,.56,'← 改札口 ・ 1 ホーム','Ticket gates / Platform 1');
  direction('Stair foot direction',13.7,2.2,-50.71,2.3,.5,'1 ホーム →','Platform 1 / Stairs');
  direction('Platform exit',16,10.1,-53.8,2.65,.5,'← 改札・出口','Gates / East Exit',Math.PI/2);
  direction('Upper landing platform direction',15.95,10.1,-53.8,2.65,.5,'↑ 1 ホーム','Platform 1',-Math.PI/2,true);
  for(const x of [10.45,14.25])b.b(m.metal,x,3.47,-47.58,.025,1.06,.025);
  for(const x of [12.8,14.6])b.b(m.metal,x,2.81,-50.74,.025,.73,.025);
  for(const z of [-54.85,-52.75])b.b(m.metal,15.97,10.6,z,.025,.5,.025);
  // Existing corrected entrance typography/layout retained, placed on the rebuilt entrance beam.
  board('Shinmachi station entrance',19,3.55,-45.825,11.8,.89,(ctx,w,h)=>{ctx.fillStyle='#e2e6da';ctx.fillRect(0,0,w,h);ctx.fillStyle='#19744f';ctx.fillRect(0,h-12,w,12);ctx.fillStyle='#203d33';ctx.font='700 42px "Yu Gothic",Meiryo,sans-serif';ctx.textBaseline='middle';ctx.fillText('新町駅',28,h/2);ctx.font='500 27px sans-serif';ctx.fillText('Shinmachi Station',230,h/2);ctx.font='24px sans-serif';ctx.fillText('東口  East Exit',720,h/2);});
  for(const x of [29,49]) {
    direction('Platform name '+x,x,10.1,-53.25,3.7,.7,'新町  Shinmachi','1  新町線 / Shinmachi Line');
    for(const dx of [-1.3,1.3])b.b(m.metal,x+dx,10.6,-53.28,.025,.5,.025);
  }
  // Waiting fixtures sit behind the main trackside circulation band.
  for(const x of [29,41,53]){
    for(const dx of [-.7,.7])b.b(m.metal,x+dx,p+.24,-48.25,.055,.48,.36);
  }
  // Existing forecourt and its street connections stay at the original ground elevation.
  for(const x of [10,23]){b.b(m.wood,x,.6,-42,2,.14,.5);b.b(m.wood,x,.95,-42.2,2,.6,.1);for(const dx of [-.7,.7])b.b(m.metal,x+dx,.3,-42,.08,.6,.4);}
  // A textured guide route joins the unchanged forecourt to the wide gate and stair approach.
  b.b(m.yellow,16.4,c.groundY+.012,-47.15,5.8,.018,.25);
  b.b(m.yellow,10.95,c.groundY+.012,-49.0,.25,.018,3.7);
  b.b(m.yellow,12.6,c.groundY+.012,-49.9,3.3,.018,.25);
  b.b(m.yellow,16,.126,-46.2,17,.012,.3);
  return {group,spatial};
}
