import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/** Display-space finishing; subtle enough to preserve facade and lattice detail. */
export function photographicPass(): ShaderPass {
  return new ShaderPass({
    uniforms: { tDiffuse: { value: null }, seconds: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform sampler2D tDiffuse;uniform float seconds;varying vec2 vUv;
      void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;vec2 p=vUv-.5;float edge=dot(p*vec2(.8,1.),p*vec2(.8,1.));c*=1.-edge*.22;
      float grain=fract(sin(dot(gl_FragCoord.xy+floor(seconds*24.),vec2(12.9898,78.233)))*43758.5453)-.5;
      c+=grain*.008;gl_FragColor=vec4(c,1.);}`,
  });
}
