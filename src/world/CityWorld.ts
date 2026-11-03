import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { NeighborhoodGenerator } from './generation/NeighborhoodGenerator';
import { PlayerController, CameraMode } from './controls/PlayerController';
import { CityActivity } from './simulation/CityActivity';
import { District } from './types';
import { CitySoundscape } from './audio/CitySoundscape';
import { BUSINESSES, businessOpen, dayState, districtZone } from './simulation/WorldRules';
import type { Business } from './simulation/WorldRules';
import { CityBackdrop } from './generation/CityBackdrop';
import { StreetReflections } from './effects/StreetReflections';
import { photographicPass } from './effects/PhotographicPass';
import { StreetAtmosphere } from './effects/StreetAtmosphere';

const LOCATIONS = [
  { name: 'Shinmachi-dori', eye: [4.7, 1.82, 43], target: [-1, 5, -25], fov: 60 },
  { name: 'Lantern alley', eye: [-16, 1.82, -25], target: [6, 2.3, -25], fov: 58 },
  { name: 'Station square', eye: [17, 1.82, -39], target: [19, 3.4, -49], fov: 56 },
  { name: 'District overview', eye: [44, 43, 58], target: [0, 7, -10], fov: 60 },
  { name: 'Residential lane', eye: [29.1, 1.82, 43], target: [28.5, 2.5, -14], fov: 58 },
  { name: 'Akane tower avenue', eye: [4.65, 1.82, 36], target: [-7, 25, -214], fov: 48 },
  { name: 'Railway approach', eye: [8.5, 1.82, -38.5], target: [-2, 8.2, -57], fov: 54 },
];

export class CityWorld {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .08, 650);
  readonly renderer: THREE.WebGLRenderer;
  readonly controller: PlayerController;
  readonly activity: CityActivity;
  readonly audio = new CitySoundscape();
  private readonly atmosphere: StreetAtmosphere;
  private readonly backdrop: CityBackdrop;
  private readonly reflections: StreetReflections;
  private readonly finish = photographicPass();
  weather: 'dry' | 'damp' = 'damp';
  reflectionsEnabled = true;
  private readonly district: District;
  private readonly composer: EffectComposer;
  private readonly sun = new THREE.DirectionalLight(0xffedd3, 3);
  private readonly ambient = new THREE.HemisphereLight(0xa3c5dc, 0x645c4c, 1.5);
  private readonly practicals: { light: THREE.PointLight; power: number; business?: Business }[] = [];
  private readonly sky: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private readonly fog = new THREE.FogExp2(0x9caaa9, .008);
  private last = performance.now(); private fps = 60; private location = 0;
  private lightingAccumulator = 0;
  time = 20.5;
  playing = false;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.renderer.info.autoReset = false;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Static district shadows are refreshed when the sun changes, not for every pedestrian step.
    this.renderer.shadowMap.autoUpdate = false;
    container.appendChild(this.renderer.domElement);
    this.scene.fog = this.fog;
    const pmrem = new THREE.PMREMGenerator(this.renderer), room = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(room, .04).texture; this.scene.environmentIntensity = .22;
    room.dispose(); pmrem.dispose();
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -76, right: 76, top: 76, bottom: -76, near: .5, far: 220 });
    this.sun.shadow.bias = -.00025; this.sun.shadow.normalBias = .035;
    this.scene.add(this.sun, this.sun.target, this.ambient);
    this.sky = this.createSky(); this.scene.add(this.sky);
    this.district = new NeighborhoodGenerator(this.readSeed()).generate(); this.scene.add(this.district.group);
    this.backdrop = new CityBackdrop(this.scene);
    this.reflections = new StreetReflections(this.scene);
    // Bounded set of non-shadowed practical lights: pools of light, not a light per sign.
    for (const position of this.district.lamps.filter((_, i) => i % 2 === 0)) this.practical(position, 0xe3eee8, 36, 15);
    this.district.shopfronts.filter(s => Math.abs(s.x) < 9).forEach((s, i) => { if (i % 3 === 0) { const p = new THREE.Vector3(0, 2.3, -.6).applyAxisAngle(THREE.Object3D.DEFAULT_UP, s.rotation).add(new THREE.Vector3(s.x, 0, s.z)); this.practical(p, s.business === 'convenience' ? 0xc5e9d8 : 0xffcc94, 32, 11, s.business); } });
    this.practical(new THREE.Vector3(0, 3, -25), 0xffab5c, 22, 15, 'restaurant');
    for (const x of [-15, -9, 12, 19]) this.practical(new THREE.Vector3(x, 2.7, -25), 0xffbc7b, 19, 9, 'restaurant');
    this.practical(new THREE.Vector3(18, 3.3, -47), 0xe6fff4, 45, 17);
    this.activity = new CityActivity(this.scene, this.district);
    this.atmosphere = new StreetAtmosphere(this.scene, this.district);
    this.controller = new PlayerController(this.camera, this.renderer.domElement, this.district.colliders);
    this.renderer.domElement.addEventListener('pointerdown', () => { if (this.audio.status === 'start') void this.audio.start().catch(() => {}); });
    this.teleport(5);
    const target = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType }); target.samples = 2;
    this.composer = new EffectComposer(this.renderer, target); this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), .25, .5, 1.05)); this.composer.addPass(new OutputPass()); this.composer.addPass(this.finish);
    window.addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); this.composer.setSize(innerWidth, innerHeight); });
    document.addEventListener('visibilitychange', () => { this.last = performance.now(); });
    this.setTime(this.time);
  }
  private readSeed(): number { const value = Number(new URLSearchParams(location.search).get('seed') ?? 8412); return Number.isFinite(value) ? value >>> 0 : 8412; }
  get cameraMode(): CameraMode { return this.controller.mode; }
  get locationIndex(): number { return this.location; }
  get locationName(): string { if (this.location === 5 && this.camera.position.distanceTo(new THREE.Vector3(...LOCATIONS[5].eye)) < 3) return 'Akane tower avenue'; if (this.location === 6 && this.camera.position.z < -36) return 'Railway approach'; return this.camera.position.y > 15 ? 'District overview' : { commercial: 'Shinmachi-dori', alley: 'Lantern alley', station: 'Station square', residential: 'Residential lane' }[districtZone(this.camera.position)]; }
  get stats() { return { fps: Math.round(this.fps), drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, buildings: this.district.stats.buildings, ...this.activity.stats }; }
  setPlaying(value: boolean): void { this.playing = value; }
  teleport(index: number): void {
    this.location = THREE.MathUtils.clamp(index, 0, LOCATIONS.length - 1); const location = LOCATIONS[this.location];
    this.setFov(location.fov);
    this.controller.setMode(this.location === 3 ? 'fly' : 'walk'); this.controller.teleport(new THREE.Vector3(...location.eye), new THREE.Vector3(...location.target));
  }
  setFov(value: number): void { this.camera.fov = THREE.MathUtils.clamp(value, 35, 80); this.camera.updateProjectionMatrix(); }
  setWeather(value: 'dry' | 'damp'): void { this.weather = value; this.reflections.setWetness(value === 'damp' && this.reflectionsEnabled ? .64 : 0); }
  setReflections(value: boolean): void { this.reflectionsEnabled = value; this.setWeather(this.weather); }
  setTime(hour: number): void {
    this.time = ((hour % 24) + 24) % 24;
    const state = dayState(this.time), elevation = state.elevation;
    const day = state.daylight, dusk = state.golden, night = state.night;
    this.sun.position.set(Math.cos((this.time - 6) / 12 * Math.PI) * 90, Math.max(5, elevation * 100), -25);
    this.sun.intensity = day * (1.1 + Math.max(0, elevation) * 2.2);
    this.sun.color.setRGB(1, .94 - dusk * .29, .83 - dusk * .4);
    this.ambient.intensity = .22 + day * 1.65; this.ambient.color.set(day > .5 ? 0xb6d2e5 : 0x73899e);
    this.scene.environmentIntensity = .19 + day * .22;
    this.renderer.toneMappingExposure = .97 + night * .17;
    this.backdrop.update(this.time, night);
    this.fog.color.set(0x111e2d).lerp(new THREE.Color(0xb4c5cf), day).lerp(new THREE.Color(0xc59177), dusk * .3 * day);
    this.fog.density = .0028 + night * .0007;
    const uniforms = this.sky.material.uniforms;
    uniforms.top.value.set(0x071329).lerp(new THREE.Color(0x5784ab), day);
    uniforms.horizon.value.copy(this.fog.color); uniforms.sunDirection.value.copy(this.sun.position).normalize(); uniforms.day.value = day; uniforms.dusk.value = dusk;
    const mat = this.district.materials;
    mat.signs.emissiveIntensity = .06 + night * 1.1; mat.warmWindows.emissiveIntensity = .12 + night * 1.25;
    mat.windows.emissiveIntensity = .005 + night * .012;
    const shopsOpen = this.time > 7 && this.time < 23.5 ? 1 : .28;
    mat.shop.emissiveIntensity = (.12 + night * .85) * shopsOpen;
    mat.lamps.emissiveIntensity = .6 + night * 3;
    mat.lantern.emissiveIntensity = businessOpen('restaurant', this.time) ? .2 + night * 1.2 : .025;
    BUSINESSES.forEach((kind, i) => {
      const open = businessOpen(kind, this.time), scheduled = mat.businesses[kind];
      scheduled.surface.emissiveIntensity = open ? .08 + night * .27 : .005;
      scheduled.light.emissiveIntensity = open ? 1.1 + night * 2 : .015;
      const residentialAwake = this.time < 1 || this.time > 17 ? 1 : this.time < 6 ? .18 : .4;
      scheduled.window.emissiveIntensity = kind === 'residential' ? .05 + night * residentialAwake : open ? .05 + night * .75 : .015;
      (mat.signs.userData.openStates.value as Float32Array)[i] = open ? 1 : .025;
    });
    this.practicals.forEach(({ light, power, business }) => { light.intensity = power * night * (business && !businessOpen(business, this.time) ? .02 : 1); });
    this.renderer.shadowMap.needsUpdate = true;
  }
  private practical(position: THREE.Vector3, color: number, power: number, distance: number, business?: Business): void {
    const light = new THREE.PointLight(color, power, distance, 2); light.position.copy(position); this.scene.add(light); this.practicals.push({ light, power, business });
  }
  private createSky(): THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> {
    const material = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, sunDirection: { value: new THREE.Vector3() }, day: { value: 1 }, dusk: { value: 0 } },
      vertexShader: 'varying vec3 vDirection; void main(){ vDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec3 vDirection; uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDirection; uniform float day; uniform float dusk;
        void main(){vec3 p=normalize(vDirection); float h=max(p.y,0.); vec3 col=mix(horizon,top,pow(h,.55));
        float sun=max(dot(p,sunDirection),0.); col+=vec3(1.,.58,.24)*pow(sun,38.)*dusk*day*.35;
        col+=vec3(1.,.86,.63)*smoothstep(.9994,.9998,sun)*day*2.;
        float star=step(.9992,fract(sin(dot(floor(p.xz*850.),vec2(12.9898,78.233)))*43758.5453));
        col+=star*(1.-day)*smoothstep(.15,.5,h)*.16; gl_FragColor=vec4(col,1.); }` });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 24, 16), material); sky.frustumCulled = false; return sky;
  }
  start(): void {
    const tick = (now: number) => {
      const delta = Math.min((now - this.last) / 1000, .05); this.last = now;
      this.fps = THREE.MathUtils.lerp(this.fps, 1 / Math.max(.001, delta), .03);
      this.controller.update(delta); this.activity.update(delta, this.time, this.camera.position); this.atmosphere.update(delta, this.time, this.camera);
      if (this.playing) { this.time = (this.time + delta * .06) % 24; this.lightingAccumulator += delta; if (this.lightingAccumulator > .2) { this.setTime(this.time); this.lightingAccumulator = 0; } }
      this.reflections.update(this.camera); this.finish.uniforms.seconds.value = now / 1000;
      this.sky.position.copy(this.camera.position); this.camera.updateMatrixWorld(); this.audio.update(delta, this.time, this.camera, this.activity.simulation); this.renderer.info.reset(); this.composer.render(delta); requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
