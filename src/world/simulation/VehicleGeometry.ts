import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { VEHICLE_PROFILES } from './VehicleCatalog.ts';
import type { VehicleKind, VehicleProfile } from './VehicleCatalog.ts';

export type VehicleSurface = 'paint' | 'glass' | 'trim' | 'chrome' | 'rubber' | 'head' | 'tail' | 'amber' | 'plate' | 'cargo' | 'cabin' | 'service' | 'decal';
export interface VehicleModel { body: Map<VehicleSurface,THREE.BufferGeometry>; wheel: Map<VehicleSurface,THREE.BufferGeometry>; triangles: number }
type V = [number,number,number];
const v=(a:V)=>new THREE.Vector3(...a);

/** Geometry is merged once per material/family/LOD, then instanced by presentation. */
class Parts {
  private readonly parts=new Map<VehicleSurface,THREE.BufferGeometry[]>();
  add(key:VehicleSurface,g:THREE.BufferGeometry,position:V=[0,0,0],rotation:V=[0,0,0]):void {
    g.applyMatrix4(new THREE.Matrix4().compose(v(position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,1,1)));
    let data=g.index?g.toNonIndexed():g; if(data!==g)g.dispose();
    for(const name of Object.keys(data.attributes))if(!['position','normal','uv'].includes(name))data.deleteAttribute(name);
    if(!data.getAttribute('uv'))data.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(data.getAttribute('position').count*2),2));
    if(!data.getAttribute('normal'))data.computeVertexNormals();
    if(!this.parts.has(key))this.parts.set(key,[]);this.parts.get(key)!.push(data);
  }
  box(key:VehicleSurface,p:V,size:V,round=.015,rotation:V=[0,0,0]):void {
    this.add(key,round>0?new RoundedBoxGeometry(...size,1,Math.min(round,...size.map(s=>s/3))):new THREE.BoxGeometry(...size),p,rotation);
  }
  polygon(key:VehicleSurface,points:V[],uvRegion?:[number,number,number,number]):void {
    const positions:number[]=[],indices:number[]=[],uv:number[]=[];
    points.forEach((p,i)=>{positions.push(...p);uv.push(i===0||i===3?0:1,i<2?0:1);});
    for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);
    if(uvRegion){const [x,y,w,h]=uvRegion;for(let i=0;i<uv.length;i+=2){uv[i]=x+uv[i]*w;uv[i+1]=y+uv[i+1]*h;}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();this.add(key,g);
  }
  windshield(points:V[],bow:number):void {
    const positions:number[]=[],indices:number[]=[],a=v(points[0]),b=v(points[1]),c=v(points[2]),d=v(points[3]);
    for(let j=0;j<=4;j++)for(let i=0;i<=10;i++) {
      const u=i/10,t=j/4,point=a.clone().lerp(b,u).lerp(d.clone().lerp(c,u),t);
      point.z+=Math.sin(u*Math.PI)*Math.sin(t*Math.PI)*bow;positions.push(...point.toArray());
    }
    for(let j=1;j<=4;j++)for(let i=0;i<10;i++){const a=(j-1)*11+i,b=j*11+i;indices.push(a,a+1,b,a+1,b+1,b);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();this.add('glass',g);
  }
  rod(key:VehicleSurface,a:V,b:V,r=.01,sides=6):void {
    const av=v(a),bv=v(b),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),bv.clone().sub(av).normalize());
    const g=new THREE.CylinderGeometry(r,r,av.distanceTo(bv),sides);g.applyQuaternion(q);this.add(key,g,av.add(bv).multiplyScalar(.5).toArray() as V);
  }
  beam(key:VehicleSurface,a:V,b:V,width=.065,depth=.045):void {
    const av=v(a),bv=v(b),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),bv.clone().sub(av).normalize());
    const g=new THREE.BoxGeometry(width,av.distanceTo(bv),depth);g.applyQuaternion(q);this.add(key,g,av.add(bv).multiplyScalar(.5).toArray() as V);
  }
  finish():Map<VehicleSurface,THREE.BufferGeometry> {
    const result=new Map<VehicleSurface,THREE.BufferGeometry>();
    for(const [key,parts]of this.parts){const g=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());g.computeBoundingBox();g.computeBoundingSphere();result.set(key,g);}return result;
  }
}

function widthAt(p:VehicleProfile,z:number):number {return p.bodyWidth/2*(1-(1-p.nose)*Math.pow(Math.abs(z)/(p.length/2),7));}
function beltAt(p:VehicleProfile,z:number):number {return p.belt+.035-.095*Math.pow(Math.abs(z)/(p.length/2),4);}
function archBottom(p:VehicleProfile,z:number):number {
  const radius=p.wheelRadius+.047;
  for(const axle of [-p.wheelbase/2,p.wheelbase/2]){const d=Math.abs(z-axle);if(d<radius)return p.wheelRadius+Math.sqrt(radius*radius-d*d);}
  return .19;
}

/** A curved shoulder/bonnet loft with genuinely cut-out wheel openings on both sides. */
function hull(parts:Parts,p:VehicleProfile,detail:boolean):void {
  const zs:number[]=[],n=detail?84:32,end=p.length/2-.04;
  for(let i=0;i<=n;i++)zs.push(-end+2*end*i/n);
  for(const axle of [-p.wheelbase/2,p.wheelbase/2])for(let i=0;i<=(detail?24:10);i++)zs.push(axle+Math.cos(i*Math.PI/(detail?24:10))*(p.wheelRadius+.047));
  zs.sort((a,b)=>a-b);const positions:number[]=[],indices:number[]=[];
  const coords=zs.filter((z,i)=>z>=-end&&z<=end&&(i===0||z-zs[i-1]>.00001));
  for(const z of coords) {
    const w=widthAt(p,z),y=beltAt(p,z),bottom=archBottom(p,z);
    for(const point of [[-w*.96,bottom,z],[-w,y-.075,z],[-w*.91,y+.015,z],[-w*.5,y+.045,z],[0,y+.055,z],[w*.5,y+.045,z],[w*.91,y+.015,z],[w,y-.075,z],[w*.96,bottom,z]])positions.push(...point);
  }
  const count=9;
  for(let i=1;i<coords.length;i++)for(let j=0;j<count-1;j++){const a=(i-1)*count+j,b=i*count+j;indices.push(a,b,a+1,a+1,b,b+1);}
  // Analytic shoulder normals avoid ripples from the deliberately nonuniform arch sampling.
  const normals:number[]=[],cross=[[-1,0],[-.98,.2],[-.48,.88],[-.1,.995],[0,1],[.1,.995],[.48,.88],[.98,.2],[1,0]];
  coords.forEach(z=>cross.forEach(([nx,ny],j)=>{
    const dw=(widthAt(p,z+.001)-widthAt(p,z-.001))/.002,dy=(beltAt(p,z+.001)-beltAt(p,z-.001))/.002;
    const factors=[-.96,-1,-.91,-.5,0,.5,.91,1,.96],n=new THREE.Vector3(nx,ny,-nx*dw*factors[j]-ny*dy).normalize();normals.push(...n.toArray());
  }));
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setIndex(indices);parts.add('paint',g);
  for(const offset of [0,(coords.length-1)*count]){const points:V[]=[];for(let j=0;j<count;j++)points.push(positions.slice((offset+j)*3,(offset+j)*3+3) as V);if(offset)points.reverse();parts.polygon('paint',points);}
  parts.box('trim',[0,.225,0],[p.bodyWidth*.62,.11,p.length*.82],.03);
  for(const side of [-1,1]) {
    parts.box(p.style==='crossover'?'trim':'paint',[side*p.bodyWidth*.475,.245,0],[.075,.12,p.wheelbase-2*(p.wheelRadius+.05)],.022);
    for(const axle of [-p.wheelbase/2,p.wheelbase/2]) {
      // Inner liner and a narrow swept fender lip, outside the tire envelope.
      const r=p.wheelRadius+.047,segments=detail?28:12;
      for(let i=0;i<segments;i++) {
        const a=i*Math.PI/segments,b=(i+1)*Math.PI/segments,x=side*(widthAt(p,axle)+.002);
        const lip:V[]=[[x,p.wheelRadius+Math.sin(a)*r,axle+Math.cos(a)*r],[x,p.wheelRadius+Math.sin(b)*r,axle+Math.cos(b)*r],[x,p.wheelRadius+Math.sin(b)*(r+.022),axle+Math.cos(b)*(r+.022)],[x,p.wheelRadius+Math.sin(a)*(r+.022),axle+Math.cos(a)*(r+.022)]];
        if(side<0)lip.reverse();parts.polygon(p.style==='crossover'?'trim':'paint',lip);
        parts.polygon('trim',[[x,p.wheelRadius+Math.sin(a)*r,axle+Math.cos(a)*r],[x,p.wheelRadius+Math.sin(b)*r,axle+Math.cos(b)*r],[x-side*.16,p.wheelRadius+Math.sin(b)*r,axle+Math.cos(b)*r],[x-side*.16,p.wheelRadius+Math.sin(a)*r,axle+Math.cos(a)*r]]);
      }
    }
  }
}

function clipZ(poly:V[],cut:number,keepAbove:boolean):V[] {
  const result:V[]=[];
  for(let i=0;i<poly.length;i++) {
    const a=poly[i],b=poly[(i+1)%poly.length],inside=(z:number)=>keepAbove?z>=cut:z<=cut;
    if(inside(a[2]))result.push(a);
    if(inside(a[2])!==inside(b[2])){const t=(cut-a[2])/(b[2]-a[2]);result.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,cut]);}
  }
  return result;
}

function cabin(parts:Parts,p:VehicleProfile,kind:VehicleKind,detail:boolean):void {
  const L=p.length,W=p.bodyWidth,h=(kind==='taxi'?1.46:p.style==='truck'?1.99:p.height)-.02;
  const fb=p.frontBase*L,fr=p.frontRoof*L,rr=p.rearRoof*L,rb=p.rearBase*L,belt=p.belt+.07,rw=W*p.roofWidth/2;
  const ws:V[]=[[-W*.455,belt,fb],[W*.455,belt,fb],[rw,h-.085,fr],[-rw,h-.085,fr]];
  parts.windshield(ws,boxyStyle(p)?.012:.055);
  for(let i=0;i<4;i++)parts.beam(i===0?'trim':'paint',ws[i],ws[(i+1)%4],i===0?.025:.072,.052);
  const rear:V[]=[[-W*.455,belt,rb],[-rw,h-.085,rr],[rw,h-.085,rr],[W*.455,belt,rb]];
  parts.windshield(rear,boxyStyle(p)?-.012:-.04);for(let i=0;i<4;i++)parts.beam('paint',rear[i],rear[(i+1)%4],.075,.052);
  const roofPositions:number[]=[],roofIndices:number[]=[],steps=detail?12:5;
  for(let j=0;j<=steps;j++) {
    const t=j/steps,z=rr+(fr-rr)*t,peak=Math.sin(t*Math.PI)*.018;
    for(let i=0;i<=8;i++){const a=i/8*Math.PI;roofPositions.push(-Math.cos(a)*rw,h-.085+Math.sin(a)*(.085+peak),z);}
  }
  for(let j=1;j<=steps;j++)for(let i=0;i<8;i++){const a=(j-1)*9+i,b=j*9+i;roofIndices.push(a,b,a+1,a+1,b,b+1);}
  const roof=new THREE.BufferGeometry();roof.setAttribute('position',new THREE.Float32BufferAttribute(roofPositions,3));roof.setIndex(roofIndices);roof.computeVertexNormals();parts.add('paint',roof);
  const boxy=boxyStyle(p),split=p.style==='truck'?p.rearBase*L+.1:boxy?L*.12:-L*.015;
  for(const side of [-1,1]) {
    const poly:V[]=[[side*W*.468,belt,rb+.045],[side*rw,h-.09,rr+.035],[side*rw,h-.09,fr-.035],[side*W*.468,belt,fb-.045]];
    const ranges=p.style==='coupe'?[[rb,fb]]:[[rb,split-.035],[split+.035,fb]];
    for(const [a,b]of ranges){
      const pane=clipZ(clipZ(poly,a,true),b,false);
      if(pane.length>=3) {
        const cargoSide=p.style==='van'&&b<split;
        if(cargoSide&&side<0)pane.reverse();parts.polygon(cargoSide?'paint':'glass',pane);
      }
    }
    for(let i=0;i<poly.length;i++)parts.beam(i===1?'chrome':'paint',poly[i],poly[(i+1)%poly.length],i===1?.018:.048,.04);
    if(p.style!=='coupe'&&p.style!=='truck')parts.rod('trim',[side*W*.468,belt,split],[side*rw,h-.085,split],.039);
    if(boxy&&p.style!=='truck') {
      const second=-L*.18;
      if(p.style!=='van')parts.rod('trim',[side*W*.468,belt,second],[side*rw,h-.085,second],.032);
      parts.box('paint',[side*W*.487,.79,-L*.19],[.025,.24,L*.41],.005);
      if(detail)parts.box('trim',[side*W*.492,.69,-L*.08],[.012,.014,L*.54],0);
    }
    // Body-colour housings, black arms and separate reflective mirror faces.
    const mz=fb-.14,my=belt+.13,mx=side*(W/2+.055),mirrorWidth=(p.width-W)/2;
    parts.rod('trim',[side*W*.45,my-.05,mz-.03],[mx,my,mz],.023);
    parts.box('paint',[mx,my+.025,mz],[mirrorWidth,.115,.19],.035);
    parts.box('chrome',[mx,my+.027,mz-.098],[mirrorWidth*.78,.073,.008],.004);
    if(detail) {
      const seamZ=p.style==='coupe'?-L*.19:split;
      for(const dz of [seamZ,fb-.08]) {
        const x=side*(widthAt(p,dz)+.004);
        parts.rod('trim',[x,belt-.02,dz],[x,.38,dz],.0035,4);
      }
      const doorZs=p.style==='coupe'?[seamZ+.14]:p.style==='truck'?[fb-.5]:[split+.18,rb+.38];
      for(const z of doorZs)parts.box(p.family==='work'?'trim':'chrome',[side*(widthAt(p,z)+.009),p.belt-.105,z],[.016,.035,.15],.009);
      // Wiper blades sit on the glass, not on the bonnet.
      if(side===1)for(const x of [-W*.23,W*.16])parts.rod('trim',[x,belt+.03,fb-.026],[x-.18,belt+.105,fb-.11],.008,5);
    }
    // Simple seated occupants and dashboard read through the glazing; no new animated NPCs.
    parts.box('cabin',[side*W*.25,.83,fr-.24],[.34,.58,.22],.06);
    parts.box('cabin',[side*W*.25,1.12,fr-.24],[.22,.2,.18],.06);
    if(side===1)parts.add('cabin',new THREE.SphereGeometry(.09,8,6),[side*W*.25,Math.min(h-.24,1.23),fr+.02]);
  }
  parts.box('cabin',[0,p.belt+.02,fb-.2],[W*.83,.10,.34],.03);
  if(['wagon','crossover','mpv'].includes(p.style))for(const side of [-1,1])parts.rod('chrome',[side*rw*.91,h-.01,rr+.2],[side*rw*.91,h-.01,fr-.15],.018);
}

function boxyStyle(p:VehicleProfile):boolean {return ['kei','van','truck','mpv'].includes(p.style);}

function endDetails(parts:Parts,p:VehicleProfile,kind:VehicleKind,detail:boolean):void {
  const L=p.length,W=p.bodyWidth,front=L/2-.024,rear=-L/2+.024,style=p.style,work=p.family==='work';
  const premium=p.family==='premium',y=work?.79:style==='crossover'?.83:.70;
  parts.box('trim',[0,.36,front-.06],[W*p.nose*.91,.17,.11],.035);
  parts.box('trim',[0,.34,rear+.06],[W*p.nose*.92,.16,.11],.035);
  // Every front has its own grille shape and lamp anatomy; none carries a real badge.
  if(['modern','wagon','crossover'].includes(style)) {
    const hw=W*.235;
    parts.polygon('trim',[[-hw*.8,.40,front],[-hw,.5,front],[-hw*.91,.76,front],[hw*.91,.76,front],[hw,.5,front],[hw*.8,.40,front]]);
    if(detail)for(let i=-3;i<=3;i++)parts.box('chrome',[i*hw/4,.58,front+.002],[.012,.24,.008],0);
  } else if(style==='sport') {
    for(const side of [-1,1]) {
      parts.box('trim',[side*W*.13,.64,front],[W*.2,.22,.012],.045);
      if(detail)for(let j=-2;j<=2;j++)parts.box('chrome',[side*W*.13+j*.035,.64,front+.007],[.009,.17,.008],0);
    }
  } else if(style==='luxury') {
    parts.box('chrome',[0,.64,front-.004],[W*.49,.27,.018],.05);
    parts.box('trim',[0,.64,front+.008],[W*.46,.23,.009],.04);
    for(let i=-1;i<=1;i++)parts.box('chrome',[0,.64+i*.065,front+.014],[W*.43,.012,.008],.003);
  } else {
    parts.box('trim',[0,work?.61:.57,front],[W*(style==='hatch'?.37:.47),work?.22:.15,.015],.03);
    if(detail)for(let i=0;i<(work?3:2);i++)parts.box(work?'trim':'chrome',[0,(work?.55:.54)+i*.065,front+.009],[W*.39,.013,.011],.003);
  }
  for(const side of [-1,1]) {
    const x=side*W*.315,hw=work?.24:style==='hatch'?.34:.36,hh=work?.21:style==='luxury'?.15:.115;
    parts.box('trim',[x,y,front-.017],[hw+.025,hh+.018,.045],.023);
    if(work) {
      parts.box('head',[x,y+.015,front+.008],[hw*.72,hh*.55,.012],.018);
      parts.box('chrome',[x,y-.048,front+.006],[hw*.79,.025,.012],.004);
    } else {
      // Narrow lenses, internal projectors and separated daytime-running segments.
      parts.box('chrome',[x,y,front+.009],[hw-.025,hh-.02,.012],.018);
      if(style==='hatch')parts.add('head',new THREE.SphereGeometry(.04,12,8),[x-side*.055,y,front-.018]);
      else parts.box('head',[x,y+.026,front+.017],[hw*.85,.027,.008],.007);
      if(['sport','coupe'].includes(style))for(const offset of [-.065,.065])parts.box('head',[x+offset,y-.014,front+.019],[.036,.045,.008],.007);
      if(style==='luxury')for(let i=0;i<3;i++)parts.box('head',[x-.095+i*.075,y-.018,front+.018],[.042,.035,.008],.006);
    }
    const tailY=style==='truck'?.53:work?1.02:p.belt-.045;
    if(['kei','van','mpv'].includes(style)) {
      parts.box('trim',[side*W*.413,tailY,rear+.005],[.15,.42,.035],.02);
      parts.box('tail',[side*W*.413,tailY+.065,rear-.016],[.095,.24,.015],.01);
      parts.box('chrome',[side*W*.413,tailY-.115,rear-.017],[.09,.06,.012],.005);
    } else if(style==='coupe') {
      for(const dx of [-.065,.065])parts.box('tail',[x+dx,tailY,rear-.006],[.084,.10,.018],.035);
    } else {
      parts.box('trim',[side*W*.30,tailY,rear+.006],[W*.20,.14,.035],.025);
      parts.box('tail',[side*W*.30,tailY,rear-.015],[W*.18,.052,.015],.014);
      if(premium)parts.box('tail',[side*W*.245,tailY-.032,rear-.015],[.025,.08,.015],.006);
    }
    parts.box('chrome',[side*W*.36,.29,rear+.027],[.11,.065,.10],.015);
    if(detail) {
      parts.box('trim',[side*W*.34,.43,front+.005],[.17,.07,.014],.015);
      for(const end of [-1,1])parts.box('trim',[side*W*.22,.40,end*(L/2-.005)],[.022,.022,.009],.009);
    }
  }
  // Left indicators are a separate switched material, driven by the authoritative clock.
  parts.box('amber',[-W*.40,y-.055,front+.012],[.047,.052,.012],.009);
  parts.box('amber',[-W*.40,p.belt-.14,rear-.015],[.055,.045,.014],.009);
  parts.box('amber',[-W/2-.01,p.belt-.02,p.frontBase*L-.32],[.015,.028,.055],.007);
  // Canvas textures use a bottom-up V coordinate: yellow kei, white private, green service.
  const plateRegion:[number,number,number,number]=[0,kind==='kei'?0:kind==='taxi'?2/3:1/3,1,1/3];
  for(const end of [-1,1]) {
    const z=end*(L/2-.001),cy=end===1?.43:style==='truck'?.40:.52,w=.31,h=.15;
    const points:V[]=[[-w/2,cy-h/2,z],[w/2,cy-h/2,z],[w/2,cy+h/2,z],[-w/2,cy+h/2,z]];
    if(end<0)points.reverse();parts.polygon('plate',points,plateRegion);
  }
  if(kind==='taxi') {
    parts.box('service',[0,1.55,-.12],[.36,.14,.17],.035);
    for(const side of [-1,1])parts.box('service',[side*(W/2+.006),.68,-.05],[.012,.09,L*.52],.003);
  }
  if(style==='coupe') {
    parts.box('paint',[0,.91,-L*.38],[W*.75,.055,.19],.025);
    for(const side of [-1,1])parts.box('trim',[side*W*.25,.855,-L*.38],[.045,.11,.075],.009);
  }
  if(work&&style!=='truck'&&detail)for(const side of [-1,1]) {
    const x=side*(W/2+.008),z=-L*.17;
    parts.polygon('decal',[[x,.72,z-.33],[x,.72,z+.33],[x,.9,z+.33],[x,.9,z-.33]]);
  }
  if(!work) {
    // Integrated lower valance and separate side intakes follow the curved fascia.
    parts.box('paint',[0,.28,front-.032],[W*.77,.09,.085],.035);
    for(const side of [-1,1]) {
      parts.box('trim',[side*W*.32,.405,front-.006],[W*.145,.125,.02],.032);
      parts.box('chrome',[side*W*.32,.363,front+.009],[W*.12,.014,.012],.005);
      if(detail) {
        const start=p.frontBase*L+.08,end=L/2-.19;
        // Bonnet shut lines and stamped creases; small enough to remain subordinate to paint.
        for(let i=0;i<12;i++) {
          const z0=start+(end-start)*i/12,z1=start+(end-start)*(i+1)/12;
          const x0=side*widthAt(p,z0)*.64,x1=side*widthAt(p,z1)*.64;
          parts.rod('trim',[x0,beltAt(p,z0)+.037,z0],[x1,beltAt(p,z1)+.037,z1],.0018,4);
        }
        const frontDoor=p.style==='coupe'?-L*.19:-L*.015;
        const rearDoor=p.rearBase*L+.06;
        for(const z of [frontDoor,rearDoor]) {
          const x=side*(widthAt(p,z)+.003);
          parts.rod('trim',[x,.37,z],[x,p.belt-.03,z],.003,4);
        }
        const sillX=side*W*.497;
        parts.rod(premium?'chrome':'trim',[sillX,.36,-p.wheelbase/2+p.wheelRadius+.08],[sillX,.36,p.wheelbase/2-p.wheelRadius-.08],.006,5);
      }
    }
  }
}

/** One deformation for shell, bumper and lenses keeps the rounded ends physically joined. */
function shapeEnds(geometry:THREE.BufferGeometry,p:VehicleProfile):void {
  const positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal'),normal=new THREE.Vector3();
  const zone=.52,edge=p.length/2-zone,round=p.style==='hatch'?.22:p.style==='hybrid'?.24:p.style==='coupe'?.10:.16;
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),sign=Math.sign(z),t=THREE.MathUtils.clamp((Math.abs(z)-edge)/zone,0,1);
    if(!t)continue;
    const f=t*t,df=2*t/zone,curve=round*(x/(p.bodyWidth/2))**2;
    const dx=round*2*x/(p.bodyWidth/2)**2;
    // Inverse transpose of the analytic deformation Jacobian preserves smooth hull normals.
    const nz=normals.getZ(i)/(1-curve*df);
    normal.set(normals.getX(i)+sign*f*dx*nz,normals.getY(i),nz).normalize();
    positions.setZ(i,z-sign*f*curve);normals.setXYZ(i,normal.x,normal.y,normal.z);
  }
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
}

function cargo(parts:Parts,p:VehicleProfile,detail:boolean):void {
  const front=p.length*.115,rear=-p.length/2+.062,center=(front+rear)/2,len=front-rear;
  parts.box('cargo',[0,1.78,center],[p.bodyWidth-.045,1.61,len],.035);
  for(const side of [-1,1]) {
    parts.box('chrome',[side*p.bodyWidth*.493,1.0,center],[.025,.09,len],.01);
    parts.box('chrome',[side*p.bodyWidth*.493,2.53,center],[.025,.045,len],.008);
    if(detail)for(let i=0;i<12;i++)parts.box('chrome',[side*p.bodyWidth*.489,1.12+i*.115,center],[.009,.012,len-.05],.002);
  }
  parts.box('trim',[0,1.75,rear-.038],[.012,1.5,.014],.003);
  for(const side of [-1,1]) {
    parts.box('chrome',[side*.33,1.74,rear-.046],[.023,1.30,.016],.005);
    for(const y of [1.15,1.75,2.35])parts.box('chrome',[side*(p.bodyWidth/2-.1),y,rear-.046],[.07,.05,.02],.004);
    parts.box('service',[side*.57,1.05,rear-.05],[.29,.055,.012],.004);
  }
}

function wheels(p:VehicleProfile,detail:boolean):Map<VehicleSurface,THREE.BufferGeometry> {
  const b=new Parts(),r=p.wheelRadius,segments=detail?28:14,commercial=p.family==='work';
  const tire=new THREE.TorusGeometry(r-.058,.058,detail?8:5,segments);tire.scale(1,1,1.55);tire.rotateY(Math.PI/2);b.add('rubber',tire);
  const barrel=new THREE.CylinderGeometry(r-.105,r-.105,.17,segments);barrel.rotateZ(Math.PI/2);b.add('trim',barrel);
  for(const side of [-1,1]) {
    if(commercial){const steel=new THREE.CylinderGeometry(r-.106,r-.106,.012,segments);steel.rotateZ(Math.PI/2);b.add('chrome',steel,[side*.086,0,0]);}
    const rim=new THREE.TorusGeometry(r-.102,.012,5,segments);rim.rotateY(Math.PI/2);b.add('chrome',rim,[side*.083,0,0]);
    const hub=new THREE.CylinderGeometry(commercial?.075:.053,commercial?.075:.053,.025,12);hub.rotateZ(Math.PI/2);b.add('chrome',hub,[side*.092,0,0]);
    const spokes=commercial?6:p.style==='coupe'?6:p.style==='luxury'?10:5;
    for(let i=0;i<spokes;i++) {
      const a=i*Math.PI*2/spokes;
      if(commercial) {
        const hole=new THREE.CylinderGeometry(.022,.022,.008,8);hole.rotateZ(Math.PI/2);b.add('rubber',hole,[side*.096,Math.sin(a)*(r-.14),Math.cos(a)*(r-.14)]);
      } else b.rod('chrome',[side*.091,Math.sin(a)*.045,Math.cos(a)*.045],[side*.082,Math.sin(a+.1)*(r-.108),Math.cos(a+.1)*(r-.108)],p.style==='luxury'?.012:.018,5);
    }
    if(detail)for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const bolt=new THREE.SphereGeometry(.009,5,4);b.add('chrome',bolt,[side*.109,Math.sin(a)*.038,Math.cos(a)*.038]);}
  }
  return b.finish();
}

export function createVehicleModel(kind:VehicleKind,detail=true):VehicleModel {
  const p=VEHICLE_PROFILES[kind],parts=new Parts();
  hull(parts,p,detail);cabin(parts,p,kind,detail);endDetails(parts,p,kind,detail);if(kind==='truck')cargo(parts,p,detail);
  const body=parts.finish(),wheel=wheels(p,detail);
  if(p.family!=='work')for(const g of body.values())shapeEnds(g,p);
  const triangles=[...body.values()].reduce((sum,g)=>sum+g.getAttribute('position').count/3,0)+4*[...wheel.values()].reduce((sum,g)=>sum+g.getAttribute('position').count/3,0);
  return{body,wheel,triangles};
}
