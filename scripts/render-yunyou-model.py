"""Offline inspection of exported site geometry. Requires mitsuba, numpy.

These are path-traced model views, not browser screenshots or mobile FPS evidence.
python render-yunyou-model.py <scene-directory> <output.png> [overview|close] [width] [spp]
"""
import json
import sys
from pathlib import Path
import numpy as np
import mitsuba as mi
import drjit as dr

mi.set_variant('llvm_ad_rgb')

class SurfaceTexture(mi.Texture):
    def __init__(self, props):
        super().__init__(props)
        self.image = props.get('image')
        self.tint = mi.Color3f(props.get('tint', [1, 1, 1]))
        self.vertex = props.get('vertex', False)
        self.normal_strength = props.get('normal_strength', -1.0)
        self.attribute = mi.load_dict({'type': 'mesh_attribute', 'name': 'vertex_color'}) if self.vertex else None

    def eval_3(self, si, active=True):
        value = self.image.eval_3(si, active) if self.image is not None else mi.Color3f(1)
        if self.normal_strength >= 0:
            n = value * 2 - 1
            n.x *= self.normal_strength
            n.y *= self.normal_strength
            return dr.normalize(n) * .5 + .5
        value *= self.tint
        if self.attribute is not None:
            value *= self.attribute.eval_3(si, active)
        return value

    def eval(self, si, active=True):
        return self.eval_3(si, active)

    def eval_1(self, si, active=True):
        value = self.image.eval_1(si, active) if self.image is not None else mi.Float(1)
        return value * dr.mean(self.tint)

    def mean(self):
        return dr.mean(self.tint) * (self.image.mean() if self.image is not None else 1)

    def max(self):
        return dr.max(self.tint)

    def is_spatially_varying(self):
        return True

    def to_string(self):
        return 'SiteSurfaceTexture[]'

mi.register_texture('site_surface', lambda p: SurfaceTexture(p))

folder = Path(sys.argv[1])
output = Path(sys.argv[2])
view = sys.argv[3] if len(sys.argv) > 3 else 'overview'
width = int(sys.argv[4]) if len(sys.argv) > 4 else 1400
spp = int(sys.argv[5]) if len(sys.argv) > 5 else 48
meta = json.loads((folder / 'scene.json').read_text())
S = mi.ScalarTransform4f

def bitmap(info, raw=False):
    if not info:
        return None
    repeat, offset = info['repeat'], info['offset']
    # Three's ordinary image textures use a lower-left UV origin.
    to_uv = mi.ScalarTransform3f().translate([offset[0], 1-offset[1]]).scale([repeat[0], -repeat[1]])
    return {'type': 'bitmap', 'filename': info['filename'], 'raw': raw, 'to_uv': to_uv, 'wrap_mode': 'repeat', 'filter_type': 'bilinear'}

def surface(m):
    color = {'type': 'site_surface', 'tint': m['color'], 'vertex': True}
    if m['map']:
        color['image'] = bitmap(m['map'])
    roughness = max(.035, m['roughness'])
    bsdf = {'type': 'principled', 'base_color': color, 'roughness': roughness, 'metallic': m['metalness']}
    if m['roughnessMap']:
        bsdf['roughness'] = {'type': 'site_surface', 'tint': [roughness]*3, 'image': bitmap(m['roughnessMap'], True)}
    if m['normalMap']:
        bsdf = {'type': 'normalmap', 'normalmap': {'type':'site_surface','image':bitmap(m['normalMap'],True),'normal_strength':float(m['normalScale'][0])}, 'bsdf': bsdf}
    if m['side'] == 2:
        bsdf = {'type': 'twosided', 'bsdf': bsdf}
    return mi.load_dict(bsdf)

camera = ([39, 25, 59], [0, 11, 0], 45) if view == 'overview' else ([13, 11.8, 26], [0, 12.9, 4.5], 48)
scene_data = {
    'type': 'scene',
    'integrator': {'type': 'path', 'max_depth': 5},
    'sensor': {'type': 'perspective', 'fov': camera[2], 'to_world': S().look_at(origin=camera[0], target=camera[1], up=[0,1,0]),
        'sampler': {'type':'independent','sample_count':spp},
        'film': {'type':'hdrfilm','width':width,'height':round(width*.75),'rfilter':{'type':'tent'}}},
    'sky': {'type': 'constant', 'radiance': {'type':'rgb','value':[.36,.4,.46]}},
    'sun': {'type': 'directional', 'direction':[-.5,-1,-.7], 'irradiance':{'type':'rgb','value':[2.55,2.4,2.18]}},
    'ground': {'type':'rectangle','to_world':S().rotate([1,0,0],-90).scale(500), 'bsdf':{'type':'diffuse','reflectance':{'type':'rgb','value':[.32,.34,.32]}}},
}
for i, entry in enumerate(meta['meshes']):
    n = entry['vertices']
    data = np.fromfile(folder / entry['file'], dtype='<f4')
    positions, normals, uvs, colors = data[:n*3], data[n*3:n*6], data[n*6:n*8], data[n*8:n*11]
    mesh = mi.Mesh('surface-' + str(i), n, n//3, has_vertex_normals=True, has_vertex_texcoords=True)
    params = mi.traverse(mesh)
    params['vertex_positions'] = positions
    params['vertex_normals'] = normals
    params['vertex_texcoords'] = uvs
    params['faces'] = np.arange(n, dtype=np.uint32)
    params.update()
    mesh.add_attribute('vertex_color', 3, colors)
    mesh.set_bsdf(surface(entry['material']))
    scene_data['mesh-' + str(i)] = mesh

print(json.dumps({'view':view,'width':width,'spp':spp,'triangles':meta['triangleCount']}), flush=True)
scene = mi.load_dict(scene_data)
result = mi.render(scene, spp=spp, seed=24)
rgb = np.maximum(np.array(result) * 1.12, 0)
rgb = np.clip((rgb*(2.51*rgb+.03))/(rgb*(2.43*rgb+.59)+.14),0,1)
output.parent.mkdir(parents=True,exist_ok=True)
mi.Bitmap(rgb.astype(np.float32)).convert(mi.Bitmap.PixelFormat.RGB, mi.Struct.Type.UInt8, True).write(str(output))
print(str(output),flush=True)
