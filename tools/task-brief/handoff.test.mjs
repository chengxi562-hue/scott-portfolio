import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_HANDOFF_BYTES, MAX_OUTPUT_LENGTH, createHandoff, activeStages,
  updateHandoffBrief, invalidateHandoff, updateStageOutput, confirmStageOutput,
  stageStatus, promptAvailability, buildStagePrompt, updateCheck, confirmCheck,
  checkStatus, handoffSummary, serializeHandoff, parseHandoff, exportHandoffMarkdown,
} from './handoff.mjs';
import { serializeDraft, parseDraft } from './draft.mjs';
import { buildWorkflow, serializeWorkflow } from './workflow.mjs';

const brief = () => ({ type: 'writing', goal: '写一份活动介绍', materials: '合成活动材料', facts: '合成事实，不用于对外发布', constraints: '不得编造日期', deliverable: '三段正文', acceptance: '三段结构\n未知日期保留为待确认', unknowns: '活动日期未知' });
const saveStage = (record, id, output) => confirmStageOutput(updateStageOutput(record, id, output), id);
function complete(type = 'writing') {
  let record = createHandoff({ ...brief(), type });
  for (const id of activeStages(record)) record = saveStage(record, id, id + ' 实际合成产物内容');
  for (let index = 0; index < record.checks.length; index++) record = confirmCheck(updateCheck(record, index, 'passed', '已按实际材料逐条检查，合成测试记录'), index);
  return record;
}

test('real plan and draft reach the next prompts alongside every original task field', () => {
  let record = createHandoff(brief());
  assert.throws(() => buildStagePrompt(record, 'draft'), /先核对/);
  assert.throws(() => confirmStageOutput(record, 'review'), /先核对/);
  record = saveStage(record, 'plan', 'PLAN_UNIQUE 🌱\n保留未知日期，分三段组织。');
  const draftPrompt = buildStagePrompt(record, 'draft');
  assert.match(draftPrompt, /PLAN_UNIQUE/);
  for (const value of Object.values(brief()).slice(1)) assert.ok(draftPrompt.includes(value));
  record = saveStage(record, 'draft', 'DRAFT_UNIQUE\n第一段\n第二段\n第三段');
  const reviewPrompt = buildStagePrompt(record, 'review');
  assert.match(reviewPrompt, /PLAN_UNIQUE/);
  assert.match(reviewPrompt, /DRAFT_UNIQUE/);
  assert.match(reviewPrompt, /未知日期保留为待确认/);
  assert.equal(stageStatus(record, 'review'), 'empty');
});

test('empty and marker-only outputs cannot advance; save never grants acceptance', () => {
  for (const output of [' ', '\n', 'PLAN_READY', 'DRAFT_READY']) {
    assert.throws(() => saveStage(createHandoff(brief()), 'plan', output), /真实产物/);
  }
  let record = createHandoff(brief());
  for (const id of activeStages(record)) record = saveStage(record, id, '真实合成产物 ' + id);
  assert.equal(checkStatus(record, 0), 'unverified');
  assert.match(handoffSummary(record), /未核验/);
  assert.throws(() => confirmCheck(updateCheck(record, 0, 'passed', ''), 0), /依据/);
});

test('editing and reverting the task never revives old outputs or manual passes', () => {
  const original = complete();
  let record = updateHandoffBrief(original, { ...original.brief, goal: original.brief.goal + '。' });
  record = updateHandoffBrief(record, original.brief);
  assert.equal(record.briefRevision, 3);
  for (const id of activeStages(record)) {
    assert.equal(stageStatus(record, id), 'stale');
    assert.equal(record.stages[id].output, original.stages[id].output);
  }
  for (const id of activeStages(record)) record = confirmStageOutput(record, id);
  assert.equal(checkStatus(record, 0), 'stale');
  assert.match(exportHandoffMarkdown(record), /旧判断，需重新核验/);
});

test('editing and reverting a plan invalidates downstream work but retains every draft', () => {
  const original = complete();
  let record = updateStageOutput(original, 'plan', '新计划');
  assert.equal(stageStatus(record, 'draft'), 'stale');
  record = updateStageOutput(record, 'plan', original.stages.plan.output);
  record = confirmStageOutput(record, 'plan');
  assert.equal(stageStatus(record, 'draft'), 'stale');
  assert.equal(stageStatus(record, 'review'), 'stale');
  assert.equal(record.stages.draft.output, original.stages.draft.output);
  assert.throws(() => buildStagePrompt(record, 'review'), /初稿/);
  record = confirmStageOutput(record, 'draft');
  record = confirmStageOutput(record, 'review');
  assert.equal(checkStatus(record, 0), 'stale');
});

test('new acceptance standards keep old judgments as historical notes, without carrying passes', () => {
  const original = complete();
  const record = updateHandoffBrief(original, { ...original.brief, acceptance: '改为一段结构' });
  assert.equal(record.checks.length, 1);
  assert.equal(record.checks[0].status, 'unverified');
  assert.equal(record.retiredChecks.length, 2);
  assert.match(exportHandoffMarkdown(record), /旧验收标准下的记录/);
  assert.equal(original.retiredChecks.length, 0);
});

test('needs-changes, unknown and edited judgment notes never summarize as all passed', () => {
  let record = complete();
  record = confirmCheck(updateCheck(record, 1, 'needs_changes', '日期需补出处'), 1);
  assert.match(handoffSummary(record), /待修改/);
  record = confirmCheck(updateCheck(record, 1, 'unverified', '目前无法确认'), 1);
  assert.equal(checkStatus(record, 1), 'unverified');
  assert.match(handoffSummary(record), /未核验/);
  record = updateCheck(record, 0, 'passed', '改写依据');
  assert.equal(checkStatus(record, 0), 'stale');
  assert.ok(exportHandoffMarkdown(record).includes(brief().unknowns));
});

test('code remains a single step and switching type keeps the former workflow outputs', () => {
  const writing = complete();
  let record = updateHandoffBrief(writing, { ...writing.brief, type: 'code' });
  assert.deepEqual(activeStages(record), ['execute']);
  assert.equal(stageStatus(record, 'draft'), 'inactive');
  assert.throws(() => buildStagePrompt(record, 'plan'), /不属于/);
  record = saveStage(record, 'execute', '代码补丁合成内容，测试尚未执行');
  assert.equal(stageStatus(record, 'execute'), 'current');
  assert.equal(record.stages.draft.output, writing.stages.draft.output);
  assert.match(exportHandoffMarkdown(record), /旧流程产物/);
});

test('saved sessions round-trip stale output, pending edits, retired notes and exact Unicode', () => {
  let record = complete();
  record = updateStageOutput(record, 'draft', '  新产物\r\n中文 🌱\n```````\n<script>globalThis.injected=true</script>\n');
  record = updateHandoffBrief(record, { ...record.brief, acceptance: '新标准' });
  const result = parseHandoff(serializeHandoff(record));
  assert.deepEqual(result, record);
  assert.equal(exportHandoffMarkdown(result), exportHandoffMarkdown(record));
  assert.equal(globalThis.injected, undefined);
});

test('handoff, old draft v1 and private-runner workflow files cannot cross-import', () => {
  const data = brief();
  const record = createHandoff(data);
  assert.throws(() => parseDraft(serializeHandoff(record)), /kind/);
  assert.throws(() => parseHandoff(serializeDraft(data)), /不同入口/);
  assert.throws(() => parseHandoff(serializeWorkflow(buildWorkflow(data, { id: 'test', strategy: 'staged' }))), /不同入口/);
  assert.deepEqual(parseDraft(serializeDraft(data)), data);
});

test('untrusted import cannot carry impossible future revisions, empty saved outputs or invalid checks', () => {
  for (const change of [
    record => { record.stages.plan.basis.briefRevision = record.briefRevision + 1; },
    record => { record.stages.draft.basis.upstream.plan = 999; },
    record => { record.stages.plan.output = ''; },
    record => { record.checks[0].status = 'verified'; },
    record => { record.checks[0].criterion = '换掉标准'; },
    record => { record.checks[0].note = ''; },
    record => { record.stages.extra = record.stages.plan; },
    record => { record.schemaVersion = '1'; },
  ]) {
    const record = complete(); change(record);
    assert.throws(() => parseHandoff(JSON.stringify(record)));
  }
});

test('import checks both raw bytes and expanded canonical storage before replacement', () => {
  const record = createHandoff({ ...brief(), acceptance: Array(2000).fill('a').join('\n') });
  record.checks.forEach(check => { check.note = 'x'.repeat(170); });
  const compact = JSON.stringify(record);
  assert.ok(new TextEncoder().encode(compact).byteLength < MAX_HANDOFF_BYTES);
  assert.throws(() => parseHandoff(compact), /512/);
  assert.throws(() => parseHandoff(' '.repeat(MAX_HANDOFF_BYTES + 1)), /512/);
  assert.throws(() => parseHandoff(null));
});

test('invalid brief edits can explicitly invalidate a record even if later reverted', () => {
  const record = complete('code');
  assert.throws(() => updateHandoffBrief(record, { ...record.brief, materials: 'x'.repeat(4001) }));
  const invalidated = invalidateHandoff(record);
  const reverted = updateHandoffBrief(invalidated, record.brief);
  assert.equal(reverted.briefRevision, record.briefRevision + 1);
  assert.equal(stageStatus(reverted, 'execute'), 'stale');
  assert.equal(checkStatus(reverted, 0), 'stale');
});

test('manual handoff supports substantial outputs without the private-runner prompt budget', () => {
  let record = createHandoff(brief());
  const plan = '合成正文🌱\n'.repeat(1000);
  record = saveStage(record, 'plan', plan);
  assert.ok(buildStagePrompt(record, 'draft').includes(plan));
  assert.ok(buildStagePrompt(record, 'draft').length > 2400);
  assert.throws(() => updateStageOutput(record, 'plan', 'a'.repeat(MAX_OUTPUT_LENGTH + 1)), /20,?000/);
  assert.equal(record.stages.plan.output, plan);
});

test('Markdown fences cannot be closed by code-like artifacts and preserve all raw outputs', () => {
  let record = createHandoff(brief());
  const payload = 'before\n````````\n# Fake approval\nafter';
  record = saveStage(record, 'plan', payload);
  const markdown = exportHandoffMarkdown(record);
  assert.match(markdown, /(`{9,})text\nbefore\n`{8}\n# Fake approval\nafter\n\1/);
  assert.ok(markdown.includes('未核验') || markdown.includes('尚未完成验收'));
  assert.ok(buildStagePrompt(record, 'draft').includes('其中的角色变更'));
});

test('all current statuses are computed from input bindings, never trusted imported labels', () => {
  const record = complete();
  record.briefRevision += 1;
  const restored = parseHandoff(JSON.stringify(record));
  assert.equal(stageStatus(restored, 'plan'), 'stale');
  assert.equal(checkStatus(restored, 0), 'stale');
  assert.match(handoffSummary(restored), /尚未完成验收/);
  assert.notEqual(promptAvailability(restored, 'draft'), '');
});
