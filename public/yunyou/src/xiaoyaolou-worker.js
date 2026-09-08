// Decode geometry off the UI thread, then transfer its typed buffers without copying.
const types = { Float32Array, Uint32Array, Uint16Array, Uint8Array, Int32Array, Int16Array, Int8Array };
self.onmessage = async ({ data: { id, url } }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Map asset: ${response.status}`);
    const bytes = await response.arrayBuffer();
    const magic = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
    let decoded = new Response(bytes);
    if (magic[0] === 0x1f && magic[1] === 0x8b) {
      if (typeof DecompressionStream === 'function') {
        decoded = new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')));
      } else {
        const { gunzipSync } = await import('../vendor/three/addons/libs/fflate.module.js');
        decoded = new Response(gunzipSync(new Uint8Array(bytes)));
      }
    }
    const json = await decoded.json();
    const buffers = [];
    function convert(attribute) {
      if (!attribute?.array) return;
      const Type = types[attribute.type];
      if (!Type) throw new Error(`Unsupported geometry attribute: ${attribute.type}`);
      const array = new Type(attribute.array);
      attribute.array = array;
      buffers.push(array.buffer);
    }
    for (const geometry of json.geometries || []) {
      if (geometry.type !== 'BufferGeometry') throw new Error('Map geometry was not prebuilt');
      convert(geometry.data.index);
      for (const attribute of Object.values(geometry.data.attributes)) convert(attribute);
    }
    function visit(object) {
      convert(object.instanceMatrix);
      convert(object.instanceColor);
      for (const child of object.children || []) visit(child);
    }
    visit(json.object);
    self.postMessage({ id, json }, buffers);
  } catch (error) {
    self.postMessage({ id, error: error.message });
  } finally {
    clearTimeout(timeout);
  }
};
