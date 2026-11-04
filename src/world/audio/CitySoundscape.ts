import type * as THREE from 'three';
import type { CitySimulation } from '../simulation/CitySimulation';
import { trafficVoiceMix } from './AudioMix';
import { businessOpen, dayState, districtZone, railServiceOpen, seededRandom } from '../simulation/WorldRules';

interface Voice { gain: GainNode; panner?: PannerNode; filter: BiquadFilterNode; engine?: OscillatorNode; engineGain?: GainNode; source?: AudioBufferSourceNode; vehicleId?: number;engineClass?:string;tickGain?:GainNode;indicatorEdge?:number }
interface FootVoice {gain:GainNode;panner:PannerNode;filter:BiquadFilterNode;until:number}
/** Original, locally synthesized ambience. Nothing plays until a user gesture resumes Web Audio. */
export class CitySoundscape {
  private context?: AudioContext;
  private master?: GainNode;
  private analyser?: AnalyserNode;
  private noise?: AudioBuffer;
  private roadNoise?: AudioBuffer;
  private murmur?: AudioBuffer;
  private readonly voices = new Map<string, Voice>();
  private readonly traffic: Voice[] = [];
  private readonly feet:FootVoice[]=[];
  private footBuffer?:AudioBuffer;
  private readonly footsteps=new Map<number,number>();
  private readonly waves=new Map<string,PeriodicWave>();
  private recording?:MediaStreamAudioDestinationNode;
  private footEvents=0;private indicatorEvents=0;
  private sources:{kind:string;x:number;z:number;gain:number}[]=[];
  private enabled = true;
  private volume = .3;
  private lastBeep = -1;
  private seconds = 0;
  private audible = false;

  get status(): 'start' | 'on' | 'muted' { return !this.enabled ? 'muted' : this.context?.state === 'running' ? 'on' : 'start'; }
  /** Own synthesized output only: never requests microphone permission. */
  get recordingStream():MediaStream|undefined{return this.recording?.stream;}
  get diagnostics() {
    const data = new Float32Array(256); this.analyser?.getFloatTimeDomainData(data);
    return { state: this.context?.state ?? 'not-started', enabled: this.enabled, volume: this.volume, voices: this.voices.size + this.traffic.length+this.feet.length, footEvents:this.footEvents,indicatorEvents:this.indicatorEvents,sources:this.sources, trafficAssignments: this.traffic.map(v => v.vehicleId ?? null), trafficGain: this.traffic.reduce((total, v) => total + v.gain.gain.value + (v.engineGain?.gain.value ?? 0), 0), audible: this.audible, rms: Math.sqrt(data.reduce((sum, x) => sum + x * x, 0) / data.length) };
  }
  async start(): Promise<void> {
    this.enabled = true;
    if (!this.context) this.initialize();
    await this.context!.resume();
  }
  toggle(): void { if (this.enabled && this.context?.state === 'running') this.enabled = false; else void this.start().catch(() => { this.enabled = false; }); }
  setVolume(value: number): void { this.volume = Math.max(0, Math.min(1, value)); }

  private initialize(): void {
    const ctx = this.context = new AudioContext(), master = this.master = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor(); compressor.threshold.value = -17; compressor.knee.value = 12; compressor.ratio.value = 3;
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 256;
    master.gain.value = 0; master.connect(compressor).connect(this.analyser).connect(ctx.destination);
    this.recording=ctx.createMediaStreamDestination();this.analyser.connect(this.recording);
    for(const [kind,harmonics] of Object.entries({kei:[0,1,.35,.18,.12,.04],diesel:[0,1,.48,.22,.18,.1],hybrid:[0,1,.025,.01],ordinary:[0,1,.22,.12,.05],refined:[0,1,.12,.025,.01],sport:[0,1,.38,.22,.12,.06]}))this.waves.set(kind,ctx.createPeriodicWave(new Float32Array(harmonics.length),new Float32Array(harmonics)));
    const buffer = this.noise = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), samples = buffer.getChannelData(0), rng = seededRandom(5129);
    let brown = 0;
    for (let i = 0; i < samples.length; i++) { brown = (brown + (rng() * 2 - 1) * .025) / 1.025; samples[i] = brown * 3; }
    this.roadNoise = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const road = this.roadNoise.getChannelData(0); let softened = 0;
    for (let i = 0; i < road.length; i++) { const white = rng() * 2 - 1; softened = softened * .82 + white * .18; road[i] = white * .24 + softened * .4; }
    // Unintelligible syllabic/formant texture, not a recording or generated dialogue.
    this.murmur = ctx.createBuffer(1, ctx.sampleRate * 11, ctx.sampleRate); const chatter = this.murmur.getChannelData(0), phases = [0, .7, 1.3];
    for (let i = 0; i < chatter.length; i++) {
      const t = i / ctx.sampleRate; let value = 0;
      for (let voice = 0; voice < 3; voice++) {
        const pitch = 105 + voice * 39 + Math.sin(t * 5 + voice) * 14; phases[voice] += pitch / ctx.sampleRate * Math.PI * 2;
        const syllable = Math.max(0, Math.sin(t * (15 + voice * 2) + voice)) ** 1.4 * (.55 + Math.sin(t * 2 + voice) * .4);
        for (let harmonic = 2; harmonic <= 12; harmonic++) { const frequency = pitch * harmonic, formant = Math.exp(-(((frequency - (550 + Math.sin(t * 4 + voice) * 150)) / 220) ** 2)) + .4 * Math.exp(-(((frequency - 1450) / 350) ** 2)); value += Math.sin(phases[voice] * harmonic) * formant * syllable * .06; }
      }
      chatter[i] = value * Math.min(1, t * 10, (11 - t) * 10);
    }
    this.voices.set('city', this.voice(130, 'lowpass'));
    this.voices.set('distant', this.voice(470, 'bandpass'));
    this.voices.set('crowd', this.voice(830, 'bandpass', { x: 1, y: 1.5, z: 29 }));
    this.voices.set('station', this.voice(1100, 'bandpass', { x: 18, y: 2, z: -47 }));
    this.voices.set('restaurantWest', this.voice(600, 'bandpass', { x: -12, y: 1.5, z: -25 }));
    this.voices.set('restaurantEast', this.voice(760, 'bandpass', { x: 16, y: 1.5, z: -25 }));
    this.voices.set('train', this.voice(330, 'lowpass', { x: 0, y: 8, z: -57 }, 105));
    for (const [x, z] of [[-5.7, 36], [5.8, -16], [32.8, 41]]) {
      const v = this.voice(160, 'lowpass', { x, y: 1, z }, 60); v.gain.gain.value = .012; v.panner!.refDistance = 1.2; this.voices.set(`vending:${x}`, v);
    }
    const vent = this.voice(210, 'lowpass', { x: -10, y: 2, z: -24 }, 95); vent.gain.gain.value = .012; vent.panner!.refDistance = 1.5; this.voices.set('vent', vent);
    for (let i = 0; i < 4; i++) this.traffic.push(this.trafficVoice(i));
    this.footBuffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.085),ctx.sampleRate);
    const impact=this.footBuffer.getChannelData(0);
    for(let i=0;i<impact.length;i++){const t=i/ctx.sampleRate;impact[i]=((rng()*2-1)*.45+Math.sin(t*610)*.3)*Math.exp(-t*65)*Math.min(1,t*1600);}
    for(let i=0;i<8;i++){
      const gain=ctx.createGain(),filter=ctx.createBiquadFilter(),panner=ctx.createPanner();filter.type='lowpass';gain.gain.value=0;
      panner.panningModel='HRTF';panner.refDistance=2;panner.rolloffFactor=1.5;
      filter.connect(gain).connect(panner).connect(master);this.feet.push({gain,filter,panner,until:0});
    }
  }
  private voice(frequency: number, type: BiquadFilterType, point?: { x: number; y: number; z: number }, engineHz?: number): Voice {
    const ctx = this.context!, source = ctx.createBufferSource(); source.buffer = type === 'bandpass' && frequency >= 600 ? this.murmur! : this.noise!; source.loop = true; source.playbackRate.value = .8 + this.voices.size * .023;
    const filter = ctx.createBiquadFilter(); filter.type = type; filter.frequency.value = frequency; filter.Q.value = type === 'bandpass' ? .6 : .5;
    const gain = ctx.createGain(); gain.gain.value = 0; source.connect(filter).connect(gain);
    let panner: PannerNode | undefined;
    if (point) {
      panner = ctx.createPanner(); panner.panningModel = 'HRTF'; panner.distanceModel = 'inverse'; panner.refDistance = 4; panner.maxDistance = 100; panner.rolloffFactor = 1.5;
      panner.positionX.value = point.x; panner.positionY.value = point.y; panner.positionZ.value = point.z; gain.connect(panner).connect(this.master!);
    } else gain.connect(this.master!);
    let engine: OscillatorNode | undefined;
    if (engineHz) { engine = ctx.createOscillator(); engine.type = 'sine'; engine.frequency.value = engineHz; const trim = ctx.createGain(); trim.gain.value = .035; engine.connect(trim).connect(filter); engine.start(); }
    source.start(0, (this.voices.size * .317) % 3.8); return { gain, panner, filter, engine, source };
  }
  private trafficVoice(index: number): Voice {
    const ctx = this.context!, source = ctx.createBufferSource(); source.buffer = this.roadNoise!; source.loop = true;
    const highpass = ctx.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 600; highpass.Q.value = .5;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1600; filter.Q.value = .4;
    const gain = ctx.createGain(), engineGain = ctx.createGain(), panner = ctx.createPanner(); gain.gain.value = engineGain.gain.value = 0;
    panner.panningModel = 'HRTF'; panner.rolloffFactor = 0; panner.positionY.value = .7;
    source.connect(highpass).connect(filter).connect(gain).connect(panner).connect(this.master!);
    const engine = ctx.createOscillator(); engine.setPeriodicWave(ctx.createPeriodicWave(new Float32Array(5), new Float32Array([0, 1, .18, .07, .03]))); engine.frequency.value = 44 + index * 2;
    engine.connect(engineGain).connect(panner); engine.start(); source.start(0, index * .791);
    const tick=ctx.createOscillator(),tickGain=ctx.createGain();tick.type='triangle';tick.frequency.value=1250;tickGain.gain.value=0;tick.connect(tickGain).connect(panner);tick.start();
    return { gain, engineGain, panner, engine, filter, source,tickGain };
  }
  update(dt: number, hour: number, camera: THREE.Camera, sim: CitySimulation): void {
    const ctx = this.context; if (!ctx || !this.master) return;
    this.seconds = sim.clock; const now = ctx.currentTime, listener = ctx.listener;
    // Camera matrix columns give a stable listener orientation in walk and free-flight modes.
    const e = camera.matrixWorld.elements, p = camera.position;
    listener.positionX.value = p.x; listener.positionY.value = p.y; listener.positionZ.value = p.z;
    listener.forwardX.value = -e[8]; listener.forwardY.value = -e[9]; listener.forwardZ.value = -e[10]; listener.upX.value = e[4]; listener.upY.value = e[5]; listener.upZ.value = e[6];
    const audible = this.enabled && !document.hidden;
    this.master.gain.setTargetAtTime(audible ? this.volume : 0, now, .15); this.audible = audible && ctx.state === 'running';
    if (!audible) return;
    this.sources=[];
    const residential = districtZone(p) === 'residential' ? 1 : 0, night = dayState(hour).night;
    const set = (name: string, value: number) => this.voices.get(name)!.gain.gain.setTargetAtTime(value, now, .3);
    set('city', (.022 - night * .008) * (residential ? .6 : 1));
    set('distant', .018 * (residential ? .35 : 1));
    const chatter = (.75 + Math.sin(this.seconds * 1.6) * .12 + Math.sin(this.seconds * 2.7) * .1);
    const crowd=sim.pedestrians.filter(q=>q.active&&!q.rail&&Math.hypot(q.x-p.x,q.z-p.z)<20);
    const conversations=crowd.filter(q=>q.activity?.state==='acting'&&q.activity.kind==='conversation');
    const hub=conversations[0]??crowd[0],crowdVoice=this.voices.get('crowd')!;
    if(hub){crowdVoice.panner!.positionX.setTargetAtTime(hub.x,now,.3);crowdVoice.panner!.positionZ.setTargetAtTime(hub.z,now,.3);}
    set('crowd', Math.min(.055,crowd.length*.003+conversations.length*.009)*chatter);
    set('station', .045 * (railServiceOpen(hour) ? 1 : .1) * (.8 + Math.sin(this.seconds * .7) * .2));
    const restaurants=sim.navigation.nodes.filter(n=>n.door?.business==='restaurant'&&businessOpen('restaurant',hour)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)).slice(0,2);
    for(const [i,name] of ['restaurantWest','restaurantEast'].entries()){
      const door=restaurants[i],v=this.voices.get(name)!;
      const count=door?sim.pedestrians.filter(q=>q.active&&!q.rail&&Math.hypot(q.x-door.x,q.z-door.z)<4).length:0;
      const gain=door?Math.min(.045,.012+count*.008)*chatter*(night?1:.6):0;
      if(door){v.panner!.positionX.setTargetAtTime(door.x,now,.3);v.panner!.positionZ.setTargetAtTime(door.z,now,.3);this.sources.push({kind:'restaurant',x:door.x,z:door.z,gain});}set(name,gain);
    }
    const train = this.voices.get('train')!; train.panner!.positionX.value = sim.trainX;
    set('train', sim.train.snapshot.active && sim.trainX > -85 && sim.trainX < 125 ? .13 * Math.min(1, sim.train.snapshot.speed / sim.train.config.cruiseSpeed) * (.85 + Math.sin(this.seconds * 21) * .15) : 0);
    // Stable IDs keep a passing car attached to its own voice instead of jumping on every sort.
    const nearby = sim.vehicles.filter(c => c.active && Math.hypot(c.x - p.x, c.z - p.z) < 32).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
    const assigned = new Set(this.traffic.map(v => v.vehicleId));
    for (const v of this.traffic) {
      let car = nearby.find(c => c.spawn === v.vehicleId);
      if (!car && v.vehicleId !== undefined) {
        v.gain.gain.setTargetAtTime(0, now, .09); v.engineGain!.gain.setTargetAtTime(0, now, .09);
        if (v.gain.gain.value + v.engineGain!.gain.value < .0001) { assigned.delete(v.vehicleId); v.vehicleId = undefined; }
        else continue;
      }
      if (!car) { car = nearby.find(c => !assigned.has(c.spawn)); if (car) { v.vehicleId = car.spawn;v.indicatorEdge=car.lights.edges;assigned.add(car.spawn); } }
      const mix = trafficVoiceMix(car?.kind ?? 'compact', car?.speed ?? 0, car ? Math.hypot(car.x - p.x, car.z - p.z) : Infinity,car?.acceleration??0,sim.wet);
      if(car){
        if(v.engineClass!==car.driver.engine){v.engine!.setPeriodicWave(this.waves.get(car.driver.engine)!);v.engineClass=car.driver.engine;}
        if(v.indicatorEdge!==car.lights.edges){v.indicatorEdge=car.lights.edges;this.indicatorEvents++;v.tickGain!.gain.cancelScheduledValues(now);v.tickGain!.gain.setValueAtTime(.0015/(1+Math.hypot(car.x-p.x,car.z-p.z)**2/9),now);v.tickGain!.gain.exponentialRampToValueAtTime(.000001,now+.035);}
        this.sources.push({kind:car.driver.engine,x:car.x,z:car.z,gain:mix.engineGain+mix.tireGain});
      }
      v.gain.gain.setTargetAtTime(mix.tireGain, now, .12); v.engineGain!.gain.setTargetAtTime(mix.engineGain, now, .12);
      if (car) { v.panner!.positionX.setTargetAtTime(car.x, now, .04); v.panner!.positionZ.setTargetAtTime(car.z, now, .04); v.engine!.frequency.setTargetAtTime(mix.engineHz + car.id % 5, now, .18); v.filter.frequency.setTargetAtTime(mix.tireLowpassHz, now, .18); v.source!.playbackRate.setTargetAtTime(mix.playbackRate + car.id % 7 * .013, now, .18); }
    }
    const alive=new Set(sim.pedestrians.filter(q=>q.active).map(q=>q.identity.uid));for(const uid of this.footsteps.keys())if(!alive.has(uid))this.footsteps.delete(uid);
    for(const person of sim.pedestrians.filter(q=>q.active)){
      const steps=person.motion.footfalls,previous=this.footsteps.get(person.identity.uid);this.footsteps.set(person.identity.uid,steps);
      if(previous===undefined||steps===previous||person.motion.speed<.05||person.rail?.state==='riding'||Math.hypot(person.x-p.x,person.z-p.z)>15)continue;
      const voice=this.feet.find(f=>f.until<now);if(!voice)continue;voice.until=now+.13;
      voice.panner.positionX.value=person.x;voice.panner.positionY.value=person.y+.06;voice.panner.positionZ.value=person.z;
      voice.filter.frequency.value=person.station?.flight?1600:sim.wet?2300:person.identity.appearance.shoe===0?1300:900;
      voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setValueAtTime(.018,now);voice.gain.gain.exponentialRampToValueAtTime(.00001,now+.12);
      const source=ctx.createBufferSource();source.buffer=this.footBuffer!;source.playbackRate.value=.90+person.identity.appearance.shoe*.13;source.connect(voice.filter);source.start();source.onended=()=>source.disconnect();this.footEvents++;
      this.sources.push({kind:'footstep',x:person.x,z:person.z,gain:.018});
    }
    const tick = Math.floor(sim.clock / .9);
    if (sim.signals.walk && tick !== this.lastBeep) { this.lastBeep = tick; this.beep(now, tick % 2 ? 7.8 : -4.55, tick % 2 ? 12 : 21.4); }
  }
  private beep(now: number, x: number, z: number): void {
    const ctx = this.context!, oscillator = ctx.createOscillator(), gain = ctx.createGain(), panner = ctx.createPanner();
    panner.panningModel = 'HRTF'; panner.refDistance = 2; panner.rolloffFactor = 1.6; panner.positionX.value = x; panner.positionY.value = 2.4; panner.positionZ.value = z;
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(1650, now); oscillator.frequency.exponentialRampToValueAtTime(1050, now + .12); oscillator.frequency.setValueAtTime(1500, now + .16); oscillator.frequency.exponentialRampToValueAtTime(1100, now + .28);
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.055, now + .02); gain.gain.linearRampToValueAtTime(0, now + .14); gain.gain.linearRampToValueAtTime(.04, now + .18); gain.gain.linearRampToValueAtTime(0, now + .3);
    oscillator.connect(gain).connect(panner).connect(this.master!); oscillator.start(now); oscillator.stop(now + .32); oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); panner.disconnect(); };
  }
}
