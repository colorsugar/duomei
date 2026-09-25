# Elephant Trunk Hill: SDF -> marching cubes. Coordinates are Three.js world
# metres relative to hill centre (-198, 1450): px east, py up, pz south.
# Layout follows the existing map (head north, trunk NE into the Li River,
# Water-Moon cave between trunk and front leg, Puxian pagoda at (14,-18)).
import numpy as np, sys
from skimage import measure
from scipy.ndimage import map_coordinates
STEP=float(sys.argv[1]) if len(sys.argv)>1 else .8
OUT=sys.argv[2] if len(sys.argv)>2 else '.'
xs=np.arange(-76,92,STEP); ys=np.arange(-5,64,STEP); zs=np.arange(-92,74,STEP)
PX,PY,PZ=np.meshgrid(xs,ys,zs,indexing='ij')

def h3(ix,iy,iz,seed):
    n=np.sin(ix*127.1+iy*311.7+iz*74.7+seed*19.19)*43758.5453
    return n-np.floor(n)
def vnoise(x,y,z,seed=0):
    ix,iy,iz=np.floor(x),np.floor(y),np.floor(z); fx,fy,fz=x-ix,y-iy,z-iz
    fx,fy,fz=[f*f*(3-2*f) for f in (fx,fy,fz)]
    r=0
    for dx in (0,1):
        for dy in (0,1):
            for dz in (0,1):
                w=(fx if dx else 1-fx)*(fy if dy else 1-fy)*(fz if dz else 1-fz)
                r=r+w*h3(ix+dx,iy+dy,iz+dz,seed)
    return r*2-1
def fbm(x,y,z,oct=4,seed=0):
    a,f,s=0,1,.5
    for i in range(oct):
        a=a+s*vnoise(x*f,y*f,z*f,seed+i*7); f*=2.03; s*=.5
    return a
def smin(a,b,k):
    h=np.clip(.5+.5*(b-a)/k,0,1); return b*(1-h)+a*h-k*h*(1-h)
def smax(a,b,k): return -smin(-a,-b,k)
def ell2(u,v,cu,cv,ru,rv): return (np.sqrt(((u-cu)/ru)**2+((v-cv)/rv)**2)-1)*min(ru,rv)
def ell3(x,y,z,c,r): return (np.sqrt(((x-c[0])/r[0])**2+((y-c[1])/r[1])**2+((z-c[2])/r[2])**2)-1)*min(r)
def capsule(x,y,z,a,b,r):
    a=np.array(a,float);b=np.array(b,float);ab=b-a
    t=np.clip(((x-a[0])*ab[0]+(y-a[1])*ab[1]+(z-a[2])*ab[2])/ab.dot(ab),0,1)
    return np.sqrt((x-a[0]-ab[0]*t)**2+(y-a[1]-ab[1]*t)**2+(z-a[2]-ab[2]*t)**2)-r

def solid(px,py,pz):
    plan=ell2(px,pz,-6,8,56,50)
    plan=smin(plan,ell2(px,pz,28,-44,30,17),12)
    plan=smin(plan,ell2(px,pz,-34,36,30,24),10)
    plan=plan+1.6*fbm(px*.03,0,pz*.03,3,5)
    top=18+32*np.exp(-((px-8)/40)**2-((pz+10)/44)**2)+9*np.exp(-((px-38)/15)**2-((pz+48)/13)**2)
    top=top+2.5*fbm(px*.05,3,pz*.05,3,9)
    shoulder=.075*np.maximum(0,py-12)**1.5
    notch=2.2*np.exp(-((py-1.2)/1.6)**2)   # solution notch at the waterline
    d=smax(plan+shoulder+notch,py-top,9)
    d=smin(d,ell3(px,py,pz,(50,24,-56),(15,13,13)),6)           # forehead / trunk root
    d=smin(d,capsule(px,py,pz,(58,30,-58),(66,14,-62),9),5)      # trunk
    d=smin(d,capsule(px,py,pz,(66,14,-62),(68,-6,-60),8.5),4)
    cave=smax(ell2(px,py,49,1,8.5,13),np.abs(pz+52)-33,2)        # Water-Moon cave, open both ends
    d=smax(d,-cave,2.2)
    # Karst surface: broad lumps, vertical solution flutes, fine pitting.
    d=d+2.8*fbm(px*.03,py*.03,pz*.03,3,1)+.7*vnoise(px*.2,py*.05,pz*.2,2)+.6*fbm(px*.12,py*.12,pz*.12,3,3)
    return d

def veg_line(px,pz):
    river=np.clip((px*.55-pz*.45)/60,0,1)       # taller bare cliffs on the Li River / confluence faces
    tongues=np.clip(vnoise(px*.11,0,pz*.11,17),0,1)*9   # shrubs creeping down gullies
    return 11+13*river+9*fbm(px*.028,0,pz*.028,3,11)-tongues

S=solid(PX,PY,PZ)
# Tree canopy: hemispherical crowns from a jittered cell lattice, shelled over the hill top.
cell=6.5
F1=np.full(PX.shape,1e9)
cx,cy,cz=np.floor(PX/cell),np.floor(PY/cell),np.floor(PZ/cell)
for dx in (-1,0,1):
    for dy in (-1,0,1):
        for dz in (-1,0,1):
            ix,iy,iz=cx+dx,cy+dy,cz+dz
            fx=(ix+h3(ix,iy,iz,1))*cell; fy=(iy+h3(ix,iy,iz,2))*cell; fz=(iz+h3(ix,iy,iz,3))*cell
            F1=np.minimum(F1,np.sqrt((PX-fx)**2+(PY-fy)**2+(PZ-fz)**2))
bumps=np.sqrt(np.clip(1-(F1/(cell*.85))**2,0,1))
vy=veg_line(PX,PZ)
taper=np.clip((PY-vy+1.5)/7,0,1)
taper=taper*taper*(3-2*taper)
thick=(0.7+3.6*bumps+.6*fbm(PX*.2,PY*.2,PZ*.2,2,21))*taper-0.6
C=S-thick
C=np.maximum(C,7.5-np.sqrt((PX-14)**2+(PZ+18)**2))              # clearing for the Puxian pagoda
C=np.maximum(C,-PY+2)

def mesh(field,name):
    v,f,n,_=measure.marching_cubes(field,0,spacing=(STEP,STEP,STEP),allow_degenerate=False)
    v=v+np.array([xs[0],ys[0],zs[0]])
    return v,f
def sample(field,v):
    idx=np.stack([(v[:,0]-xs[0])/STEP,(v[:,1]-ys[0])/STEP,(v[:,2]-zs[0])/STEP])
    return map_coordinates(field,idx,order=1,mode='nearest')

rv,rf=mesh(S,'rock')
# Drop rock hidden deep inside the canopy.
inside=sample(C,rv)<-1.2
rf=rf[~inside[rf].all(axis=1)]
cv,cf=mesh(C,'canopy')

def normals(v,f):
    n=np.zeros_like(v); fn=np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]])
    for k in range(3): np.add.at(n,f[:,k],fn)
    return n/np.maximum(np.linalg.norm(n,axis=1,keepdims=True),1e-9)

def srgb(c): return np.clip(np.array(c)/255.0,0,1)
def rock_colors(v,f):
    x,y,z=v[:,0],v[:,1],v[:,2]; nrm=normals(v,f)
    base=srgb((158,156,148))
    c=np.tile(base,(len(v),1))
    streak=np.clip((vnoise(x*.28,y*.028,z*.28,4)*.5+.5-.45)/.35,0,1)
    c=c*(1-.35*streak[:,None])+srgb((92,88,80))*(.35*streak[:,None])
    pale=np.clip((fbm(x*.09,y*.02,z*.09,2,13)-.2)/.5,0,1)
    c=c*(1-.3*pale[:,None])+srgb((196,192,180))*(.3*pale[:,None])
    stain=np.clip((fbm(x*.05,y*.05,z*.05,3,6)-.25)/.4,0,1)
    c=c*(1-.28*stain[:,None])+srgb((170,138,98))*(.28*stain[:,None])
    wet=np.clip((4.5-y)/4.0,0,1)
    c=c*(1-.6*wet[:,None])+srgb((72,78,66))*(.6*wet[:,None])
    moss=np.clip((nrm[:,1]-.35)/.4,0,1)*np.clip((y-3)/6,0,1)
    c=c*(1-.55*moss[:,None])+srgb((88,104,62))*(.55*moss[:,None])
    return c
def canopy_colors(v):
    x,y,z=v[:,0],v[:,1],v[:,2]
    pal=np.array([srgb(p) for p in [(78,112,52),(96,128,60),(66,98,48),(112,136,66),(84,118,72),(104,120,56)]])
    ix,iy,iz=np.floor(x/6.5),np.floor(y/6.5),np.floor(z/6.5)
    k=(h3(ix,iy,iz,9)*len(pal)).astype(int)%len(pal)
    c=pal[k]*(0.85+0.3*(fbm(x*.3,y*.3,z*.3,2,31)*.5+.5))[:,None]
    return np.clip(c,0,1)

def write_ply(path,v,f,c):
    # Three (x, y up, z south) -> Blender (x, -z, y), absolute world position.
    V=np.stack([v[:,0]-198,-(v[:,2]+1450),v[:,1]],1).astype('<f4')
    C=(np.clip(c,0,1)*255).astype('u1')
    with open(path,'wb') as fh:
        fh.write(f"ply\nformat binary_little_endian 1.0\nelement vertex {len(V)}\nproperty float x\nproperty float y\nproperty float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nelement face {len(f)}\nproperty list uchar int vertex_indices\nend_header\n".encode())
        rec=np.zeros(len(V),dtype=[('p','<f4',3),('c','u1',3)]);rec['p']=V;rec['c']=C;fh.write(rec.tobytes())
        # marching_cubes winding is outward for field<0 inside when flipped; keep consistent for Blender recalc anyway
        fr=np.zeros(len(f),dtype=[('n','u1'),('i','<i4',3)]);fr['n']=3;fr['i']=f[:,::-1];fh.write(fr.tobytes())

write_ply(f'{OUT}/rock.ply',rv,rf,rock_colors(rv,rf))
write_ply(f'{OUT}/canopy.ply',cv,cf,canopy_colors(cv))
print('rock',len(rv),len(rf),'canopy',len(cv),len(cf),'top',rv[:,1].max(),cv[:,1].max())
