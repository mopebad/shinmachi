import * as THREE from 'three';
import {YOTO_VENUE} from './YotoVenueLayout.ts';
import {SHINDO_CONTROLS,SHINDO_PANEL} from './ShindoConsole.ts';
import type {ShindoAction} from './ShindoConsole.ts';
import {shindoMarqueeOffset,shindoPlaybackProgress} from './ShindoDisplay.ts';
export interface ShindoPlayback {time:number;title:string;playing:boolean;level:number;bands:number[];duration?:number}
export const vinylAngle=(time:number)=>Number.isFinite(time)?time*Math.PI*10/9:0;

/** Small playback-driven details; no independent animation timer, flashing lights or fabricated beat. */
export class ShindoPresentation {
 readonly group=new THREE.Group();
 readonly controls:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshStandardMaterial>[]=[];
 private readonly records:THREE.Group[]=[];
 private readonly screen=document.createElement('canvas');
 private readonly texture:THREE.CanvasTexture;
 private readonly meters:THREE.InstancedMesh;
 private readonly object=new THREE.Object3D();
 private readonly color=new THREE.Color();
 private title='';private titleElapsed=0;private displayTime=0;private level=0;private lastPlaying=false;
 constructor(){
  const f=YOTO_VENUE.floorY;this.group.name='SHINDO / playback details';
  const vinyl=document.createElement('canvas');vinyl.width=vinyl.height=512;const p=vinyl.getContext('2d')!;
  p.fillStyle='#121819';p.fillRect(0,0,512,512);p.strokeStyle='#303636';p.lineWidth=.8;
  for(let r=72;r<253;r+=3){p.beginPath();p.arc(256,256,r,0,Math.PI*2);p.stroke();}
  p.fillStyle='#8e574e';p.beginPath();p.arc(256,256,66,0,Math.PI*2);p.fill();
  p.fillStyle='#d1c6a9';p.font='17px Arial';p.textAlign='center';p.fillText('SHINDO',256,241);p.font='10px Arial';p.fillText('DEPTH STUDIES / A',256,278);p.fillRect(245,204,22,4);p.fillStyle='#151e1e';p.beginPath();p.arc(256,256,5,0,Math.PI*2);p.fill();
  const map=new THREE.CanvasTexture(vinyl);map.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshStandardMaterial({map,roughness:.38,metalness:.12});
  for(const x of [17.757]){
   const record=new THREE.Group(),face=new THREE.Mesh(new THREE.CircleGeometry(.145,96),material);face.rotation.x=-Math.PI/2;record.position.set(x,f+1.192,-40.48);record.add(face);this.records.push(record);this.group.add(record);
  }
  this.screen.width=1024;this.screen.height=144;this.texture=new THREE.CanvasTexture(this.screen);this.texture.colorSpace=THREE.SRGBColorSpace;
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(.68,.096),new THREE.MeshStandardMaterial({map:this.texture,emissiveMap:this.texture,emissive:0xffffff,emissiveIntensity:.24,roughness:.66}));panel.position.set(18.94,f+.938,-40.029);this.group.add(panel);
  for(const {action,x,label}of SHINDO_CONTROLS){
   const c=document.createElement('canvas');c.width=384;c.height=172;const p=c.getContext('2d')!;
   p.fillStyle='#29302e';p.fillRect(0,0,384,172);p.strokeStyle='#756b54';p.lineWidth=3;p.strokeRect(3,3,378,166);
   p.textAlign='center';p.fillStyle='#d0c7ae';p.font='36px Arial';p.fillText(action==='previous'?'‹ PREV':action==='next'?'NEXT ›':'▷ / Ⅱ',192,76);
   p.fillStyle='#a8ab9b';p.font='21px "Yu Gothic",Arial';p.fillText(action==='previous'?'前へ':action==='next'?'次へ':'再生 / 一時停止',192,133);
   const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
   const button=new THREE.Mesh(new THREE.PlaneGeometry(SHINDO_PANEL.width,SHINDO_PANEL.height),new THREE.MeshStandardMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.16,roughness:.6}));
   button.name='SHINDO / '+label;button.userData.shindoAction=action satisfies ShindoAction;
   button.position.set(x,f+SHINDO_PANEL.yAboveFloor,SHINDO_PANEL.z);this.controls.push(button);this.group.add(button);
  }
  this.meters=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0x694522,emissiveIntensity:0,roughness:.55}),16);
  for(let row=0;row<2;row++)for(let i=0;i<8;i++){
   this.object.position.set(18.615+i*.01,f+1.15+row*.009,-40.324);this.object.scale.set(.007,.004,.002);this.object.updateMatrix();this.meters.setMatrixAt(row*8+i,this.object.matrix);this.meters.setColorAt(row*8+i,this.color.setHex(0x1b2926));
  }
  this.meters.computeBoundingSphere();this.group.add(this.meters);this.update(0,{time:0,title:'Selected sound / 深度',playing:false,level:0,bands:[0,0,0]});
 }
 highlight(control:THREE.Object3D|null){for(const button of this.controls)button.material.emissiveIntensity=button===control?.48:.16;}
 update(dt:number,state:ShindoPlayback){
  this.level+=(Math.max(0,Math.min(1,state.playing?state.level:0))-this.level)*(1-Math.exp(-Math.max(0,dt)*16));
  if(state.playing||state.time===0)for(const record of this.records)record.rotation.y=-vinylAngle(state.time);
  (this.meters.material as THREE.MeshStandardMaterial).emissiveIntensity=state.playing?.14:0;
  for(let row=0;row<2;row++)for(let i=0;i<8;i++){
   const value=state.playing?Math.max(this.level*.8,(state.bands[row]??0)*.85):0;
   this.meters.setColorAt(row*8+i,this.color.setHex(i/8<value?i>5?0xba8c4d:0x819b73:0x15201d));
  }
  this.meters.instanceColor!.needsUpdate=true;
  // The display reveals complete track names rather than permanently truncating them.
  // Limit canvas uploads to ~20 Hz; short titles and a paused static display cost almost nothing.
  const changed=state.title!==this.title||state.playing!==this.lastPlaying;
  if(state.title!==this.title){this.title=state.title;this.titleElapsed=0;}
  else this.titleElapsed+=Math.max(0,dt);
  this.lastPlaying=state.playing;this.displayTime+=Math.max(0,dt);
  if(changed||this.displayTime>=.05){
   this.displayTime=0;
   const p=this.screen.getContext('2d')!;
   p.fillStyle='#121c1c';p.fillRect(0,0,1024,144);p.textAlign='left';
   p.fillStyle='#aa9c7f';p.font='23px Arial';p.fillText(state.playing?'NOW PLAYING / 選曲':'PAUSED / 一時停止',25,37);
   p.font='37px "Yu Gothic",Arial';p.fillStyle='#c7d0c4';
   const available=970,title=state.title||'Selected sound / 深度';
   const offset=shindoMarqueeOffset(this.titleElapsed,p.measureText(title).width,available);
   p.save();p.beginPath();p.rect(25,57,available,63);p.clip();p.fillText(title,25-offset,104);p.restore();
   const progress=shindoPlaybackProgress(state.time,state.duration??NaN);
   if(progress!==null){
    p.fillStyle='#303e3a';p.fillRect(25,129,970,3);
    p.fillStyle='#a68b62';p.fillRect(25,129,970*progress,3);
   }
   this.texture.needsUpdate=true;
  }
  this.group.userData.playback={time:state.time,playing:state.playing,level:this.level,angle:this.records[0].rotation.y};
 }
}
