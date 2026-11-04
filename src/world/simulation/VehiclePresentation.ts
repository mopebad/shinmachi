import * as THREE from 'three';
import { createVehicleModel } from './VehicleGeometry.ts';
import type { VehicleModel, VehicleSurface } from './VehicleGeometry.ts';
import { VEHICLE_KINDS, VEHICLE_PROFILES } from './VehicleCatalog.ts';
import type { VehicleKind } from './VehicleCatalog.ts';
import type { CitySimulation } from './CitySimulation.ts';
import { dayState } from './WorldRules.ts';

type Pool={ mesh:THREE.InstancedMesh; surface:VehicleSurface; wheel:boolean; braking?:boolean };
type Family={ near:Pool[]; far:Pool[]; models:[VehicleModel,VehicleModel] };
const UNIT=new THREE.Vector3(1,1,1);

function plateTexture():THREE.CanvasTexture {
  const c=document.createElement('canvas');c.width=512;c.height=384;const ctx=c.getContext('2d')!;
  for(let i=0;i<3;i++) {
    ctx.fillStyle=['#2b5148','#e5e4d4','#d4b548'][i];ctx.fillRect(0,i*128,512,128);
    ctx.fillStyle=i===0?'#e5e9d9':'#274139';ctx.textAlign='center';ctx.font='26px "Yu Gothic", sans-serif';ctx.fillText('新町  500',256,i*128+34);
    ctx.font='bold 62px sans-serif';ctx.fillText('12 · 86',268,i*128+105);
    ctx.font='25px "Yu Gothic", sans-serif';ctx.fillText(i===0?'あ':'わ',61,i*128+90);
    for(const x of [20,492]){ctx.fillStyle='#738078';ctx.beginPath();ctx.arc(x,i*128+15,4,0,Math.PI*2);ctx.fill();}
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
function serviceTexture():THREE.CanvasTexture {
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d')!;
  ctx.fillStyle='#e4e8df';ctx.fillRect(0,0,512,128);ctx.fillStyle='#34594f';ctx.textAlign='center';ctx.font='bold 65px "Yu Gothic",sans-serif';ctx.fillText('まち便',256,77);ctx.font='19px sans-serif';ctx.fillText('SHINMACHI  /  LOCAL DELIVERY',256,111);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

/** Render-only library. Routes, speed, braking, selection and clock remain in CitySimulation. */
export class VehiclePresentation {
  readonly group=new THREE.Group();
  readonly families=new Map<VehicleKind,Family>();
  private readonly root=new THREE.Matrix4();private readonly local=new THREE.Matrix4();private readonly matrix=new THREE.Matrix4();
  private readonly position=new THREE.Vector3();private readonly rotation=new THREE.Quaternion();private readonly tint=new THREE.Color();
  private readonly headMaterials:THREE.MeshStandardMaterial[]=[];
  private readonly tailMaterial=new THREE.MeshStandardMaterial({color:0x912e28,emissive:0xfb3022,emissiveIntensity:.8,roughness:.25});
  private readonly brakeMaterial=new THREE.MeshStandardMaterial({color:0xd54432,emissive:0xff3121,emissiveIntensity:2.4,roughness:.25});
  private readonly amberMaterial=new THREE.MeshStandardMaterial({color:0xd59a3d,emissive:0xffa12a,emissiveIntensity:1.8,roughness:.3});
  constructor(parent:THREE.Group) {
    this.group.name='Original vehicle family library';parent.add(this.group);
    const materials:Record<Exclude<VehicleSurface,'head'>,THREE.Material>={
      paint:new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:.48,roughness:.28,clearcoat:.85,clearcoatRoughness:.16,envMapIntensity:1.1}),
      glass:new THREE.MeshPhysicalMaterial({color:0x344650,metalness:.12,roughness:.16,transparent:true,opacity:.83,depthWrite:false,side:THREE.DoubleSide,envMapIntensity:.55}),
      trim:new THREE.MeshStandardMaterial({color:0x192126,roughness:.7,side:THREE.DoubleSide}),
      chrome:new THREE.MeshStandardMaterial({color:0x9da9ac,roughness:.3,metalness:.88}),
      rubber:new THREE.MeshStandardMaterial({color:0x181b1d,roughness:.91}),
      tail:this.tailMaterial,amber:this.amberMaterial,
      plate:new THREE.MeshStandardMaterial({map:plateTexture(),roughness:.6,side:THREE.DoubleSide}),
      cargo:new THREE.MeshStandardMaterial({color:0xcbd1cc,metalness:.32,roughness:.54}),
      cabin:new THREE.MeshStandardMaterial({color:0x303330,roughness:.92}),
      service:new THREE.MeshStandardMaterial({color:0x2d6961,roughness:.4,emissive:0x26463c,emissiveIntensity:.15}),
      decal:new THREE.MeshStandardMaterial({map:serviceTexture(),roughness:.75,side:THREE.DoubleSide}),
    };
    for(const kind of VEHICLE_KINDS) {
      const head=new THREE.MeshStandardMaterial({color:VEHICLE_PROFILES[kind].family==='work'?0xffe6bb:0xe5f2f5,emissive:VEHICLE_PROFILES[kind].family==='work'?0xffd8a0:0xdaefff,emissiveIntensity:1.3,roughness:.2});
      this.headMaterials.push(head);
      const models:[VehicleModel,VehicleModel]=[createVehicleModel(kind,true),createVehicleModel(kind,false)];
      const make=(model:VehicleModel,lod:string)=>{
        const pools:Pool[]=[];
        for(const wheel of [false,true])for(const [surface,g]of wheel?model.wheel:model.body) {
          let material=surface==='head'?head:materials[surface];
          if(wheel&&surface==='chrome'&&kind==='coupe'){material=(material as THREE.MeshStandardMaterial).clone();(material as THREE.MeshStandardMaterial).color.setHex(0x9c8a6b);}
          const create=(mat:THREE.Material,braking?:boolean)=>{
            const mesh=new THREE.InstancedMesh(g,mat,wheel?80:20);mesh.name=`${kind}/${lod}/${wheel?'wheel/':''}${surface}${braking?'/brake':''}`;
            // Sun shadows are cached for static scenery. Moving cars use live GTAO/contact
            // shading and reflections, so they must never bake a stale shadow into that map.
            mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=false;mesh.receiveShadow=true;mesh.userData.vehicleIds=[];
            this.group.add(mesh);pools.push({mesh,surface,wheel,braking});
          };
          create(material,false);if(surface==='tail')create(this.brakeMaterial,true);
        }
        return pools;
      };
      this.families.set(kind,{near:make(models[0],'near'),far:make(models[1],'far'),models});
    }
  }
  update(sim:CitySimulation,camera?:THREE.Vector3):void {
    const night=dayState(sim.hour).night,lit=night>.2||sim.wet;
    this.headMaterials.forEach(m=>m.emissiveIntensity=lit?.5+night*1.8:0);
    this.tailMaterial.emissiveIntensity=lit?.25+night*.8:0;this.brakeMaterial.emissiveIntensity=1.3+night*1.7;
    for(const f of this.families.values())for(const pool of [...f.near,...f.far]){pool.mesh.count=0;pool.mesh.userData.vehicleIds.length=0;}
    for(const c of sim.vehicles) {
      if(!c.active)continue;
      const p=VEHICLE_PROFILES[c.kind],family=this.families.get(c.kind)!;
      const distance=camera?Math.hypot(c.x-camera.x,c.z-camera.z):0,pools=distance>45?family.far:family.near;
      this.position.set(c.x,-.018,c.z);this.rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,c.yaw);this.root.compose(this.position,this.rotation,UNIT);
      const steer=c.steering,roll=c.s/p.wheelRadius;
      const indicating=c.lights.blink;
      for(const pool of pools) {
        if(pool.surface==='tail'&&pool.braking!==c.braking||pool.surface==='amber'&&!indicating)continue;
        const put=(matrix:THREE.Matrix4)=>{
          const i=pool.mesh.count++;if(i>=pool.mesh.instanceMatrix.count)throw new Error('Vehicle pool capacity exceeded');
          pool.mesh.setMatrixAt(i,matrix);pool.mesh.setColorAt(i,this.tint.setHex(pool.surface==='paint'?c.color:pool.wheel&&pool.surface==='chrome'?[0xffffff,0x7b898f,0xc5b79e][c.variant]:0xffffff));pool.mesh.userData.vehicleIds[i]=c.id;
        };
        if(!pool.wheel)put(this.root);
        else for(const side of [-1,1])for(const axle of [-1,1]) {
          this.position.set(side*(p.bodyWidth/2-.13),p.wheelRadius,axle*p.wheelbase/2);
          this.rotation.setFromEuler(new THREE.Euler(roll,axle>0?steer:0,0,'YXZ'));this.local.compose(this.position,this.rotation,UNIT);
          this.matrix.multiplyMatrices(this.root,this.local);put(this.matrix);
        }
      }
    }
    // Refit only live instance bounds, for correct main, reflection and shadow-camera culling.
    for(const f of this.families.values())for(const {mesh}of [...f.near,...f.far])if(mesh.count){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();}
  }
}
