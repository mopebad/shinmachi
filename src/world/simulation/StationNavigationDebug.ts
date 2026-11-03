import * as THREE from 'three';
import type { CitySimulation } from './CitySimulation';

/** Optional development overlay. Every marker reads the live navigation/simulation state. */
export class StationNavigationDebug {
  readonly group=new THREE.Group();
  private readonly labels=new Map<number,{sprite:THREE.Sprite;canvas:HTMLCanvasElement;text:string}>();
  private readonly gates=new Map<string,THREE.Mesh<THREE.BoxGeometry,THREE.MeshBasicMaterial>>();
  private readonly routes:THREE.LineSegments;
  private readonly positions=new Float32Array(88*256*2*3);
  constructor(sim:CitySimulation,parent:THREE.Group){
    this.group.name='Optional station navigation debug';parent.add(this.group);
    const station=sim.navigation.station!,nodes=sim.navigation.nodes,points:number[]=[],colors:number[]=[],markers:number[]=[];
    for(const id of station.nodeIds){const n=nodes[id];markers.push(n.x,n.y+.06,n.z);}
    for(const [id,list]of sim.navigation.edges)for(const edge of list)if(edge.station){
      const a=nodes[id],b=nodes[edge.to],color=new THREE.Color(edge.station.kind==='stairs'?0xff9d55:edge.station.kind==='gate'?0xffdb58:edge.station.state==='returning'||edge.station.state==='exiting'?0xc195ff:0x54dcf5);
      points.push(a.x,a.y+.055,a.z,b.x,b.y+.055,b.z);colors.push(color.r,color.g,color.b,color.r,color.g,color.b);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const network=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.8,depthTest:false,depthWrite:false}));network.renderOrder=100;this.group.add(network);
    const dots=new THREE.BufferGeometry();dots.setAttribute('position',new THREE.Float32BufferAttribute(markers,3));this.group.add(new THREE.Points(dots,new THREE.PointsMaterial({color:0xe0f9ff,size:.085,depthTest:false,transparent:true,opacity:.85})));
    for(const slot of station.waiting){const n=nodes[slot.node],ring=new THREE.Mesh(new THREE.RingGeometry(.25,.34,20),new THREE.MeshBasicMaterial({color:0x59efaf,side:THREE.DoubleSide,depthTest:false}));ring.rotation.x=-Math.PI/2;ring.position.set(n.x,n.y+.04,n.z);this.group.add(ring);}
    for(const gate of station.layout.gates){const box=new THREE.Mesh(new THREE.BoxGeometry(gate.width,.12,gate.depth),new THREE.MeshBasicMaterial({color:0x43ecad,transparent:true,opacity:.55,depthTest:false,depthWrite:false}));box.position.set(gate.center.x,gate.center.y+1.35,gate.center.z);this.group.add(box);this.gates.set(gate.id,box);}
    const routes=new THREE.BufferGeometry();routes.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));routes.setDrawRange(0,0);
    this.routes=new THREE.LineSegments(routes,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.8,depthTest:false,depthWrite:false}));this.routes.frustumCulled=false;this.routes.renderOrder=101;this.group.add(this.routes);
  }
  update(sim:CitySimulation):void{
    if(!this.group.visible)return;
    for(const [id,box]of this.gates)box.material.color.setHex(sim.stationTraffic!.owners.has('gate:'+id)?0xff625e:0x43ecad);
    for(const item of this.labels.values())item.sprite.visible=false;
    let count=0;
    for(const p of sim.pedestrians){
      if(!p.active||!p.station)continue;
      let label=this.labels.get(p.id);
      if(!label){const canvas=document.createElement('canvas');canvas.width=384;canvas.height=64;const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,depthTest:false,depthWrite:false}));sprite.scale.set(2.9,.48,1);sprite.renderOrder=102;this.group.add(sprite);label={sprite,canvas,text:''};this.labels.set(p.id,label);}
      const text=`${p.id} / ${p.station.state.toUpperCase()} / ${p.station.paid?'PAID':'UNPAID'}`;
      if(text!==label.text){const ctx=label.canvas.getContext('2d')!;ctx.clearRect(0,0,384,64);ctx.fillStyle='#12242de8';ctx.fillRect(0,0,384,64);ctx.fillStyle=p.station.paid?'#90ffc7':'#fff1aa';ctx.font='600 19px monospace';ctx.textBaseline='middle';ctx.fillText(text,10,32,364);label.sprite.material.map!.needsUpdate=true;label.text=text;}
      label.sprite.visible=true;label.sprite.position.set(p.x,p.y+2.05,p.z);
      let previous={x:p.x,y:p.y,z:p.z};
      const route=p.station.state==='approaching'?p.path.slice(p.next):p.station.route.slice(p.station.index);
      for(const id of route){const next=sim.navigation.nodes[id];if(count+6>this.positions.length)break;this.positions.set([previous.x,previous.y+.1,previous.z,next.x,next.y+.1,next.z],count);count+=6;previous=next;}
    }
    this.routes.geometry.setDrawRange(0,count/3);this.routes.geometry.attributes.position.needsUpdate=true;
  }
}
