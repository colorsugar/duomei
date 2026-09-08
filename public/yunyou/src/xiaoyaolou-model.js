import * as THREE from 'three';

const assetRoot = new URL('../assets/xiaoyaolou/', import.meta.url);
const decoder = new Worker(new URL('./xiaoyaolou-worker.js', import.meta.url), { type: 'module' });
const pending = new Map();
let requestId = 0;
let decoderError;
decoder.onmessage = ({ data }) => {
  const request = pending.get(data.id);
  if (!request) return;
  pending.delete(data.id);
  if (data.error) request.reject(new Error(data.error));
  else request.resolve(data.json);
};
decoder.onerror = error => {
  decoderError = new Error(error.message || 'Map decoder failed');
  for (const request of pending.values()) request.reject(decoderError);
  pending.clear();
};
const prebuiltManifest = fetch(new URL('manifest.json', assetRoot)).then(async response => {
  if (!response.ok) throw new Error(`Map manifest: ${response.status}`);
  const manifest = await response.json();
  if (manifest.version !== 1 || manifest.three !== THREE.REVISION) throw new Error('Unsupported map asset version');
  return manifest;
});

export async function loadXiaoyaolou() {
  const id = 'xiaoyaolou';
  if (decoderError) throw decoderError;
  const manifest = await prebuiltManifest;
  const entry = manifest.assets[id];
  if (!entry) throw new Error(`Unknown map asset: ${id}`);
  const json = await new Promise((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve, reject });
    decoder.postMessage({ id, url: new URL(entry.file, assetRoot).href });
  });
  const object = await new THREE.ObjectLoader().setResourcePath(assetRoot.href).parseAsync(json);
  object.traverse(o => {
    if (o.isSpotLight && o.userData.target) o.target = object.getObjectByProperty('uuid', o.userData.target) || o.target;
    if (o.isInstancedMesh) { o.computeBoundingBox(); o.computeBoundingSphere(); }
  });
  object.updateMatrixWorld(true);
  object.traverse(o => { o.matrixAutoUpdate = false; o.matrixWorldAutoUpdate = false; });
  return object;
}

export function setXiaoyaolouNight(group, on) {
  const seen = new Set();
  group.traverse(o => {
    if (o.isLight) o.visible = on;
    for (const material of o.material ? [].concat(o.material) : []) {
      const states = material.userData.prebuiltNight;
      if (!states || seen.has(material)) continue;
      seen.add(material);
      const state = on ? states.night : states.day;
      if (state.emissive) material.emissive.fromArray(state.emissive);
      if (state.intensity !== undefined) material.emissiveIntensity = state.intensity;
      material.emissiveMap = state.map ? material.map : null;
      material.needsUpdate = true;
    }
  });
}
