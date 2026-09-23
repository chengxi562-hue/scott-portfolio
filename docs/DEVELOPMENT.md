# 开发、测试与发布说明

## 结构

- `index.html`、`assets/site.css`、`assets/site.js`、`assets/languages.js`：首页与双语交互。
- `assets/interior.css`：子页公共字体、主题与阅读布局。
- `tools/evidence-brief/`、`tools/task-brief/`：公开工具，核心规则与页面交互分离。
- `projects/tongzhou/`、`projects/xuanshu/`：静态案例，不包含本地执行器或研究引擎。
- `assets/fonts/`：本地字体及许可；中文标题子集覆盖说明见 `ChengxiEditorial-SOURCE.md`，新增文字时检查覆盖。
- `vision/`：个人练习页，保留 `noindex`，不放在站内导航或 sitemap。
- `_dev/`、`.playwright-cli/`：本地候选、备份、回执及测试输出，被 Git 忽略，不随网站发布。

原始照片、私人档案、源视频库、会员凭证、任务队列与控制接口不进入此仓库。

## 测试

在仓库根目录启动本地服务器后测试页面。核心测试无需模型或网络请求：

```sh
node --test tools/evidence-brief/core.test.mjs tools/task-brief/core.test.mjs tools/task-brief/draft.test.mjs tools/task-brief/workflow.test.mjs tools/task-brief/handoff.test.mjs
```

新增模块的测试命令见对应工具 README。改变实际行为时验证正常流程和会出错的反例，浏览器检查覆盖操作、下载、恢复、修改后失效、错误提示与手机布局。样例只使用公开或合成材料，输出放在本地隔离目录。

工具使用浏览器存储，失败须明确提示。复制失败保留可选择文本，未知值和未验收状态不能自动变成通过。两工具不要自动调用模型或上传输入。

## 主题与安全策略

主题偏好键为 `site-theme`，首页与子页共用。内联主题初始化脚本受页面 CSP 哈希保护；改变脚本必须同步哈希。禁止把取消 CSP 当作排查办法。首页无脚本时主要内容及原生详情仍应可读。

## 发布

站点沿用 GitHub Pages 的 `main` 根目录。推送会触发线上变化，执行前需取得覆盖发布动作的明确授权；仓库 About、个人 GitHub README、LinkedIn 是独立更新位置，不能因网站发布就声称已经同步。

发布前检查变更范围和公开资产；发布后核对实际资源以及关键浏览器操作。必须区分：本地检查通过、文件发布成功、线上实际使用通过、用户对视觉的认可。

## 当前返工与历史

2026-09-23：采用新的窗景插画与个人专题展册方向，保留双语、深浅主题及历史链接；Task Brief 加入实际产物的手动交接。GitHub 与 LinkedIn 使用同一组公开工具和个人贡献说明。用户已明确授权本次网站发布和关联资料修改，无需再重复确认本次范围内的发布；未来新增发布仍遵循上方规则。

前两版及后续 A/B 实页均被用户否定，保留历史，不再作为当前设计。第二版的技术检查不覆盖本次实现；当前发布工作与回执目录为 `_dev/release-20260923/`。

上一版根 README 全文、截图及回执保留在本地 `_dev/brand-system-20260923/previous/`、`_dev/portfolio-20260923/` 与 Git 历史。更早的已发布功能里程碑为 `354924e` / `f365acf`，这些历史记录不能被引用为本轮发布证据。
