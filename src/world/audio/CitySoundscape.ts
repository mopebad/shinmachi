import type * as THREE from 'three';
import type { CitySimulation } from '../simulation/CitySimulation';
import { businessOpen, dayState, districtZone, railServiceOpen, seededRandom } from '../simulation/WorldRules';

interface Voice { gain: GainNode; panner?: PannerNode; filter: BiquadFilterNode; engine?: OscillatorNode }
/** Original, locally synthesized ambience. Nothing plays until a user gesture resumes Web Audio. */
export class CitySoundscape {
  private context?: AudioContext;
  private master?: GainNode;
  private analyser?: AnalyserNode;
  private noise?: AudioBuffer;
  private murmur?: AudioBuffer;
  private readonly voices = new Map<string, Voice>();
  private readonly traffic: Voice[] = [];
  private enabled = true;
  private volume = .42;
  private lastBeep = -1;
  private seconds = 0;
  private audible = false;

  get status(): 'start' | 'on' | 'muted' { return !this.enabled ? 'muted' : this.context?.state === 'running' ? 'on' : 'start'; }
  get diagnostics() {
    const data = new Float32Array(256); this.analyser?.getFloatTimeDomainData(data);
    return { state: this.context?.state ?? 'not-started', enabled: this.enabled, volume: this.volume, voices: this.voices.size + this.traffic.length, audible: this.audible, rms: Math.sqrt(data.reduce((sum, x) => sum + x * x, 0) / data.length) };
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
    const buffer = this.noise = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), samples = buffer.getChannelData(0), rng = seededRandom(5129);
    let brown = 0;
    for (let i = 0; i < samples.length; i++) { brown = (brown + (rng() * 2 - 1) * .025) / 1.025; samples[i] = brown * 3; }
    // Unintelligible syllabic/formant texture, not a recording or generated dialogue.
    this.murmur = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate); const chatter = this.murmur.getChannelData(0), phases = [0, .7, 1.3];
    for (let i = 0; i < chatter.length; i++) {
      const t = i / ctx.sampleRate; let value = 0;
      for (let voice = 0; voice < 3; voice++) {
        const pitch = 105 + voice * 39 + Math.sin(t * 5 + voice) * 14; phases[voice] += pitch / ctx.sampleRate * Math.PI * 2;
        const syllable = Math.max(0, Math.sin(t * (15 + voice * 2) + voice)) ** 1.4 * (.55 + Math.sin(t * 2 + voice) * .4);
        for (let harmonic = 2; harmonic <= 12; harmonic++) { const frequency = pitch * harmonic, formant = Math.exp(-(((frequency - (550 + Math.sin(t * 4 + voice) * 150)) / 220) ** 2)) + .4 * Math.exp(-(((frequency - 1450) / 350) ** 2)); value += Math.sin(phases[voice] * harmonic) * formant * syllable * .06; }
      }
      chatter[i] = value * Math.min(1, t * 10, (4 - t) * 10);
    }
    this.voices.set('city', this.voice(130, 'lowpass'));
    this.voices.set('distant', this.voice(470, 'bandpass'));
    this.voices.set('crowd', this.voice(830, 'bandpass', { x: 1, y: 1.5, z: 29 }));
    this.voices.set('station', this.voice(1100, 'bandpass', { x: 18, y: 2, z: -47 }));
    this.voices.set('restaurantWest', this.voice(600, 'bandpass', { x: -12, y: 1.5, z: -25 }));
    this.voices.set('restaurantEast', this.voice(760, 'bandpass', { x: 16, y: 1.5, z: -25 }));
    this.voices.set('train', this.voice(330, 'lowpass', { x: 0, y: 8, z: -57 }, 105));
    for (const [x, z] of [[-5.7, 36], [5.8, -16], [32.8, 41]]) {
      const v = this.voice(160, 'lowpass', { x, y: 1, z }, 60); v.gain.gain.value = .045; v.panner!.refDistance = 1.2; this.voices.set(`vending:${x}`, v);
    }
    const vent = this.voice(210, 'lowpass', { x: -10, y: 2, z: -24 }, 95); vent.gain.gain.value = .045; vent.panner!.refDistance = 1.5; this.voices.set('vent', vent);
    for (let i = 0; i < 6; i++) this.traffic.push(this.voice(900, 'lowpass', { x: 0, y: .7, z: 0 }, 55));
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
    if (engineHz) { engine = ctx.createOscillator(); engine.type = 'triangle'; engine.frequency.value = engineHz; const trim = ctx.createGain(); trim.gain.value = .13; engine.connect(trim).connect(filter); engine.start(); }
    source.start(); return { gain, panner, filter, engine };
  }
  update(dt: number, hour: number, camera: THREE.Camera, sim: CitySimulation): void {
    const ctx = this.context; if (!ctx || !this.master) return;
    this.seconds += dt; const now = ctx.currentTime, listener = ctx.listener;
    // Camera matrix columns give a stable listener orientation in walk and free-flight modes.
    const e = camera.matrixWorld.elements, p = camera.position;
    listener.positionX.value = p.x; listener.positionY.value = p.y; listener.positionZ.value = p.z;
    listener.forwardX.value = -e[8]; listener.forwardY.value = -e[9]; listener.forwardZ.value = -e[10]; listener.upX.value = e[4]; listener.upY.value = e[5]; listener.upZ.value = e[6];
    const audible = this.enabled && !document.hidden;
    this.master.gain.setTargetAtTime(audible ? this.volume : 0, now, .15); this.audible = audible && ctx.state === 'running';
    if (!audible) return;
    const residential = districtZone(p) === 'residential' ? 1 : 0, night = dayState(hour).night;
    const set = (name: string, value: number) => this.voices.get(name)!.gain.gain.setTargetAtTime(value, now, .3);
    set('city', (.07 - night * .025) * (residential ? .6 : 1));
    set('distant', (.07 + sim.stats.vehicles * .004) * (residential ? .35 : 1));
    const chatter = (.75 + Math.sin(this.seconds * 1.6) * .12 + Math.sin(this.seconds * 2.7) * .1);
    set('crowd', Math.min(.17, sim.stats.pedestrians * .002) * chatter);
    set('station', .11 * (railServiceOpen(hour) ? 1 : .1) * (.8 + Math.sin(this.seconds * .7) * .2));
    for (const name of ['restaurantWest', 'restaurantEast']) set(name, businessOpen('restaurant', hour) ? .12 * chatter * (night ? 1 : .6) : .004);
    const train = this.voices.get('train')!; train.panner!.positionX.value = sim.trainX - 13.5;
    set('train', railServiceOpen(hour) && sim.trainX > -85 && sim.trainX < 125 ? .32 * (.85 + Math.sin(this.seconds * 21) * .15) : 0);
    const nearby = sim.vehicles.filter(c => c.active).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)).slice(0, 6);
    this.traffic.forEach((v, i) => {
      const c = nearby[i]; v.gain.gain.setTargetAtTime(c ? .06 + c.speed * .025 : 0, now, .15);
      if (c) { v.panner!.positionX.value = c.x; v.panner!.positionZ.value = c.z; v.engine!.frequency.setTargetAtTime(42 + c.speed * 11 + (c.kind === 'truck' ? -8 : 12), now, .2); v.filter.frequency.setTargetAtTime(250 + c.speed * 190, now, .2); }
    });
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
