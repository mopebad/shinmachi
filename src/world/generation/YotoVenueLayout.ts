/** Authored metres, shared by rendering, player traversal and music portals. No NPC interior graph. */
export interface VenueRect {minX:number;maxX:number;minZ:number;maxZ:number}
export interface VenueSurface extends VenueRect {id:string;y:number}
export interface VenueBox extends VenueRect {id:string;minY:number;maxY:number;material:'wall'|'wood'|'metal'|'tile'|'ceiling';collision:boolean}
const G=.115, floor=G-18*.17;
export const YOTO_VENUE={
 id:'shindo',name:'深度 / SHINDO',groundY:G,floorY:floor,
 frontage:{x:18.14,z:-27.55,width:4.68,height:9.9},
 exteriorReservation:{minX:15.8,maxX:21.2,minZ:-30.35,maxZ:-27.6},
 shaft:{minX:18.6,maxX:20.4,minZ:-32.64,maxZ:-27.5},
 // Cut ground slabs into the retaining-wall thickness, not on their exposed inner faces.
 // Both the near asphalt and far terrain use this opening; the walking shaft is unchanged.
 slabOpening:{minX:18.5,maxX:20.48,minZ:-32.74,maxZ:-27.6},
 room:{minX:15.95,maxX:20.4,minZ:-41.05,maxZ:-32.64},
 npcReservation:{minX:18.45,maxX:20.55,minZ:-39.15,maxZ:-30.35},
 entry:{x:19.5,y:G,z:-27.35},
 source:{x:18.25,y:floor+1.25,z:-40.4},
 soundSystem:{speakers:[{x:16.45,y:floor+1.08,z:-40.59},{x:20.0,y:floor+1.08,z:-40.59}]},
 tenants:[{floor:'B1',name:'深度',detail:'SHINDO · MUSIC BAR',enterable:true},{floor:'1F',name:'夜灯亭',detail:'FOYER / SMALL KITCHEN',enterable:true},{floor:'2F',name:'余白',detail:'LISTENING ROOM · OFFSTAGE',enterable:false},{floor:'3F',name:'音庭',detail:'KARAOKE · OFFSTAGE',enterable:false}],
} as const;
export function inVenueRect(p:{x:number;z:number},r:VenueRect,margin=0){return p.x>=r.minX-margin&&p.x<=r.maxX+margin&&p.z>=r.minZ-margin&&p.z<=r.maxZ+margin;}
/** Preserve the side service gap behind east-facing main-street lots, including alternate seeds. */
export function yotoParcelDepth(x:number,z:number,width:number,depth:number){
 const shaft=YOTO_VENUE.shaft;
 const rearLimit=YOTO_VENUE.frontage.x-YOTO_VENUE.frontage.width/2-.3;
 return x>5&&x<8&&z+width/2+.95>shaft.minZ&&z-width/2-.15<shaft.maxZ?Math.min(depth,rearLimit-x):depth;
}
export function createYotoVenue(){
 const v=YOTO_VENUE,surfaces:VenueSurface[]=[
  {id:'entrance',minX:18.6,maxX:20.4,minZ:-27.6,maxZ:-26.65,y:G},
  {id:'foyer',minX:15.98,maxX:18.45,minZ:-30.22,maxZ:-27.5,y:G},
  {id:'basement-floor',...v.room,y:floor},
 ];
 for(let i=0;i<18;i++)surfaces.push({id:`tread-${i+1}`,minX:18.6,maxX:20.4,minZ:-27.6-(i+1)*.28,maxZ:-27.6-i*.28,y:G-(i+1)*.17});
 const boxes:VenueBox[]=[],box=(id:string,r:VenueRect,minY:number,maxY:number,material:VenueBox['material']='wall',collision=true)=>boxes.push({id,...r,minY,maxY,material,collision});
 // A sealed descending soffit provides 2.64 m of headroom at every tread.
 box('shaft-west',{minX:18.43,maxX:18.6,minZ:-32.64,maxZ:-27.6},floor-.2,2.9);
 box('shaft-east',{minX:20.4,maxX:20.55,minZ:-32.64,maxZ:-27.6},floor-.2,2.9);
 // Conservative side reservations contain the real grips, returns, brackets and wall lamps.
 // These thin envelopes keep the player's body clear while preserving a 1.516 m grip-to-grip aisle.
 box('stair-rail-west',{minX:18.594,maxX:18.742,minZ:-32.662,maxZ:-27.578},floor+.3,G+1.05,'metal');
 box('stair-rail-east',{minX:20.258,maxX:20.406,minZ:-32.662,maxZ:-27.578},floor+.3,G+1.05,'metal');
 for(const s of surfaces.filter(s=>s.id.startsWith('tread')))box('soffit-'+s.id,{minX:18.43,maxX:20.55,minZ:s.minZ,maxZ:s.maxZ},s.y+2.64,2.9,'ceiling');
 box('stair-rear-closure',{minX:18.43,maxX:20.55,minZ:-32.8,maxZ:-32.64},-.42,2.9,'ceiling');
 box('room-west',{minX:15.78,maxX:v.room.minX,minZ:-41.22,maxZ:-32.64},floor-.2,-.3);
 box('room-east',{minX:20.4,maxX:20.55,minZ:-41.22,maxZ:-32.64},floor-.2,-.3);
 box('room-back',{minX:15.78,maxX:20.55,minZ:-41.22,maxZ:-41.05},floor-.2,-.3);
 box('room-entry-return',{minX:15.78,maxX:18.6,minZ:-32.8,maxZ:-32.64},floor-.2,-.3);
 box('ceiling',{minX:15.78,maxX:20.55,minZ:-41.22,maxZ:-32.64},-.42,-.25,'ceiling');
 box('foyer-back',{minX:15.8,maxX:18.43,minZ:-30.4,maxZ:-30.22},G,3.3);
 box('foyer-west',{minX:15.8,maxX:15.98,minZ:-30.22,maxZ:-27.55},G,3.3);
 box('foyer-front-left',{minX:15.98,maxX:16.95,minZ:-27.65,maxZ:-27.52},G,2.65,'wood');
 box('foyer-front-right',{minX:18.0,maxX:18.43,minZ:-27.65,maxZ:-27.52},G,2.65,'wood');
 box('foyer-counter',{minX:16.12,maxX:17.48,minZ:-30.08,maxZ:-29.5},G,G+1.05,'wood');
 // Interior furniture has the same collision boxes as its rendered carcasses.
 box('bar-counter',{minX:17.05,maxX:17.7,minZ:-37.8,maxZ:-33.9},floor,floor+1.02,'wood');
 box('backbar',{minX:16.0,maxX:16.36,minZ:-37.85,maxZ:-33.8},floor,floor+.88,'wood');
 for(const [i,z]of [-34.55,-35.65,-36.75].entries())box('stool-'+i,{minX:18.0,maxX:18.44,minZ:z-.22,maxZ:z+.22},floor,floor+.72,'wood');
 box('listening-booth',{minX:17.15,maxX:19.55,minZ:-40.85,maxZ:-40.12},floor,floor+1.0,'metal');
 box('lounge-bench',{minX:16.02,maxX:16.58,minZ:-40.2,maxZ:-38.5},floor,floor+.82,'wood');
 box('lounge-table',{minX:16.9,maxX:17.45,minZ:-39.6,maxZ:-39.05},floor,floor+.59,'wood');
 box('east-bench',{minX:19.82,maxX:20.33,minZ:-39.25,maxZ:-36.85},floor,floor+.82,'wood');
 for(const x of [16.45,20.0])box('speaker-'+x,{minX:x-.36,maxX:x+.36,minZ:-41.03,maxZ:-40.39},floor,floor+1.45,'metal');
 box('entry-leaf',{minX:20.215,maxX:20.34,minZ:-33.73,maxZ:-32.895},floor,floor+2.31,'wood');
 box('entry-head',{minX:18.5975,maxX:20.4025,minZ:-32.93,maxZ:-32.81},floor+2.31,-.42,'wood');
 box('room-east-lining',{minX:20.23,maxX:20.4,minZ:-41.05,maxZ:-32.8},floor,-.42);
 const journey=[{x:19.5,y:G,z:-26.9},v.entry,...surfaces.filter(s=>s.id.startsWith('tread')).map(s=>({x:19.5,y:s.y,z:(s.minZ+s.maxZ)/2})),{x:19.5,y:floor,z:-33.25},{x:19.5,y:floor,z:-37.65}];
 return{...v,surfaces,boxes,journey};
}
export type YotoVenueSpatial=ReturnType<typeof createYotoVenue>;
/** undefined delegates to the existing city/station; null blocks a drop or invalid step. */
export function venueSupport(v:YotoVenueSpatial,x:number,z:number,previousY:number):number|null|undefined{
 const owned=inVenueRect({x,z},v.exteriorReservation,.01)||inVenueRect({x,z},v.shaft,.01)||inVenueRect({x,z},v.room,.01);
 if(!owned)return previousY<-.2?null:undefined;
 const candidates=v.surfaces.filter(s=>inVenueRect({x,z},s)&&Math.abs(s.y-previousY)<=.205).map(s=>s.y);
 if(candidates.length)return Math.max(...candidates);
 // The basement roof remains ordinary city ground; only the stair shaft is an opening.
 if(previousY>-.1&&!inVenueRect({x,z},v.shaft)&&inVenueRect({x,z},v.room))return undefined;
 return null;
}
export function venueBodyBlocked(v:YotoVenueSpatial,x:number,z:number,y:number,radius=.25){return v.boxes.some(b=>b.collision&&x>b.minX-radius&&x<b.maxX+radius&&z>b.minZ-radius&&z<b.maxZ+radius&&y+1.65>b.minY+.02&&y<b.maxY-.015);}
export function venueOwnsReservation(v:YotoVenueSpatial,b:VenueRect){return [v.exteriorReservation,v.npcReservation].some(r=>r.minX===b.minX&&r.maxX===b.maxX&&r.minZ===b.minZ&&r.maxZ===b.maxZ);}
