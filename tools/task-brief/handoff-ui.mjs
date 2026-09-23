import {
  MAX_HANDOFF_BYTES, MAX_OUTPUT_LENGTH, STAGE_LABELS, activeStages,
  createHandoff, updateHandoffBrief, invalidateHandoff, updateStageOutput, confirmStageOutput,
  stageStatus, promptAvailability, buildStagePrompt, updateCheck, confirmCheck,
  checkStatus, outputsReady, handoffSummary, serializeHandoff, parseHandoff,
  exportHandoffMarkdown,
} from './handoff.mjs';

const STORAGE_KEY = 'task-brief-handoff-v1';
const stageLabels = { empty: '待填写', unconfirmed: '已保留，待保存', stale: '旧产物，需按当前任务重新核对', current: '已保存，可继续', inactive: '旧流程产物，保留但不参与当前验收' };
const checkLabels = { unverified: '未核验', passed: '已记录人工通过', needs_changes: '待修改', stale: '旧判断，需针对当前产物重新核验' };
const $ = selector => document.querySelector(selector);
const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};

export function setupHandoff({ readBrief, applyBrief, confirmAction, isConfirmOpen, hasRestoredBrief, downloadFile }) {
  let record = null;
  let syncError = '';
  let storageIssue = '';
  let backupSnapshot = '';
  let mutation = 0;
  const stageViews = new Map();
  let checkViews = [];
  const status = $('#handoffStatus');
  const content = $('#handoffContent');
  const stagesContainer = $('#handoffStages');
  const checksContainer = $('#handoffChecks');
  const start = $('#startHandoff');
  const importInput = $('#importHandoff');
  const jsonButton = $('#downloadHandoff');
  const markdownButton = $('#exportHandoff');

  function announce(message) { status.textContent = message + (storageIssue ? ' ' + storageIssue : ''); }
  function persist() {
    try {
      sessionStorage.setItem(STORAGE_KEY, serializeHandoff(record));
      storageIssue = '';
    } catch (_) {
      storageIssue = '标签页保存未成功，记录仍在当前页面；请下载交接记录并确认保存。';
    }
    $('#handoffSaveState').textContent = storageIssue || '仅保留在本标签页。关闭前下载交接记录，下次可完整恢复。';
  }
  function accept(next, message = '') {
    record = next;
    mutation += 1;
    persist();
    render();
    if (message) announce(message);
    else if (storageIssue) announce('');
  }
  function perform(action, message) {
    if (syncError) { announce(syncError); return; }
    try { accept(action(), message); }
    catch (error) { announce(error.message); }
  }
  function guardPaste(textarea, limit, label) {
    textarea.addEventListener('paste', event => {
      const pasted = event.clipboardData?.getData('text/plain');
      if (pasted === undefined) return;
      const length = textarea.value.length - (textarea.selectionEnd - textarea.selectionStart) + pasted.length;
      if (length > limit) {
        event.preventDefault();
        announce(label + '粘贴后会超过 ' + limit.toLocaleString('en-US') + ' 字符，未替换或截断现有内容；请先拆分材料。');
      }
    });
  }
  async function copyPrompt(view) {
    if (view.copy.disabled || !view.prompt.value) return;
    try {
      await navigator.clipboard.writeText(view.prompt.value);
      announce('本步任务已复制。请在自己使用的 AI 中执行，再把真实产物粘贴回来。');
    } catch (_) {
      view.details.open = true;
      view.prompt.focus();
      view.prompt.select();
      announce('自动复制不可用，已选中本步任务，请手动复制。');
    }
  }
  function stageView(id, index) {
    const article = node('article', undefined, 'handoff-stage');
    article.dataset.handoffStage = id;
    const heading = node('h3', String(index + 1).padStart(2, '0') + ' · ' + STAGE_LABELS[id]);
    heading.id = 'handoff-' + id + '-title';
    const state = node('p', '', 'handoff-stage-state');
    state.id = 'handoff-' + id + '-state';
    const details = node('details', undefined, 'handoff-prompt');
    const summary = node('summary', '查看本步任务');
    const prompt = node('textarea');
    prompt.id = 'handoff-' + id + '-prompt';
    prompt.readOnly = true;
    prompt.rows = 8;
    prompt.setAttribute('aria-label', STAGE_LABELS[id] + '任务文本');
    details.append(summary, prompt);
    const copy = node('button', '复制本步任务');
    copy.type = 'button';
    copy.dataset.copyStage = id;
    const label = node('label', '粘贴实际' + STAGE_LABELS[id]);
    const output = node('textarea');
    output.id = 'handoff-' + id + '-output';
    output.rows = 6;
    output.maxLength = MAX_OUTPUT_LENGTH;
    output.placeholder = '把你实际得到的产物粘贴到这里；不要只填写“已完成”。';
    output.setAttribute('aria-describedby', state.id);
    guardPaste(output, MAX_OUTPUT_LENGTH, '阶段产物');
    label.append(output);
    const save = node('button', '保存本步产物');
    save.type = 'button';
    save.dataset.saveStage = id;
    const blocked = node('p', '', 'handoff-stage-help');
    const view = { article, heading, state, details, prompt, copy, output, save, blocked };
    output.addEventListener('input', () => perform(() => updateStageOutput(record, id, output.value)));
    save.addEventListener('click', () => perform(() => confirmStageOutput(record, id), '已保存本步产物。保存表示它对应当前任务，不代表验收通过。'));
    copy.addEventListener('click', () => copyPrompt(view));
    article.append(heading, state, copy, details, label, save, blocked);
    return view;
  }
  function checkView(check, index) {
    const item = node('article', undefined, 'handoff-check');
    const criterion = node('h4', check.criterion);
    const state = node('p', '', 'handoff-check-state');
    const selectLabel = node('label', '我的判断');
    const select = node('select');
    select.id = 'handoff-check-' + index + '-status';
    for (const [value, label] of Object.entries({ unverified: '未核验', passed: '通过', needs_changes: '待修改' })) {
      const option = node('option', label); option.value = value; select.append(option);
    }
    selectLabel.append(select);
    const noteLabel = node('label', '依据或待修改项');
    const note = node('textarea');
    note.id = 'handoff-check-' + index + '-note';
    note.rows = 3;
    note.maxLength = 4000;
    note.placeholder = '例如：已对照第 2 段核对来源；发布日期仍待确认。';
    guardPaste(note, 4000, '验收依据');
    noteLabel.append(note);
    const save = node('button', '保存人工判断');
    save.type = 'button';
    save.dataset.saveCheck = index;
    const change = () => perform(() => updateCheck(record, index, select.value, note.value));
    select.addEventListener('change', change);
    note.addEventListener('input', change);
    save.addEventListener('click', () => perform(() => confirmCheck(record, index), '人工判断已保存；未核验项保持未核验。'));
    item.append(criterion, state, selectLabel, noteLabel, save);
    return { item, criterion, state, select, note, save };
  }
  function render() {
    content.hidden = !record;
    jsonButton.disabled = !record || !!syncError;
    markdownButton.disabled = !record || !!syncError;
    start.textContent = record ? '重新开始一份交接' : '开始手动交接';
    if (!record) return;
    const ids = activeStages(record);
    if ([...stageViews.keys()].join(',') !== ids.join(',')) {
      stageViews.clear(); stagesContainer.replaceChildren();
      ids.forEach((id, index) => { const view = stageView(id, index); stageViews.set(id, view); stagesContainer.append(view.article); });
    }
    for (const [id, view] of stageViews) {
      const blocked = syncError || promptAvailability(record, id);
      const state = stageStatus(record, id);
      view.state.textContent = stageLabels[state];
      view.article.dataset.state = state;
      view.prompt.value = blocked ? '' : buildStagePrompt(record, id);
      view.prompt.placeholder = blocked;
      view.copy.disabled = Boolean(blocked);
      view.save.disabled = Boolean(blocked) || !record.stages[id].output.trim();
      view.output.readOnly = Boolean(syncError);
      view.blocked.textContent = blocked || '保存前请核对：这是按当前任务和上游材料得到的产物。每步最多 20,000 字符。';
      if (view.output.value !== record.stages[id].output) view.output.value = record.stages[id].output;
    }
    if (JSON.stringify(checkViews.map(view => view.criterion.textContent)) !== JSON.stringify(record.checks.map(check => check.criterion))) {
      checkViews = record.checks.map(checkView);
      checksContainer.replaceChildren(...checkViews.map(view => view.item));
    }
    record.checks.forEach((check, index) => {
      const view = checkViews[index];
      view.state.textContent = checkLabels[checkStatus(record, index)];
      if (view.select.value !== check.status) view.select.value = check.status;
      if (view.note.value !== check.note) view.note.value = check.note;
      view.select.disabled = Boolean(syncError);
      view.note.readOnly = Boolean(syncError);
      view.save.disabled = !!syncError || !outputsReady(record);
    });
    $('#handoffSummary').textContent = syncError || handoffSummary(record);
    $('#handoffUnknowns').textContent = record.brief.unknowns ? '任务中仍保留的未知项：' + record.brief.unknowns : '没有填写未知项，不代表不存在未知；验收时请继续保留无法确认的内容。';
    const preserved = $('#handoffPreserved');
    const preservedBody = $('#handoffPreservedBody');
    preservedBody.replaceChildren();
    for (const id of Object.keys(STAGE_LABELS).filter(key => !ids.includes(key) && record.stages[key].output)) {
      const label = node('label', '旧流程 · ' + STAGE_LABELS[id]);
      const textarea = node('textarea');
      textarea.readOnly = true; textarea.rows = 5; textarea.value = record.stages[id].output;
      label.append(textarea); preservedBody.append(label);
    }
    record.retiredChecks.forEach(check => {
      const item = node('div', undefined, 'handoff-retired');
      item.append(node('p', check.criterion), node('p', '旧判断（已失效）：' + checkLabels[check.status]), node('p', check.note || '无备注'));
      preservedBody.append(item);
    });
    preserved.hidden = !preservedBody.children.length;
  }
  start.addEventListener('click', async () => {
    if (isConfirmOpen()) return;
    try {
      const next = createHandoff(readBrief());
      if (record && !await confirmAction('重新开始会替换当前交接产物与人工判断。需要保留时请取消，先下载交接记录。确定重新开始吗？')) return;
      syncError = ''; backupSnapshot = '';
      accept(next, '手动交接已建立。先复制第一步任务，交给你自己使用的 AI。');
      stageViews.values().next().value.copy.focus({ preventScroll: true });
    } catch (error) { announce(error.message); }
  });
  jsonButton.addEventListener('click', () => {
    if (!record || syncError) return;
    try {
      const text = serializeHandoff(record);
      downloadFile(text, 'task-brief-handoff.json', 'application/json;charset=utf-8');
      backupSnapshot = text;
      announce('已请求下载交接记录，请确认保存成功。文件包含原任务、实际产物与人工判断，可在此完整恢复。');
    } catch (error) { announce(error.message); }
  });
  markdownButton.addEventListener('click', () => {
    if (!record || syncError) return;
    try {
      downloadFile(exportHandoffMarkdown(record), 'task-brief-handoff.md', 'text/markdown;charset=utf-8');
      announce('已请求下载完整 Markdown。未核验、过期产物和旧判断会如实保留；恢复填写请另存交接 JSON。');
    } catch (error) { announce(error.message); }
  });
  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    importInput.disabled = true;
    try {
      if (file.size > MAX_HANDOFF_BYTES) throw new Error('交接记录超过 512 KiB，未导入。');
      const next = parseHandoff(await file.text());
      const preparedSnapshot = serializeHandoff(next);
      if (isConfirmOpen()) throw new Error('请先完成当前确认，再导入交接记录。');
      const before = mutation;
      const formBefore = JSON.stringify(readBrief());
      const hasContent = Object.entries(readBrief()).some(([key, value]) => key !== 'type' && value.trim());
      if ((record || hasContent) && !await confirmAction('导入会同时替换当前任务信息和交接记录。需要保留时请取消并下载现有记录。确定导入吗？')) {
        announce('已取消导入，当前任务与交接记录保持不变。'); return;
      }
      if (before !== mutation || formBefore !== JSON.stringify(readBrief())) throw new Error('确认期间内容发生变化，请重新导入，当前内容保持不变。');
      record = next; syncError = '';
      applyBrief(next.brief);
      backupSnapshot = preparedSnapshot;
      accept(next, '交接记录已恢复。产物和通过标记来自文件中的使用者记录，工具未验证其真实性。');
    } catch (error) { announce('未导入：' + error.message); }
    finally { importInput.value = ''; importInput.disabled = false; }
  });
  window.addEventListener('beforeunload', event => {
    if (!record) return;
    const hasWork = Object.values(record.stages).some(stage => stage.output.trim()) || record.checks.some(check => check.note || check.status !== 'unverified');
    let current = '';
    try { current = serializeHandoff(record); } catch (_) {}
    if (hasWork && (!current || current !== backupSnapshot)) { event.preventDefault(); event.returnValue = ''; }
  });
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      record = parseHandoff(stored);
      if (hasRestoredBrief) record = updateHandoffBrief(record, readBrief());
      else applyBrief(record.brief);
      announce('已恢复本标签页交接记录。关闭前请下载 JSON 留存。');
    }
  } catch (_) { storageIssue = '交接缓存无法读取或存储不可用，尚未覆盖旧缓存；可导入已下载的交接记录。'; announce(''); }
  $('#handoffSaveState').textContent = storageIssue || '仅保留在本标签页。关闭前下载交接记录，下次可完整恢复。';
  render();
  return {
    sync(nextBrief) {
      if (!record) return;
      try {
        const next = updateHandoffBrief(record, nextBrief);
        const changed = next.briefRevision !== record.briefRevision;
        syncError = '';
        if (changed) accept(next, '任务信息已变更。原产物和人工判断仍保留，请按当前任务重新核对并保存。');
        else render();
      } catch (error) {
        if (!syncError) { record = invalidateHandoff(record); mutation += 1; persist(); }
        syncError = error.message;
        render();
        announce('当前任务信息尚未同步到交接记录，旧产物已标记失效：' + error.message);
      }
    },
  };
}
