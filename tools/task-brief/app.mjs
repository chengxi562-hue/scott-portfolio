import { normalizeBrief, buildBrief } from './core.mjs';
import { MAX_DRAFT_BYTES, serializeDraft, parseDraft } from './draft.mjs';
import { buildWorkflow, serializeWorkflow } from './workflow.mjs';

const STORAGE_KEY = 'task-brief-v1';
const FIELDS = ['type', 'goal', 'materials', 'facts', 'constraints', 'deliverable', 'acceptance', 'unknowns'];

const EXAMPLES = {
  research: {
    type: 'research',
    goal: '调研 3 个同类营销工具的公开资料，整理其定位、定价与核心功能差异，为后续选型讨论提供参考。',
    materials: '各产品官网公开页面与帮助文档链接（由需求方在协作时提供）。',
    facts: '【虚构示例，仅用于演示】目标市场为中文中小企业；团队目前尚未选定任何工具。',
    constraints: '仅使用公开资料，不注册试用账号；一周内完成。',
    deliverable: '一份对比表格与不超过两页的文字总结。',
    acceptance: '覆盖 3 个产品的定位、定价、核心功能；信息标注来源链接；结论部分明确列出待确认问题。',
    unknowns: '预算范围尚未确定；是否需要覆盖海外产品待确认。'
  },
  writing: {
    type: 'writing',
    goal: '为一篇介绍 AI 辅助写作流程的文章设计大纲，面向没有技术背景的普通读者。',
    materials: '编辑部提供的选题说明与往期文章风格样本。',
    facts: '【虚构示例，仅用于演示】文章计划发布在公众号；目标篇幅约 2000 字。',
    constraints: '避免专业术语堆砌；不虚构产品功效与数据。',
    deliverable: '三级大纲一份，含每节要点与预估字数分配。',
    acceptance: '结构完整（引入、主体、结尾）；每节要点清晰；字数分配合理；风格与样本一致。',
    unknowns: '是否需要配图建议待确认；截稿日期未定。'
  },
  code: {
    type: 'code',
    goal: '修复活动页面在手机上点击「展开详情」按钮无响应的问题。',
    materials: '相关页面文件与浏览器控制台报错截图（由需求方提供）。',
    facts: '【虚构示例，仅用于演示】问题在 iOS Safari 与 Android Chrome 均可复现；桌面端正常。',
    constraints: '不引入新依赖；保持现有样式不变；兼容近两年主流浏览器。',
    deliverable: '修复后的代码补丁，并附简要原因说明。',
    acceptance: '移动端点击按钮可正常展开与收起；桌面端行为不变；控制台无新增报错。',
    unknowns: '是否与其他页面共用该组件待确认。'
  }
};

function ready(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

ready(() => {
  const form = document.getElementById('briefForm');
  const status = document.getElementById('status');
  const outExecute = document.getElementById('outExecute');
  const outReview = document.getElementById('outReview');
  const copyExecute = document.getElementById('copyExecute');
  const copyReview = document.getElementById('copyReview');
  const downloadExecute = document.getElementById('downloadExecute');
  const downloadReview = document.getElementById('downloadReview');
  const clearBtn = document.getElementById('clearBtn');
  const dialog = document.getElementById('confirmDialog');
  const confirmText = document.getElementById('confirmText');
  const confirmCancel = document.getElementById('confirmCancel');
  const themeToggle = document.getElementById('themeToggle');
  const downloadDraft = document.getElementById('downloadDraft');
  const importDraft = document.getElementById('importDraft');
  const draftStatus = document.getElementById('draftStatus');
  const workflowStatus = document.getElementById('workflowStatus');
  const workflowPreview = document.getElementById('workflowPreview');
  const workflowDownload = document.getElementById('downloadWorkflow');
  let workflowText = '';

  function invalidateWorkflow() {
    workflowText = '';
    workflowDownload.disabled = true;
    workflowPreview.replaceChildren();
    workflowStatus.textContent = '使用当前任务信息生成计划。';
  }

  function locateError() {
    for (const name of FIELDS) {
      const el = form.elements[name];
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
    }
    const name = ['goal', 'deliverable', 'acceptance'].find(key => !form.elements[key].value.trim()) || FIELDS.find(key => form.elements[key].maxLength > 0 && form.elements[key].value.length > form.elements[key].maxLength);
    if (name) {
      form.elements[name].setAttribute('aria-invalid', 'true');
      form.elements[name].setAttribute('aria-describedby', 'status');
      form.elements[name].focus();
    }
  }

  document.getElementById('previewWorkflow').addEventListener('click', () => {
    invalidateWorkflow();
    try {
      const plan = buildWorkflow(readForm(), {id: document.getElementById('workflowId').value, strategy: document.getElementById('workflowStrategy').value});
      workflowText = serializeWorkflow(plan);
      for (const [index, task] of plan.tasks.entries()) {
        const li = document.createElement('li');
        const title = document.createElement('strong');
        title.textContent = `${String(index + 1).padStart(2, '0')} / ${plan.tasks.length === 3 ? ['制定计划', '完成初稿', '审阅产物'][index] : task.title}`;
        const detail = document.createElement('p');
        detail.textContent = (task.depends_on.length ? '前一步完成后执行。' : '流程起点。') + (task.acceptance === 'manual' ? '完成后检查产物，再确认采纳。' : '阶段标记只确认输出结构，不证明内容正确。');
        li.append(title, detail);
        workflowPreview.append(li);
      }
      workflowDownload.disabled = false;
      workflowStatus.textContent = `已设计 ${plan.tasks.length} 个步骤；没有发出模型请求。`;
    } catch (error) {
      workflowStatus.textContent = error.message;
      setStatus(error.message);
      locateError();
      const idInput = document.getElementById('workflowId');
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,44}$/.test(idInput.value)) {
        idInput.setAttribute('aria-invalid', 'true');
        idInput.focus();
      }
    }
  });
  for (const id of ['workflowId', 'workflowStrategy']) document.getElementById(id).addEventListener('input', event => {
    event.target.removeAttribute('aria-invalid');
    invalidateWorkflow();
  });
  workflowDownload.addEventListener('click', () => {
    if (!workflowText) return;
    downloadFile(workflowText, 'tongzhou-workflow.json', 'application/json;charset=utf-8');
    workflowStatus.textContent = '任务包已开始下载；审阅后交给自己的本地环境执行。';
  });

  let memoryOnly = false;
  let saveIssue = "";
  let dirtyFromRestore = false;

  function setStatus(msg) {
    status.textContent = msg + (saveIssue ? ' ' + saveIssue : '');
  }

  function readForm() {
    const data = {};
    for (const name of FIELDS) {
      const el = form.elements[name];
      data[name] = el ? el.value : '';
    }
    return data;
  }

  function writeForm(data) {
    for (const name of FIELDS) {
      const el = form.elements[name];
      if (el && typeof data[name] === 'string') { el.value = data[name]; el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); }
    }
  }

  function formHasContent() {
    const data = readForm();
    return FIELDS.some((name) => name !== 'type' && data[name].trim() !== '');
  }

  function invalidateOutputs() {
    invalidateWorkflow();
    outExecute.value = '';
    outReview.value = '';
    copyExecute.disabled = true;
    copyReview.disabled = true;
    downloadExecute.disabled = true;
    downloadReview.disabled = true;
  }

  function persist() {
    try {
      const data = normalizeBrief(readForm(), { allowIncomplete: true });
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      memoryOnly = false;
      saveIssue = "";
    } catch (err) {
      memoryOnly = true;
      saveIssue = '标签页保存失败，输入仍在当前页面；请检查长度限制并下载草稿留存。';
      setStatus('');
    }
  }

  function restore() {
    let raw = null;
    try {
      raw = sessionStorage.getItem(STORAGE_KEY);
    } catch (err) {
      raw = null;
      memoryOnly = true;
      saveIssue = "浏览器存储不可用，当前输入仅留在页面内存中。";
      setStatus("");
    }
    if (raw === null) return;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      dirtyFromRestore = true;
      setStatus('检测到无法解析的本地缓存，已忽略；编辑表单后将覆盖缓存。');
      return;
    }
    try {
      const clean = normalizeBrief(parsed, { allowIncomplete: true });
      writeForm(clean);
    } catch (err) {
      dirtyFromRestore = true;
      setStatus('本地缓存内容不符合格式，已忽略；编辑表单后将覆盖缓存。');
    }
  }

  function confirmAction(message) {
    return new Promise((resolve) => {
      confirmText.textContent = message;
      const onClose = () => {
        dialog.removeEventListener('close', onClose);
        resolve(dialog.returnValue === 'ok');
      };
      dialog.addEventListener('close', onClose);
      dialog.returnValue = 'cancel';
      dialog.showModal();
      confirmCancel.focus();
    });
  }

  async function applyExample(key) {
    const example = EXAMPLES[key];
    if (!example) return;
    if (formHasContent()) {
      const ok = await confirmAction('当前表单已有内容，用示例替换现有内容吗？');
      if (!ok) return;
    }
    writeForm(example);
    invalidateOutputs();
    persist();
    setStatus('已填入合成示例；其中场景与事实仅为演示，请按实际任务修改。');
  }

  async function clearForm() {
    if (formHasContent()) {
      const ok = await confirmAction('确定要清空表单全部内容吗？');
      if (!ok) return;
    }
    for (const name of FIELDS) {
      const el = form.elements[name];
      if (el && name !== 'type') el.value = '';
    }
    form.elements.type.value = 'research';
    invalidateOutputs();
    saveIssue = "";
    memoryOnly = false;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      saveIssue = "浏览器记录未能清除，刷新后可能恢复旧内容。";
      memoryOnly = true;
    }
    setStatus('表单已清空。');
  }

  function generate(event) {
    event.preventDefault();
    let brief;
    try {
      brief = normalizeBrief(readForm());
    } catch (err) {
      setStatus(err && err.message ? err.message : '输入不符合要求，请检查后重试。');
      locateError();
      return;
    }
    let executeMd;
    let reviewMd;
    try {
      executeMd = buildBrief(brief, 'execute');
      reviewMd = buildBrief(brief, 'review');
    } catch (err) {
      setStatus(err && err.message ? err.message : '生成失败，请检查输入。');
      return;
    }
    outExecute.value = executeMd;
    outReview.value = reviewMd;
    copyExecute.disabled = false;
    copyReview.disabled = false;
    downloadExecute.disabled = false;
    downloadReview.disabled = false;
    setStatus('已生成执行版与复核版任务单。');
  }

  async function copyText(textarea, label) {
    if (!textarea.value) {
      setStatus('没有可复制的内容，请先生成任务单。');
      return;
    }
    try {
      await navigator.clipboard.writeText(textarea.value);
      setStatus(label + '已复制到剪贴板。');
    } catch (err) {
      textarea.focus();
      textarea.select();
      setStatus('自动复制失败，已选中文本，请手动复制。');
    }
  }

  function downloadFile(text, filename, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function downloadText(textarea, filename, label) {
    if (!textarea.value) {
      setStatus('没有可下载的内容，请先生成任务单。');
      return;
    }
    downloadFile(textarea.value, filename, 'text/markdown;charset=utf-8');
    setStatus(label + '已开始下载。');
  }

  downloadDraft.addEventListener('click', () => {
    try {
      const text = serializeDraft(readForm());
      downloadFile(text, 'task-brief-draft.json', 'application/json;charset=utf-8');
      draftStatus.textContent = '草稿已开始下载。请确认文件已保存，下次可导入继续填写。';
    } catch (err) {
      draftStatus.textContent = '草稿未下载：' + err.message;
    }
  });

  importDraft.addEventListener('change', async () => {
    const file = importDraft.files[0];
    if (!file) return;
    importDraft.disabled = true;
    try {
      if (file.size > MAX_DRAFT_BYTES) throw new Error('文件超过 128 KB 上限。');
      const data = parseDraft(await file.text());
      if (dialog.open) throw new Error('请先完成当前确认，再导入草稿。');
      if (formHasContent()) {
        const ok = await confirmAction('导入会替换当前表单。需要保留现有内容时，请取消并先下载草稿。确定导入吗？');
        if (!ok) {
          draftStatus.textContent = '已取消导入，当前内容保持不变。';
          return;
        }
      }
      writeForm(data);
      invalidateOutputs();
      dirtyFromRestore = false;
      persist();
      setStatus('已导入草稿，请检查内容后重新生成任务单。');
      draftStatus.textContent = '草稿已导入，可以继续填写。' + (saveIssue ? ' ' + saveIssue : '');
    } catch (err) {
      draftStatus.textContent = '未导入，当前内容保持不变：' + err.message;
    } finally {
      importDraft.value = '';
      importDraft.disabled = false;
    }
  });

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeToggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  function initTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem('site-theme') || localStorage.getItem('task-brief-theme');
    } catch (err) {
      saved = null;
    }
    if (saved === 'dark' || saved === 'light') {
      applyTheme(saved);
    } else {
      applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    }
  }

  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try {
      localStorage.setItem('site-theme', next);
    } catch (err) { /* ignore */ }
  });

  form.addEventListener('submit', generate);

  form.addEventListener('input', () => {
    for (const name of FIELDS) form.elements[name].removeAttribute('aria-invalid');
    invalidateOutputs();
    if (dirtyFromRestore) dirtyFromRestore = false;
    persist();
    if (!memoryOnly) setStatus('内容已修改，请重新生成任务单。');
  });

  for (const btn of document.querySelectorAll('[data-example]')) {
    btn.addEventListener('click', () => { applyExample(btn.getAttribute('data-example')); });
  }

  clearBtn.addEventListener('click', () => { clearForm(); });

  copyExecute.addEventListener('click', () => { copyText(outExecute, '执行版'); });
  copyReview.addEventListener('click', () => { copyText(outReview, '复核版'); });
  downloadExecute.addEventListener('click', () => { downloadText(outExecute, 'task-brief-execute.md', '执行版'); });
  downloadReview.addEventListener('click', () => { downloadText(outReview, 'task-brief-review.md', '复核版'); });

  initTheme();
  restore();
  invalidateOutputs();
});
