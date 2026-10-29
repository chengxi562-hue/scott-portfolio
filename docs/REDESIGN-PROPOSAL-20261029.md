# 个人网站全栈优化提案 · 2026-10-29（预览分支，未发布）

分支 `preview/fullstack-20261029`（基于线上 `3731961`），工作树 `~/Projects/personal-site-preview`。
本地预览：`cd ~/Projects/personal-site-preview && python3 -m http.server 18800 --bind 127.0.0.1` → http://127.0.0.1:18800/
未推送、未发布。GitHub Pages 以 `main` 根目录发布，推送即上线，须 Scott 明确授权。

## 审计结论（线上基线 3731961）

| 项 | 结果 |
|---|---|
| 外部请求 | 0（全部页面，桌面/390 手机） |
| 控制台错误 / 4xx | 0 |
| 横向溢出 | 无 |
| 工具自动测试 | evidence-brief 24/24、task-brief 42/42 |
| 首页传输量 | 桌面 1009 KB、手机 1133 KB；最大项是首屏插画 JPEG 527 KB、作品截图 PNG 144 KB×2、中文标题字体 184 KB |
| 发布前检查 | 无自动化：链接、CSP 哈希、sitemap 都靠人工 |
| 内容 | 页面简历链接仍指 `resume-…-2026-09.pdf`，仓库另有 `2026-10.pdf`（ee267f3 加入，未被引用）——需 Scott 决定用哪份 |

视觉方向此前多次被否定（见 DESIGN.md 历史），本分支**不改视觉、不改文案**，只做底层。

## 本分支已做（可回退，单个提交）

1. **图片管线**：首屏插画与两张作品截图增加 AVIF 源（`<picture>` 优先 AVIF，JPEG/PNG 回退不变）。
   首页传输 桌面 1009→529 KB（-48%）、手机 1133→578 KB（-49%）。前后首屏截图逐像素平均差 ≈1.6/255（肉眼一致）。
   注：macOS `sips` 对奇数高度（1942×809）输出的 AVIF 在 Chrome 中显示为空白——已改为 1940×808 并截图核验，这是必须做画面验收的原因。
2. **发布前检查 `node scripts/check.mjs`**（零依赖、无网络）：本地链接/srcset 目标存在且已纳入 Git（防线上 404）、
   外链白名单、内联脚本与 CSP sha256 一致（DEVELOPMENT.md 规则自动化）、JSON-LD 可解析、sitemap 指向真实页面、
   图片/字体/脚本体积预算、`_dev/` 等私有目录不被跟踪。已做反例验证（改坏链接与 CSP 哈希 → 2 项 FAIL）。
3. 资源版本参数 `?v=20261029-preview`，避免旧缓存。

## 建议下一步（需 Scott 决定）

- 简历：改链到 2026-10 版，或删除未引用的 10 月文件。
- 推送时是否加 GitHub Actions 跑 `scripts/check.mjs` + 工具测试（会出现在仓库里）。
- 视觉：如需重做，建议先出 2 张静态首屏稿让你选，再动代码；不在本分支擅自改风格。
- `assets/curiosity-window.png`（2.4 MB）仅作无 `<picture>` 浏览器回退，可改为指向 1200 JPEG 再省仓库体积（线上实际传输不受影响）。

## 发布步骤（仅在授权后）

`git -C ~/Projects/personal-site merge --ff-only preview/fullstack-20261029 && node scripts/check.mjs && git push origin main`，
发布后核对线上首屏图片实际为 AVIF 且可见、简历下载、深浅主题、中英文。回滚：`git revert` 该提交并推送。
