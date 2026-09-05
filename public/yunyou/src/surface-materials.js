import * as THREE from 'three';

// Original 1K Poly Haven channels; only colour is decoded as sRGB.
// See assets/tex/pbr/SOURCES.json. Texture coordinates are in metres.
export function loadSurfaceTextures() {
  const loader = new THREE.TextureLoader(), surfaces = {};
  for (const name of ['wood', 'paving', 'plaster']) {
    const channels = {};
    for (const channel of ['color', 'normal', 'roughness', 'ao']) {
      const texture = loader.load(new URL('../assets/tex/pbr/' + name + '/' + channel + '.jpg', import.meta.url).href);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = channel === 'color' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.anisotropy = 8;
      channels[channel] = texture;
    }
    surfaces[name] = channels;
  }
  return surfaces;
}

const cache = new WeakMap();
export function heritageMaterials(TEX) {
  if (cache.has(TEX)) return cache.get(TEX);
  const make = (surface, color, roughness, metres, strength) => {
    const maps = TEX.pbr?.[surface] ?? {};
    const m = new THREE.MeshStandardMaterial({
      color, map: maps.color ?? null, normalMap: maps.normal ?? null,
      normalScale: new THREE.Vector2(strength, strength), roughnessMap: maps.roughness ?? null,
      aoMap: maps.ao ?? null, aoMapIntensity: .65, roughness, metalness: 0,
    });
    m.name = 'heritage-' + surface;
    m.userData = { surface, metres };
    return m;
  };
  const wood = make('wood', 0xd5d0c1, .9, .6, .28);
  const paving = make('paving', 0xe5e4df, .96, 3, .48);
  const plaster = make('plaster', 0xeee9dc, .94, 2, .2);
  const dressedStone = make('plaster', 0xbdbeb3, .93, .75, .45);
  const roof = make('plaster', 0x878a7e, .9, .8, .27);
  const result = { wood, paving, plaster, dressedStone, roof };
  cache.set(TEX, result);
  return result;
}
