import test from 'node:test';
import assert from 'node:assert/strict';
import {Buffer} from 'node:buffer';
import {serializeDraft, parseDraft, MAX_DRAFT_BYTES} from './draft.mjs';

const emptyBrief = (type = 'research') => ({
  type, goal: '', materials: '', facts: '', constraints: '',
  deliverable: '', acceptance: '', unknowns: '',
});
const pack = (brief, overrides = {}) => JSON.stringify({
  kind: 'task-brief', schemaVersion: 1, brief, ...overrides,
});
const rejectBothWays = brief => {
  assert.throws(() => serializeDraft(brief));
  assert.throws(() => parseDraft(pack(brief)));
};

test('serialized drafts have the versioned envelope and leave input unchanged', () => {
  assert.equal(MAX_DRAFT_BYTES, 128 * 1024);
  const input = Object.freeze({type: 'writing', goal: '正在整理', ignored: 'discard'});
  const text = serializeDraft(input);
  assert.equal(typeof text, 'string');
  assert.deepEqual(JSON.parse(text), {
    kind: 'task-brief', schemaVersion: 1,
    brief: {...emptyBrief('writing'), goal: '正在整理'},
  });
  assert.deepEqual(input, {type: 'writing', goal: '正在整理', ignored: 'discard'});
});

test('empty and incomplete drafts round-trip for every supported task type', () => {
  for (const type of ['research', 'writing', 'code']) {
    assert.deepEqual(parseDraft(serializeDraft({type})), emptyBrief(type));
    const partial = {type, materials: '已有材料', acceptance: '  \n'};
    assert.deepEqual(parseDraft(serializeDraft(partial)), {
      ...emptyBrief(type), materials: '已有材料', acceptance: '  \n',
    });
  }
});

test('multiline Chinese, Markdown and code-like content remain inert text', () => {
  const materials = '第一行：中文与 emoji 🌱\n```js\nglobalThis.__draftTestExecuted = true;\n```\n# 标题\n- [链接](https://example.test/?a=1&b=2)\n\\path\\file "引号"\n';
  const brief = {
    ...emptyBrief('code'), materials, goal: ' 保留首尾空格 ',
    facts: '事实\r\n第二行', unknowns: '<script>alert("data")</script>',
  };
  assert.deepEqual(parseDraft(serializeDraft(brief)), brief);
  assert.equal(Object.hasOwn(globalThis, '__draftTestExecuted'), false);
});

test('import drops unknown brief fields and returns only normalized fields', () => {
  const text = '{"kind":"task-brief","schemaVersion":1,"brief":{"type":"research","goal":"目标","extra":{"nested":true},"__proto__":{"draftPolluted":true}}}';
  const brief = parseDraft(text);
  assert.deepEqual(brief, {...emptyBrief(), goal: '目标'});
  assert.equal(Object.hasOwn(brief, 'extra'), false);
  assert.equal(Object.hasOwn(brief, '__proto__'), false);
  assert.equal(Object.hasOwn(Object.prototype, 'draftPolluted'), false);
});

test('import requires a primitive string instead of coercing other inputs', () => {
  const text = pack({type: 'research'});
  for (const input of [undefined, null, 0, true, {}, [], new String(text), Buffer.from(text)]) {
    assert.throws(() => parseDraft(input));
  }
});

test('import rejects malformed JSON and nonobject envelopes', () => {
  for (const text of ['', '   ', '{', '{"kind":"task-brief",}', 'null', '[]', 'true', '42', '"draft"']) {
    assert.throws(() => parseDraft(text));
  }
});

test('import requires the exact kind, numeric schema version and brief member', () => {
  const brief = {type: 'research'};
  for (const kind of [undefined, null, '', 'Task-Brief', 1, {}]) {
    assert.throws(() => parseDraft(pack(brief, {kind})));
  }
  for (const schemaVersion of [undefined, null, '1', 0, 2, true, []]) {
    assert.throws(() => parseDraft(pack(brief, {schemaVersion})));
  }
  assert.throws(() => parseDraft(JSON.stringify({kind: 'task-brief', schemaVersion: 1})));
});

test('both directions reject invalid brief shapes, task types and field values', () => {
  for (const brief of [undefined, null, [], 5, 'draft', {}, {type: 'trading'}, {type: null}, {type: 1}]) {
    rejectBothWays(brief);
  }
  for (const field of ['goal', 'materials', 'facts', 'constraints', 'deliverable', 'acceptance', 'unknowns']) {
    for (const value of [null, 0, false, [], {}]) {
      rejectBothWays({type: 'research', [field]: value});
    }
  }
});

test('incomplete drafts still enforce per-field and total text limits', () => {
  for (const [field, limit] of [
    ['goal', 1000], ['materials', 4000], ['facts', 4000], ['constraints', 4000],
    ['deliverable', 4000], ['acceptance', 4000], ['unknowns', 4000],
  ]) {
    const allowed = {type: 'research', [field]: 'x'.repeat(limit)};
    assert.equal(parseDraft(serializeDraft(allowed))[field], allowed[field]);
    rejectBothWays({...allowed, [field]: 'x'.repeat(limit + 1)});
  }
  const atTotalLimit = {
    ...emptyBrief(), goal: 'g'.repeat(1000), materials: 'm'.repeat(4000),
    facts: 'f'.repeat(4000), constraints: 'c'.repeat(4000),
    deliverable: 'd'.repeat(4000), acceptance: 'a'.repeat(3000),
  };
  assert.deepEqual(parseDraft(serializeDraft(atTotalLimit)), atTotalLimit);
  rejectBothWays({...atTotalLimit, unknowns: 'x'});
});

test('import caps UTF-8 bytes with an inclusive boundary, not string length', () => {
  const base = pack({type: 'research', ignored: '汉'.repeat(30000)});
  const exact = base + ' '.repeat(MAX_DRAFT_BYTES - Buffer.byteLength(base, 'utf8'));
  assert.equal(Buffer.byteLength(exact, 'utf8'), MAX_DRAFT_BYTES);
  assert.ok(exact.length < MAX_DRAFT_BYTES);
  assert.deepEqual(parseDraft(exact), emptyBrief());
  assert.throws(() => parseDraft(exact + ' '));

  const multibyteOversize = pack({type: 'research', ignored: '汉'.repeat(45000)});
  assert.ok(multibyteOversize.length < MAX_DRAFT_BYTES);
  assert.ok(Buffer.byteLength(multibyteOversize, 'utf8') > MAX_DRAFT_BYTES);
  assert.throws(() => parseDraft(multibyteOversize));
});
