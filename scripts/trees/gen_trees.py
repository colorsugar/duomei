# Street-tree library in normalised units (instanced at scale = crown radius).
# Camphor: dense rounded dome of clumps. Banyan: broad spreading canopy with
# heavier limbs and aerial roots. Output: crown/wood PLY per species (Blender up = z).
import numpy as np, sys
from skimage import measure
OUT=sys.argv[1] if len(sys.argv)>1 else '.'
rng=np.random.default_rng(11)
def smin(a,b,k):
    h=np.clip(.5+.5*(b-a)/k,0,1);return b*(1-h)+a*h-k*h*(1-h)
def h3(ix,iy,iz,seed):
    n=np.sin(ix*127.1+iy*311.7+iz*74.7+seed*19.19)*43758.5453;return n-np.floor(n)
def worley(X,Y,Z,cell,seed):
    F=np.full(X.shape,1e9);cx,cy,cz=np.floor(X/cell),np.floor(Y/cell),np.floor(Z/cell)
    for dx in (-1,0,1):
        for dy in (-1,0,1):
            for dz in (-1,0,1):
                ix,iy,iz=cx+dx,cy+dy,cz+dz
                F=np.minimum(F,np.sqrt((X-(ix+h3(ix,iy,iz,seed))*cell)**2+(Y-(iy+h3(ix,iy,iz,seed+1))*cell)**2+(Z-(iz+h3(ix,iy,iz,seed+2))*cell)**2))
    return F
SPEC={
 'camphor':dict(r=1.05,zc=1.22,flat=.78,clumps=11,clump_r=(.38,.55),base=.62,limbs=5,roots=0,palette=[(58,88,40),(70,100,46),(50,80,38),(82,108,52)]),
 'banyan': dict(r=1.45,zc=1.20,flat=.52,clumps=15,clump_r=(.40,.62),base=.72,limbs=7,roots=14,palette=[(72,104,50),(86,116,56),(64,96,48),(96,120,60)]),
}
def write_ply(path,v,f,c):
    V=v.astype('<f4');C=(np.clip(c,0,1)*255).astype('u1')
    with open(path,'wb') as fh:
        fh.write(f"ply\nformat binary_little_endian 1.0\nelement vertex {len(V)}\nproperty float x\nproperty float y\nproperty float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nelement face {len(f)}\nproperty list uchar int vertex_indices\nend_header\n".encode())
        rec=np.zeros(len(V),dtype=[('p','<f4',3),('c','u1',3)]);rec['p']=V;rec['c']=C;fh.write(rec.tobytes())
        fr=np.zeros(len(f),dtype=[('n','u1'),('i','<i4',3)]);fr['n']=3;fr['i']=f[:,::-1];fh.write(fr.tobytes())
for name,S in SPEC.items():
    st=.035;R=S['r']+.5
    xs=np.arange(-R,R,st);zs=np.arange(0,2.3,st)
    X,Y,Z=np.meshgrid(xs,xs,zs,indexing='ij')
    # clump centres on a squashed dome
    cents=[]
    for i in range(S['clumps']):
        a=i*2.399+rng.random()*.4;u=rng.random()
        rr=S['r']*(.25+.62*np.sqrt(u));h=S['zc']+(1-rr/S['r'])*S['r']*S['flat']*.55+(rng.random()-.5)*.18
        cents.append((np.cos(a)*rr,np.sin(a)*rr,h,S['clump_r'][0]+rng.random()*(S['clump_r'][1]-S['clump_r'][0])))
    cents.append((0,0,S['zc']+S['r']*S['flat']*.5,S['clump_r'][1]*1.1))
    d=np.full(X.shape,9.0)
    for (cx,cy,cz,cr) in cents:
        e=np.sqrt((X-cx)**2+(Y-cy)**2+((Z-cz)/.86)**2)-cr
        d=smin(d,e,.16)
    d=np.maximum(d,S['base']-Z)                     # flat-ish crown underside
    F=worley(X,Y,Z,.16,7);d=d-.07*np.sqrt(np.clip(1-(F/.15)**2,0,1))+.03   # leaf-cluster bumps
    v,f,_,_=measure.marching_cubes(d,0,spacing=(st,st,st));v=v+np.array([xs[0],xs[0],zs[0]])
    # colours: clump tint, sunlit top lighter, underside darker
    pal=np.array(S['palette'])/255.
    k=np.argmin([(v[:,0]-c[0])**2+(v[:,1]-c[1])**2+(v[:,2]-c[2])**2 for c in cents],axis=0)%len(pal)
    col=pal[k]*(.78+.4*np.clip((v[:,2]-S['base'])/(S['zc']+S['r']*S['flat']-S['base']),0,1))[:,None]
    col=col*(.9+.2*h3(np.floor(v[:,0]/.12),np.floor(v[:,1]/.12),np.floor(v[:,2]/.12),3))[:,None]
    write_ply(f'{OUT}/{name}-crown.ply',v,f,col)
    # wood: trunk + limbs to clump centres (+ aerial roots for banyan), as tapered tubes
    V=[];Fc=[];Cc=[]
    def tube(a,b,r0,r1,seg=7):
        a=np.array(a,float);b=np.array(b,float);ax=b-a;L=np.linalg.norm(ax);ax/=L
        t=np.cross(ax,[0,0,1] if abs(ax[2])<.9 else [1,0,0]);t/=np.linalg.norm(t);s=np.cross(ax,t)
        base=len(V)
        for j,(p,r) in enumerate(((a,r0),(b,r1))):
            for i in range(seg):
                ang=2*np.pi*i/seg;V.append(p+r*(np.cos(ang)*t+np.sin(ang)*s))
        for i in range(seg):
            i2=(i+1)%seg;Fc.append([base+i,base+i2,base+seg+i2]);Fc.append([base+i,base+seg+i2,base+seg+i])
    trunk_top=(0,0,S['base']+.15)
    tube((0,0,-.05),trunk_top,.13 if name=='camphor' else .2,.09 if name=='camphor' else .14,9)
    for i in range(S['limbs']):
        c=cents[i*len(cents)//S['limbs']];tube(trunk_top,(c[0]*.8,c[1]*.8,c[2]-.1),.07,.025)
    for i in range(S['roots']):
        a=rng.random()*6.28;rr=.4+rng.random()*(S['r']-.5);x,y=np.cos(a)*rr,np.sin(a)*rr
        tube((x,y,S['base']+.05),(x+.03,y,0),.018,.012,5)
    V=np.array(V);Fc=np.array(Fc)
    bark=np.tile(np.array([.36,.33,.28]),(len(V),1))*(.85+.3*np.clip(V[:,2],0,1)[:,None]*.3)
    write_ply(f'{OUT}/{name}-wood.ply',V,Fc,bark)
    print(name,'crown',len(v),len(f),'wood',len(V))
