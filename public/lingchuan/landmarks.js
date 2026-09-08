// Photo-identified buildings, located on the shared 2017 image coordinate system.
export const campusPoint=(px,pz,y=4)=>[(px-382)*1.079,y,(pz-264)*1.079];
export const archiveDirectory='https://web.archive.org/web/20120319173935/http://www.gllczx.com:80/xyjg/lcxyjg.asp';
export const landmarks=[
 {id:'yuying',name:'育英楼',kind:'教学',point:campusPoint(382,264,15),size:[88,23,45],source:'旧官网楼宇相册 · 2013',note:'白色外廊、红色水平饰线、中央玻璃顶厅。楼名可从正面照片核对。',detailRegion:'courtyard'},
 {id:'xinxing',name:'新星楼',kind:'教学',point:campusPoint(362,228,13),size:[76,30,38],source:'用户确认位置、高德实拍照片、2022校园视频',note:'位于育英楼后方。六层楼体、端部弧形玻璃楼梯间、挑檐及石材拱形入口；门头为“新星楼”。'},
 {id:'garden',name:'育英楼前庭院',kind:'景观',point:campusPoint(393,316,3),size:[75,15,95],source:'旧官网校园风光相册 · 2013',note:'曲径、球形景观与白色花架；路径依据俯拍照片和历史影像比对。',detailRegion:'courtyard'},
 {id:'gate',name:'校门',kind:'入口',point:campusPoint(413,355,4),size:[34,12,20],direction:[.342,.13,.94],source:'2017-07-27校门实拍、2022视频、用户确认校门未变',note:'同一座校门：上扬金属雨篷、密集空间桁架、V形支撑；右门房有金色窗框、石砌基座与三行题名。'},
 {id:'sculpture',name:'灵中标志雕像',kind:'景观',point:campusPoint(409,339,7),size:[25,14,26],source:'旧官网校庆、校园新闻 · 2007 / 2015',note:'银色曲面与金色球体，位于进校后的主轴线上。'},
 {id:'planetarium',name:'天象馆',kind:'教学',point:campusPoint(323,270,16),size:[45,28,49],source:'用户提供天象馆近照、2022校园视频',note:'粉色小面砖、三层弧形蓝砖窗带与金色馆名；圆顶位于前部屋顶。入口架在石砌平台上，左右两侧分别有阶梯。'},
 {id:'basketball',name:'篮球场',kind:'运动',point:campusPoint(330,337,2),size:[110,14,83],source:'2017-07-19贴吧照片、2022视频总图',note:'按2017照片恢复灰色旧场地、白色划线和旧式混凝土篮架。主体区按航拍两列四排定位；官网记载的第九场位置仍未确认。'},
 {id:'football',name:'足球场与跑道',kind:'运动',point:campusPoint(516,330,2),size:[190,16,145],source:'旧官网设施介绍、历史影像 · 2017',note:'400米环形跑道与天然草足球场。看台细节依据旧照片，尺寸按比例估计。',detailRegion:'athletics'},
 {id:'peixian',name:'培贤楼',kind:'教学',point:campusPoint(309,302,7),size:[78,20,34],source:'用户确认、2017乒乓球区照片、2022航拍',note:'篮球场旁的三层外廊楼。乒乓球照片中的白色端墙属于培贤楼，天象馆圆顶出现在其后方。'},
 {id:'dining',name:'食堂体育综合楼',kind:'生活',point:campusPoint(245,283,7),size:[58,23,45],source:'2022视频航拍、旧官网设施目录、2017影像',note:'篮球区西北侧的大跨度馆舍已补入，屋顶颜色依据2017影像；食堂与馆舍各入口用途仍在对照。'},
 {id:'laboratory',name:'求实楼 · 实验楼',kind:'教学',point:campusPoint(323,210,10),size:[55,26,40],source:'2017-07-19贴吧第26楼文字与实拍',note:'帖子明确说明求实楼是做实验的地方，顶层有舞蹈室和电脑室。按实拍恢复五层窗带、灰色立柱、红瓦入口及前侧台阶。',detailRegion:'academic'},
 {id:'office',name:'综合楼 · 办公楼',kind:'办公',point:campusPoint(302.935,230.603,7),size:[39,21,32],source:'2017-07-19贴吧第26楼文字与实拍',note:'帖子确认校长办公室、教务处位于综合楼。独立建出三层前翼、竖向弧形玻璃楼梯间，与后方求实楼对应。'},
 {id:'library',name:'图书馆',kind:'教学',point:campusPoint(338,174,10),size:[35,26,38],source:'2017-07-19贴吧说明与可辨题名的实拍',note:'位于求实楼后方。帖子记载一层为阅览室、二层为借阅室，沿图书馆往下通向女生宿舍。'},
 {id:'dorm',name:'学生宿舍',kind:'生活',point:campusPoint(243,355,12),size:[76,30,70],source:'用户确认与宿舍近照、2022校园视频',note:'篮球场旁两栋独立宿舍，外廊相对，中间为通道。浅粉色小面砖、红褐色饰线与带绿瓦压顶的入口围墙。'},
 {id:'tabletennis',name:'乒乓球场',kind:'运动',point:campusPoint(265,313,2),size:[35,15,35],source:'2017-07-19贴吧第30楼实拍、用户确认培贤楼',note:'培贤楼西端、靠食堂一侧的露天乒乓球区，紫红色球台、蓝色台边、金属支架与白色地面方框。球台间距和区界按照片比例估计。'},
 {id:'steps',name:'通往足球场的阶梯',kind:'通行',point:campusPoint(425,311,3),size:[56,14,42],source:'2017-07-19及08-11贴吧照片、2022双向航拍',note:'校内短梯段、跨路通道及场侧下行梯段；补入2017照片中的石栏板、石柱和柱帽。下方保留车行道路，级数与高差按影像比例估计。'},
 {id:'recharge',name:'饭卡充值处',kind:'生活',point:campusPoint(242,316,6),size:[42,19,25],source:'用户确认建筑用途与相邻关系、历史影像',note:'食堂与宿舍之间另有一栋办理饭卡充值的楼，已单独建模。楼名未另行命名，层数、立面和精确轮廓仍按影像比例估计。'}
];
