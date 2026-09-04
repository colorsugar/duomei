import bpy, math
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
N,M=320,20
v=[];f=[]
for i in range(N):
 t=i/N*math.tau;r=1.65+.36*math.cos(3*t)
 for j in range(M):
  u=j/M*math.tau;a=.61*math.cos(u);b=.065*math.sin(u);rr=a*math.cos(2*t)-b*math.sin(2*t);z=a*math.sin(2*t)+b*math.cos(2*t)
  v.append(((r+rr)*math.cos(t), (r+rr)*math.sin(t), .48*math.sin(3*t)+z))
for i in range(N):
 for j in range(M):
  f.append((i*M+j,((i+1)%N)*M+j,((i+1)%N)*M+(j+1)%M,i*M+(j+1)%M))
mesh=bpy.data.meshes.new('ribbon');mesh.from_pydata(v,[],f);mesh.update()
o=bpy.data.objects.new('Sculpture',mesh);bpy.context.collection.objects.link(o);o.rotation_euler=(.28,-.32,-.28)
for p in mesh.polygons:p.use_smooth=True
mat=bpy.data.materials.new('Pearlescent warm chrome');mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.79,.67,.52,1);bs.inputs['Metallic'].default_value=.96;bs.inputs['Roughness'].default_value=.19;bs.inputs['Coat Weight'].default_value=1;bs.inputs['Coat Roughness'].default_value=.14
o.data.materials.append(mat)
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.19,.12,.25,1);world.node_tree.nodes['Background'].inputs[1].default_value=.6
for name,pos,color,power,size in [('Key',(-4,5,5),(1,.93,.79),1600,5),('Edge',(5,0,2),(.64,.74,1),1400,4),('Ember',(0,-4,-2),(1,.18,.03),1800,3),('Top',(-2,3,-4),(.75,1,.53),1800,4)]:
 bpy.ops.object.light_add(type='AREA',location=pos);l=bpy.context.object;l.name=name;l.data.energy=power;l.data.color=color;l.data.shape='RECTANGLE';l.data.size=size;l.data.size_y=size*.4;l.rotation_euler=(Vector((0,0,0))-l.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,0,8.7));cam=bpy.context.object;cam.rotation_euler=(0,0,0);cam.data.type='PERSP';cam.data.lens=53;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.filepath='/tmp/sculpture-poster.png';scene.view_settings.view_transform='AgX';bpy.ops.render.render(write_still=True)
