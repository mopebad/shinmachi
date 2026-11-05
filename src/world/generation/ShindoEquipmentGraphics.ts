import * as THREE from 'three';
import {YOTO_VENUE} from './YotoVenueLayout';

/** Original equipment silkscreen, authored at the imported equipment's measured scale. */
export function equipmentGraphics(){
 const group=new THREE.Group(),f=YOTO_VENUE.floorY;
 const panel=(w:number,h:number,draw:(p:CanvasRenderingContext2D)=>void)=>{
  const c=document.createElement('canvas');c.width=1536;c.height=512;const p=c.getContext('2d')!;draw(p);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
  return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,transparent:true,depthWrite:false,roughness:.5,polygonOffset:true,polygonOffsetFactor:-1}));
 };
 const amp=panel(.434,.108,p=>{
  p.fillStyle='#252c2c';p.textAlign='center';p.font='15px Arial';
  p.fillText('SHINDO  /  INTEGRATED AMPLIFIER',465,75);
  for(const [x,t]of [[230,'SOURCE'],[1160,'VOLUME'],[495,'BASS'],[650,'TREBLE'],[800,'BALANCE'],[960,'LOUDNESS']]as const)p.fillText(t,x,455);
  p.font='12px Arial';p.fillText('PHONO · AUX · LINE',230,95);p.fillText('− dB +',1275,90);
  for(const x of [230,1275])for(let i=0;i<17;i++){const a=Math.PI*.83+i*Math.PI*1.34/16,r=102;p.save();p.translate(x,260);p.rotate(a);p.fillRect(r,0,i%4===0?14:7,2);p.restore();}
 });amp.position.set(18.67,f+1.128,-40.3318);group.add(amp);
 const deck=panel(.454,.365,p=>{
  // Canvas vertical dimension covers the front-to-back depth of the deck.
  p.fillStyle='#242b2c';p.font='16px Arial';p.fillText('SHINDO  /  DIRECT DRIVE',38,490);
  p.font='12px Arial';p.fillText('33⅓     45',130,449);p.fillText('QUARTZ LOCK',1130,490);
  p.font='13px Arial';p.fillText('PITCH',1377,180);
  for(let i=0;i<17;i++){const y=205+i*12;p.fillRect(1350,y,i%4===0?24:13,1.2);if(i%4===0)p.fillText(String(8-i),1320,y+4);}
 });deck.rotation.x=-Math.PI/2;deck.position.set(17.82,f+1.1623,-40.48);group.add(deck);
 return group;
}
