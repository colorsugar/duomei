import * as THREE from 'three';
import { HORIZON_NIGHT } from '/yunyou/src/atmosphere.js';

/** 夜景：深蓝渐变穹顶 + 少量星（不用 Sky.js 夜景） */
export function createNightDome() {
  const uniforms = {
    uHorizon: { value: new THREE.Vector3(HORIZON_NIGHT.r, HORIZON_NIGHT.g, HORIZON_NIGHT.b) },
  };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uHorizon;
      varying vec3 vDir;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float h = max(vDir.y, 0.0);
        vec3 zenith = vec3(0.04, 0.07, 0.18);
        vec3 horizon = uHorizon * 1.25;
        vec3 col = mix(horizon, zenith, pow(h, 0.48));
        vec2 sp = vDir.xz / (vDir.y + 1.02);
        float star = step(0.992, hash(floor(sp * 420.0))) * smoothstep(0.15, 0.85, h);
        col += vec3(0.85, 0.9, 1.0) * star * 0.9;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(4500, 32, 16), mat);
  mesh.name = 'night-dome';
  mesh.frustumCulled = false;
  mesh.renderOrder = -3;
  mesh.onBeforeRender = (_r, _s, camera) => {
    mesh.position.copy(camera.position);
    mesh.updateMatrixWorld();
  };
  return mesh;
}
