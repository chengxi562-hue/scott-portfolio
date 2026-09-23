# 弋承熙 · Chengxi Yi

个人网站，以及两款可以在浏览器里使用的小工具。

[个人网站](https://yichengxi.cn/) · [LinkedIn](https://www.linkedin.com/in/chengxi-yi-452460428/) · [反馈问题](https://github.com/chengxi562-hue/scott-portfolio/issues)

我在西南财经大学与 Audencia 的联合培养项目学习市场营销，关注金融服务、商业研究与 AI 应用。我负责问题定义、流程设计与结果核对，AI 编程工具协助实现。

## 可以用来做什么

| 你要完成的事 | 工具 | 可以带走的结果 |
| --- | --- | --- |
| 把 AI 回答中的说法和出处整理清楚 | **[循据 · Evidence Brief](https://yichengxi.cn/tools/evidence-brief/)** | 带来源摘录、反证和待核验问题的 Markdown 简报，以及可恢复的资料备份 |
| 把一个模糊目标交代给 AI 或协作者，再接回实际结果 | **[协作计划设计器 · Task Brief](https://yichengxi.cn/tools/task-brief/)** | 包含原任务、实际计划和初稿、复核意见与人工判断的完整交接记录 |

两款工具目前都是中文界面，无需账号或 API Key。输入在浏览器中处理，不自动上传材料、不调用模型；你决定把导出的内容交给谁。

### 循据：从说法到可追溯简报

写研究问题 → 添加具体说法 → 记录出处与摘录 → 标记支持、反驳或背景 → 记录人工复核 → 导出简报。

缺日期、缺原文或缺证据的条目会保留待核验提示。文字匹配不等于事实真实，工具不会替你判断真假。

[使用说明、示例与源码](tools/evidence-brief/README.md)

### Task Brief：让任务更容易交接

填写目标与材料 → 写清交付与验收 → 复制本步任务给自己的 AI → 保存实际计划、初稿和复核 → 人工核对 → 下载完整记录。

“手动交接”逐阶段保存真实产物，生成带有上游材料的下一阶段任务。任务或产物改变后，旧人工判断会失效，原稿保留供核对；交接 JSON 可恢复完整记录，Markdown 用于阅读和交付。它不依赖站点所有者的会员或私人执行器；工作流 JSON 是独立的高级出口。

[使用说明、格式与源码](tools/task-brief/README.md)

## 其他实践

[同舟](projects/tongzhou/)和[玄枢](projects/xuanshu/)是公开案例页。个人投研、知识整理等项目展示问题、方法和边界；这些本地系统没有作为公共服务开放。它们与上面可直接使用的浏览器工具是不同交付。

## 本地运行

这是一个静态 HTML / CSS / JavaScript 网站，无需安装依赖或构建。

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

打开 `http://127.0.0.1:8080/`。工具使用 ES modules，请通过本地服务器打开，不要直接双击 HTML。

- [循据代码与说明](tools/evidence-brief/)
- [Task Brief 代码与说明](tools/task-brief/)
- [开发、测试与发布说明](docs/DEVELOPMENT.md)
- [设计记录](DESIGN.md)

两款工具代码分别采用各自目录内的 MIT 许可；字体许可随字体保留。材料与用户输入的权利不因工具许可改变。

**2026-09-23 版本**：个人窗景插画、双语首页、统一深浅主题，以及 Task Brief 手动交接。工具已经使用合成材料进行本地行为验证；暂无经过外部用户验证的效率提升或使用量数据。功能通过不等于每份用户材料都正确，最终判断仍由使用者负责。

---

**English** — A personal website and two browser tools for evidence briefs and AI task handoffs. The tools currently have Chinese interfaces and do not call models or upload input. I define the problems and workflows and review the outputs, with implementation supported by AI coding tools. See the individual guides for capabilities and limitations.
