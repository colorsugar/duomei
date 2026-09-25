# blender -b --python build.py -- <workdir> <old_glb> <out_dir> [preview]
import bpy, bmesh, sys, os, math
from mathutils import Vector
argv=sys.argv[sys.argv.index('--')+1:]
W,OLD,OUT=argv[0],argv[1],argv[2];PREVIEW=len(argv)>3
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene

def imp_ply(name):
    bpy.ops.wm.ply_import(filepath=os.path.join(W,name+'.ply'))
    o=bpy.context.selected_objects[0];o.name='xiangbishan-'+name
    bpy.context.view_layer.objects.active=o
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.02);bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.mesh.delete_loose();bpy.ops.mesh.dissolve_degenerate(threshold=0.01)
    bpy.ops.object.mode_set(mode='OBJECT');o.data.validate();bpy.ops.object.shade_smooth()
    return o
rock=imp_ply('rock');canopy=imp_ply('canopy')

def decimate(o,ratio):
    m=o.modifiers.new('dec','DECIMATE');m.ratio=ratio
    bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier='dec')
decimate(rock,.72);decimate(canopy,.42)

def box_uv(o,size):
    bpy.context.view_layer.objects.active=o;o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.cube_project(cube_size=size,correct_aspect=False,scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
box_uv(rock,14);box_uv(canopy,9)

def material(name,tex,rough):
    m=bpy.data.materials.new(name);m.use_nodes=True;nt=m.node_tree
    bsdf=nt.nodes['Principled BSDF'];bsdf.inputs['Roughness'].default_value=rough
    img=nt.nodes.new('ShaderNodeTexImage');img.image=bpy.data.images.load(os.path.join(W,tex))
    col=nt.nodes.new('ShaderNodeVertexColor');col.layer_name='Col'
    mix=nt.nodes.new('ShaderNodeMix');mix.data_type='RGBA';mix.blend_type='MULTIPLY';mix.inputs['Factor'].default_value=1
    nt.links.new(img.outputs['Color'],mix.inputs[6]);nt.links.new(col.outputs['Color'],mix.inputs[7])
    nt.links.new(mix.outputs[2],bsdf.inputs['Base Color'])
    return m
for o,mat in [(rock,material('xiangbishan:karst',  'rock-detail.jpg',.92)),(canopy,material('xiangbishan:canopy','leaf-detail.jpg',.85))]:
    o.data.materials.clear();o.data.materials.append(mat)
    ca=o.data.color_attributes
    if 'Col' not in ca: ca[0].name='Col'
    ca.active_color=ca['Col']

# Keep the pagoda and shore works from the previous asset; re-seat the pagoda on the new rock.
bpy.ops.import_scene.gltf(filepath=OLD)
keep=[];
for o in list(bpy.context.selected_objects):
    if o.type=='MESH' and o.name!='xiangbishan实体构件 0' and 'xiangbishan实体构件' in o.name: keep.append(o)
    elif o.type=='MESH': bpy.data.objects.remove(o)
for o in list(bpy.data.objects):
    if o.type=='EMPTY': bpy.data.objects.remove(o)
pagoda=[o for o in keep if o.name.endswith('1')]
if pagoda:
    p=pagoda[0];bb=[p.matrix_world@Vector(c) for c in p.bound_box];cx=sum(v.x for v in bb)/8;cy=sum(v.y for v in bb)/8;zmin=min(v.z for v in bb)
    p.location.z+=500;bpy.context.view_layer.update()
    for m in p.data.materials:
        if m and m.use_nodes and 'Principled BSDF' in m.node_tree.nodes:
            b=m.node_tree.nodes['Principled BSDF'];b.inputs['Base Color'].default_value=(.30,.27,.24,1)  # weathered Ming brick, not white
            for l in list(b.inputs['Base Color'].links): m.node_tree.links.remove(l)
    deps=bpy.context.evaluated_depsgraph_get()
    hit,loc,*_=scene.ray_cast(deps,Vector((cx,cy,200)),Vector((0,0,-1)))
    # ray hits canopy first if any; the pagoda sits in a clearing so the first hit is rock
    p.location.z-=500
    if hit: p.location.z+=loc.z-zmin-.4;print('pagoda seated at',loc.z)

# Ambient occlusion baked into vertex colour (canopy shades the rock and itself).
scene.render.engine='CYCLES';scene.cycles.samples=96;scene.cycles.device='CPU'
bpy.data.worlds.new('w');scene.world=bpy.data.worlds['w']
scene.world.light_settings.distance=9
for o in (rock,canopy):
    ca=o.data.color_attributes;ao=ca.new('AO','FLOAT_COLOR','POINT');ca.active_color=ao
    for x in bpy.context.selected_objects:x.select_set(False)
    o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.bake(type='AO',target='VERTEX_COLORS')
    col=ca['Col'];
    for i,(c,a) in enumerate(zip(col.data,ao.data)):
        k=(.42 if o is canopy else .38)+(.58 if o is canopy else .62)*a.color[0];c.color=(c.color[0]*k,c.color[1]*k,c.color[2]*k,1)
    ca.remove(ao);ca.active_color=ca['Col'];o.select_set(False)
for o in (rock,canopy):
    o['lmId']='xiangbishan';o['sourceBaseline']='sdf-2026-09-26'

def export(path,objs,draco_level=7):
    for x in bpy.context.selected_objects:x.select_set(False)
    for o in objs:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path,use_selection=True,export_format='GLB',export_extras=True,export_vertex_color='ACTIVE',
        export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=draco_level,export_image_format='JPEG',export_jpeg_quality=84,export_apply=True)
    print('exported',path,os.path.getsize(path))
export(os.path.join(OUT,'xiangbishan.glb'),[rock,canopy]+keep)
# Far copy: heavier decimation, no small shore parts.
far=[]
for o in (rock,canopy):
    c=o.copy();c.data=o.data.copy();scene.collection.objects.link(c);decimate(c,.3);far.append(c)
export(os.path.join(OUT,'xiangbishan-far.glb'),far+pagoda)
for c in far:bpy.data.objects.remove(c)

if PREVIEW:
    scene.render.engine='BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE_NEXT'
    scene.render.resolution_x,scene.render.resolution_y=1280,800
    w=scene.world;w.use_nodes=True;w.node_tree.nodes['Background'].inputs[0].default_value=(.45,.58,.75,1);w.node_tree.nodes['Background'].inputs[1].default_value=.9
    sun=bpy.data.lights.new('sun','SUN');sun.energy=3.2;so=bpy.data.objects.new('sun',sun);scene.collection.objects.link(so);so.rotation_euler=(math.radians(50),0,math.radians(140))
    bpy.ops.mesh.primitive_plane_add(size=600,location=(-198,-1450,.3));wat=bpy.context.object
    wm=bpy.data.materials.new('water');wm.use_nodes=True;wm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.05,.14,.11,1);wm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.08;wat.data.materials.append(wm)
    cam=bpy.data.cameras.new('c');cam.lens=35;co=bpy.data.objects.new('c',cam);scene.collection.objects.link(co);scene.camera=co
    for i,(pos,tgt) in enumerate([((-40,-1300,60),(-190,-1440,20)),((-150,-1250,35),(-185,-1430,18)),((-330,-1380,45),(-195,-1450,20))]):
        co.location=pos;d=Vector(tgt)-Vector(pos);co.rotation_euler=d.to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=os.path.join(W,f'preview{i}.png');bpy.ops.render.render(write_still=True)
