# 弋承熙 Yi Chengxi · 作品集

个人求职作品集站点。单页静态站，无构建步骤，双击 `index.html` 即可本地查看。

**在线地址**：https://yichengxi.app.workbuddy.host/

> 域名沿革：2026-09-18 由 `scott-portfolio.app.workbuddy.host` 迁至 `yichengxi.app.workbuddy.host`
> （旧域名已下线）。同日深夜另购入 **`yichengxi.cn`**，计划迁至自有域名。
> 仓库名仍为 `scott-portfolio`（GitHub 仓库名，与域名无关；README 标题的显示名以站点为准）。

## 内容

- 首屏：定位陈述 + 投研系统实时状态面板
- 做法：四步方法论（调研 → 定义 → 构建 → 验收迭代）
- 故障自曝：两条由真实事故固化的校验规则
- 项目：智能投研系统 / 抖音观点知识库管线 / 多模型 AI 网关，另附 **10 个**已建成系统与工作流
- 实习、校园、教育与联系方式（含**简历 PDF 下载**、GitHub / LinkedIn / 博客外链）
- 教育栏含**升学状态**（2027 Fall 港校硕士申请、CUHK 已面试）、**均分 81.89**与**论文录用**
- 顶栏导航只保留站内锚点（做法 / 项目 / 实习 / 校园 / 教育 / 联系）；**GitHub 外链收在页脚联系方式区**，不在右上角重复出现

> ✅ **均分 81.89 已确认**（2026-09-18，用户核对成绩单原件）。
> 过程记录：当日发现三处档案口径不一（本档 vs `研究生申请/CLAUDE.md` 记 81.00 / 2.9
> vs `推荐信准备.md` 记 81.03），先把站点均分**临时撤下**规避风险；
> 用户核对原件确认 **81.89 正确**后，站点已恢复显示，并反向修正了上述两处项目档案。

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
