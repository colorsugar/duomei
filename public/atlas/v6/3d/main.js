// 七国战略图志 · 立体版。地形由底图旁生成的 height/normal 资产抬升，标签与交互仍由同一份
// 实体数据驱动。Same-origin iframe of /dalu/map.
import * as THREE from "three";
import { installTrackpadGestures } from "/yunyou/src/trackpad-gestures.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";

const params = new URLSearchParams(location.search);
const embedded = params.get("embed") === "duomei" && window.parent !== window;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;
// Water ripples are the only permanent animation, so reduced-motion visitors get on-demand frames.
const animated = !reducedMotion;

// --- Sky, sea and sun -----------------------------------------------------
// Clear-day aerial: deep blue zenith down to a narrow, light blue-grey horizon haze. Warmth lives only
// in the glow around the sun, and the fog is the horizon colour so far land melts into the sky.
const SKY_ZENITH = new THREE.Color(0x0a2248);
const SKY_MID = new THREE.Color(0x2f6b93);
const SKY_HORIZON = new THREE.Color(0xa9c3d6);
// Below the horizon the dome shows the same haze as the fog, so the sea's far edge never reads as a band.
const FOG_COLOR = SKY_HORIZON.clone().multiplyScalar(0.92);
const SKY_LOW = FOG_COLOR;
const SUN_COLOR = new THREE.Color(0xffe6c4);
const SUN_DIR = new THREE.Vector3(-900, 1300, 700).normalize();
const FOG_NEAR = 2600;
const FOG_FAR = 7200; // fully fogged before the water plane's edge at WATER_SPAN / 2
const SEA_SHALLOW = new THREE.Color(0x2f9f92);
const SEA_DEEP = new THREE.Color(0x0b2c4a);
const SEA_FOAM = new THREE.Color(0xeef4f2);
const WATER_SPAN = 20000;
const WATER_DEPTH_RANGE = 32;

const HOME = { x: 768, y: 560, radius: 1480, polar: 0.98 };
const TILT = { oblique: 0.98, top: 0.12 };
// Beyond these camera distances a kind's labels fold away so the chart never turns into a wall of pills.
const KIND_ZOOM = { kingdom: Infinity, legend: Infinity, city: 1250, site: 1250, architecture: 820 };
const KIND_NAME = { kingdom: "国家与政体", city: "城池", site: "战略要地", legend: "传说栖地", architecture: "宫堡庄园" };

const $ = (id) => document.getElementById(id);
const root = $("atlas3d");
const stage = $("stage");
const loading = $("loading");
const card = $("card");
const cardBody = $("card-body");
const lightbox = $("lightbox");

function fail(message) {
  loading.classList.add("is-failed");
  loading.innerHTML = `<p>${message}<br><a href="/dalu/map?view=2d" target="_top">打开平面版地图</a></p>`;
}

function post(message) {
  if (embedded) window.parent.postMessage(message, location.origin);
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
} catch {
  fail("这台设备暂时打不开立体地图。");
  throw new Error("webgl unavailable");
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
stage.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = "atlas3d-labels";
stage.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = SKY_LOW.clone();
scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);

const camera = new THREE.PerspectiveCamera(46, 1, 4, 14000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = !reducedMotion;
controls.dampingFactor = 0.09;
controls.screenSpacePanning = false;
// Mac trackpad: two-finger scroll pans, pinch zooms, Option+scroll rotates/tilts (mouse wheel still zooms).
installTrackpadGestures(controls, { onChange: () => controls.dispatchEvent({ type: "change" }) });
controls.minDistance = 230;
controls.maxDistance = 3400;
controls.minPolarAngle = 0.04;
controls.maxPolarAngle = 1.24;
controls.rotateSpeed = 0.55;
controls.zoomSpeed = 0.8;
controls.panSpeed = 0.9;
controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
controls.listenToKeyEvents(window);
controls.keyPanSpeed = 24;

// --- Gradient sky ---------------------------------------------------------
// One dome shader, reused by the water reflection so the horizon line never breaks.
const SKY_GLSL = `
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uLow;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
vec3 skyColor(vec3 dir) {
  float h = clamp(dir.y, -1.0, 1.0);
  // The pale haze is a thin band hugging the horizon; above it the sky goes blue fast.
  vec3 c = mix(uHorizon, uMid, smoothstep(0.0, 0.07, h));
  c = mix(c, uZenith, smoothstep(0.05, 0.45, h));
  c = mix(uLow, c, smoothstep(-0.02, 0.01, h));
  // Warm light only near the sun: a tight disc plus a ~13 degree halo, no all-over wash.
  float s = max(dot(dir, uSunDir), 0.0);
  c += uSunColor * (pow(s, 220.0) * 0.9 + pow(s, 26.0) * 0.10);
  return c;
}
`;

function skyUniforms() {
  return {
    uZenith: { value: SKY_ZENITH },
    uMid: { value: SKY_MID },
    uHorizon: { value: SKY_HORIZON },
    uLow: { value: SKY_LOW },
    uSunColor: { value: SUN_COLOR },
    uSunDir: { value: SUN_DIR },
  };
}

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(11000, 64, 32),
  new THREE.ShaderMaterial({
    uniforms: skyUniforms(),
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `${SKY_GLSL}
      varying vec3 vDir;
      void main() {
        gl_FragColor = vec4(skyColor(normalize(vDir)), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }),
);
scene.add(sky);

// --- Water ----------------------------------------------------------------
// One plane at sea level for both continents. Depth comes from the height fields, so shallow water
// stays translucent (the basemap's own shallows show through) and the shoreline gets a foam band.
const waterUniforms = Object.assign(skyUniforms(), {
  uDepthMap: { value: new THREE.DataTexture(new Uint8Array([255]), 1, 1, THREE.RedFormat, THREE.UnsignedByteType) },
  uFieldOrigin: { value: new THREE.Vector2() },
  uFieldSize: { value: new THREE.Vector2(1, 1) },
  uDepthRange: { value: WATER_DEPTH_RANGE },
  uTime: { value: 0 },
  uShallow: { value: SEA_SHALLOW },
  uDeep: { value: SEA_DEEP },
  uFoam: { value: SEA_FOAM },
  uFogColor: { value: FOG_COLOR },
  uFogNear: { value: FOG_NEAR },
  uFogFar: { value: FOG_FAR },
  // World units covered by one screen pixel at one unit of distance; resize() keeps it current.
  uPixelScale: { value: 0.0006 },
});
waterUniforms.uDepthMap.value.needsUpdate = true;

const water = new THREE.Mesh(
  new THREE.PlaneGeometry(WATER_SPAN, WATER_SPAN).rotateX(-Math.PI / 2),
  new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `${SKY_GLSL}
      uniform sampler2D uDepthMap;
      uniform vec2 uFieldOrigin;
      uniform vec2 uFieldSize;
      uniform float uDepthRange;
      uniform float uTime;
      uniform vec3 uShallow;
      uniform vec3 uDeep;
      uniform vec3 uFoam;
      uniform vec3 uFogColor;
      uniform float uFogNear;
      uniform float uFogFar;
      uniform float uPixelScale;
      varying vec3 vWorld;

      // One ripple octave survives only while its wavelength stays much bigger than a pixel. Short waves
      // go first, so the far sea keeps a smooth gradient instead of the old zebra striping.
      float rippleFade(float k, float footprint, float distFade) {
        float cyclesPerPixel = k * footprint * 0.15915494;
        return distFade * (1.0 - smoothstep(0.05, 0.3, cyclesPerPixel));
      }

      void main() {
        vec2 uv = (vWorld.xz - uFieldOrigin) / uFieldSize;
        float depth = texture2D(uDepthMap, uv).r * uDepthRange;
        if (depth < 0.02) discard;

        vec3 toEye = cameraPosition - vWorld;
        float dist = length(toEye);
        vec3 view = toEye / dist;
        // Distance flattens the sheet (basically glass past ~1500 units); dividing by the vertical view
        // component adds the foreshortening that makes near-horizon water alias the hardest.
        float distFade = 1.0 / (1.0 + dist * 0.004);
        float footprint = dist * uPixelScale / max(abs(view.y), 0.06);

        // Slow cross-travelling ripples: their gradient is the surface normal.
        vec2 p = vWorld.xz;
        float t = uTime;
        vec2 grad = vec2(0.0);
        grad.x += 0.055 * rippleFade(0.055, footprint, distFade) * cos(p.x * 0.055 + t * 0.85);
        grad.y += 0.050 * rippleFade(0.061, footprint, distFade) * cos(p.y * 0.061 - t * 0.72);
        float cross1 = 0.032 * rippleFade(0.037, footprint, distFade) * cos((p.x + p.y) * 0.037 + t * 1.15);
        grad += vec2(cross1, cross1);
        float cross2 = 0.024 * rippleFade(0.085, footprint, distFade) * cos((p.x - p.y) * 0.085 - t * 1.45);
        grad += vec2(cross2, -cross2);
        vec3 n = normalize(vec3(-grad.x * 0.6, 1.0, -grad.y * 0.6));

        vec3 body = mix(uShallow, uDeep, smoothstep(0.0, 10.0, depth));
        float fresnel = clamp(pow(1.0 - clamp(dot(n, view), 0.0, 1.0), 4.0), 0.0, 0.85);
        vec3 col = mix(body, skyColor(reflect(-view, n)), fresnel);
        vec3 hDir = normalize(uSunDir + view);
        // A sub-pixel glint sparkles into aliasing, so distance trades the sharp lobe for a wide dim sheen.
        col += uSunColor * pow(max(dot(n, hDir), 0.0), mix(260.0, 28.0, 1.0 - distFade))
             * mix(1.5, 0.20, 1.0 - distFade);

        float band = 1.0 - smoothstep(0.2, 3.0, depth);
        // The shore pulse is a depth contour, so it too settles to a steady band where it cannot resolve.
        float pulse = mix(0.62, sin(depth * 3.0 - t * 1.4), distFade);
        float foam = clamp(band * (0.55 + 0.45 * pulse), 0.0, 1.0);
        col = mix(col, uFoam, foam * 0.5);
        float fog = smoothstep(uFogNear, uFogFar, length(cameraPosition - vWorld));
        // Deep water is opaque so open sea looks the same inside and outside the mapped tiles (no floating board).
        float alpha = max(mix(0.2, 1.0, smoothstep(0.0, 14.0, depth)), foam * 0.6);
        alpha = max(alpha, fog);

        gl_FragColor = vec4(mix(col, uFogColor, fog), alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }),
);
scene.add(water);

// Sun sits upper-left of the default view, matching the basemap's own shading.
scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x1d2733, 0.85));
scene.add(new THREE.AmbientLight(0x9fb3c8, 0.28));
const sun = new THREE.DirectionalLight(0xffe6c4, 1.35);
sun.position.copy(SUN_DIR).multiplyScalar(1800);
scene.add(sun);

let canvasWidth = 3256;
let canvasHeight = 1024;
const toWorld = (x, y) => new THREE.Vector3(x - canvasWidth / 2, 0, y - canvasHeight / 2);

// --- Relief ---------------------------------------------------------------
// Real terrain: /atlas/v6/assets/terrain/<name>.height.bin, Uint16 小端 768×512, row 0 = image top,
// h = v / 65535 * 150 - 30 in basemap pixels (= world units). Sea level is 0, the sea floor reaches -30.
const TERRAIN_COLS = 768;
const TERRAIN_ROWS = 512;
const TERRAIN_MIN = -30;
const TERRAIN_SPAN = 150;
// Fallback only (no .height.bin): luminance relief tops out here, and has no bathymetry.
const FALLBACK_HEIGHT = 55;
const heightFields = [];

const terrainBase = (tile) => `/atlas/v6/assets/terrain/${tile.src.split("/").pop().replace(/\.webp$/i, "")}`;

function luminanceField(image, tile) {
  const cols = 256;
  const rows = Math.round(cols * tile.height / tile.width);
  const c = document.createElement("canvas");
  c.width = cols;
  c.height = rows;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, cols, rows);
  const px = ctx.getImageData(0, 0, cols, rows).data;
  let field = new Float32Array(cols * rows);
  for (let i = 0; i < cols * rows; i += 1) {
    const r = px[i * 4] / 255;
    const g = px[i * 4 + 1] / 255;
    const b = px[i * 4 + 2] / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // Water on the chart is dark and blue-leaning; everything else climbs with brightness (snowfields highest).
    const water = b > r + 0.06 && lum < 0.42;
    field[i] = water ? 0 : Math.pow(Math.min(1, Math.max(0, (lum - 0.22) / 0.62)), 1.35);
  }
  for (let pass = 0; pass < 3; pass += 1) {
    const next = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        let sum = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          const yy = y + dy;
          if (yy < 0 || yy >= rows) continue;
          for (let dx = -1; dx <= 1; dx += 1) {
            const xx = x + dx;
            if (xx < 0 || xx >= cols) continue;
            sum += field[yy * cols + xx];
            n += 1;
          }
        }
        next[y * cols + x] = sum / n;
      }
    }
    field = next;
  }
  return { cols, rows, field, tile, scale: FALLBACK_HEIGHT, fallback: true };
}

async function loadHeightField(tile) {
  const response = await fetch(`${terrainBase(tile)}.height.bin`);
  if (!response.ok) throw new Error(`${response.status} for ${terrainBase(tile)}.height.bin`);
  const buffer = await response.arrayBuffer();
  const count = TERRAIN_COLS * TERRAIN_ROWS;
  if (buffer.byteLength !== count * 2) throw new Error(`unexpected size for ${terrainBase(tile)}.height.bin`);
  const raw = new Uint16Array(buffer);
  const field = new Float32Array(count);
  for (let i = 0; i < count; i += 1) field[i] = (raw[i] / 65535) * TERRAIN_SPAN + TERRAIN_MIN;
  return { cols: TERRAIN_COLS, rows: TERRAIN_ROWS, field, tile, scale: 1, fallback: false };
}

function sampleField(hf, u, v) {
  const fx = Math.min(hf.cols - 1, Math.max(0, u * (hf.cols - 1)));
  const fy = Math.min(hf.rows - 1, Math.max(0, v * (hf.rows - 1)));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(hf.cols - 1, x0 + 1);
  const y1 = Math.min(hf.rows - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const a = hf.field[y0 * hf.cols + x0] * (1 - tx) + hf.field[y0 * hf.cols + x1] * tx;
  const b = hf.field[y1 * hf.cols + x0] * (1 - tx) + hf.field[y1 * hf.cols + x1] * tx;
  return (a * (1 - ty) + b * ty) * hf.scale;
}

function fieldAt(x, y) {
  for (const hf of heightFields) {
    const { tile } = hf;
    if (x >= tile.x && x <= tile.x + tile.width && y >= tile.y && y <= tile.y + tile.height) {
      return hf;
    }
  }
  return null;
}

// Raw surface height, sea floor included; outside every tile it is open deep water.
function terrainHeightAt(x, y) {
  const hf = fieldAt(x, y);
  return hf ? sampleField(hf, (x - hf.tile.x) / hf.tile.width, (y - hf.tile.y) / hf.tile.height) : TERRAIN_MIN;
}

// Labels and flights ride on the surface: never below the water plane.
function heightAt(x, y) {
  return Math.max(0, terrainHeightAt(x, y));
}

// Water depth under a canvas point. The luminance fallback has no bathymetry, so its sea reads as deep.
function seabedDepth(x, y) {
  const hf = fieldAt(x, y);
  if (!hf) return WATER_DEPTH_RANGE;
  const h = sampleField(hf, (x - hf.tile.x) / hf.tile.width, (y - hf.tile.y) / hf.tile.height);
  if (h < 0) return -h;
  return hf.fallback ? WATER_DEPTH_RANGE : 0;
}

// One R8 texture in canvas space: the water shader only needs "how deep is it here".
function buildDepthTexture() {
  const width = Math.max(2, Math.round(canvasWidth / 2));
  const height = Math.max(2, Math.round(canvasHeight / 2));
  const data = new Uint8Array(width * height);
  for (let row = 0; row < height; row += 1) {
    const y = ((row + 0.5) / height) * canvasHeight;
    for (let col = 0; col < width; col += 1) {
      const depth = Math.min(WATER_DEPTH_RANGE, seabedDepth(((col + 0.5) / width) * canvasWidth, y));
      data[row * width + col] = Math.round((depth / WATER_DEPTH_RANGE) * 255);
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RedFormat, THREE.UnsignedByteType);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

async function buildTile(tile) {
  const texture = await new THREE.TextureLoader().loadAsync(tile.src);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  let hf = null;
  try {
    hf = await loadHeightField(tile);
  } catch (error) {
    console.warn("立体地图：高程贴图不可用，回退到底图亮度推高度。", error);
  }
  if (!hf) hf = luminanceField(texture.image, tile);
  heightFields.push(hf);

  let normalMap = null;
  if (!hf.fallback) {
    try {
      normalMap = await new THREE.TextureLoader().loadAsync(`${terrainBase(tile)}.normal.png`);
      normalMap.anisotropy = texture.anisotropy;
    } catch (error) {
      console.warn("立体地图：法线贴图不可用，只用顶点法线。", error);
    }
  }

  // Displacement is written on the CPU so heightAt(), picking and the mesh never disagree.
  const segments = coarse ? [256, 170] : [384, 256];
  const geometry = new THREE.PlaneGeometry(tile.width, tile.height, segments[0], segments[1]).rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const u = (pos.getX(i) + tile.width / 2) / tile.width;
    const v = (pos.getZ(i) + tile.height / 2) / tile.height;
    pos.setY(i, sampleField(hf, u, v));
  }
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, metalness: 0 });
  if (normalMap) {
    material.normalMap = normalMap;
    material.normalScale = new THREE.Vector2(1.2, 1.2);
  }
  // Real height fields get the procedural rock / snow layers; the luminance fallback stays as-is.
  if (!hf.fallback) attachSurfaceShader(material);
  const mesh = new THREE.Mesh(geometry, material);
  const center = toWorld(tile.x + tile.width / 2, tile.y + tile.height / 2);
  mesh.position.set(center.x, 0, center.z);
  scene.add(mesh);
}

// --- Surface shader ------------------------------------------------------
// Layer rock / snow / vegetation on top of the hand-drawn basemap. The mesh keeps the lighting and
// normal map from MeshStandardMaterial; onBeforeCompile injects varyings and a fragment chunk that
// derives weights from the geometric world normal and altitude. Detail textures fade out past ~1200
// units so the far chart stays as the basemap painted it. The fallback height path (luminanceField)
// does not get the shader — task explicitly allows skipping it.
const surfaceSandColor = new THREE.Color(0xc9b58a);
const surfaceSnowColor = new THREE.Color(0xf2f4f7);
const surfaceRockTone = new THREE.Color(0x8d8577);

// Shared uniforms — every tile's onBeforeCompile merges the same value objects in, so mutating
// .value here updates the shader on both tiles in lockstep.
const surfaceUniforms = {
  uKarst: { value: null },
  uStone: { value: null },
  uSandColor: { value: surfaceSandColor },
  uSnowColor: { value: surfaceSnowColor },
  uRockTone: { value: surfaceRockTone },
  uKarstScale: { value: 0.022 },
  uStoneScale: { value: 0.013 },
  uHasDetail: { value: 0 },
  // Triplanar is for the steep, photogenic look. Coarse-pointer devices skip it and stay on xz.
  uTriplanar: { value: coarse ? 0 : 1 },
};

const SURFACE_VERTEX_PROLOGUE = `
  varying vec3 vAtlasWorld;
  varying vec3 vAtlasNormal;
`;
const SURFACE_VERTEX_WORLDPOS = `
  vAtlasWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vAtlasNormal = normalize(mat3(modelMatrix) * objectNormal);
`;

const SURFACE_FRAGMENT_PROLOGUE = `
  varying vec3 vAtlasWorld;
  varying vec3 vAtlasNormal;
  uniform sampler2D uKarst;
  uniform sampler2D uStone;
  uniform vec3 uSandColor;
  uniform vec3 uSnowColor;
  uniform vec3 uRockTone;
  uniform float uKarstScale;
  uniform float uStoneScale;
  uniform float uHasDetail;
  uniform float uTriplanar;

  float aHash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }
  float aVNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(aHash(i), aHash(i + vec2(1.0, 0.0)), u.x),
               mix(aHash(i + vec2(0.0, 1.0)), aHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float aFbm(vec2 p) {
    return aVNoise(p) * 0.58 + aVNoise(p * 2.07 + 11.3) * 0.28 + aVNoise(p * 4.13 + 27.7) * 0.14;
  }
`;

const SURFACE_FRAGMENT_BODY = `
  {
    // Geometric normal (not the normal-map perturbation) decides what biome each pixel belongs to.
    float slope = clamp(1.0 - vAtlasNormal.y, 0.0, 1.0);
    float h = vAtlasWorld.y;
    vec3 base = diffuseColor.rgb;

    // Wet-sand band just above sea level so the basemap's hand-drawn shore stays in character.
    float coast = smoothstep(-0.1, 0.25, h) * (1.0 - smoothstep(0.6, 1.6, h));
    base = mix(base, uSandColor, coast * 0.4);

    // Past ~1200 units the detail textures / noise dither fade to nothing, leaving just the basemap
    // tint plus the broad snow / rock bands.
    float dist = length(cameraPosition - vAtlasWorld);
    float detail = 1.0 - smoothstep(1200.0, 2400.0, dist);

    vec2 vp = vAtlasWorld.xz;
    float gv = aFbm(vp * 0.018 + 7.3);
    float fine = aVNoise(vp * 0.32 + 19.1);

    vec3 veg = base * (0.88 + 0.24 * gv);
    veg *= mix(vec3(0.94, 1.06, 0.90), vec3(1.08, 1.02, 0.86), fine);
    vec3 land = mix(base, veg, detail);

    // Rock: steep slopes, with extra weight on the high band above 55 units so peaks read as cliffs.
    float rock = smoothstep(0.35, 0.60, slope);
    rock += smoothstep(55.0, 78.0, h) * 0.45 * (1.0 - smoothstep(0.55, 0.85, slope));
    rock = clamp(rock + (aVNoise(vp * 0.05 + 3.0) - 0.5) * 0.22, 0.0, 1.0);

    vec3 rockCol = uRockTone;
    if (rock > 0.002 && detail > 0.002 && uHasDetail > 0.5) {
      vec3 karst;
      if (uTriplanar > 0.5) {
        vec3 w = pow(abs(vAtlasNormal), vec3(4.0));
        w /= max(w.x + w.y + w.z, 1e-4);
        karst  = texture2D(uKarst, vAtlasWorld.zy * uKarstScale).rgb * w.x;
        karst += texture2D(uKarst, vAtlasWorld.xz * uKarstScale).rgb * w.y;
        karst += texture2D(uKarst, vAtlasWorld.xy * uKarstScale).rgb * w.z;
      } else {
        karst = texture2D(uKarst, vp * uKarstScale).rgb;
      }
      vec3 stone = texture2D(uStone, vp * uStoneScale).rgb;
      float mixK = clamp(0.35 + 0.55 * gv, 0.0, 1.0);
      vec3 rockTex = mix(stone, karst, mixK);
      rockTex *= 0.85 + 0.3 * aVNoise(vp * 0.45);
      rockCol = mix(uRockTone, rockTex, detail);
    }
    // Pull the rock tone toward the basemap so the stylised chart stays cohesive.
    rockCol = mix(rockCol, base, 0.4);

    vec3 surface = mix(land, rockCol, rock);

    // Snow line ~72 world units, dithered ±3 units, suppressed on steep slopes.
    float snowNoise = (gv - 0.5) * 4.5 + (fine - 0.5) * 1.5;
    float snowBand = smoothstep(64.0, 80.0, h + snowNoise);
    float snowMask = snowBand * (1.0 - smoothstep(0.55, 0.80, slope));
    float cold = clamp(0.55 * slope + (fine - 0.5) * 0.8, 0.0, 1.0);
    vec3 snowCol = mix(uSnowColor, uSnowColor * vec3(0.78, 0.88, 1.04), cold * 0.6);
    snowMask *= mix(1.0, 0.85, 1.0 - detail);
    surface = mix(surface, snowCol, snowMask);

    diffuseColor.rgb = surface;

    float rough = mix(0.95, 0.85, clamp(rock, 0.0, 1.0));
    rough = mix(rough, 0.6, clamp(snowMask, 0.0, 1.0));
    roughnessFactor = rough;
  }
`;

function attachSurfaceShader(material) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, surfaceUniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\n" + SURFACE_VERTEX_PROLOGUE)
      .replace("#include <project_vertex>", "#include <project_vertex>\n" + SURFACE_VERTEX_WORLDPOS);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + SURFACE_FRAGMENT_PROLOGUE)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n" + SURFACE_FRAGMENT_BODY);
  };
  // Same shader for every tile → one compiled program, shared across the chart.
  material.customProgramCacheKey = () => "atlas-surface-v1";
}

async function loadSurfaceTextures() {
  const loader = new THREE.TextureLoader();
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const setup = (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = aniso;
  };
  let karst = null;
  let stone = null;
  try {
    karst = await loader.loadAsync("/yunyou/assets/tex/karst.jpg");
    setup(karst);
  } catch (error) {
    console.warn("立体地图：karst 贴图缺失，地形只用程序化岩石色调。", error);
  }
  try {
    stone = await loader.loadAsync("/yunyou/assets/tex/stone.jpg");
    setup(stone);
  } catch (error) {
    console.warn("立体地图：stone 贴图缺失，地形只用 karst。", error);
  }
  if (!karst && !stone) return false;
  if (!karst) karst = stone;
  if (!stone) stone = karst;
  surfaceUniforms.uKarst.value = karst;
  surfaceUniforms.uStone.value = stone;
  surfaceUniforms.uHasDetail.value = 1;
  return true;
}

// --- Camera flights -------------------------------------------------------
const spherical = new THREE.Spherical();
const offset = new THREE.Vector3();
let flight = null;

function currentView() {
  offset.copy(camera.position).sub(controls.target);
  spherical.setFromVector3(offset);
  return { target: controls.target.clone(), radius: spherical.radius, polar: spherical.phi, azimuth: spherical.theta };
}

function applyView(view) {
  spherical.set(view.radius, view.polar, view.azimuth);
  offset.setFromSpherical(spherical);
  controls.target.copy(view.target);
  camera.position.copy(view.target).add(offset);
  camera.lookAt(controls.target);
  invalidate();
}

function flyTo(partial, duration = 720) {
  const from = currentView();
  const to = { ...from, ...partial, target: partial.target ? partial.target.clone() : from.target };
  to.radius = Math.min(controls.maxDistance, Math.max(controls.minDistance, to.radius));
  to.polar = Math.min(controls.maxPolarAngle, Math.max(controls.minPolarAngle, to.polar));
  if (reducedMotion || duration === 0) {
    applyView(to);
    flight = null;
    return;
  }
  flight = { from, to, start: performance.now(), duration };
}

function stepFlight(now) {
  if (!flight) return;
  const t = Math.min(1, (now - flight.start) / flight.duration);
  const e = 1 - Math.pow(1 - t, 3);
  const { from, to } = flight;
  applyView({
    target: from.target.clone().lerp(to.target, e),
    radius: from.radius + (to.radius - from.radius) * e,
    polar: from.polar + (to.polar - from.polar) * e,
    azimuth: from.azimuth + (to.azimuth - from.azimuth) * e,
  });
  if (t >= 1) flight = null;
}

function homeView() {
  const target = toWorld(HOME.x, HOME.y);
  // Portrait phones see a narrow strip of a very wide chart, so they start closer in.
  const radius = camera.aspect < 0.9 ? 1120 : HOME.radius;
  return { target, radius, polar: HOME.polar, azimuth: 0 };
}

// --- Entities & labels ----------------------------------------------------
const kindVisible = { kingdom: true, city: true, site: true, legend: true, architecture: true };
const labels = [];
let entities = [];
let active = null;

function makeLabel(entity) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `atlas3d-label kind-${entity.kind}`;
  el.style.setProperty("--dot", entity.color);
  el.innerHTML = `<i></i><span></span>`;
  el.lastChild.textContent = entity.shortName;
  el.setAttribute("aria-label", `${entity.name}，${KIND_NAME[entity.kind]}`);
  el.addEventListener("click", (event) => {
    event.stopPropagation();
    select(entity, true);
  });
  // CSS2DRenderer owns the wrapper's transform; the button keeps its own "pin above the point" offset.
  const pin = document.createElement("div");
  pin.className = "atlas3d-pin";
  pin.appendChild(el);
  const object = new CSS2DObject(pin);
  const world = toWorld(entity.x, entity.y);
  object.position.set(world.x, heightAt(entity.x, entity.y) + 3, world.z);
  scene.add(object);
  labels.push({ entity, el, object, shown: true });
}

// Capitals, gates and palaces often share a kingdom's anchor, so labels are culled greedily in screen
// space by priority; the tapped entity always survives.
const PRIORITY = { kingdom: 0, legend: 1, site: 2, city: 3, architecture: 4 };
const projected = new THREE.Vector3();
const kept = [];

function updateLabels(distance) {
  kept.length = 0;
  const halfW = stage.clientWidth / 2;
  const halfH = stage.clientHeight / 2;
  const ordered = labels
    .map((label) => {
      projected.copy(label.object.position).project(camera);
      return { label, x: projected.x * halfW, y: -projected.y * halfH, behind: projected.z > 1 };
    })
    .sort((a, b) => (a.label.entity === active ? -1 : b.label.entity === active ? 1 : PRIORITY[a.label.entity.kind] - PRIORITY[b.label.entity.kind]));
  for (const item of ordered) {
    const { label } = item;
    const { entity } = label;
    let show = entity === active || (kindVisible[entity.kind] && distance < KIND_ZOOM[entity.kind] && !item.behind);
    if (show && entity !== active) {
      const w = entity.shortName.length * 14 + 48;
      show = !kept.some((other) => Math.abs(other.x - item.x) < (w + other.w) / 2 && Math.abs(other.y - item.y) < 34);
    }
    if (show) kept.push({ x: item.x, y: item.y, w: entity.shortName.length * 14 + 48 });
    if (show !== label.shown) {
      label.shown = show;
      label.el.classList.toggle("is-hidden", !show);
    }
  }
}

function renderCard(entity) {
  cardBody.replaceChildren();
  const add = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    cardBody.appendChild(el);
    return el;
  };
  add("p", "atlas3d-card-kicker", [entity.category, KIND_NAME[entity.kind]].filter(Boolean).join(" · "));
  add("h2", null, entity.name);
  if (entity.tag) add("p", "atlas3d-card-tag", entity.tag);
  if (entity.description) add("p", null, entity.description);
  if (entity.detail && entity.detail !== entity.description) add("p", null, entity.detail);
  if (entity.facts.length) {
    const dl = add("dl");
    for (const fact of entity.facts) {
      if (fact.text === entity.detail) continue;
      const dt = document.createElement("dt");
      dt.textContent = fact.label;
      const dd = document.createElement("dd");
      dd.textContent = fact.text;
      dl.append(dt, dd);
    }
  }
  if (entity.gallery.length) {
    const list = add("ul", "atlas3d-card-gallery");
    for (const plate of entity.gallery) {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      const img = document.createElement("img");
      img.src = plate.src;
      img.alt = plate.title;
      img.loading = "lazy";
      img.decoding = "async";
      const caption = document.createElement("span");
      caption.textContent = plate.title.replace(`${entity.name} · `, "").replace(`${entity.shortName} · `, "");
      button.append(img, caption);
      button.addEventListener("click", () => openLightbox(plate));
      li.appendChild(button);
      list.appendChild(li);
    }
  }
  const actions = add("div", "atlas3d-card-actions");
  const focus = document.createElement("button");
  focus.type = "button";
  focus.textContent = "飞到这里";
  focus.addEventListener("click", () => focusOn(entity));
  actions.appendChild(focus);
  if (entity.parent) {
    const parent = entities.find((item) => item.id === entity.parent);
    if (parent) {
      const up = document.createElement("button");
      up.type = "button";
      up.textContent = `所属 · ${parent.shortName}`;
      up.addEventListener("click", () => select(parent, true));
      actions.appendChild(up);
    }
  }
  cardBody.scrollTop = 0;
}

function focusOn(entity) {
  const radius = entity.kind === "kingdom" ? 980 : entity.kind === "architecture" ? 520 : 700;
  flyTo({ target: toWorld(entity.x, entity.y), radius });
}

function select(entity, fly) {
  for (const label of labels) label.el.classList.toggle("is-active", label.entity === entity);
  active = entity;
  if (!entity) {
    card.hidden = true;
    return;
  }
  renderCard(entity);
  card.hidden = false;
  if (fly) focusOn(entity);
}

function openLightbox(plate) {
  $("lightbox-img").src = plate.src;
  $("lightbox-img").alt = plate.title;
  $("lightbox-caption").textContent = [plate.title, plate.view, plate.caption].filter(Boolean).join(" · ");
  lightbox.hidden = false;
}

// --- Chrome ---------------------------------------------------------------
$("card-close").addEventListener("click", () => select(null));
$("lightbox-close").addEventListener("click", () => { lightbox.hidden = true; });
lightbox.addEventListener("click", (event) => { if (event.target === lightbox) lightbox.hidden = true; });
$("reset").addEventListener("click", () => { select(null); flyTo(homeView(), 900); });
$("zoom-in").addEventListener("click", () => flyTo({ radius: currentView().radius * 0.68 }, 420));
$("zoom-out").addEventListener("click", () => flyTo({ radius: currentView().radius * 1.45 }, 420));
$("tilt").addEventListener("click", (event) => {
  const oblique = event.currentTarget.getAttribute("aria-pressed") !== "true";
  event.currentTarget.setAttribute("aria-pressed", String(oblique));
  event.currentTarget.textContent = oblique ? "斜看" : "俯视";
  flyTo({ polar: oblique ? TILT.oblique : TILT.top }, 600);
});
$("artbook").addEventListener("click", () => {
  if (embedded) post({ type: "atlas-open-artbook" });
  else window.top.location.href = "/guyu/hanhai-realms-artbook";
});

// --- Help sheet -------------------------------------------------------------
const help = $("help");
const HELP_SEEN_KEY = "duomei-atlas3d-help-seen";
function setHelp(open) {
  help.hidden = !open;
  if (open) $("help-ok").focus({ preventScroll: true });
  else try { localStorage.setItem(HELP_SEEN_KEY, "1"); } catch { /* private mode */ }
}
$("help-open").addEventListener("click", () => setHelp(true));
$("help-close").addEventListener("click", () => setHelp(false));
$("help-ok").addEventListener("click", () => setHelp(false));
help.addEventListener("click", (event) => { if (event.target === help) setHelp(false); });
let helpSeen = true;
try { helpSeen = localStorage.getItem(HELP_SEEN_KEY) === "1"; } catch { /* private mode: never nag */ }

function setImmersive(on) {
  root.classList.toggle("is-immersive", on);
  $("exit-immersive").hidden = !on;
  post({ type: "atlas-immersive", on });
}
$("immersive").addEventListener("click", () => setImmersive(true));
$("exit-immersive").addEventListener("click", () => setImmersive(false));
window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!help.hidden) setHelp(false);
  else if (!lightbox.hidden) lightbox.hidden = true;
  else if (!card.hidden) select(null);
  else if (root.classList.contains("is-immersive")) setImmersive(false);
});

for (const chip of $("chips").querySelectorAll("button")) {
  chip.addEventListener("click", () => {
    const kind = chip.dataset.kind;
    kindVisible[kind] = !kindVisible[kind];
    chip.setAttribute("aria-pressed", String(kindVisible[kind]));
    invalidate();
    if (active?.kind === kind && !kindVisible[kind]) select(null);
  });
}

// A clean tap on open water or land (no drag) folds the card away.
let tap = null;
renderer.domElement.addEventListener("pointerdown", (event) => { tap = { x: event.clientX, y: event.clientY, at: performance.now(), id: event.pointerId }; });
renderer.domElement.addEventListener("pointerup", (event) => {
  if (!tap || tap.id !== event.pointerId) return;
  const moved = Math.hypot(event.clientX - tap.x, event.clientY - tap.y);
  if (moved < 8 && performance.now() - tap.at < 400 && !card.hidden) select(null);
  tap = null;
});

$("hint").textContent = coarse ? "单指拖动 · 双指缩放旋转 · 点标记看介绍" : "拖动平移 · 滚轮缩放 · 右键旋转俯仰 · 点标记看介绍";
// The React shell already offers the flat chart next to its own return link.
if (embedded) $("bar").querySelector('a[href*="view=2d"]').hidden = true;

// --- Boot -----------------------------------------------------------------
// With reduced motion nothing moves on its own, so frames are drawn only when something changed.
let needsRender = true;
function invalidate() {
  needsRender = true;
}
controls.addEventListener("change", invalidate);

function resize() {
  const { clientWidth: w, clientHeight: h } = stage;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
  // Device pixels, so the ripple LOD fades exactly when a wave reaches one real pixel.
  waterUniforms.uPixelScale.value =
    (2 * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, renderer.domElement.height);
  invalidate();
}
window.addEventListener("resize", resize);
resize();

const bounds = new THREE.Box3();
function clampTarget() {
  bounds.min.set(-canvasWidth / 2 - 120, -50, -canvasHeight / 2 - 120);
  bounds.max.set(canvasWidth / 2 + 120, 200, canvasHeight / 2 + 120);
  if (bounds.containsPoint(controls.target)) return;
  const before = controls.target.clone();
  bounds.clampPoint(controls.target, controls.target);
  camera.position.add(controls.target.clone().sub(before));
}

renderer.setAnimationLoop((now) => {
  stepFlight(now);
  if (flight) invalidate();
  else {
    if (controls.update()) invalidate();
    clampTarget();
  }
  if (!animated && !needsRender) return;
  if (animated) waterUniforms.uTime.value = now * 0.001;
  sky.position.copy(camera.position);
  updateLabels(camera.position.distanceTo(controls.target));
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  needsRender = false;
});

(async () => {
  try {
    const data = await (await fetch("./3d/data.json?v=20260908-3d")).json();
    canvasWidth = data.canvas.width;
    canvasHeight = data.canvas.height;
    entities = data.entities;
    // Load the rock detail textures first so the surface shader has them when its program compiles.
    await loadSurfaceTextures();
    await Promise.all(data.tiles.map(buildTile));
    waterUniforms.uDepthMap.value.dispose();
    waterUniforms.uDepthMap.value = buildDepthTexture();
    waterUniforms.uFieldOrigin.value.set(-canvasWidth / 2, -canvasHeight / 2);
    waterUniforms.uFieldSize.value.set(canvasWidth, canvasHeight);
    for (const entity of entities) makeLabel(entity);
    applyView(homeView());
    const entry = params.get("entry");
    const wanted = entry && entities.find((item) => item.id === entry);
    if (wanted) {
      select(wanted, false);
      flyTo({ target: toWorld(wanted.x, wanted.y), radius: wanted.kind === "kingdom" ? 980 : 700 }, 1400);
    }
    loading.classList.add("is-done");
    // First visit: show the gesture guide once the chart is up, unless a deep link already opened a place.
    if (!helpSeen && !wanted) setHelp(true);
    document.title = `${wanted ? `${wanted.name} · ` : ""}七国战略图志 · 立体 | 多美小记`;
  } catch (error) {
    console.error(error);
    fail("大陆暂时没展开，可能是网络不太顺。");
  }
})();
