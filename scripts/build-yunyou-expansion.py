"""Convert public OSM map extracts into small, separately fetched city sectors.
Requires shapely. Input: directory with qixing/chuanshan/xishan/yushan.osm.
Keeps the existing core map untouched. Heights are interpretive unless tagged.
"""
import sys,json,xml.etree.ElementTree as ET
from pathlib import Path
from shapely.geometry import Polygon,LineString,Point,box
from shapely.ops import polygonize,unary_union

source=Path(sys.argv[1]);out=Path('public/yunyou/data/sectors');out.mkdir(parents=True,exist_ok=True)
regions={'qixing':(110.299,25.267,110.322,25.286),'chuanshan':(110.29,25.246,110.316,25.267),'xishan':(110.255,25.272,110.28,25.292),'yushan':(110.282,25.296,110.309,25.314)}
def xy(lat,lon):return ((lon-110.2935)*100656.58,-(lat-25.283)*110574)
nodes={};ways={};rels={}
for name in regions:
 for e in ET.parse(source/(name+'.osm')).getroot():
  if e.tag=='node':nodes[e.attrib['id']]=e
  elif e.tag=='way':ways[e.attrib['id']]=e
  elif e.tag=='relation':rels[e.attrib['id']]=e
def tags(e):return {t.attrib['k']:t.attrib['v'] for t in e.findall('tag')}
def coords(e):return [xy(float(nodes[n.attrib['ref']].attrib['lat']),float(nodes[n.attrib['ref']].attrib['lon'])) for n in e.findall('nd') if n.attrib['ref'] in nodes]
def polygon(e):
 if e.tag=='way':
  p=coords(e)
  return Polygon(p).buffer(0) if len(p)>3 and p[0]==p[-1] else Polygon()
 outer=[];inner=[]
 for m in e.findall('member'):
  w=ways.get(m.attrib['ref'])
  if m.attrib['type']!='way' or w is None:continue
  p=coords(w)
  if len(p)>1:(inner if m.attrib.get('role')=='inner' else outer).append(LineString(p))
 return unary_union(list(polygonize(outer))).difference(unary_union(list(polygonize(inner))))
def polys(g):return [g] if g.geom_type=='Polygon' else [p for p in getattr(g,'geoms',[]) if p.geom_type=='Polygon']
def lines(g):return [g] if g.geom_type=='LineString' else [p for p in getattr(g,'geoms',[]) if p.geom_type=='LineString']
def ring(c):return [[round(x,1),round(z,1)] for x,z in c]
def area(g):return [{'o':ring(p.exterior.coords),'h':[ring(i.coords) for i in p.interiors]} for p in polys(g) if p.area>6]
core=box(-1560,-1659,1661,2101)
features=[]
for e in [*ways.values(),*rels.values()]:
 t=tags(e);kind='water' if t.get('natural')=='water' else 'green' if t.get('leisure')=='park' or t.get('natural')=='wood' or t.get('landuse') in ['grass','forest','meadow'] else 'building' if 'building' in t else None
 if kind:
  g=polygon(e)
  if not g.is_empty:features.append((kind,g,t))
for name,b in regions.items():
 x0,z1=xy(b[1],b[0]);x1,z0=xy(b[3],b[2]);clip=box(x0,z0,x1,z1).difference(core)
 data={'id':name,'bounds':[x0,z0,x1,z1],'water':[],'green':[],'buildings':[],'roads':[]}
 for kind,g,t in features:
  if not g.intersects(clip):continue
  parts=area(g.intersection(clip).simplify(1.5,preserve_topology=True))
  if kind=='building':
   try:h=float(t.get('height',str(float(t.get('building:levels','4'))*3)).replace(' m',''))
   except:h=12
   for p in parts:data['buildings'].append({**p,'height':max(3,min(65,h))})
  else:data[kind]+=parts
 for e in ways.values():
  t=tags(e);kind=t.get('highway');p=coords(e)
  if kind not in ['primary','secondary','tertiary','residential','unclassified','living_street','pedestrian','footway','path'] or len(p)<2:continue
  for l in lines(LineString(p).intersection(clip).simplify(1.2)):
   if l.length>4:data['roads'].append({'p':ring(l.coords),'w':{'primary':16,'secondary':12,'tertiary':9,'residential':6,'pedestrian':4}.get(kind,2.5),'bridge':t.get('bridge')=='yes'})
 data['source']='https://api.openstreetmap.org/api/0.6/map?bbox='+','.join(map(str,b))
 data['license']='OpenStreetMap contributors / ODbL 1.0'
 (out/(name+'.json')).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
 print(name,{k:len(data[k]) for k in ['water','green','buildings','roads']})

# Park footprints and known peak anchors form the low-detail, always-visible map.
parks={}
for key,typ,id in [('qixing','way','243874128'),('chuanshan','relation','14531822'),('xishan','relation','14531790'),('yushan','way','253617571')]:
 e=(ways if typ=='way' else rels)[id];g=polygon(e).simplify(3,preserve_topology=True)
 parks[key]={'areas':area(g),'source':f'https://www.openstreetmap.org/{typ}/{id}'}
peakids={'luotuoshan':'6316468647','putuoshan':'6316468650','yueyashan':'6360357979','chuanshan':'4553931195','tashan':'6337543756','xishan':'9994299781','yinshan':'9994311681'}
peaks={}
for key,id in peakids.items():
 e=nodes[id];p=xy(float(e.attrib['lat']),float(e.attrib['lon']));candidates=[g for k,g,t in features if k=='green' and g.contains(Point(p)) and tags(e).get('name')!=t.get('name') and g.area<1200000]
 # A local terrain patch follows the mapped wooded footprint, capped around the peak.
 r={'putuoshan':280,'yueyashan':185,'xishan':330,'chuanshan':195,'luotuoshan':60,'tashan':65,'yinshan':80}[key]
 g=min(candidates,key=lambda g:g.area).intersection(Point(p).buffer(r)) if candidates else Point(p).buffer(r)
 peaks[key]={'x':round(p[0],1),'z':round(p[1],1),'areas':area(g.simplify(3)),'source':'https://www.openstreetmap.org/node/'+id,'lat':float(e.attrib['lat']),'lon':float(e.attrib['lon'])}
bridge=ways['246520676'];temple=ways['1026675595']
result={'parks':parks,'peaks':peaks,'huaqiao':ring(coords(bridge)),'qixiasi':area(polygon(temple)), 'license':'OpenStreetMap contributors / ODbL 1.0'}
Path('public/yunyou/data/expansion.js').write_text('// OSM footprint geometry; generated by scripts/build-yunyou-expansion.py.\nexport const EXPANSION = '+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n')
