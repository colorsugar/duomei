// WGS84 anchors: OSM public map, 2026-09-05. Model heights are approximate
// relative relief, not surveyed elevation. Footprint sources: expansion.js.
export const CITY_PLACES = [
 {id:'qixing',name:'七星公园',kind:'park',region:'qixing',lat:25.2754513,lon:110.3063811,span:1300,h:0,desc:'从花桥进入七星公园，普陀山、七星岩、栖霞禅寺、骆驼山和月牙山散布在园中。可以点选各处地标，沿小东江看桥、看山，再到桂海碑林读石刻。'},
 {id:'huaqiao',name:'花桥',kind:'bridge',region:'qixing',lat:25.2770013,lon:110.30411555,span:160,h:7,view:[1,.55,.6],desc:'七星公园入口附近跨小东江的石拱桥，桥廊、石拱与水中倒影构成桂林熟悉的风景。地图按现有桥梁足迹定位，桥下水系沿真实地图展开。'},
 {id:'qixingyan',name:'七星岩',kind:'poi',region:'qixing',lat:25.2775518,lon:110.3075425,span:190,h:8,desc:'普陀山中的天然溶洞，也是七星景区的代表性景点。这里标出洞口位置；点开照片看岩洞实景，地图暂呈现洞口与周边山体。'},
 {id:'qixiasi',name:'栖霞禅寺',kind:'building',region:'qixing',lat:25.2785338,lon:110.3078973,span:230,h:17,desc:'位于七星景区普陀山西麓，寺院殿宇依山展开。地图依据寺院建筑足迹安排殿堂与院落，照片呈现寺院真实外观。'},
 {id:'luotuoshan',name:'骆驼山',kind:'hill',region:'qixing',lat:25.272791,lon:110.3082307,span:230,h:48,view:[1,.35,.6],desc:'七星公园中形似骆驼的石灰岩孤峰。双峰起伏、伸出的头颈与山脚草地形成鲜明轮廓，是园中很适合停下来拍照的地方。'},
 {id:'putuoshan',name:'普陀山',kind:'hill',region:'qixing',lat:25.2757586,lon:110.3073327,span:850,h:90,desc:'七星公园北部的山体，七星岩、栖霞禅寺与山间游步道围绕这里分布。地图保留山体与这些景点之间的位置关系。'},
 {id:'yueyashan',name:'月牙山',kind:'hill',region:'qixing',lat:25.2740854,lon:110.3028976,span:620,h:70,desc:'七星公园西南部山体，山麓的龙隐岩、龙隐洞一带保存着丰富的摩崖石刻。往西南便是桂海碑林。'},
 {id:'guihaibeilin',name:'桂海碑林',kind:'building',region:'qixing',lat:25.2738285,lon:110.3014541,span:170,h:8,desc:'月牙山麓的石刻与博物馆景点，龙隐岩、龙隐洞的摩崖题刻是这里的主角。点开实景照片，可以看见岩壁上层层相叠的文字。'},
 {id:'chuanshan',name:'穿山景区',kind:'hill',region:'chuanshan',lat:25.2539623,lon:110.2994789,span:820,h:74,desc:'市中心南面的穿山景区，山、水与洞相连，隔小东江可以望见塔山。地图扩展了这一带的河道、道路与山体位置，可继续点选塔山看穿山塔。'},
 {id:'tashan',name:'塔山·穿山塔',kind:'pagoda',region:'chuanshan',lat:25.2549618,lon:110.2952273,span:290,h:58,desc:'穿山西侧、小东江旁的孤峰，山顶砖塔与水面倒影组成塔山清影。地图以山体、七层砖塔和临水位置呈现这一地标。'},
 {id:'xishan',name:'西山公园',kind:'hill',region:'xishan',lat:25.2871113,lon:110.2692845,span:1000,h:100,desc:'桂林城西的山水公园，西山、隐山和湖面组成一片可散步赏景的区域。地图保留公园真实边界，并补上西侧城市道路。'},
 {id:'yinshan',name:'隐山',kind:'hill',region:'xishan',lat:25.2834489,lon:110.2773468,span:300,h:38,desc:'西山公园东部近湖的小山，隐山与西湖相依。照片展示西山公园的湖山环境，地图上的位置对应隐山本身。'},
 {id:'yushan',name:'虞山公园',kind:'park',region:'yushan',lat:25.3017351,lon:110.296633,span:680,h:50,desc:'桂林市中心北面的山林公园，沿城北道路可以接着游览叠彩山、木龙湖一带。地图补齐公园范围与周边街道，照片展示园中实景。'},
];
export const SECTORS = [
 {id:'qixing',bbox:[110.299,25.267,110.322,25.286]},
 {id:'chuanshan',bbox:[110.29,25.246,110.316,25.267]},
 {id:'xishan',bbox:[110.255,25.272,110.28,25.292]},
 {id:'yushan',bbox:[110.282,25.296,110.309,25.314]},
];
