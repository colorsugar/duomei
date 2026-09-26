# blender -b --python build_trees.py -- <workdir> <out.glb> <leaf-detail.jpg> [preview]
import bpy, sys, os, math
from mathutils import Vector
argv=sys.argv[sys.argv.index('--')+1:];W,OUT,LEAF=argv[:3];PREVIEW=len(argv)>3
bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene
def imp(path,name):
    bpy.ops.wm.ply_import(filepath=path);o=bpy.context.selected_objects[0];o.name=name
    bpy.context.view_layer.objects.active=o;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=.002);bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.shade_smooth();ca=o.data.color_attributes;ca[0].name='Col';ca.active_color=ca['Col'];return o
leaf=bpy.data.materials.new('broadleaf green');leaf.use_nodes=True;nt=leaf.node_tree;b=nt.nodes['Principled BSDF']
img=nt.nodes.new('ShaderNodeTexImage');img.image=bpy.data.images.load(LEAF);vc=nt.nodes.new('ShaderNodeVertexColor');vc.layer_name='Col'
mix=nt.nodes.new('ShaderNodeMix');mix.data_type='RGBA';mix.blend_type='MULTIPLY';mix.inputs['Factor'].default_value=1
nt.links.new(img.outputs['Color'],mix.inputs[6]);nt.links.new(vc.outputs['Color'],mix.inputs[7]);nt.links.new(mix.outputs[2],b.inputs['Base Color']);b.inputs['Roughness'].default_value=.9
bark=bpy.data.materials.new('banyan bark');bark.use_nodes=True;nb=bark.node_tree;vb=nb.nodes.new('ShaderNodeVertexColor');vb.layer_name='Col';nb.links.new(vb.outputs['Color'],nb.nodes['Principled BSDF'].inputs['Base Color'])
cardmat=bpy.data.materials.new('leaf cluster');cardmat.use_nodes=True;cn=cardmat.node_tree;ci=cn.nodes.new('ShaderNodeTexImage');ci.image=bpy.data.images.load(os.path.join(W,'leaf-cluster.png'))
cb=cn.nodes['Principled BSDF'];cn.links.new(ci.outputs['Color'],cb.inputs['Base Color']);cn.links.new(ci.outputs['Alpha'],cb.inputs['Alpha']);cb.inputs['Roughness'].default_value=.8
cardmat.blend_method='CLIP' if hasattr(cardmat,'blend_method') else None
try: cardmat.surface_render_method='DITHERED'
except Exception: pass
scene.render.engine='CYCLES';scene.cycles.samples=64;w=bpy.data.worlds.new('w');scene.world=w;w.light_settings.distance=.6
roots=[]
for k,sp in enumerate(['camphor','banyan']):
    crown=imp(os.path.join(W,sp+'-crown.ply'),sp+' leaves');wood=imp(os.path.join(W,sp+'-wood.ply'),sp+' branches')
    for o in (crown,wood):o.data.materials.append(leaf if o is crown else bark)
    # AO into vertex colour (wood + crown occlude each other)
    ao=crown.data.color_attributes.new('AO','FLOAT_COLOR','POINT');crown.data.color_attributes.active_color=ao
    for x in bpy.context.selected_objects:x.select_set(False)
    crown.select_set(True);bpy.context.view_layer.objects.active=crown;bpy.ops.object.bake(type='AO',target='VERTEX_COLORS')
    col=crown.data.color_attributes['Col']
    for c,a in zip(col.data,ao.data):
        f=.45+.55*a.color[0];c.color=(c.color[0]*f,c.color[1]*f,c.color[2]*f,1)
    crown.data.color_attributes.remove(ao);crown.data.color_attributes.active_color=col
    bpy.context.view_layer.objects.active=crown;crown.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.cube_project(cube_size=.9,scale_to_bounds=False);bpy.ops.object.mode_set(mode='OBJECT');crown.select_set(False)
    base_tris=len(crown.data.polygons)
    # Leaf-cluster cards scattered over the crown surface break the smooth silhouette up close.
    import random, bmesh
    random.seed(k*7+1)
    polys=[p for p in crown.data.polygons];areas=[p.area for p in polys]
    def cards(n,size):
        bm=bmesh.new();uvl=bm.loops.layers.uv.new('UVMap')
        for p in random.choices(polys,weights=areas,k=n):
            c=Vector(p.center)+Vector(p.normal)*.04;nrm=Vector(p.normal)
            t=nrm.cross(Vector((0,0,1)));t=t.normalized() if t.length>1e-3 else Vector((1,0,0))
            b2=nrm.cross(t).normalized();ang=random.random()*6.283;t,b2=(t*math.cos(ang)+b2*math.sin(ang)),(b2*math.cos(ang)-t*math.sin(ang))
            tilt=random.uniform(-.5,.5);b2=(b2+nrm*tilt).normalized();s=size*random.uniform(.75,1.25)
            vs=[bm.verts.new(c+(t*x+b2*y)*s) for x,y in((-1,-1),(1,-1),(1,1),(-1,1))];f=bm.faces.new(vs)
            for l,(u,v) in zip(f.loops,((0,0),(1,0),(1,1),(0,1))):l[uvl].uv=(u,v)
        me=bpy.data.meshes.new(sp+' leafcards');bm.to_mesh(me);bm.free();o=bpy.data.objects.new(sp+' leafcards',me);scene.collection.objects.link(o);o.data.materials.append(cardmat);return o
    lc=[cards(260,.24),cards(70,.34),None]
    for lod,target in enumerate([2200,520,140]):
        e=bpy.data.objects.new(sp if lod==0 else f'{sp}.{lod:03d}',None);scene.collection.objects.link(e);e['species']=sp;e['lod']=lod;e.location.x=k*5;roots.append(e)
        if lc[lod]:lc[lod].parent=e;lc[lod].name=sp+' leafcards'+('' if lod==0 else f'.{lod:03d}')
        for src,tri in ((crown,target),(wood,None)):
            c=src.copy();c.data=src.data.copy();scene.collection.objects.link(c);c.parent=e;c.location.x=0
            if tri and tri<base_tris:
                m=c.modifiers.new('d','DECIMATE');m.ratio=tri/base_tris;bpy.context.view_layer.objects.active=c;bpy.ops.object.modifier_apply(modifier='d')
            c.name=src.name+('' if lod==0 else f'.{lod:03d}')
    bpy.data.objects.remove(crown);bpy.data.objects.remove(wood)
for e in roots:e.location.x=0
for x in bpy.context.selected_objects:x.select_set(False)
for e in roots:
    e.select_set(True)
    for c in e.children:c.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT,use_selection=True,export_format='GLB',export_extras=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=7,export_image_format='JPEG',export_jpeg_quality=82)
print('exported',OUT,os.path.getsize(OUT),[(e.name,[(c.name,len(c.data.polygons)) for c in e.children]) for e in roots])
if PREVIEW:
    for i,e in enumerate(roots):e.location.x=(i%3)*4;e.location.y=(i//3)*4
    scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x,scene.render.resolution_y=1100,700
    w.use_nodes=True;w.node_tree.nodes['Background'].inputs[0].default_value=(.5,.6,.75,1)
    s=bpy.data.lights.new('s','SUN');s.energy=3.5;so=bpy.data.objects.new('s',s);scene.collection.objects.link(so);so.rotation_euler=(math.radians(45),0,math.radians(40))
    cam=bpy.data.cameras.new('c');cam.lens=35;co=bpy.data.objects.new('c',cam);scene.collection.objects.link(co);scene.camera=co
    co.location=(4,-9,3.2);co.rotation_euler=(Vector((4,2,1))-co.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=os.path.join(W,'trees.png');bpy.ops.render.render(write_still=True)
