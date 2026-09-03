# xiaogai.fun 参考站证据记录

记录时间：2026-09-01。以下 DNS、响应头与拨测统计由用户提供，本环境未能直接读取 tance.cc 原始 JSON，因此将其视为“用户提供、待复核”的参考证据，而不是候选站验收结果。

## 托管线索

- DNS CNAME：`xiaogai.fun.tcbaccess.tencentcloudbase.com`
- HTTP：`server: tcbgw`
- HTTP：`x-cloudbase-upstream-type: Tencent-COS`
- 海外查询曾解析到 `43.173.130.130`、`43.173.153.178`；APNIC 登记主体为 ACEVILLE PTE. LTD.、国家代码 SG
- 大资源另由 `*.tcb.qcloud.la` 分发
- 页面未看到 ICP/公安备案号或 `beian.miit.gov.cn` 链接；这不等于官方备案库确认“未备案”

这些线索共同支持“自有域名 + CloudBase 网关 + COS/CDN + 区域调度”，不支持把参考站归因于 Vercel，也不足以断言其节点均在境外或域名未备案。

## 大陆拨测

- 精确 URL：`https://xiaogai.fun/collection/`
- tance.cc 任务：`820565`
- 完成时间：2026-09-01 北京时间 21:00
- 总节点：100/100 HTTP 200，0 超时
- 大陆：91/91
- 电信：30/30，平均 257.7 ms
- 联通：30/30，平均 290.9 ms
- 移动：29/29，平均 272.9 ms
- [结果 JSON](https://www.tance.cc/api-proxy/v1/tasks/820565/results)
- [任务页面](https://www.tance.cc/http/https%3A%2F%2Fxiaogai.fun%2Fcollection%2F)

该拨测只证明当时的可达性。大陆探针解析到腾讯北京、上海、广州地址，而海外解析到腾讯新加坡地址，说明存在 GeoDNS/区域调度；这反而不能用来证明“不需要 ICP”。
