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

const LOCATIONS = [
  { name: 'Shinmachi-dori', eye: [4.7, 1.82, 43], target: [-1, 5, -25] },
  { name: 'Lantern alley', eye: [-16, 1.82, -25], target: [6, 2.3, -25] },
  { name: 'Station square', eye: [17, 1.82, -39], target: [19, 3.2, -50] },
  { name: 'District overview', eye: [44, 43, 58], target: [0, 7, -10] },
];

export class CityWorld {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, .08, 320);
  readonly renderer: THREE.WebGLRenderer;
  readonly controller: PlayerController;
  readonly activity: CityActivity;
  private readonly district: District;
  private readonly composer: EffectComposer;
  private readonly sun = new THREE.DirectionalLight(0xffedd3, 3);
  private readonly ambient = new THREE.HemisphereLight(0xa3c5dc, 0x645c4c, 1.5);
  private readonly practicals: { light: THREE.PointLight; power: number }[] = [];
  private readonly sky: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private readonly fog = new THREE.FogExp2(0x9caaa9, .008);
  private last = performance.now(); private fps = 60; private location = 0;
  private lightingAccumulator = 0;
  time = 17.25;
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
    // Bounded set of non-shadowed practical lights: pools of light, not a light per sign.
    for (const position of this.district.lamps.filter((_, i) => i % 2 === 0)) this.practical(position, 0xffd4a0, 30, 15);
    for (const side of [-1, 1]) for (const z of [-38, -12, 29, 49]) this.practical(new THREE.Vector3(side * 5.5, 2.5, z), side > 0 ? 0xffb969 : 0x80c9d5, 24, 10);
    this.practical(new THREE.Vector3(0, 3, -25), 0xffab5c, 22, 15);
    for (const x of [-15, -9, 12, 19]) this.practical(new THREE.Vector3(x, 2.7, -25), 0xffbc7b, 19, 9);
    this.practical(new THREE.Vector3(18, 3.3, -47), 0xe6fff4, 45, 17);
    this.activity = new CityActivity(this.scene, this.district.doors);
    this.controller = new PlayerController(this.camera, this.renderer.domElement, this.district.colliders);
    this.teleport(0);
    const target = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType }); target.samples = 2;
    this.composer = new EffectComposer(this.renderer, target); this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), .19, .45, 1.25)); this.composer.addPass(new OutputPass());
    window.addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); this.composer.setSize(innerWidth, innerHeight); });
    document.addEventListener('visibilitychange', () => { this.last = performance.now(); });
    this.setTime(this.time);
  }
  private readSeed(): number { const value = Number(new URLSearchParams(location.search).get('seed') ?? 8412); return Number.isFinite(value) ? value >>> 0 : 8412; }
  get cameraMode(): CameraMode { return this.controller.mode; }
  get locationName(): string { return LOCATIONS[this.location].name; }
  get stats() { return { fps: Math.round(this.fps), drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, buildings: this.district.stats.buildings, ...this.activity.stats }; }
  setPlaying(value: boolean): void { this.playing = value; }
  teleport(index: number): void {
    this.location = THREE.MathUtils.clamp(index, 0, LOCATIONS.length - 1); const location = LOCATIONS[this.location];
    this.controller.setMode(index === 3 ? 'fly' : 'walk'); this.controller.teleport(new THREE.Vector3(...location.eye), new THREE.Vector3(...location.target));
  }
  setTime(hour: number): void {
    this.time = ((hour % 24) + 24) % 24;
    const elevation = Math.sin((this.time - 6) / 12 * Math.PI);
    const day = THREE.MathUtils.smoothstep(elevation, -.12, .3), dusk = 1 - THREE.MathUtils.smoothstep(Math.abs(elevation), .04, .42), night = 1 - day;
    this.sun.position.set(Math.cos((this.time - 6) / 12 * Math.PI) * 90, Math.max(5, elevation * 100), -25);
    this.sun.intensity = day * (1.1 + Math.max(0, elevation) * 2.2);
    this.sun.color.setRGB(1, .94 - dusk * .29, .83 - dusk * .4);
    this.ambient.intensity = .34 + day * 1.65; this.ambient.color.set(day > .5 ? 0xb6d2e5 : 0x7b92bd);
    this.scene.environmentIntensity = .13 + day * .22;
    this.fog.color.set(0x101c30).lerp(new THREE.Color(0xb4c5cf), day).lerp(new THREE.Color(0xc59177), dusk * .3 * day);
    this.fog.density = .0065 + night * .003;
    const uniforms = this.sky.material.uniforms;
    uniforms.top.value.set(0x071329).lerp(new THREE.Color(0x5784ab), day);
    uniforms.horizon.value.copy(this.fog.color); uniforms.sunDirection.value.copy(this.sun.position).normalize(); uniforms.day.value = day; uniforms.dusk.value = dusk;
    const mat = this.district.materials;
    mat.signs.emissiveIntensity = .12 + night * .85; mat.warmWindows.emissiveIntensity = .12 + night * 1.25;
    mat.windows.emissiveIntensity = .04 + night * .23;
    const shopsOpen = this.time > 7 && this.time < 23.5 ? 1 : .28;
    mat.shop.emissiveIntensity = (.12 + night * .85) * shopsOpen;
    mat.lamps.emissiveIntensity = .6 + night * 3;
    this.practicals.forEach(({ light, power }) => { light.intensity = power * night; });
    this.renderer.shadowMap.needsUpdate = true;
  }
  private practical(position: THREE.Vector3, color: number, power: number, distance: number): void {
    const light = new THREE.PointLight(color, power, distance, 2); light.position.copy(position); this.scene.add(light); this.practicals.push({ light, power });
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
    const sky = new THREE.Mesh(new THREE.SphereGeometry(260, 24, 16), material); sky.frustumCulled = false; return sky;
  }
  start(): void {
    const tick = (now: number) => {
      const delta = Math.min((now - this.last) / 1000, .05); this.last = now;
      this.fps = THREE.MathUtils.lerp(this.fps, 1 / Math.max(.001, delta), .03);
      this.controller.update(delta); this.activity.update(delta, this.time);
      if (this.playing) { this.time = (this.time + delta * .06) % 24; this.lightingAccumulator += delta; if (this.lightingAccumulator > .2) { this.setTime(this.time); this.lightingAccumulator = 0; } }
      this.sky.position.copy(this.camera.position); this.renderer.info.reset(); this.composer.render(delta); requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
