# 桂林云游：2026-09-04 建模更新

本次修改位于 `public/yunyou/`，延用现有 Three.js 0.170.0、地图投影和 OSM 数据。地标照片用于观察形体；新增叶片纹理使用明确允许再分发的 CC0 素材。用户已有四张实拍保留原文件。模型是照片引导的交互式重建，不是摄影测量或测绘成果。

## 实景依据

- 象山水月洞近景：<https://www.klook.com/en-SG/activity/128764-private-guilin-highlights-day-tour/>，参考图 <https://res.klook.com/image/upload/activities/gc312knokukhxxbsnvaz.jpg>。厚实天然拱顶、洞内纵深、宽柱脚、浅灰岩壁、黑色纵裂，植被集中在顶部和裂隙。
- 山体反向洞口：<https://k.sina.cn/article_6439120649_p17fcd2f0900100ksg2.html>。航拍轮廓：<https://it.topchinatravel.com/attrazioni/collina-della-proboscide-di-elefante.htm>。不能用圆环代替洞穴，默认镜头改从漓江侧看洞。
- 滨江步道提升：桂林日报，<https://m.guilinlife.com/article/5ks565878a9213f4833f.html>。解放桥至象山公园3号门、樟树、铺装、休憩设施、花境和观景平台。
- 灯柱近景实拍：<https://4travel.jp/travelogue/10203133>；与逍遥楼同框参考：<https://www.topchinatravel.com/pic/city/guilin/attractions/xiaoyao-tower-05.jpg>。尖顶五边形立体框、多层轮廓灯、中央竖向灯饰。重现照片可辨认的一组六座；数量、尺寸、间距和坐标是照片估计，不声称为2026年完整实测清单。
- 解放桥尺寸及桥型：中国地情网，<https://zhongguodiqing.cn/dqwh/dqwh_zszg/202006/t20200609_5140945.shtml>。284米、45米、五跨空腹式箱型连拱。蓝色拱线和暖色边灯按网站已有 `jiefangqiao-night.webp` 实拍。
- 市区游船：<https://www.visitourchina.com/guilin/attraction/fubo-wave-subduing-hill.html>，参考 <https://www.visitourchina.com/FileUpload/newpicture/cities/guilin/fuposhan1.jpg>。低白船体、长排窗、上甲板、蓝色栏杆。演示航迹不是实际班次、航线或运营承诺。

## 变更

- 象鼻山：圆钝覆绿山背、临水岩壁、厚鼻脚、沿鼻脚与山体之间贯通的水月洞。资产提前烘焙成紧凑二进制；失败时保留低分辨率SDF回退。
- 滨江路：使用已有OSM道路折点，步道、路缘、栏杆、樟树、长椅、路灯、花境；桥北添加逍遥楼前双层滨水平台和尖顶灯柱。设施细节为照片估计。
- 漓江：三艘游船，有限航道往返、缓慢转向和尾流；可暂停，减少动态效果时默认静止。
- 现有地标：共享曲檐增加实际瓦垄几何，塔高按原资料校正；改善山体水线及阴面，树冠由单块改为多簇。山顶平台/亭为解说性细节，位置依既有峰顶锚点，未经测绘。
- 操作：上/下地标与沿江导览；保留手动旋转、缩放、日夜、地图开关、返回多美及加载失败回退。手机简介卡限制高度，为场景和导览按钮留出空间。
- 性能：缓存地标、空闲时预构建、着色器预热、近距离细节分级；同材质合并并释放中间几何；游船114网格合并成12；流畅档降低持续慢帧时的像素比，隐藏页暂停场景更新。缩放不再每次扫描全城，触摸缩放结束不再误选地标。

## 验证

```sh
node --loader ./scripts/yunyou-node-loader.mjs scripts/bake-yunyou.mjs
node --loader ./scripts/yunyou-node-loader.mjs scripts/verify-yunyou.mjs
node --loader ./scripts/yunyou-node-loader.mjs scripts/verify-yunyou-walk.mjs
npm run build
npm run test:home-hold
npm run test:music
npm run test:guyu
```

几何验证实际检查全部精模索引及有限坐标、合并后模型、塔高、烘焙网格的洞口射线穿透、船舶在完整往返期间是否保持在地图水域内。它不等于浏览器渲染或手机FPS验收。

当前会话云浏览器在原正式地图上报告 `WebGL unavailable`，内部预览地址也被浏览器环境拒绝，因此无法给出本次修改的浏览器视觉或手机真机性能通过结论。发布仍须遵守原PR检查和正式发布门禁。

## 逍遥楼与老城街区补充

- 逍遥楼两层三檐、连主楼/基座/台基总高约24m，非24m木楼叠加8m台座：[广西日报现场报道](https://www.chinanews.com.cn/m/cul/2016/04-27/7849960.shtml)；[开楼报道23.6m](https://www.chinanews.com.cn/m/cul/2016/04-27/7849420.shtml)。以用户既有实拍及[侧前清晰照片](https://www.sucaisucai.com/sucai/08716580.html)重建深棕柱梁、灰瓦、白墙、二层回廊、上部山花与前凸门廊。临滨江路挡墙与广场高差参照[实拍](https://touch.go.qunar.com/poi/9600290)，尺寸属视觉估计。
- 东西巷在靖江王城正阳门东西两侧，东连逍遥楼；[桂林博物馆](https://guilinmuseum.org.cn/News/Details/413e6572-4e15-4146-a004-8e5a278c38b5)。保留OSM巷道折点，灰瓦店铺模块表现街巷尺度，不声称逐店测绘。解放东路对面是向杉湖延伸的正阳街。
- 正阳街钟楼为开放红色钢桁架，四石墩、顶端交叉、蓝边白面多面钟与下悬大钟。[已查看的全塔照片](https://touch.travel.qunar.com/comment/5597929)。落点取现有OSM正阳路/依仁路圆形广场；约17.5m高度为旅游资料，缺少工程尺寸。静态钟面是装饰展示。
- 门前榕树：[广西云/南国早报采访园林局](https://v.gxnews.com.cn/sp/21594958)确认正阳门、东华门、承运门前各两棵小叶榕。使用融合树干、伸展横枝、垂气根及密集宽树冠；两树具体坐标为场景估计。
- 用户新增视觉参考：[Peter Gostev 金门大桥演示](https://x.com/petergostev/status/2095604392984535043)，已在浏览器实际观看。参考水面波纹、近景结构与平顺镜头，新增单次渲染的解析波纹法线、渐变天空、随地标聚焦的静态阴影与缓入缓出飞行；没有声称效果已达到视频质量。

老城街区包括店铺、钟楼和两棵细节榕树；本轮继续加入摄影叶片。现有地图/照片/手机交互与生产音乐外壳保持同一站点路径。


## 高清与街面漫游修订

用户反馈上一轮模型仍显粗糙，象山轮廓退步。本轮恢复原来的山体/鼻脚空间关系，并重新调整覆绿山顶坡势、鼻根高度、圆拱洞口和朝洞口的入场镜头。山体提前烘焙，保留表面裂隙纹理与水线阴影。它仍是照片引导的近似模型，不是实景扫描资产。

- 已实际观看第二个参考 [Pietro Schirano 的 West Village 街区](https://x.com/skirano/status/2095899479308144981)。重点转为连续街区和可到达的街面视角。
- 按已有道路折线补建 134 栋沿街建筑，有实体窗框、窗台、店铺门窗、挑檐、阳台、屋顶设备、人行道和路灯。已记录 OSM 建筑保留原轮廓并加立面材质。补建店铺是风貌示意，招牌不是现实商户清单；没有声称市中心每栋建筑均为实测。
- 新增“街面漫游”：WASD / 方向键、手机方向按钮、拖动转头、Esc / 返回鸟瞰；切换地标退出行走。初始落点选择可通行道路，避免河道和已有/补建建筑，失焦清空按键。
- 默认“高清”使用最高 2 倍像素密度、柔和阴影、摄影叶片和实时平面水反射；“均衡”最高 1.5 倍，“流畅”最高 1 倍并使用轻量水面，持续慢帧可降至 .9。相机静止时降低反射刷新频率；建筑与叶片按街区分块合并/实例化。没有经过真机 FPS 测量，不能保证所有手机的帧率。
- [ambientCG LeafSet024](https://ambientcg.com/view?id=LeafSet024)：CC0，2K Color / Opacity / NormalGL 图（保持尺寸，优化 JPEG 体积），用于 `assets/tex/foliage/`。不是生成树叶或无授权扫描模型。未使用不可下载的 Sketchfab 象鼻山扫描。
- 新增 `Water.js` 和 `waternormals.jpg` 来自 [Three.js r170](https://github.com/mrdoob/three.js/tree/r170/examples)，沿用仓库已有 MIT 许可；未改动依赖清单。
- 额外通过实际 Three.js 网格导出做了离线 CPU 视图检查，检查象山轮廓/洞口和正阳街店面尺度。离线光照与网站 WebGL 不同，不能将该图作为网站截图或浏览器验收。最终几何检查覆盖整条洞口射线、全部近景网格、完整游船往返及街面出生点/建筑碰撞。
