# Jiefang Bridge (解放桥), Guilin: five-span open-spandrel box arch,
# spans 41.5+61+72+61+41.5 m, width 45 m (public figures). Rise, spandrel
# spacing, lamp design and colours are photo estimates, not survey data.
# blender -b --python build_bridge.py -- <old_glb> <out_dir> <tex_dir> [preview]
import bpy, bmesh, sys, os, math
from mathutils import Vector, Matrix
argv=sys.argv[sys.argv.index('--')+1:];OLD,OUT,TEX=argv[:3];PREVIEW=len(argv)>3
bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene

# --- axis from the previous asset's bridge part (keeps the OSM alignment) ---
bpy.ops.import_scene.gltf(filepath=OLD)
src=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.endswith(' 9')][0]
pts=[src.matrix_world@v.co for v in src.data.vertices]
cx=sum(p.x for p in pts)/len(pts);cy=sum(p.y for p in pts)/len(pts)
sxx=sum((p.x-cx)**2 for p in pts);syy=sum((p.y-cy)**2 for p in pts);sxy=sum((p.x-cx)*(p.y-cy) for p in pts)
ang=.5*math.atan2(2*sxy,sxx-syy);U=Vector((math.cos(ang),math.sin(ang),0));Vv=Vector((-U.y,U.x,0))
ts=[(p-Vector((cx,cy,0))).dot(U) for p in pts];mid=(max(ts)+min(ts))/2
C=Vector((cx,cy,0))+U*mid
all_pts=[o.matrix_world@v.co for o in bpy.context.scene.objects if o.type=='MESH' for v in o.data.vertices]
ta=[(p-C).dot(U) for p in all_pts];T0,T1=min(ta),max(ta)
print('axis',ang,'centre',C,'bridge extent',min(ts)-mid,max(ts)-mid,'approach',T0,T1)
for o in list(bpy.context.scene.objects):bpy.data.objects.remove(o)

SPANS=[41.5,61,72,61,41.5];L=sum(SPANS);W=45.0;HALF=W/2
DECK=10.6;SPRING=1.2
def deck_z(u):
    # vertical curve over the bridge, ramps down to street level on the approaches
    if abs(u)<=L/2: return DECK+.7*(1-(u/(L/2))**2)
    e=L/2;far=(T1 if u>0 else -T0);t=min(1,(abs(u)-e)/max(1,far-e));return DECK-(DECK-.75)*(t*t*(3-2*t))
def P(u,v,z):return C+U*u+Vv*v+Vector((0,0,z))

mats={}
def mat(name,color,rough=.8,metal=0,tex=None,scale=None,emit=None,night=None):
    m=bpy.data.materials.new('jiefangqiao:'+name);m.use_nodes=True;b=m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal
    if tex:
        img=m.node_tree.nodes.new('ShaderNodeTexImage');img.image=bpy.data.images.load(os.path.join(TEX,tex))
        mix=m.node_tree.nodes.new('ShaderNodeMix');mix.data_type='RGBA';mix.blend_type='MULTIPLY';mix.inputs['Factor'].default_value=1
        mix.inputs[6].default_value=(*color,1);m.node_tree.links.new(img.outputs['Color'],mix.inputs[7]);m.node_tree.links.new(mix.outputs[2],b.inputs['Base Color'])
    if emit:
        b.inputs['Emission Color'].default_value=(*emit,1);b.inputs['Emission Strength'].default_value=1.0
    if night:m['nightStrength']=night
    mats[name]=m;return m
mat('concrete',(.80,.79,.75),.85,tex='concrete.jpg')
mat('stone',(.56,.55,.52),.9,tex='stone.jpg')
mat('asphalt',(.13,.135,.14),.95)
mat('paving',(.62,.58,.52),.9,tex='paving.jpg')
mat('rail',(.86,.85,.81),.6)
mat('marking',(.85,.85,.8),.7)
mat('planter',(.30,.24,.20),.8)
mat('flower',(.62,.08,.10),.8)
mat('lamp',(.9,.86,.74),.4,emit=(1.,.72,.38),night=3.2)
mat('led',(.30,.55,.85),.5,emit=(.12,.45,1.),night=4.0)
mat('archface',(.80,.79,.75),.85,tex='concrete.jpg',emit=(.10,.32,1.),night=2.4)   # blue flood on arch faces at night
mat('soffit',(.74,.73,.70),.9,tex='concrete.jpg',emit=(1.,.50,.18),night=.35)     # warm wash under the barrels

bm_by={}
def bmx(name):
    if name not in bm_by:bm_by[name]=bmesh.new()
    return bm_by[name]
def quad(bm,a,b,c,d):
    vs=[bm.verts.new(x) for x in (a,b,c,d)];bm.faces.new(vs)
def box(name,u0,u1,v0,v1,z0,z1):
    bm=bmx(name);p=lambda u,v,z:bm.verts.new(P(u,v,z))
    c=[p(u0,v0,z0),p(u1,v0,z0),p(u1,v1,z0),p(u0,v1,z0),p(u0,v0,z1),p(u1,v0,z1),p(u1,v1,z1),p(u0,v1,z1)]
    for f in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]:bm.faces.new([c[i] for i in f])
def strip(name,path,v0,v1,z_of,thick=None):
    # surface along u with a profile [v0,v1]; path = list of u; z_of(u)
    bm=bmx(name);prev=None
    for u in path:
        z=z_of(u);row=[bm.verts.new(P(u,v0,z)),bm.verts.new(P(u,v1,z))]
        if thick:row+=[bm.verts.new(P(u,v1,z-thick)),bm.verts.new(P(u,v0,z-thick))]
        if prev:
            n=len(row)
            for i in range(n):
                if not thick and i==1:break
                bm.faces.new([prev[i],prev[(i+1)%n],row[(i+1)%n],row[i]][::-1] if thick else [prev[0],prev[1],row[1],row[0]])
        prev=row
def frange(a,b,step):
    n=max(1,int(math.ceil((b-a)/step)));return [a+(b-a)*i/n for i in range(n+1)]

# --- deck, carriageway, sidewalks ---
upath=frange(T0,T1,2.0)
strip('asphalt',upath,-13.5,13.5,lambda u:deck_z(u)+.02)
for s in (-1,1):
    strip('paving',upath,s*13.5,s*(HALF-.6),lambda u:deck_z(u)+.18)
strip('concrete',upath,-HALF,HALF,lambda u:deck_z(u)-.02,thick=1.1)
# kerbs and lane marks
for s in (-1,1):
    for u in upath[:-1]:
        z=deck_z(u);v=s*13.5;box('concrete',u,u+2.0,min(v,v-s*.25),max(v,v-s*.25),z,z+.2)
for lane in (-9,-4.5,4.5,9):
    for u in frange(T0+4,T1-4,9)[:-1]:
        z=deck_z(u)+.035;box('marking',u,u+3.5,lane-.08,lane+.08,z-.01,z)
for u in frange(T0+2,T1-2,1.5):box('marking',u,u+.5,-.1,.1,deck_z(u)+.01,deck_z(u)+.04)
# balustrade: posts, top rail, flower troughs; lamp standards
for s in (-1,1):
    vr=s*(HALF-.35)
    for u in frange(T0+1,T1-1,2.4):
        z=deck_z(u);box('rail',u-.14,u+.14,vr-.14,vr+.14,z,z+1.15)
    for u in upath[:-1]:
        z=deck_z(u);z2=deck_z(u+2)
        box('rail',u,u+2.0,vr-.2,vr+.2,(z+z2)/2+1.05,(z+z2)/2+1.22)
        box('rail',u,u+2.0,vr-.08,vr+.08,(z+z2)/2+.25,(z+z2)/2+.35)
    for u in frange(-L/2+3,L/2-3,6):
        z=deck_z(u);box('planter',u-1.2,u+1.2,vr-.45*s-.35,vr-.45*s+.35,z+1.2,z+1.55);box('flower',u-1.1,u+1.1,vr-.45*s-.3,vr-.45*s+.3,z+1.55,z+1.8)
    for u in frange(-L/2+8,L/2-8,18):
        z=deck_z(u);vl=s*(HALF-1.2)
        box('rail',u-.35,u+.35,vl-.35,vl+.35,z,z+1.2);box('rail',u-.13,u+.13,vl-.13,vl+.13,z+1.2,z+7.6)
        box('rail',u-.9,u+.9,vl-.07,vl+.07,z+6.6,z+6.75)
        bm=bmx('lamp')
        for du,dz in [(-.85,6.55),(.85,6.55),(0,7.95)]:
            bmesh.ops.create_uvsphere(bm,u_segments=10,v_segments=7,radius=.32,matrix=Matrix.Translation(P(u+du,vl,z+dz)))

# --- arches, spandrel walls, spandrel arches ---
u=-L/2;springs=[]
for k,S in enumerate(SPANS):
    a,b=u,u+S;u=b;mid=(a+b)/2;f=S/6.8  # rise
    R=(S*S/4+f*f)/(2*f);zc=SPRING+f-R
    def intr(t):return zc+math.sqrt(max(0,R*R-(t-mid)**2))
    ring=1.8 if S>60 else 1.5
    n=48;ts=[a+(b-a)*i/n for i in range(n+1)]
    bm=bmx('concrete')
    # barrel: intrados surface, face rings on both sides, extrados top
    for v0,v1,flip in [(-HALF+.8,HALF-.8,False)]:
        for i in range(n):
            t0,t1=ts[i],ts[i+1]
            quad(bmx('soffit'),P(t0,v0,intr(t0)),P(t1,v0,intr(t1)),P(t1,v1,intr(t1)),P(t0,v1,intr(t0)))
            quad(bm,P(t0,v1,intr(t0)+ring),P(t1,v1,intr(t1)+ring),P(t1,v0,intr(t1)+ring),P(t0,v0,intr(t0)+ring))
    for s in (-1,1):
        vf=s*(HALF-.8)
        for i in range(n):
            t0,t1=ts[i],ts[i+1];q=[P(t0,vf,intr(t0)),P(t1,vf,intr(t1)),P(t1,vf,intr(t1)+ring),P(t0,vf,intr(t0)+ring)]
            quad(bmx('archface'),*(q if s<0 else q[::-1]))
        # blue LED line hugging the intrados edge of each face
        led=bmx('led')
        for i in range(n):
            t0,t1=ts[i],ts[i+1];vo=vf+s*.06
            quad(led,*[P(t0,vo,intr(t0)+.15),P(t1,vo,intr(t1)+.15),P(t1,vo,intr(t1)+.45),P(t0,vo,intr(t0)+.45)][::(1 if s<0 else -1)])
    # spandrel cross walls every ~4.6 m, with small arches bridging their heads
    cols=frange(a+2.2,b-2.2,4.6)
    for c in cols:
        top=deck_z(c)-1.1;base=intr(c)+ring-.2
        if top-base<.6:continue
        box('concrete',c-.45,c+.45,-HALF+.8,HALF-.8,base,top)
    for c0,c1 in zip(cols[:-1],cols[1:]):
        top=deck_z((c0+c1)/2)-1.1;base=intr((c0+c1)/2)+ring
        if top-base<1.4:continue
        m=[c0+.45+(c1-c0-.9)*i/10 for i in range(11)];bm=bmx('concrete');r=(c1-c0-.9)/2;cm=(c0+c1)/2
        for s in (-1,1):
            vf=s*(HALF-.8)
            for i in range(10):
                h0=top-.35-max(0,math.sqrt(max(0,r*r-(m[i]-cm)**2)))*.55;h1=top-.35-max(0,math.sqrt(max(0,r*r-(m[i+1]-cm)**2)))*.55
                q=[P(m[i],vf,h0),P(m[i+1],vf,h1),P(m[i+1],vf,top),P(m[i],vf,top)];quad(bm,*(q if s<0 else q[::-1]))
    springs.append((a,b))
# --- piers with cutwaters and abutments ---
bounds=[-L/2]+[sum(SPANS[:i+1])-L/2 for i in range(len(SPANS))]
for i,bu in enumerate(bounds):
    end=i in (0,len(bounds)-1);wide=5.5 if not end else 9
    box('stone',bu-wide/2,bu+wide/2,-HALF+.2,HALF-.2,-1.5,SPRING+.6)
    bm=bmx('stone')
    for s in (-1,1):  # pointed cutwater at both faces
        v0=s*(HALF-.2);tip=s*(HALF+3.2)
        a1,b1,c1=P(bu-wide/2,v0,-1.5),P(bu+wide/2,v0,-1.5),P(bu,tip,-1.5)
        a2,b2,c2=P(bu-wide/2,v0,SPRING+.6),P(bu+wide/2,v0,SPRING+.6),P(bu,tip,SPRING+.6)
        for q in ([a1,c1,c2,a2],[c1,b1,b2,c2]):quad(bm,*(q if s>0 else q[::-1]))
        tri=[bm.verts.new(x) for x in (a2,c2,b2) ];bm.faces.new(tri if s>0 else tri[::-1])
    box('concrete',bu-wide/2-.3,bu+wide/2+.3,-HALF+.5,HALF-.5,SPRING+.6,SPRING+1.3)
    if end:  # abutment wall up to deck
        box('stone',bu-9 if bu<0 else bu,bu if bu<0 else bu+9,-HALF,HALF,-1.5,deck_z(bu)-1.1)
# approach embankment side walls (stone faced) under the ramps
for s in (-1,1):
    for seg in ((T0,-L/2-4),(L/2+4,T1)):
        for u0 in frange(seg[0],seg[1],3)[:-1]:
            z=deck_z(u0+1.5)-1.1
            if z>.3:box('stone',u0,u0+3,min(s*(HALF-.8),s*HALF),max(s*(HALF-.8),s*HALF),-.5,z)

objs=[]
for name,bm in bm_by.items():
    me=bpy.data.meshes.new('jfq-'+name);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.001)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
    o=bpy.data.objects.new('jiefangqiao-'+name,me);scene.collection.objects.link(o);me.materials.append(mats[name]);o['lmId']='jiefangqiao';o['sourceBaseline']='procedural-2026-09-26'
    if name in('concrete','stone','paving','archface','soffit'):
        bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.cube_project(cube_size=6 if name!='paving' else 3,scale_to_bounds=False);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
    if name=='lamp':
        for p in me.polygons:p.use_smooth=True
    objs.append(o)
print('objects',[(o.name,len(o.data.polygons)) for o in objs])

def export(path):
    for o in objs:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path,use_selection=True,export_format='GLB',export_extras=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=7,export_image_format='JPEG',export_jpeg_quality=82)
    print('exported',path,os.path.getsize(path))
export(os.path.join(OUT,'jiefangqiao.glb'))
export(os.path.join(OUT,'jiefangqiao-far.glb'))

if PREVIEW:
    scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x,scene.render.resolution_y=1280,720
    w=bpy.data.worlds.new('w');scene.world=w;w.use_nodes=True;w.node_tree.nodes['Background'].inputs[0].default_value=(.45,.58,.75,1)
    sun=bpy.data.lights.new('sun','SUN');sun.energy=3;so=bpy.data.objects.new('sun',sun);scene.collection.objects.link(so);so.rotation_euler=(math.radians(50),0,math.radians(150))
    bpy.ops.mesh.primitive_plane_add(size=900,location=(C.x,C.y,.3));wm=bpy.data.materials.new('w');wm.use_nodes=True;wm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.05,.14,.11,1);bpy.context.object.data.materials.append(wm)
    cam=bpy.data.cameras.new('c');cam.lens=30;co=bpy.data.objects.new('c',cam);scene.collection.objects.link(co);scene.camera=co
    for i,(pos,tgt) in enumerate([(C-Vv*110+U*20+Vector((0,0,9)),C+Vector((0,0,6))),(C-Vv*55+U*60+Vector((0,0,4)),C+U*10+Vector((0,0,7)))]):
        co.location=pos;co.rotation_euler=(tgt-pos).to_track_quat('-Z','Y').to_euler();scene.render.filepath=os.path.join(OUT,f'bridge{i}.png');bpy.ops.render.render(write_still=True)
