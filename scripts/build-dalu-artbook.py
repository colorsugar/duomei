import json,io,hashlib,shutil,sys
WEB="--web" in sys.argv
from pathlib import Path
from PIL import Image
from reportlab import rl_config
rl_config.useA85=False
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from fontTools.ttLib import TTFont as FTFont
from fontTools.varLib.instancer import instantiateVariableFont
R=Path(__file__).resolve().parents[1]; D=R; T=R/'tmp/pdfs'
T.mkdir(parents=True,exist_ok=True);(R/'output/pdf').mkdir(parents=True,exist_ok=True)
d=json.loads((R/'docs/dalu/atlas-data.json').read_text()); imgs={a['id']:a for a in d['images']}
if not (T/'NotoSansSC-Regular.ttf').exists():
 f=FTFont(T/'NotoSansSC.ttf');instantiateVariableFont(f,{'wght':400},inplace=True);f.save(T/'NotoSansSC-Regular.ttf')
pdfmetrics.registerFont(TTFont('CJK',str(T/'NotoSansSC-Regular.ttf')))
pdfmetrics.registerFont(TTFont('Serif','/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'))
groups=[('双庭之间',['forest-court','red-court','mist-port'],['treant-forest']),('万兽与边境',['gray-camp','ford-fort'],[]),('越过寒季',['north-seat','lake-city','saddle-city'],[]),('粮河汇入海门',['aivernor','grain-city','west-port','east-port'],['twin-plan']),('火与水之间',['forge-city','landbridge-city'],['iron-plan']),('帝国的账册与海岸',['imperial-seat','eastern-arsenal','delta-city'],[]),('旧港与远岛',['island-seat','free-port','hanhai-city'],['cave-cutaway','trench-cutaway','trench-depth']),('盐路与泉约',['salt-city'],[]),('山河相接',[],[x for x in imgs if x.startswith('connection-')]),('烬月 · 传说栖地',[],[x for x in imgs if x.startswith('beast-')]),('宫堡与庄园',[],[x for a in d['architecture'] for x in a['images']])]
plates=[]
for gi,(title,cities,extra) in enumerate(groups):
 for id in [x+'-'+v for x in cities for v in ['aerial','ground']]+extra:
  plates.append({**imgs[id],'chapter':title,'chapterIndex':gi})
assert len(plates)==74 and len({x['id'] for x in plates})==74
lookup={x['id']:x for k in ['cities','sites','legends'] for x in d[k]}
arch={id:a for a in d['architecture'] for id in a['images']}
special={'twin-plan':'site-1','iron-plan':'site-12','cave-cutaway':'site-11','treant-forest':'site-10','trench-cutaway':'site-9','trench-depth':'site-9','connection-gates':'site-1','connection-iron':'site-12','connection-lakes':'site-7','connection-frontier':'site-6','connection-hanhai':'hanhai-city','connection-mist':'site-11'}
W,H=720,900; ink='#263C37'; muted='#697A71'; paper='#F4F0E7'; gold='#9C7543'
OUT=R/('tmp/pdfs/fantasy-continent-artbook-web.pdf' if WEB else 'output/pdf/奇幻大陆-艺术图集.pdf'); c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1)
c.setTitle('奇幻大陆 · 地理、风物与宫堡庄园');c.setAuthor('多美 DUOMEI');c.setSubject('74幅艺术图版 · 可点击目录 · 地图定位');c.setViewerPreference('DisplayDocTitle','true')
styles={}
def text(s,x,y,size=12,color=ink,font='CJK'):
 c.setFillColor(HexColor(color));c.setFont(font,size);c.drawString(x,y,s)
def para(s,x,y,w,size=12,leading=21,color=ink):
 sty=ParagraphStyle('body',fontName='CJK',fontSize=size,leading=leading,textColor=HexColor(color),wordWrap='CJK')
 p=Paragraph(s.replace('&','&amp;'),sty);_,h=p.wrap(w,H);p.drawOn(c,x,y-h);return y-h
cache={}
def picture(id,x,y,w,h):
 a=imgs[id];src=D/'public/atlas/v6'/a['src'].lstrip('/');src=src.with_suffix('.webp')
 if id not in cache:
  im=Image.open(src).convert('RGB')
  if WEB:im.thumbnail((1280,1280),Image.Resampling.LANCZOS)
  b=io.BytesIO();im.save(b,'JPEG',quality=78 if WEB else 82,optimize=True);cache[id]=ImageReader(b)
 c.drawImage(cache[id],x,y,w,h,preserveAspectRatio=True,anchor='c')
def base(label,num):
 c.setFillColor(HexColor(paper));c.rect(0,0,W,H,fill=1,stroke=0)
 text('DUOMEI   /   奇幻大陆',44,865,9,muted);text(label,430,865,9,muted)
 c.setStrokeColor(HexColor('#CFD4C7'));c.setLineWidth(.5);c.line(44,846,676,846);c.line(44,48,676,48)
 text('返回目录',44,28,9,muted);c.linkRect('', 'toc', (40,20,110,43),relative=0,thickness=0)
 text(f'{num:02d} / 81',614,28,9,muted,font='Serif')
def finish(): c.showPage()
# Cover
c.setFillColor(HexColor(ink));c.rect(0,0,W,H,fill=1,stroke=0)
text('DUOMEI  /  THE FANTASY CONTINENT',44,856,11,'#D8C4A0','Serif')
text('奇幻大陆',44,752,55,'#F4F0E7');text('地理、风物与宫堡庄园',47,708,19,'#D8C4A0')
picture('aivernor-panorama',0,182,720,480)
text('74 幅图版   /   11 个章节   /   13 处新增建筑与聚落',44,125,13,'#F4F0E7')
text('从粮河与王城，走向远海和烬月。',44,90,12,'#D8C4A0')
text('点击进入目录  →',44,43,12,'#F4F0E7');c.linkRect('','toc',(40,30,210,65),relative=0,thickness=0);finish()
base('阅读这片大陆',2);c.bookmarkPage('guide');c.addOutlineEntry('阅读这片大陆','guide',0)
text('每座建筑，都有来处',44,790,32)
para('城堡守河渡，宫殿依王畿，庄园靠田地与水磨。建筑的华丽，来自墙外的水源、粮食和商路。',44,748,632,13,23)
picture('lake-manor',44,321,632,365)
text('怎样翻阅',44,293,19)
para('目录中的每一行都可点击，直接跳到对应图版。页面下方的“返回目录”回到索引；“在地图中查看”打开大陆专题内的交互地图，并定位该地点。书签面板也可按章翻阅。',44,262,632,12,21)
para('本册收录原有 60 幅地理风物图版及新增 14 幅改绘与建筑设定图。场景属于架空世界的艺术表现；方位、路线与尺度以交互地图和地点说明为准。新增建筑在所属城市或栖地锚点下标示，具体相对位置写在说明中。',44,171,632,11,20,muted)
finish()
# Four pages of detailed linked contents.
for t in range(4):
 base('图版索引',3+t);c.bookmarkPage('toc' if t==0 else 'toc'+str(t))
 if t==0:c.addOutlineEntry('目录 · 点击标题跳转','toc',0)
 text('沿着目录出发',44,794,32);text(f'图版索引  {t+1} / 4',44,763,11,muted)
 current=None;y=717
 for index,a in list(enumerate(plates))[t*20:(t+1)*20]:
  if a['chapter']!=current:
   text(a['chapter'],44,y,11,gold);y-=23;current=a['chapter']
  # One linked row per plate
  text(a['title'],59,y,11);text(str(index+7),635,y,11,muted)
  c.linkRect('',a['id'],(44,y-6,676,y+18),relative=0,thickness=0);y-=26
 assert y>52,(t,y)
 for j in range(4):
  text(str(j+1),480+j*48,66,11,gold);c.linkRect('','toc' if j==0 else 'toc'+str(j),(474+j*48,58,510+j*48,87),relative=0,thickness=0)
 finish()
# Plates
for i,a in enumerate(plates):
 base(a['chapter'],i+7);c.bookmarkPage(a['id'])
 if i==0 or a['chapter']!=plates[i-1]['chapter']:c.addOutlineEntry(a['chapter'],a['id'],0)
 c.addOutlineEntry(a['title'],a['id'],1)
 text(f'{i+1:02d}   /   '+a['view'],44,815,10,gold)
 text(a['title'],44,772,25)
 picture(a['id'],44,316,632,421.333)
 if a['id'] in arch:
  p=arch[a['id']];entry=p['id'];left=[('落在地图上',p['where']),('营造与风土',p['formation'])];right=[('抵达与往来',p['routes']),('生活与故事',p['story'])]
 else:
  entry=special.get(a['id'],a['id'].removesuffix('-aerial').removesuffix('-ground'));p=lookup.get(entry,{})
  prof=p.get('profile',{});left=[('图中所见',a['caption'])];right=[('地点与生活',p.get('description') or prof.get('geography') or '山海地形决定通行方式，完整形成逻辑与接驳关系见交互地图。')]
  if prof.get('routes') and len(left[0][1])+len(prof['routes'])<190:left.append(('沿路而行',prof['routes']))
 for x,blocks in [(44,left),(374,right)]:
  y=282
  for label,body in blocks:
   text(label,x,y,10,gold);y=para(body,x,y-13,302,10.5,18)-19
  assert y>69,(a['id'],y)
 url='https://duomei.site/dalu/map?entry='+entry
 text('在地图中查看  →',523,65,10,gold);c.linkURL(url,(515,55,676,83),relative=0,thickness=0)
 a['page']=i+7;a['entry']=entry
 finish()
base('沿海流继续',81);c.bookmarkPage('end');c.addOutlineEntry('沿海流继续','end',0)
text('地图之外，故事仍在生长',44,787,30)
picture('connection-hanhai',44,313,632,421.333)
para('走出王城，沿粮河抵达海门；越过冬营与低鞍，听见远岛的潮声。宫堡、庄园、集市和村落，共同构成这片大陆可以居住、旅行和讲述的生活。',44,267,632,14,25)
text('打开大陆专题  →',44,136,14,gold);c.linkURL('https://duomei.site/dalu',(40,121,250,155),relative=0,thickness=0)
text('多美 · 奇幻大陆  /  2026 年 9 月扩充版',44,84,10,muted)
c.save()
manifest={'title':'奇幻大陆 · 艺术图集','pageCount':81,'plateCount':74,'chapterCount':11,'buildingCount':13,'pdf':'/downloads/fantasy-continent-artbook.pdf','sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'bytes':OUT.stat().st_size,'chapters':[{'title':title,'page':next(a['page'] for a in plates if a['chapter']==title)} for title,_,_ in groups],'plates':[{'id':a['id'],'title':a['title'],'page':a['page'],'entry':a['entry']} for a in plates]}
(T/'pdf-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({'path':str(OUT),'bytes':OUT.stat().st_size,'pages':81},ensure_ascii=False))
