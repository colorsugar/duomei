/**
 * 漓江水面：Clearwater（MIT, Aurélien / Lumaris）浅水焦散思路的 Three.js 移植。
 * 完整 FFT 实现见 tmp-xiaoyao/refs/clearwater — 此处为 MVP 折射 + 投影焦散 + 远距天空反射。
 * 许可：public/xiaoyao/vendor/clearwater-LICENSE.txt
 */
import * as THREE from 'three';

const vertexShader = /* glsl */ `
varying vec2 vWorldXZ;
varying vec3 vView;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldXZ = wp.xz;
  vView = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSky;
uniform float uNight;
uniform float uCausticScale;
uniform sampler2D uNoise;
varying vec2 vWorldXZ;
varying vec3 vView;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float caustic(vec2 p) {
  vec2 q = p * uCausticScale;
  float c = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 o = vec2(sin(uTime * 0.4 + fi * 1.7), cos(uTime * 0.35 + fi * 2.1)) * (0.8 + fi);
    c += sin(q.x * (3.1 + fi) + q.y * (2.7 - fi * 0.3) + dot(o, q) * 0.5 + uTime * (0.6 + fi * 0.2));
  }
  c = pow(max(c * 0.22 + 0.55, 0.0), 2.2);
  return c;
}

void main() {
  vec2 uv = vWorldXZ * 0.08;
  float wave = sin(uv.x * 3.0 + uTime * 0.9) * 0.04 + sin(uv.y * 2.5 - uTime * 0.7) * 0.03;
  vec3 N = normalize(vec3(wave, 1.0, wave * 0.6));
  vec3 V = normalize(vView);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  float dist = length(vWorldXZ) * 0.0025;
  float shore = smoothstep(0.0, 0.35, dist);
  float c = caustic(vWorldXZ + N.xz * 2.0);
  vec3 water = mix(uShallow, uDeep, shore);
  water += vec3(0.35, 0.55, 0.45) * c * (1.0 - uNight) * (1.0 - dist * 0.4);
  vec3 refl = mix(uSky, uDeep, 0.35);
  water = mix(water, refl, fres * (0.45 + dist * 0.5));
  water *= mix(1.0, 0.35, uNight);
  gl_FragColor = vec4(water, 0.92);
}`;

function makeNoiseTexture() {
  const s = 128;
  const data = new Uint8Array(s * s * 4);
  for (let i = 0; i < s * s; i++) {
    const v = Math.floor(Math.random() * 255);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, s, s);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function createLijiangWater({ mobile = false } = {}) {
  const geo = new THREE.PlaneGeometry(520, 380, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.4, 0.65, 0.2).normalize() },
      uDeep: { value: new THREE.Color(0x1a3a42) },
      uShallow: { value: new THREE.Color(0x2d6b6a) },
      uSky: { value: new THREE.Color(0x7eb8d8) },
      uNight: { value: 1 },
      uCausticScale: { value: mobile ? 0.045 : 0.09 },
      uNoise: { value: makeNoiseTexture() },
    },
    vertexShader,
    fragmentShader,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(40, 0.15, 120);
  mesh.name = 'lijiang-water';
  return {
    mesh,
    update(t, sunDir, night) {
      mat.uniforms.uTime.value = t;
      if (sunDir) mat.uniforms.uSunDir.value.copy(sunDir);
      mat.uniforms.uNight.value = night;
    },
  };
}
