import { normalizeBrief } from './core.mjs';

export const MAX_DRAFT_BYTES = 128 * 1024;

const DRAFT_KIND = 'task-brief';
const DRAFT_SCHEMA_VERSION = 1;

function utf8ByteLength(text) {
  return new TextEncoder().encode(text).byteLength;
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function serializeDraft(input) {
  const brief = normalizeBrief(input, { allowIncomplete: true });
  const envelope = {
    kind: DRAFT_KIND,
    schemaVersion: DRAFT_SCHEMA_VERSION,
    brief,
  };
  const text = JSON.stringify(envelope, null, 2) + '\n';
  if (utf8ByteLength(text) > MAX_DRAFT_BYTES) {
    throw new Error('草稿序列化后超过 128KB 上限，请精简内容后再导出');
  }
  return text;
}

export function parseDraft(text) {
  if (typeof text !== 'string') {
    throw new Error('草稿内容必须是字符串');
  }
  if (utf8ByteLength(text) > MAX_DRAFT_BYTES) {
    throw new Error('草稿文件超过 128KB 上限，无法导入');
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('草稿格式不对：不是合法的 JSON 文本');
  }
  if (!isPlainObject(data)) {
    throw new Error('草稿格式不对：顶层必须是 JSON 对象');
  }
  if (data.kind !== DRAFT_KIND) {
    throw new Error('这不是本工具导出的草稿文件（kind 不匹配）');
  }
  if (data.schemaVersion !== DRAFT_SCHEMA_VERSION) {
    throw new Error('草稿版本不受支持：仅支持 schemaVersion 1');
  }
  if (!('brief' in data)) {
    throw new Error('草稿格式不对：缺少 brief 字段');
  }
  return normalizeBrief(data.brief, { allowIncomplete: true });
}
