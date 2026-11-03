import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

/** One bounded planar scene reflection, masked to irregular patches on road surfaces. */
export class StreetReflections {
  readonly surface: Reflector;
  private readonly material: THREE.ShaderMaterial;
  constructor(scene: THREE.Scene) {
    const shader = {
      uniforms: { color: { value: new THREE.Color() }, tDiffuse: { value: null }, textureMatrix: { value: new THREE.Matrix4() }, wetness: { value: .64 }, eye: { value: new THREE.Vector3() } },
      vertexShader: `uniform mat4 textureMatrix; varying vec4 vReflection; varying vec3 vWorld;
        void main(){vReflection=textureMatrix*vec4(position,1.);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float wetness; uniform vec3 eye; varying vec4 vReflection; varying vec3 vWorld;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
        void main(){vec2 p=vWorld.xz;float mainRoad=1.-smoothstep(3.45,3.65,abs(p.x));float avenue=1.-smoothstep(4.7,4.95,abs(p.y-12.));float alley=(1.-smoothstep(1.8,2.02,abs(p.y+25.)))*step(abs(p.x),23.);
        float road=max(max(mainRoad,avenue),alley);if(road<.01)discard;
        float n=noise(p*vec2(.65,.34))*.65+noise(p*3.7)*.35;float pool=smoothstep(.28,.72,n);float fine=noise(p*vec2(28.,6.));
        vec2 uv=vReflection.xy/vReflection.w;vec2 jitter=vec2(fine-.5,noise(p*18.)-.5)*.0011;
        vec3 col=texture2D(tDiffuse,uv+jitter).rgb*.4;col+=texture2D(tDiffuse,uv+jitter+vec2(.0018,0)).rgb*.15;col+=texture2D(tDiffuse,uv+jitter-vec2(.0018,0)).rgb*.15;col+=texture2D(tDiffuse,uv+jitter+vec2(0,.0024)).rgb*.15;col+=texture2D(tDiffuse,uv+jitter-vec2(0,.0024)).rgb*.15;
        float grazing=pow(1.-clamp(normalize(eye-vWorld).y,0.,1.),3.);float alpha=wetness*road*(.09+pool*.58)*(.22+grazing*.78);
        gl_FragColor=vec4(col,alpha);}`,
    };
    this.surface = new Reflector(new THREE.PlaneGeometry(148, 148), { textureWidth: 768, textureHeight: 768, multisample: 0, clipBias: .005, shader });
    this.surface.name = 'Masked after-rain road reflections'; this.surface.rotation.x = -Math.PI / 2; this.surface.position.y = .026;
    this.material = this.surface.material as THREE.ShaderMaterial;
    this.material.transparent = true; this.material.depthWrite = false; this.material.toneMapped = false;
    scene.add(this.surface);
  }
  setWetness(value: number): void { this.material.uniforms.wetness.value = value; this.surface.visible = value > .01; }
  update(camera: THREE.Camera): void { this.material.uniforms.eye.value.copy(camera.position); }
}
