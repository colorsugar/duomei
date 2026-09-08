# 逍遥楼单项更新

本次仅替换默认 Blender 模式下逍遥楼的近景模型与夜景；其他地标、远景模型、原版对照模式和地图系统保持当前生产版本。

资产位于 `public/yunyou/assets/xiaoyaolou/`。清单只包含逍遥楼，几何已在本机 Blender 5.2.1 中重建并完成 Cycles 遮蔽烘焙；檐线灯带是独立几何，昼夜状态分别保存。解码在单个 Worker 中进行，缺少原生 gzip 解压时使用与 Three.js r170 同源的 fflate。

`blender-models.js` 继续使用现有串行加载、LRU 释放和距离切换。只有 `xiaoyaolou` 分支加载此资产，其余 GLB 路径不变。用户选择旧版对照时保留原有模型。

本地编辑工程保存在 E 盘建模交接包中。参考为站内逍遥楼实景、[桂林日报 2019-05-16](https://epaper.guilinlife.com/glrb/images/2019-05/16/02/RB02.pdf)与[广西广播电视台夜景航拍](https://news.gxtv.cn/article/detail_2ada88bda3e249cb9f2c3cc0c9182c02.html)。细部尺寸和灯光功率属于照片估算，不是测绘数据。

验证：`node scripts/verify-xiaoyaolou.mjs` 检查唯一资产范围、哈希、贴图、烘焙和夜景。设置 `YUNYOU_VERIFY_ORIGIN` 与已有 `PLAYWRIGHT_MODULE` 可执行真实浏览器选择、旋转、日夜及手机尺寸检查。正式发布仍遵循现有 EdgeOne 工作流。
