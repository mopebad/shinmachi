export interface VenueTrack {file:string;title:string;url:string}
const base=import.meta.env.BASE_URL;
const fallback:VenueTrack={file:'edm-detection-mode.mp3',title:'EDM Detection Mode · Kevin MacLeod',url:base+'assets/music/edm-detection-mode.mp3'};

/** One media element stays connected to Web Audio across every playlist change. */
export class ShindoPlayer {
 readonly element=new Audio(fallback.url);
 private tracks:VenueTrack[]=[fallback];
 private index=0;
 private wanted=true;
 private request=0;
 private error:string|null=null;
 private loading=false;
 private savedFile:string|null=null;
 constructor(){
  try{const saved=JSON.parse(localStorage.getItem('shindo-player')??'null');if(saved&&typeof saved.file==='string'){this.savedFile=saved.file;this.wanted=saved.wanted!==false;}}catch{/* Storage can be unavailable in private contexts. */}
  this.element.preload='metadata';this.element.volume=1;
  this.element.addEventListener('ended',()=>{if(this.wanted)void this.skip(1);});
  this.element.addEventListener('error',()=>{this.error=`Cannot decode this track (media error ${this.element.error?.code}). Try MP3, WAV or another track.`;});
  this.element.addEventListener('canplay',()=>{this.error=null;});
  void this.refresh();
 }
 get state(){return{tracks:this.tracks,index:this.index,title:this.tracks[this.index].title,paused:this.element.paused,wanted:this.wanted,loading:this.loading,buffering:this.element.networkState===2&&this.element.readyState<3,error:this.error,time:this.element.currentTime,duration:this.element.duration};}
 async refresh(){
  const request=++this.request;this.loading=true;
  try{
   const response=await fetch(base+'assets/audio/nightlife/shindo/tracks.json',{cache:'no-store'});
   if(!response.ok)throw new Error('Track list unavailable. Run the Vite server or rebuild after adding files.');
   const data:unknown=await response.json();
   if(!data||typeof data!=='object'||!('tracks'in data)||!Array.isArray(data.tracks))throw new Error('Invalid track list');
   const tracks:VenueTrack[]=data.tracks.filter((t:unknown):t is {file:string;title:string}=>!!t&&typeof t==='object'&&'file'in t&&typeof t.file==='string'&&!/[\\/]/.test(t.file)&&/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(t.file)&&'title'in t&&typeof t.title==='string')
    .map(t=>({...t,url:base+'assets/audio/nightlife/shindo/'+encodeURIComponent(t.file)}));
   if(request!==this.request)return;
   const current=this.tracks[this.index].url;this.tracks=tracks.length?tracks:[fallback];
   const match=this.tracks.findIndex(t=>this.savedFile?t.file===this.savedFile:t.url===current);this.index=Math.max(0,match);
   this.error=null;
   if(this.tracks[this.index].url!==current||this.element.error){const wasPlaying=!this.element.paused;this.load();if(wasPlaying&&this.wanted)await this.play();}
  }catch(error){if(request===this.request)this.error=String(error instanceof Error?error.message:error);}
  finally{if(request===this.request)this.loading=false;}
 }
 private remember(){if(this.loading&&this.savedFile&&this.tracks[this.index].url===fallback.url)return;this.savedFile=this.tracks[this.index].file;try{localStorage.setItem('shindo-player',JSON.stringify({file:this.savedFile,wanted:this.wanted}));}catch{/* Playback works without persistence. */}}
 private load(){this.element.pause();this.error=null;this.element.src=this.tracks[this.index].url;this.element.load();this.remember();}
 async select(index:number){
  if(!Number.isInteger(index)||index<0||index>=this.tracks.length)return;
  const wasPlaying=!this.element.paused;if(index!==this.index){this.index=index;this.load();}
  if(wasPlaying&&this.wanted)await this.play();
 }
 async skip(direction:number){const wasPlaying=!this.element.paused||this.element.ended;this.index=(this.index+direction%this.tracks.length+this.tracks.length)%this.tracks.length;this.load();if(wasPlaying&&this.wanted)await this.play();}
 async play(){this.wanted=true;this.remember();try{await this.element.play();this.error=null;}catch(error){this.error=String(error instanceof Error?error.message:error);}}
 pause(){this.wanted=false;this.remember();this.element.pause();}
 async unlock(){if(this.wanted&&this.element.paused)await this.play();}
 async toggle(){if(this.element.paused)await this.play();else this.pause();}
}
