import {fittedRun} from './SignLayout';
import {drawRun,measureSignInk} from './SignTextures';

/** Original venue identity: measured sans typography, depth contours and a restrained print palette. */
export function drawShindoGraphic(p:CanvasRenderingContext2D,w:number,h:number,theme:string){
 const ink='#d5cdbb',muted='#929d99',accent='#b2936b',font='"Yu Gothic", "Meiryo", Arial, sans-serif';
 const label=(s:string,x:number,y:number,width:number,size:number,color=ink)=>{
  p.fillStyle=color;drawRun(p,fittedRun(s,{x,y,width,height:size*1.5},size,(t,n)=>measureSignInk(p,t,n,font)),font);
 };
 const line=(x:number,y:number,xx:number,yy:number,color=accent)=>{p.strokeStyle=color;p.lineWidth=Math.max(1,Math.min(w,h)*.002);p.beginPath();p.moveTo(x,y);p.lineTo(xx,yy);p.stroke();};
 const contours=(x:number,y:number,r:number)=>{p.save();p.beginPath();p.rect(w*.04,h*.04,w*.92,h*.92);p.clip();p.strokeStyle=accent;p.lineWidth=Math.max(1,h*.002);for(let i=0;i<9;i++){p.globalAlpha=.15+i*.035;p.beginPath();p.ellipse(x,y,r*(.2+i*.115),r*(.12+i*.06),-.42,0,Math.PI*2);p.stroke();}p.restore();};
 p.fillStyle='#182122';p.fillRect(0,0,w,h);
 if(theme==='shindo-entry'){
  p.fillStyle='#232927';p.fillRect(0,0,w,h);
  label('深度 / SHINDO',w*.065,h*.14,w*.71,h*.28);
  label('B1 ↓',w*.79,h*.16,w*.16,h*.25,accent);
  line(w*.065,h*.64,w*.935,h*.64,'#5a6257');
  label('ELECTRONIC LISTENING BAR',w*.065,h*.75,w*.87,h*.09,muted);return;
 }
 if(theme==='shindo-arrival'){
  p.fillStyle='#242b28';p.fillRect(0,0,w,h);
  label('深度 / SHINDO',w*.08,h*.2,w*.68,h*.4);
  label('B1',w*.83,h*.23,w*.1,h*.32,accent);return;
 }
 if(theme==='shindo-exit'){
  p.fillStyle='#242b28';p.fillRect(0,0,w,h);
  label('出口 / EXIT',w*.065,h*.2,w*.57,h*.4,'#d4dbc8');
  label('↑ STREET',w*.70,h*.25,w*.24,h*.27,muted);return;
 }
 if(theme==='shindo-plaque'){
  p.fillStyle='#252a28';p.fillRect(0,0,w,h);
  label('深度',w*.06,h*.15,w*.24,h*.4,'#c5b18b');
  label('shindo',w*.38,h*.16,w*.56,h*.26);
  label('LISTENING BAR',w*.39,h*.62,w*.53,h*.1,muted);return;
 }
 if(theme==='shindo-art'){
  p.fillStyle='#b6ae98';p.fillRect(0,0,w,h);
  p.fillStyle='#343936';p.fillRect(w*.11,h*.1,w*.78,h*.67);
  p.strokeStyle='#9c8970';p.lineWidth=w*.025;
  for(let i=0;i<5;i++){p.beginPath();p.arc(w*.49,h*.43,w*(.09+i*.058),-.7,Math.PI*1.45);p.stroke();}
  label('room / 01',w*.12,h*.82,w*.76,h*.048,'#323931');return;
 }
 if(theme==='shindo-house'){
  label('深度 / B1',w*.13,h*.12,w*.74,w*.1);
  line(w*.13,h*.27,w*.87,h*.27);
  label('LISTEN CLOSELY',w*.13,h*.37,w*.74,w*.07);
  label('音楽と、ゆっくり。',w*.13,h*.55,w*.74,w*.061,muted);
  label('PLEASE KEEP VOICES LOW',w*.13,h*.78,w*.74,w*.038,accent);return;
 }
 if(theme==='shindo-menu'){
  label('深度  /  SHINDO',w*.09,h*.04,w*.82,Math.min(w*.095,h*.065));
  label('DRINKS & LISTENING',w*.09,h*.14,w*.82,w*.051,muted);line(w*.09,h*.21,w*.91,h*.21);
  [['ハイボール','HIGHBALL','800'],['生ビール','DRAFT BEER','700'],['ウイスキー','JAPANESE WHISKY','1100'],['珈琲','COFFEE','600']].forEach(([jp,en,price],i)=>{
   const y=h*(.26+i*.145);label(jp,w*.09,y,w*.67,w*.075);label(en,w*.09,y+h*.055,w*.64,w*.038,muted);label(price,w*.76,y+h*.008,w*.15,w*.06,accent);
  });
  line(w*.09,h*.86,w*.91,h*.86);label('音楽と、ゆっくり。',w*.09,h*.89,w*.82,w*.06,muted);return;
 }
 if(theme==='shindo-sessions'||theme==='shindo-poster-b'||theme==='shindo-poster-c'){
  const n=theme==='shindo-sessions'?1:theme==='shindo-poster-b'?2:3;
  label('深度  /  SELECTED SOUND',w*.085,h*.055,w*.83,w*.045);line(w*.085,h*.14,w*.915,h*.14);
  label('LISTENING SESSION',w*.085,h*.17,w*.83,w*.043,muted);
  p.fillStyle=n===2?'#47343b':n===3?'#313c3c':'#27313a';p.fillRect(w*.085,h*.27,w*.83,h*.4);
  contours(w*(n===2?.65:.5),h*.47,w*.48);
  if(n===3)for(let i=0;i<13;i++)line(w*(.15+i*.055),h*.31,w*(.15+i*.055),h*(.38+(i%5)*.05),'#a28d70');
  label(['SUBSURFACE','SLOW FREQUENCIES','AFTER THE LAST TRAIN'][n-1],w*.085,h*.72,w*.83,w*.071);
  label('ELECTRONIC · DUB · AMBIENT',w*.085,h*.81,w*.83,w*.037,muted);
  label(`B1 / SESSION 0${n}`,w*.085,h*.89,w*.83,w*.045,accent);return;
 }
 if(theme.startsWith('shindo-sleeve')){
  const n=theme.endsWith('b')?1:theme.endsWith('c')?2:0;
  p.fillStyle=['#aa9a77','#424b4f','#653f45'][n];p.fillRect(0,0,w,h);
  contours(w*.55,h*.48,w*.5);label(['DEPTH STUDIES','ROOM TONE','NIGHT ARCHIVE'][n],w*.08,h*.77,w*.84,h*.085,'#e1d5bc');label('PRIVATE PRESS / 33 RPM',w*.08,h*.9,w*.84,h*.034,'#d2c6ad');return;
 }
 // The same identity works on the narrow entrance fascia and the listening wall.
 contours(w*.91,h*.48,Math.max(w*.3,h*.63));
 label('深度  /  ELECTRONIC LISTENING BAR',w*.065,h*.105,w*.77,Math.min(h*.105,w*.055),muted);
 label('SHINDO',w*.06,h*.29,w*.79,Math.min(h*.39,w*.17));
 line(w*.065,h*.78,w*.56,h*.78);
 label('TOKYO · B1 / SELECTED SOUND',w*.065,h*.825,w*.85,Math.min(h*.068,w*.035),accent);
}
