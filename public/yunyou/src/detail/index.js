// 精模注册表：选中地标时按需动态加载。每个模块导出 build({THREE,F,M,TEX,lm}) -> Group（世界坐标，含 userData.top），
// 可选 night(group, on) 切换夜景灯光，可选 mode = 'add'（叠加在简模上而非替换）。
export const DETAIL = {
  fuboshan: () => import('./hills.js'),
  diecaishan: () => import('./hills.js'),
  rita: () => import('./rita.js'),
  yueta: () => import('./yueta.js'),
  xiangbishan: () => import('./xiangbishan.js'),
  xiaoyaolou: () => import('./xiaoyaolou.js'),
  wangcheng: () => import('./wangcheng.js'),
  gunanmen: () => import('./gunanmen.js'),
  mulongta: () => import('./mulongta.js'),
  jiefangqiao: () => import('./jiefangqiao.js'),
  shelita: () => import('./shelita.js'),
};
