# 弋承熙 Scott Yi · 作品集

个人求职作品集站点。单页静态站，无构建步骤，双击 `index.html` 即可本地查看。

**在线地址**：https://scott-portfolio.app.workbuddy.host/

## 内容

- 首屏：定位陈述 + 投研系统实时状态面板
- 做法：四步方法论（调研 → 定义 → 构建 → 验收迭代）
- 故障自曝：两条由真实事故固化的校验规则
- 项目：智能投研系统 / 抖音观点知识库管线 / 多模型 AI 网关，另附 6 个已建成系统
- 实习、校园、教育与联系方式

## 设计说明

刻意避开"通用 AI 审美"，三条具体做法：

| 维度 | 做法 |
|---|---|
| 字体 | 中文标题用宋体（Songti SC）配 Instrument Serif；数字与英文走 Instrument Sans / Outfit；编号走 JetBrains Mono |
| 色彩 | 暖白纸感底 `#FBFAF8` + 近黑 `#17171A` + 单一墨绿强调 `#1E4D3D` |
| 结构 | 无圆角卡片、无阴影、无渐变；全部用细线与留白分区；章节序号放大为视觉元素 |

响应式：桌面 1440 / 移动 390 均已实测，无横向溢出。

## 目录结构

```
index.html          单文件站点（CSS 内联）
assets/fonts/       开源字体（SIL OFL 1.1）
_dev/               设计稿备份与截图（不参与发布，已在 .gitignore 中）
```

## 字体许可

Instrument Serif、Instrument Sans、Outfit、JetBrains Mono 均采用
**SIL Open Font License 1.1**，可自由用于商业与非商业用途。
