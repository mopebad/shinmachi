import {venueMusicMix} from './VenueMusicMix';
import {ShindoPlayer} from './ShindoPlayer';
import {shindoImpulse,shindoRoom,unit} from './ShindoAcoustics';
import {YOTO_VENUE} from '../generation/YotoVenueLayout';
interface MusicVoice {kind:'shindo'|'jazz';element:HTMLAudioElement;filter:BiquadFilterNode;inside:GainNode;outside:GainNode;panner:PannerNode;mix:ReturnType<typeof venueMusicMix>;starts:number;error?:string;speakers?:GainNode[];speakerPanners?:PannerNode[];wet?:GainNode}
/** Local recorded stereo music. Streaming avoids allocating two long decoded PCM tracks. */
export class VenueMusic {
 private readonly voices:MusicVoice[]=[];
 private meter?:AnalyserNode;
 private readonly samples=new Float32Array(256);
 private readonly frequencies=new Uint8Array(128);
 private lastMeter=0;
 readonly levels={rms:0,bands:[0,0,0]};
 constructor(private readonly context:AudioContext,master:GainNode,private readonly player:ShindoPlayer,private readonly speakerAt?:(i:number)=>{x:number;y:number;z:number}|undefined){
  for(const [kind,file]of [['shindo','edm-detection-mode.mp3'],['jazz','backbay-lounge.mp3']] as const){
   const element=kind==='shindo'?player.element:new Audio(`${import.meta.env.BASE_URL}assets/music/${file}`);element.loop=kind==='jazz';element.preload='auto';
   const source=context.createMediaElementSource(element),filter=context.createBiquadFilter(),inside=context.createGain(),outside=context.createGain(),panner=context.createPanner();
   filter.type='lowpass';filter.frequency.value=320;filter.Q.value=.35;inside.gain.value=outside.gain.value=0;
   panner.panningModel='HRTF';panner.rolloffFactor=0; // The shared acoustic contract owns attenuation.
   source.connect(filter);filter.connect(outside).connect(panner).connect(master);
   const voice:MusicVoice={kind,element,filter,inside,outside,panner,mix:venueMusicMix({x:0,y:1.8,z:0},kind,21),starts:0};
   if(kind==='shindo'){
    this.meter=context.createAnalyser();this.meter.fftSize=256;this.meter.smoothingTimeConstant=.8;source.connect(this.meter);
    const bass=context.createBiquadFilter(),air=context.createBiquadFilter();bass.type='lowshelf';bass.frequency.value=145;bass.gain.value=1.2;air.type='highshelf';air.frequency.value=6000;air.gain.value=-1.3;
    filter.connect(bass).connect(air);air.connect(inside).connect(master);
    const split=context.createChannelSplitter(2);air.connect(split);voice.speakerPanners=[];voice.speakers=YOTO_VENUE.soundSystem.speakers.map((point,i)=>{
     const gain=context.createGain(),speaker=context.createPanner();gain.gain.value=0;speaker.panningModel='HRTF';speaker.rolloffFactor=0;
     speaker.positionX.value=point.x;speaker.positionY.value=point.y;speaker.positionZ.value=point.z;voice.speakerPanners!.push(speaker);split.connect(gain,i);gain.connect(speaker).connect(master);return gain;
    });
    const reflections=context.createConvolver(),highpass=context.createBiquadFilter(),damping=context.createBiquadFilter();
    const channels=shindoImpulse(context.sampleRate),impulse=context.createBuffer(2,channels[0].length,context.sampleRate);channels.forEach((data,i)=>impulse.copyToChannel(data,i));reflections.buffer=impulse;
    highpass.type='highpass';highpass.frequency.value=210;damping.type='lowpass';damping.frequency.value=3600;
    voice.wet=context.createGain();voice.wet.gain.value=0;air.connect(highpass).connect(damping).connect(reflections).connect(voice.wet).connect(master);
   }else filter.connect(inside).connect(master);
   element.addEventListener('canplay',()=>{voice.error=undefined;});
   element.addEventListener('error',()=>{voice.error='Media load/decode error '+element.error?.code;});this.voices.push(voice);
  }
 }
 async unlock(){await Promise.all(this.voices.map(async v=>{if(!v.element.paused)return;try{if(v.kind==='shindo')await this.player.unlock();else await v.element.play();if(!v.element.paused)v.starts++;v.error=undefined;}catch(error){v.error=String(error);}}));}
 update(p:{x:number;y:number;z:number},hour:number){const now=this.context.currentTime;for(const v of this.voices){
  const mix=v.mix=venueMusicMix(p,v.kind,hour),room=shindoRoom(p),speakerBlend=room.room?room.blend:0;
  v.inside.gain.setTargetAtTime(mix.inside*(1-speakerBlend*.32),now,.22);
  v.speakers?.forEach((gain,i)=>{const s=this.speakerAt?.(i)??YOTO_VENUE.soundSystem.speakers[i],distance=Math.hypot(p.x-s.x,p.y-s.y,p.z-s.z);gain.gain.setTargetAtTime(mix.inside*speakerBlend*.16/(1+(distance/7)**2),now,.22);const speaker=v.speakerPanners?.[i];if(speaker){speaker.positionX.value=s.x;speaker.positionY.value=s.y;speaker.positionZ.value=s.z;}});
  v.wet?.gain.setTargetAtTime(mix.inside*speakerBlend*.085,now,.3);
  v.outside.gain.setTargetAtTime(mix.outside,now,.22);v.filter.frequency.setTargetAtTime(mix.cutoff,now,.2);v.panner.positionX.value=mix.portal.x;v.panner.positionY.value=mix.portal.y;v.panner.positionZ.value=mix.portal.z;
 }
 if(this.meter&&now-this.lastMeter>.045){
  this.lastMeter=now;this.meter.getFloatTimeDomainData(this.samples);this.meter.getByteFrequencyData(this.frequencies);
  this.levels.rms=unit(Math.sqrt(this.samples.reduce((a,b)=>a+b*b,0)/this.samples.length)*4);
  this.levels.bands=[[1,5],[5,18],[18,48]].map(([a,b])=>unit(this.frequencies.slice(a,b).reduce((s,v)=>s+v,0)/((b-a)*255)));
 }}
 get diagnostics(){return this.voices.map(v=>({kind:v.kind,readyState:v.element.readyState,paused:v.element.paused,time:v.element.currentTime,duration:v.element.duration,starts:v.starts,error:v.error??null,mix:v.mix,gainInside:v.inside.gain.value+(v.speakers??[]).reduce((n,g)=>n+g.gain.value,0),speakerGains:v.speakers?.map(g=>g.gain.value),roomReflections:v.wet?.gain.value??0,levels:v.kind==='shindo'?this.levels:undefined,gainOutside:v.outside.gain.value,cutoff:v.filter.frequency.value}));}
}
