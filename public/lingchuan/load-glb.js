import * as THREE from './vendor/three.module.js';

const COMPONENTS = {
  5120: Int8Array, 5121: Uint8Array, 5122: Int16Array,
  5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array,
};
const ITEM_SIZES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const WRAPS = { 33071: THREE.ClampToEdgeWrapping, 33648: THREE.MirroredRepeatWrapping, 10497: THREE.RepeatWrapping };
const FILTERS = {
  9728: THREE.NearestFilter, 9729: THREE.LinearFilter,
  9984: THREE.NearestMipmapNearestFilter, 9985: THREE.LinearMipmapNearestFilter,
  9986: THREE.NearestMipmapLinearFilter, 9987: THREE.LinearMipmapLinearFilter,
};

function abortError(signal) {
  if (signal?.reason instanceof Error) return signal.reason;
  return new DOMException('The GLB load was aborted.', 'AbortError');
}

function checkAbort(signal) {
  if (signal?.aborted) throw abortError(signal);
}

function abortable(promise, signal) {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const abort = () => reject(abortError(signal));
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

async function browserDecodeImage(bytes, mimeType, { signal } = {}) {
  checkAbort(signal);
  const blob = new Blob([bytes], { type: mimeType });
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
      if (signal?.aborted) { bitmap.close(); throw abortError(signal); }
      return bitmap;
    } catch (error) {
      checkAbort(signal);
      if (typeof Image === 'undefined') throw error;
    }
  }
  if (typeof Image === 'undefined') throw new Error('GLB: image decoding is unavailable; supply decodeImage.');
  const url = URL.createObjectURL(blob);
  const image = new Image();
  try {
    return await new Promise((resolve, reject) => {
      const cleanup = () => {
        image.onload = image.onerror = null;
        signal?.removeEventListener('abort', abort);
      };
      const abort = () => { cleanup(); image.src = ''; reject(abortError(signal)); };
      image.onload = () => { cleanup(); resolve(image); };
      image.onerror = () => { cleanup(); reject(new Error('GLB: embedded image could not be decoded.')); };
      if (signal?.aborted) { abort(); return; }
      signal?.addEventListener('abort', abort, { once: true });
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function integer(value, label, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`GLB: invalid ${label}.`);
  return value;
}

function parseContainer(input) {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input)
    : ArrayBuffer.isView(input) ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength) : null;
  if (!bytes || bytes.byteLength < 20) throw new Error('GLB: an ArrayBuffer or typed-array view of a complete GLB is required.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('GLB: invalid magic header.');
  if (view.getUint32(4, true) !== 2) throw new Error('GLB: only version 2 is supported.');
  if (view.getUint32(8, true) !== bytes.byteLength || bytes.byteLength % 4) throw new Error('GLB: invalid total length.');
  let json;
  let bin;
  for (let offset = 12; offset < bytes.length;) {
    if (offset + 8 > bytes.length) throw new Error('GLB: truncated chunk header.');
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const end = offset + 8 + length;
    if (length % 4 || end > bytes.length) throw new Error('GLB: invalid chunk length or alignment.');
    if (offset === 12 && type !== 0x4e4f534a) throw new Error('GLB: the first chunk must be JSON.');
    const chunk = bytes.subarray(offset + 8, end);
    if (type === 0x4e4f534a) {
      if (json !== undefined) throw new Error('GLB: duplicate JSON chunks.');
      try { json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(chunk)); }
      catch (cause) { throw new Error('GLB: invalid UTF-8 JSON.', { cause }); }
    } else if (type === 0x004e4942) {
      if (bin !== undefined) throw new Error('GLB: duplicate BIN chunks.');
      bin = chunk;
    }
    offset = end;
  }
  if (json?.asset?.version !== '2.0') throw new Error('GLB: JSON asset.version must be 2.0.');
  const unsupported=(json.extensionsRequired??[]).filter(name=>name!=='KHR_mesh_quantization');
  if(unsupported.length)throw new Error(`GLB: required extensions are unsupported: ${unsupported.join(', ')}.`);
  if (json.skins?.length || json.animations?.length) throw new Error('GLB: skins and animations are unsupported.');
  if (json.buffers?.length) {
    if (json.buffers.length !== 1 || json.buffers[0].uri || !bin) throw new Error('GLB: exactly one embedded BIN buffer is supported.');
    const length = integer(json.buffers[0].byteLength, 'buffer byteLength');
    if (length > bin.length || bin.length - length > 3) throw new Error('GLB: BIN length does not match the declared buffer.');
    bin = bin.subarray(0, length);
  } else if (json.bufferViews?.length) throw new Error('GLB: bufferViews require a BIN buffer.');
  return { json, bin };
}

/**
 * Parse GLBs produced by exportGLB. Supports one triangle primitive per mesh,
 * packed/strided accessors and quantized normals, embedded PNGs, PBR materials, transforms and extras.
 * Input can be an ArrayBuffer or a typed-array view with a nonzero byteOffset.
 * For Node verification inject async decodeImage(Uint8Array, mimeType, {signal})
 * returning an image source (a fake {width, height, close()} is sufficient).
 * The returned root is the original scene node when the scene has one root.
 * dispose() is idempotent and releases all allocated GPU/image resources.
 */
export async function parseCampusGLB(buffer, { decodeImage = browserDecodeImage, signal } = {}) {
  checkAbort(signal);
  const { json, bin } = parseContainer(buffer);
  const geometries = new Set();
  const textures = new Set();
  const images = new Set();
  const materials = [];
  const accessorCache = new Map();
  const imageCache = new Map();
  const textureCache = new Map();
  const meshCache = new Map();
  let disposed = false;
  let root;

  function closeImage(image) {
    if (typeof image?.close === 'function') image.close();
    else if (typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement) image.src = '';
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
    for (const image of images) closeImage(image);
    geometries.clear(); textures.clear(); images.clear();
  }

  function bufferView(index) {
    integer(index, 'bufferView index');
    const definition = json.bufferViews?.[index];
    if (!definition || definition.buffer !== 0 || !bin) throw new Error(`GLB: invalid bufferView ${index}.`);
    const offset = integer(definition.byteOffset ?? 0, 'bufferView byteOffset');
    const length = integer(definition.byteLength, 'bufferView byteLength');
    if (offset + length > bin.length) throw new Error('GLB: bufferView exceeds BIN bounds.');
    return { definition, bytes: bin.subarray(offset, offset + length) };
  }

  function accessor(index, semantic) {
    integer(index, 'accessor index');
    const definition = json.accessors?.[index];
    if (!definition || definition.sparse) throw new Error(`GLB: missing or sparse accessor ${index} is unsupported.`);
    const ArrayType = COMPONENTS[definition.componentType];
    const itemSize = ITEM_SIZES[definition.type];
    if (!ArrayType || !itemSize) throw new Error('GLB: unsupported accessor component type or shape.');
    if (semantic === 'indices' && (definition.type !== 'SCALAR' || ![5121, 5123, 5125].includes(definition.componentType) || definition.normalized)) {
      throw new Error('GLB: indices must be unsigned, unnormalized SCALAR values.');
    }
    if (semantic === 'position' && (definition.type !== 'VEC3' || definition.componentType !== 5126)) {
      throw new Error('GLB: POSITION must be FLOAT VEC3.');
    }
    if (semantic === 'normal' && definition.type !== 'VEC3') throw new Error('GLB: NORMAL must be VEC3.');
    if (semantic === 'uv' && definition.type !== 'VEC2') throw new Error('GLB: TEXCOORD_0 must be VEC2.');
    if (accessorCache.has(index)) return accessorCache.get(index);
    const { definition: view, bytes } = bufferView(definition.bufferView);

    const count = integer(definition.count, 'accessor count', 1);
    const offset = integer(definition.byteOffset ?? 0, 'accessor byteOffset');
    const packedStride=itemSize*ArrayType.BYTES_PER_ELEMENT;
    const stride=view.byteStride??packedStride;
    if(stride<packedStride||stride%ArrayType.BYTES_PER_ELEMENT)throw new Error('GLB: invalid byteStride.');
    const size=(count-1)*stride+packedStride;
    if (offset % ArrayType.BYTES_PER_ELEMENT || !Number.isSafeInteger(size) || offset + size > bytes.length) {
      throw new Error('GLB: accessor alignment or bounds are invalid.');
    }
    const absoluteOffset = bytes.byteOffset + offset;
    // A caller's typed-array slice can begin at an unaligned host buffer address.
    const storage = absoluteOffset % ArrayType.BYTES_PER_ELEMENT
      ? bytes.slice(offset, offset + size) : bytes.subarray(offset, offset + size);
    let array;
    if(stride===packedStride)array=new ArrayType(storage.buffer,storage.byteOffset,count*itemSize);
    else{array=new ArrayType(count*itemSize);for(let i=0;i<count;i++){const tuple=new ArrayType(storage.buffer,storage.byteOffset+i*stride,itemSize);array.set(tuple,i*itemSize);}}
    const result = new THREE.BufferAttribute(array, itemSize, definition.normalized === true);
    accessorCache.set(index, result);
    return result;
  }

  async function imageSource(index) {
    integer(index, 'image index');
    if (imageCache.has(index)) return imageCache.get(index);
    const definition = json.images?.[index];
    if (!definition || definition.uri || definition.mimeType !== 'image/png') throw new Error('GLB: only embedded PNG images are supported.');
    const { bytes } = bufferView(definition.bufferView);
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (bytes.length < 24 || signature.some((value, i) => bytes[i] !== value)) throw new Error('GLB: invalid embedded PNG.');
    const pending = Promise.resolve().then(() => decodeImage(bytes, definition.mimeType, { signal })).then((image) => {
      if (!image) throw new Error('GLB: decodeImage returned no image.');
      if (disposed || signal?.aborted) { closeImage(image); throw abortError(signal); }
      images.add(image);
      return image;
    });
    const image = await abortable(pending, signal);
    imageCache.set(index, image);
    return image;
  }

  async function texture(index) {
    integer(index, 'texture index');
    if (textureCache.has(index)) return textureCache.get(index);
    const definition = json.textures?.[index];
    if (!definition) throw new Error(`GLB: missing texture ${index}.`);
    const source = await imageSource(definition.source);
    checkAbort(signal);
    const sampler = definition.sampler === undefined ? {} : json.samplers?.[definition.sampler];
    if (!sampler) throw new Error('GLB: missing texture sampler.');
    const result = new THREE.Texture(source);
    textures.add(result);
    result.name = definition.name ?? json.images[definition.source].name ?? '';
    result.colorSpace = THREE.SRGBColorSpace;
    result.flipY = false;
    result.wrapS = WRAPS[sampler.wrapS ?? 10497];
    result.wrapT = WRAPS[sampler.wrapT ?? 10497];
    result.magFilter = FILTERS[sampler.magFilter ?? 9729];
    result.minFilter = FILTERS[sampler.minFilter ?? 9987];
    if ([result.wrapS, result.wrapT, result.magFilter, result.minFilter].some((value) => value === undefined)) {
      throw new Error('GLB: unsupported sampler setting.');
    }
    result.needsUpdate = true;
    textureCache.set(index, result);
    return result;
  }

  async function buildMaterials() {
    for (const definition of json.materials ?? []) {
      checkAbort(signal);
      const pbr = definition.pbrMetallicRoughness ?? {};
      const factor = pbr.baseColorFactor ?? [1, 1, 1, 1];
      const result = new THREE.MeshStandardMaterial();
      materials.push(result);
      result.name = definition.name ?? '';
      result.color.fromArray(factor); // glTF and Three.js color storage are linear.
      result.opacity = factor[3] ?? 1;
      result.roughness = pbr.roughnessFactor ?? 1;
      result.metalness = pbr.metallicFactor ?? 1;
      result.emissive.fromArray(definition.emissiveFactor ?? [0, 0, 0]);
      result.side = definition.doubleSided ? THREE.DoubleSide : THREE.FrontSide;
      const alphaMode = definition.alphaMode ?? 'OPAQUE';
      if (!['OPAQUE', 'MASK', 'BLEND'].includes(alphaMode)) throw new Error('GLB: unsupported alphaMode.');
      if (alphaMode === 'BLEND') { result.transparent = true; result.depthWrite = false; }
      else if (alphaMode === 'MASK') result.alphaTest = definition.alphaCutoff ?? 0.5;
      else result.opacity = 1;
      if (pbr.baseColorTexture) {
        if ((pbr.baseColorTexture.texCoord ?? 0) !== 0) throw new Error('GLB: only texture coordinate set 0 is supported.');
        result.map = await texture(pbr.baseColorTexture.index);
      }
      result.userData = definition.extras ?? {};
    }
  }

  function meshData(index) {
    integer(index, 'mesh index');
    if (meshCache.has(index)) return meshCache.get(index);
    const definition = json.meshes?.[index];
    if (!definition || definition.primitives?.length !== 1) throw new Error('GLB: each mesh must have exactly one primitive.');
    const primitive = definition.primitives[0];
    if ((primitive.mode ?? 4) !== 4 || primitive.targets?.length || primitive.extensions?.KHR_draco_mesh_compression) {
      throw new Error('GLB: only uncompressed triangle meshes without morph targets are supported.');
    }
    const geometry = new THREE.BufferGeometry();
    geometries.add(geometry);
    geometry.name = definition.name ?? '';
    geometry.userData = definition.extras ?? {};
    const position = accessor(primitive.attributes?.POSITION, 'position');
    geometry.setAttribute('position', position);
    for (const [semantic, name] of [['NORMAL', 'normal'], ['TEXCOORD_0', 'uv']]) {
      if (primitive.attributes[semantic] !== undefined) {
        const attribute = accessor(primitive.attributes[semantic], name);
        if (attribute.count !== position.count) throw new Error('GLB: vertex attribute counts differ.');
        geometry.setAttribute(name, attribute);
      }
    }
    if (primitive.indices !== undefined) {
      const indices = accessor(primitive.indices, 'indices');
      if (indices.count % 3) throw new Error('GLB: index count does not contain complete triangles.');
      for (const value of indices.array) if (value >= position.count) throw new Error('GLB: index exceeds position count.');
      geometry.setIndex(indices);
    } else if (position.count % 3) throw new Error('GLB: vertex count does not contain complete triangles.');
    const positionDefinition = json.accessors[primitive.attributes.POSITION];
    if (positionDefinition.min?.length === 3 && positionDefinition.max?.length === 3) {
      geometry.boundingBox = new THREE.Box3(new THREE.Vector3().fromArray(positionDefinition.min), new THREE.Vector3().fromArray(positionDefinition.max));
    } else geometry.computeBoundingBox();
    let material;
    if (primitive.material === undefined) {
      material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 1 });
      materials.push(material);
    } else {
      integer(primitive.material, 'material index');
      material = materials[primitive.material];
      if (!material) throw new Error('GLB: missing material.');
    }
    if (material.map && !geometry.getAttribute('uv')) throw new Error('GLB: a textured mesh needs UVs.');
    const result = { geometry, material };
    meshCache.set(index, result);
    return result;
  }

  try {
    await buildMaterials();
    checkAbort(signal);
    const definitions = json.nodes ?? [];
    const nodes = definitions.map((definition) => {
      if (definition.skin !== undefined || definition.extensions?.EXT_mesh_gpu_instancing) throw new Error('GLB: skinning and GPU instancing are unsupported.');
      const data = definition.mesh === undefined ? null : meshData(definition.mesh);
      const node = data ? new THREE.Mesh(data.geometry, data.material) : new THREE.Group();
      node.name = definition.name ?? '';
      node.userData = definition.extras ?? {};
      if (definition.matrix) {
        if (definition.matrix.length !== 16 || definition.matrix.some((value) => !Number.isFinite(value))) throw new Error('GLB: invalid node matrix.');
        node.matrix.fromArray(definition.matrix);
        node.matrix.decompose(node.position, node.quaternion, node.scale);
        node.matrixAutoUpdate = false;
      } else {
        if (definition.translation) node.position.fromArray(definition.translation);
        if (definition.rotation) node.quaternion.fromArray(definition.rotation);
        if (definition.scale) node.scale.fromArray(definition.scale);
      }
      return node;
    });
    const parentIndices = new Map();
    for (let i = 0; i < definitions.length; i++) {
      for (const child of definitions[i].children ?? []) {
        integer(child, 'child node index');
        if (!nodes[child] || parentIndices.has(child)) throw new Error('GLB: missing child or node with multiple parents.');
        parentIndices.set(child, i);
      }
    }
    for (let i = 0; i < definitions.length; i++) {
      const seen = new Set([i]);
      for (let ancestor = parentIndices.get(i); ancestor !== undefined; ancestor = parentIndices.get(ancestor)) {
        if (seen.has(ancestor)) throw new Error('GLB: cyclic node hierarchy.');
        seen.add(ancestor);
      }
      for (const child of definitions[i].children ?? []) nodes[i].add(nodes[child]);
    }
    const scene = json.scenes?.[json.scene ?? 0];
    if (!scene || !Array.isArray(scene.nodes)) throw new Error('GLB: no valid default scene.');
    const sceneNodes = scene.nodes.map((index) => {
      integer(index, 'scene node index');
      if (!nodes[index] || parentIndices.has(index)) throw new Error('GLB: invalid scene root.');
      return nodes[index];
    });
    if (new Set(sceneNodes).size !== sceneNodes.length) throw new Error('GLB: duplicate scene roots.');
    root = sceneNodes.length === 1 ? sceneNodes[0] : new THREE.Group();
    if (sceneNodes.length !== 1) {
      root.name = scene.name ?? 'Campus';
      root.userData = scene.extras ?? {};
      root.add(...sceneNodes);
    }
    root.updateMatrixWorld(true);
    checkAbort(signal);
    return { root, materials, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}

/**
 * Fetch and parse a campus GLB. onProgress receives
 * {loaded, total, lengthComputable, progress}; progress is null until a total is
 * known, and 1 when downloading is complete. Pass AbortController.signal to
 * cancel both the download and image decoding. Call dispose() when replacing it.
 */
export async function loadCampusGLB(url, { signal, onProgress } = {}) {
  checkAbort(signal);
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`GLB: HTTP ${response.status} loading ${url}.`);
  const contentLength = Number(response.headers.get('content-length'));
  const total = Number.isSafeInteger(contentLength) && contentLength > 0 ? contentLength : 0;
  const report = (loaded, complete = false) => onProgress?.({
    loaded, total, lengthComputable: total > 0,
    progress: complete ? 1 : total ? Math.min(loaded / total, 1) : null,
  });
  report(0);
  let buffer;
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const chunks = [];
    let loaded = 0;
    try {
      while (true) {
        checkAbort(signal);
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        report(loaded);
      }
    } catch (error) {
      await reader.cancel().catch(() => {});
      throw error;
    } finally {
      reader.releaseLock();
    }
    checkAbort(signal);
    const bytes = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    buffer = bytes.buffer;
    report(loaded, true);
  } else {
    buffer = await response.arrayBuffer();
    report(buffer.byteLength, true);
  }
  checkAbort(signal);
  // Static hosts may serve gzip assets without Content-Encoding; decode explicitly.
  const header = new Uint8Array(buffer, 0, Math.min(2, buffer.byteLength));
  if (header[0] === 0x1f && header[1] === 0x8b) {
    if (typeof DecompressionStream === 'undefined') throw new Error('GLB: gzip decompression unavailable.');
    const decodedStream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'), { signal });
    buffer = await abortable(new Response(decodedStream).arrayBuffer(), signal);
    checkAbort(signal);
  }
  return parseCampusGLB(buffer, { signal });
}

export default loadCampusGLB;
