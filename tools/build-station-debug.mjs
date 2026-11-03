import { writeFile } from 'node:fs/promises';
import { createStationLayout, STATION } from '../src/world/generation/StationLayout.ts';
const s=createStationLayout(), out=[];
const text=(x,y,label,size=17,color='#d8e7e4')=>out.push('<text x="'+x+'" y="'+y+'" font-size="'+size+'" fill="'+color+'">'+label+'</text>');
const colors={concourse:'#437565',landing:'#c99449',tread:'#dcac65',platform:'#467e9a'};
out.push('<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1130" viewBox="0 0 1500 1130"><rect width="1500" height="1130" fill="#111f29"/><g font-family="Arial,sans-serif">');
text(45,50,'SHINMACHI / STATION SPATIAL CONTRACT',27);text(45,80,'Metres. Derived directly from StationLayout.ts. Single existing track retained; no passenger AI or boarding.',17);
function plan(ox,oy,scale,upper){
  const X=x=>ox+(x-8)*scale,Z=z=>oy+(z+55.5)*scale;
  for(const r of s.surfaces.filter(r=>r.kind==='landing'||(upper?r.kind==='platform':r.kind==='concourse')))out.push('<rect x="'+X(r.minX)+'" y="'+Z(r.minZ)+'" width="'+(r.maxX-r.minX)*scale+'" height="'+(r.maxZ-r.minZ)*scale+'" fill="'+colors[r.kind]+'" stroke="#91b3b5" stroke-width="1"/>');
  for(const f of s.flights)for(const t of f.treads)out.push('<rect x="'+X(t.minX)+'" y="'+Z(t.minZ)+'" width="'+(t.maxX-t.minX)*scale+'" height="'+(t.maxZ-t.minZ)*scale+'" fill="'+(f.id.startsWith('lower')?'#dfb46c':'#e58060')+'" stroke="#1e3440" stroke-width=".8"/>');
  for(const b of s.boxes.filter(b=>b.collision&&(upper?b.maxY>STATION.platformY&&b.minY<STATION.platformY+1.65:b.minY<.3&&b.minX<26)))out.push('<rect x="'+X(b.minX)+'" y="'+Z(b.minZ)+'" width="'+Math.max(1,(b.maxX-b.minX)*scale)+'" height="'+Math.max(1,(b.maxZ-b.minZ)*scale)+'" fill="#c5d0cf" opacity=".8"/>');
  const path=(upper?s.journey.filter(p=>p.y>=STATION.platformY-.001):s.journey.filter(p=>p.x>9&&p.y<=STATION.groundY+.001)).map(p=>X(p.x)+','+Z(p.z)).join(' ');
  out.push('<polyline points="'+path+'" fill="none" stroke="#ffe98f" stroke-width="3"/>');
  for(const [id,p]of Object.entries(s.nodes).filter(([id])=>upper?['upperLanding','waiting'].includes(id):['entrance','concourse','gate','stairFoot','returnA'].includes(id))){out.push('<circle cx="'+X(p.x)+'" cy="'+Z(p.z)+'" r="4" fill="#fff4af"/>');text(X(p.x)+7,Z(p.z)-8,id,13,'#fff4af');}
  return {X,Z};
}
text(45,130,'GROUND CONCOURSE / gates on left, ticketing on right',22);
plan(45,150,28,false);text(700,185,'PASSENGER SEQUENCE',20);
['Street + forecourt','Entrance / unpaid concourse','Fare gates: 1.05m wide lane + two 0.90m lanes','Paid circulation / lower landing','10 + 11 risers, with a 1.50m rest landing','Return, then 11 + 10 risers and another rest','Upper landing / platform waiting areas'].forEach((t,i)=>text(700,225+i*29,(i+1)+'. '+t,17));
text(45,435,'PLATFORM PLAN / 53.5m long, 7.80m deep; stair opening left clear',22);
const top=plan(45,462,26,true);
out.push('<line x1="45" y1="447" x2="1436" y2="447" stroke="#91a9b7" stroke-width="3"/>');text(1110,428,'Existing track centre z = -57',15);
text(80,702,'Blue: platform decks. Orange/red: parallel stair flights. Grey: physical guards/columns. Yellow: connected journey.',16);
text(45,760,'STAIR SECTION / flights on parallel Z lanes, linked by a 2.0m return landing',22);
const X=x=>55+(x-8)*47,Y=y=>1070-y*24;
out.push('<line x1="50" y1="'+Y(STATION.groundY)+'" x2="910" y2="'+Y(STATION.groundY)+'" stroke="#78918d" stroke-width="2"/>');
for(const f of s.flights){const points=[];points.push(X(f.from.x)+','+Y(f.from.y));for(const t of f.treads){const a=f.to.x>f.from.x?t.minX:t.maxX,b=f.to.x>f.from.x?t.maxX:t.minX;points.push(X(a)+','+Y(t.y),X(b)+','+Y(t.y));}out.push('<polyline points="'+points.join(' ')+'" fill="none" stroke="'+(f.id.startsWith('lower')?'#dfb46c':'#e58060')+'" stroke-width="5"/>');}
for(const [a,b,y]of [[13.2,15.2,STATION.platformY],...s.surfaces.filter(r=>r.kind==='landing'&&r.y>1).map(r=>[r.minX,r.maxX,r.y])])out.push('<line x1="'+X(a)+'" y1="'+Y(y)+'" x2="'+X(b)+'" y2="'+Y(y)+'" stroke="#72b9d1" stroke-width="8"/>');
text(960,820,'Platform / door sill: y = 7.455m',19);text(960,858,'Return landing: y = 3.785m',19);text(960,896,'Concourse: y = 0.115m',19);text(960,934,'42 equal risers: 174.76mm',19);text(960,972,'Tread going: 310mm',19);text(960,1010,'Flight width: 1.80m',19);text(45,1110,'Source-derived debug projection. Orange/red flights occupy parallel lanes; elevations match the rendered geometry.',15);
out.push('</g></svg>');
await writeFile('quality/station1-layout.svg',out.join('\n'));
await writeFile('quality/station1-spatial.json',JSON.stringify(s,null,2)+'\n');
console.log('Saved station layout SVG and spatial contract JSON.');
