import * as THREE from 'three';
import {YOTO_VENUE} from './YotoVenueLayout.ts';
import { seededRandom } from '../simulation/WorldRules.ts';
import { AKANE_TOWER, skylineLayout, skylineRoads, SKYLINE_FAMILIES } from './SkylineLayout.ts';
import type { SkylineBuilding } from './SkylineLayout.ts';

type Shape = 'box' | 'plane' | 'rod' | 'sphere';
/** Small scenery-only instancer: no sign atlas, textures, lights or simulation registration. */
class SceneryBatch {
  private readonly shapes = { box: new THREE.BoxGeometry(), plane: new THREE.PlaneGeometry(), rod: new THREE.CylinderGeometry(1,1,1,6), sphere: new THREE.SphereGeometry(1,6,4) };
  private readonly batches = new Map<string,{shape:Shape;material:THREE.Material;matrices:THREE.Matrix4[];colors:THREE.Color[];sections:string[]}>();
  section='ground';
  private readonly transform = new THREE.Matrix4();
  private readonly object = new THREE.Object3D();
  origin(x=0,z=0,yaw=0):void { this.transform.makeRotationY(yaw).setPosition(x,0,z); }
  part(shape:Shape,material:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,yaw=0,tint=0xffffff):void {
    const key=shape+material.uuid;
    if(!this.batches.has(key))this.batches.set(key,{shape,material,matrices:[],colors:[],sections:[]});
    this.object.position.set(x,y,z);this.object.scale.set(w,h,d);this.object.rotation.set(0,yaw,0);this.object.updateMatrix();
    const batch=this.batches.get(key)!;batch.matrices.push(this.transform.clone().multiply(this.object.matrix));batch.colors.push(new THREE.Color(tint));batch.sections.push(this.section);
  }
  box(m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,tint=0xffffff):void {this.part('box',m,x,y,z,w,h,d,0,tint);}
  plane(m:THREE.Material,x:number,y:number,z:number,w:number,h:number,yaw=0,tint=0xffffff):void {this.part('plane',m,x,y,z,w,h,1,yaw,tint);}
  rod(m:THREE.Material,a:THREE.Vector3,b:THREE.Vector3,r:number):void {
    const delta=b.clone().sub(a);this.object.position.copy(a).add(b).multiplyScalar(.5);this.object.scale.set(r,delta.length(),r);this.object.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP,delta.normalize());this.object.updateMatrix();
    const key='rod'+m.uuid;if(!this.batches.has(key))this.batches.set(key,{shape:'rod',material:m,matrices:[],colors:[],sections:[]});
    const batch=this.batches.get(key)!;batch.matrices.push(this.transform.clone().multiply(this.object.matrix));batch.colors.push(new THREE.Color(0xffffff));batch.sections.push(this.section);
  }
  finish(name:string):THREE.Group {
    const group=new THREE.Group();group.name=name;
    for(const batch of this.batches.values()){
      const mesh=new THREE.InstancedMesh(this.shapes[batch.shape],batch.material,batch.matrices.length);
      batch.matrices.forEach((matrix,i)=>{mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,batch.colors[i]);});
      mesh.userData.sections=batch.sections;mesh.castShadow=false;mesh.receiveShadow=false;mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh);
    }
    return group;
  }
}

interface Volume { x:number; z:number; bottom:number; w:number; d:number; h:number }
/** Visual city beyond the fixed playable envelope. Every facade is actual world-space geometry. */
export class CityBackdrop {
  readonly group=new THREE.Group();
  readonly towerGroup=new THREE.Group();
  private readonly haze={value:.0008};
  private readonly office:THREE.MeshStandardMaterial;
  private readonly residential:THREE.MeshStandardMaterial;
  private readonly warm:THREE.MeshStandardMaterial;
  private readonly steel:THREE.MeshStandardMaterial;
  private readonly white:THREE.MeshStandardMaterial;
  private readonly deck:THREE.MeshStandardMaterial;
  private readonly beacon:THREE.MeshStandardMaterial;
  private readonly curtain:THREE.MeshStandardMaterial;
  private material(color:number,roughness=.85,emissive=0x000000,intensity=0):THREE.MeshStandardMaterial {
    const m=new THREE.MeshStandardMaterial({color,roughness,metalness:roughness<.6?.25:0,emissive,emissiveIntensity:intensity});
    // The metre-scale skyline needs kilometre-scale aerial perspective. Keep the existing near-street fog unchanged.
    m.onBeforeCompile=shader=>{shader.uniforms.skylineHaze=this.haze;shader.fragmentShader='uniform float skylineHaze;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`#ifdef USE_FOG
        float skylineDistance=length(vViewPosition);
        float skylineFog=1.-exp(-pow(skylineDistance*skylineHaze,2.));
        gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,skylineFog);
      #endif`);};
    m.customProgramCacheKey=()=> 'metropolitan-aerial-perspective-v1';return m;
  }
  constructor(scene:THREE.Scene,seed=8412){
    const wall=this.material(0xffffff),trim=this.material(0x5c6465),roof=this.material(0x586064),glass=this.material(0x243943,.42);
    this.curtain=this.material(0xffffff,.46);
    this.office=this.material(0x71888c,.48,0xb8d5d7,.2);
    this.residential=this.material(0xb2a28b,.55,0xffc88e,.2);
    this.warm=this.material(0x928f7b,.58,0xe3e1bd,.2);
    this.steel=this.material(0xc65732,.48,0xff781e,1.3);this.white=this.material(0xd5d2c6,.5,0xffc381,.4);
    this.deck=this.material(0x414e54,.32,0xffc47c,.35);this.beacon=this.material(0x611b13,.6,0xff3520,2);
    // Coplanar facade overlays need a depth bias at kilometre distances, especially with the existing near clip.
    for(const m of [glass,this.office,this.residential,this.warm]){m.polygonOffset=true;m.polygonOffsetFactor=-1;m.polygonOffsetUnits=-4;}
    const layout=skylineLayout((seed^0x11c6f)>>>0),roads=skylineRoads(),b=new SceneryBatch();
    const ground=this.material(0x485052,.99),paving=this.material(0x777d79,.98),asphalt=this.material(0x303b42,.98),paint=this.material(0xa8ada4,.99);
    // The skyline's underlying terrain shares the real basement shaft opening.
    const cut=YOTO_VENUE.slabOpening;
    for(const [x0,x1,z0,z1]of [[-1700,cut.minX,-2280,1120],[cut.maxX,1700,-2280,1120],[cut.minX,cut.maxX,-2280,cut.minZ],[cut.minX,cut.maxX,cut.maxZ,1120]])
      b.box(ground,(x0+x1)/2,-.32,(z0+z1)/2,x1-x0,.12,z1-z0);
    for(const road of roads){
      b.section='road:'+road.id;
      const x=(road.minX+road.maxX)/2,z=(road.minZ+road.maxZ)/2,w=road.maxX-road.minX,d=road.maxZ-road.minZ;
      b.box(paving,x,-.10,z,w+2.2,.1,d+2.2);b.box(asphalt,x,-.037,z,w,.035,d);
      const length=road.axis==='z'?d:w;
      for(let t=-length/2+4;t<length/2;t+=12)b.box(paint,x+(road.axis==='x'?t:0),-.014,z+(road.axis==='z'?t:0),road.axis==='x'?4:.12,.012,road.axis==='z'?4:.12);
    }
    for(const spec of layout)this.building(b,spec,wall,trim,roof,glass);
    // Small service structures, light poles and road continuity occupy the backdrop, never the railway clearance.
    b.section='street-utilities';
    for(const side of [-1,1])for(let z=-95;z>-365;z-=34){
      b.box(trim,side*5.35,3.8,z,.13,7.7,.13);b.box(trim,side*4.8,7.6,z,1.2,.08,.10);
      b.box(this.warm,side*4.3,7.5,z,.55,.06,.3);
    }
    // Continue the existing straight railway visually into its reserved corridor, without adding a line or route.
    b.section='rail-continuation';
    for(const side of [-1,1]){
      b.box(trim,side*215.5,6.2,-57,289,.9,6.5);
      for(const z of [-57.75,-56.25])b.box(roof,side*215.5,6.93,z,289,.18,.09);
      for(let x=80;x<355;x+=16){b.box(trim,side*x,3,-57,1.2,6,2.6);b.box(trim,side*x,5.5,-57,3.8,.8,3.8);b.box(roof,side*x,9.1,-59.3,.09,5,.09);b.box(roof,side*x,11.5,-57,.09,.09,4.8);}
      b.box(roof,side*215.5,11.0,-57,289,.025,.025);
      for(let x=72;x<360;x+=1.6)b.box(roof,side*x,6.8,-57,.18,.15,2.3);
    }
    this.group.add(b.finish('Background blocks / three spatial detail bands'));
    this.tower();this.group.name='Metropolitan scenery / Akane broadcast tower';
    this.group.userData={seed,layoutSeed:(seed^0x11c6f)>>>0,buildings:layout.length,families:SKYLINE_FAMILIES,layers:[0,1,2].map(layer=>layout.filter(s=>s.layer===layer).length),tower:AKANE_TOWER,roads:roads.length,visualOnly:true};
    scene.add(this.group);
  }
  private building(b:SceneryBatch,s:SkylineBuilding,wall:THREE.Material,trim:THREE.Material,roof:THREE.Material,glass:THREE.Material):void {
    const rng=seededRandom(s.seed),w=s.width,d=s.depth,h=s.floors*s.floorHeight;
    const palette=[0x8b8980,0xb2ada0,0x767e7f,0x9d927f,0x717b86,0x9b938a,0x6b7779],color=s.family===2||s.family===5?[0x526773,0x6b7d85,0x52645e][s.palette%3]:s.family===3?[0x927b67,0xa79d8b,0x7d7470][s.palette%3]:palette[s.palette];
    b.origin(s.x,s.z,s.yaw);b.section='building:'+s.seed;
    const volumes:Volume[]=[];
    const volume=(x:number,z:number,bottom:number,vw:number,vd:number,vh:number)=>volumes.push({x,z,bottom,w:vw,d:vd,h:vh});
    if(s.family===0){volume(0,0,0,w,d,h*.83);volume(-w*.07,-d*.08,h*.83,w*.78,d*.75,h*.17);}
    else if(s.family===3){volume(0,0,0,w,d,h*.73);volume(w*.12,-d*.12,h*.73,w*.7,d*.72,h*.27);}
    else if(s.family===4){volume(0,0,0,w,d,h*.57);volume(-w*.08,-d*.08,h*.57,w*.82,d*.82,h*.26);volume(-w*.16,-d*.16,h*.83,w*.62,d*.62,h*.17);}
    else if(s.family===5){volume(0,0,0,w,d,Math.min(12,h*.2));volume(-w*.04,-d*.04,Math.min(12,h*.2),w*.73,d*.75,h-Math.min(12,h*.2));}
    else volume(0,0,0,w*(s.family===1?.94:1),d*(s.family===1?.94:1),h);
    for(const v of volumes){
      b.box(s.family===2||s.family===5?this.curtain:wall,v.x,v.bottom+v.h/2,v.z,v.w,v.h,v.d,color);
      b.box(s.family===1||s.family===4?wall:roof,v.x,v.bottom+v.h+.22,v.z,v.w+.12,.44,v.d+.12,s.family===1||s.family===4?color:0xffffff);
      const floorStep=s.layer===2?3:s.layer===1?2:1;
      const occupancy=.15+rng()*.48,suites=Array.from({length:12},()=>rng());
      for(const side of [0,1,2,3]){
        const span=side<2?v.w:v.d,cols=Math.max(2,Math.min(s.layer===2?5:12,Math.floor(span/(s.family===2?2.2:2.8))));
        const face=(material:THREE.Material,along:number,y:number,ww:number,hh:number,tint=0xffffff,offset=.025)=>{
          b.plane(material,v.x+(side===0||side===1?along:(side===2?1:-1)*(v.w/2+offset)),y,v.z+(side===0||side===1?(side===0?1:-1)*(v.d/2+offset):along),ww,hh,side===0?0:side===1?Math.PI:side===2?Math.PI/2:-Math.PI/2,tint);
        };
        for(let f=1;f<Math.floor(v.h/s.floorHeight);f+=floorStep){
          const y=v.bottom+f*s.floorHeight+.15,awake=rng()<occupancy?1:.12;
          for(let c=0;c<cols;c++){
            const lit=rng()<awake*(.45+suites[c]*.5),material=lit?(s.family===1||s.family===4?this.residential:s.family===2||s.family===5?this.office:this.warm):glass;
            const ww=span/cols*(s.family===2||s.family===5?.88:.58),hh=s.family===1?1.65:s.family===2?2.15:1.8;
            face(material,-span/2+(c+.5)*span/cols,y,ww,hh,lit?(rng()<.5?0xd1d9d3:0xffffff):0xffffff);
          }
          if(s.layer===0&&side<2&&(s.family===1||s.family===4)){
            // Recessed balcony rail and opaque slab, contained within the reserved parcel.
            face(trim,0,y-.85,span-.3,.16,0xffffff,.14);
            face(roof,0,y-.45,span-.5,.72,0xffffff,.20);
            for(let c=1;c<cols;c+=2)face(wall,-span/2+c*span/cols,y,.14,2.1,color,.22);
          }
          if((s.family===0||s.family===6)&&s.layer<2)face(trim,0,y-1.15,span,.12);
          if(s.family===3&&s.layer===0&&f%3===0)face(wall,0,y-1.1,span,.18,0xb0a18b,.06);
        }
        if((s.family===2||s.family===5)&&s.layer<2)for(let c=1;c<cols;c++)face(trim,-span/2+c*span/cols,v.bottom+v.h/2,.075,v.h-.4);
      }
      if(s.layer===0){
        for(const side of [-1,1])b.box(trim,v.x+side*(v.w/2-.14),v.bottom+v.h/2,v.z,.28,v.h,.35);
      }
    }
    const top=volumes.at(-1)!;
    b.box(trim,top.x,top.bottom+top.h+1,top.z,Math.min(6,top.w*.35),1.6,Math.min(5,top.d*.3));
    if(s.family===5){b.box(roof,top.x,h+2.6,top.z,top.w*.75,3,top.d*.62);b.box(trim,top.x,h+4.5,top.z,top.w*.5,.8,top.d*.43);}
    if(s.layer<2){
      const count=s.layer===0?3:1;
      for(let i=0;i<count;i++){const x=top.x+(i-1)*Math.min(2,top.w*.14);b.box(roof,x,h+.55,top.z-top.d*.25,1.1,1.1,1.5);b.box(trim,x,h+1.13,top.z-top.d*.25,1.2,.12,1.6);}
      b.box(trim,top.x+top.w*.3,h+2.7,top.z,.08,5.4,.08);
      if(s.family===1||s.family===4){b.part('rod',wall,top.x-top.w*.25,h+2.2,top.z+top.d*.18,1.0,2.4,1.0,0,0xb7b8ab);for(const side of [-1,1])b.box(trim,top.x-top.w*.25+side*.9,h+.8,top.z+top.d*.18,.12,1.6,.12);}
      if(s.layer===0){b.box(trim,w*.44,h*.4,-d*.32,.16,h*.8,.16);b.box(trim,-w*.42,1.35,d*.43,1.1,2.7,.55);}
    }
    b.origin();
  }
  private tower():void {
    const b=new SceneryBatch(),p=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z),levels=[[0,47.5],[25,39],[55,29],[90,21],[120,16],[145,12.5],[165,10],[200,7],[235,5],[250,4.5],[275,2.8]];
    const concrete=this.material(0x99978e),roof=this.material(0x5c6769);
    b.section='landmark';b.box(concrete,0,.15,0,104,.3,104);
    b.box(concrete,0,8,0,48,16,48);b.box(roof,0,16.3,0,50,.6,50);
    b.box(roof,0,80,0,4.5,155,4.5);
    for(let l=1;l<levels.length;l++){
      const [ya,ra]=levels[l-1],[yb,rb]=levels[l],m=ya>=235&&l%2===0?this.white:this.steel;
      for(const sx of [-1,1])for(const sz of [-1,1])b.rod(m,p(sx*ra,ya,sz*ra),p(sx*rb,yb,sz*rb),l<4?.65:l<7?.38:.22);
      const subdivisions=Math.ceil((yb-ya)/9);
      for(let part=0;part<subdivisions;part++){
        const a=part/subdivisions,c=(part+1)/subdivisions,y0=ya+(yb-ya)*a,y1=ya+(yb-ya)*c,r0=ra+(rb-ra)*a,r1=ra+(rb-ra)*c;
        for(const side of [-1,1]){
          b.box(m,0,y1,side*r1,r1*2,.28,.28);b.box(m,side*r1,y1,0,.28,.28,r1*2);
          b.rod(m,p(-r0,y0,side*r0),p(r1,y1,side*r1),ya<120?.14:.09);b.rod(m,p(r0,y0,side*r0),p(-r1,y1,side*r1),ya<120?.14:.09);
          b.rod(m,p(side*r0,y0,-r0),p(side*r1,y1,r1),ya<120?.14:.09);b.rod(m,p(side*r0,y0,r0),p(side*r1,y1,-r1),ya<120?.14:.09);
        }
      }
    }
    for(const [y,width,depth]of [[150,31,29],[250,15,14]]){
      b.box(this.steel,0,y-2,0,width,3,depth);
      for(const side of [-1,1]){
        b.box(this.deck,0,y+.1,side*(depth/2-.2),width-.9,2,.35);
        b.box(this.deck,side*(width/2-.2),y+.1,0,.35,2,depth-.9);
        for(let x=-width/2+1;x<width/2;x+=2)b.box(this.white,x,y+.1,side*depth/2,.14,2.3,.18);
      }
      b.box(this.white,0,y+1.5,0,width+1,.5,depth+1);b.box(this.steel,0,y-3.8,0,width*.78,1.1,depth*.8);
    }
    for(let y=275;y<330;y+=5)b.part('rod',Math.floor((y-275)/10)%2?this.white:this.steel,0,y+2.5,0,y<295?.8:.46,5,y<295?.8:.46);
    b.part('rod',this.white,0,331.5,0,.16,3,.16);
    for(const y of [153,253,332.7])b.part('sphere',this.beacon,0,y,0,.25,.25,.25);
    this.towerGroup.add(b.finish('Painted lattice / decks / antenna / foundations'));
    this.towerGroup.position.set(AKANE_TOWER.x,0,AKANE_TOWER.z);this.towerGroup.rotation.y=AKANE_TOWER.yaw;
    this.towerGroup.name='Akane / fixed 333 metre landmark';this.group.add(this.towerGroup);
  }
  update(hour:number,night:number):void {
    this.haze.value=.0007+night*.00012;
    const officeAwake=hour>=7&&hour<22?.75:.12,residentialAwake=hour>=17||hour<1?1:hour<6?.14:.32;
    this.office.emissiveIntensity=.015+night*.7*officeAwake;this.residential.emissiveIntensity=.015+night*.55*residentialAwake;
    this.warm.emissiveIntensity=.02+night*.42;
    const illuminated=hour>=17.5&&hour<24?night:0;
    this.steel.emissiveIntensity=.015+illuminated*1.5;this.white.emissiveIntensity=.01+illuminated*.65;this.deck.emissiveIntensity=.02+illuminated*.65;
    this.beacon.emissiveIntensity=1.2+(Math.floor(hour*3600)%2===0?.8:0);
  }
}
