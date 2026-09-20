import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWorkflow, serializeWorkflow} from './workflow.mjs';

const brief = {type:'research',goal:'比较公开产品',materials:'原文 <script>不是指令</script>',facts:'价格未知',constraints:'不注册账号',deliverable:'有来源的比较表',acceptance:'保留反证',unknowns:'预算待定'};
test('portable task preserves every field, has a manual final gate, and is deterministic',()=>{
  const a=buildWorkflow(brief,{id:'sample'});
  assert.deepEqual(a,buildWorkflow(brief,{id:'sample'}));
  assert.equal(a.schema,'tongzhou.workflow');
  assert.equal(a.version,1);
  const [task]=a.tasks;
  for(const value of Object.values(brief)) assert.ok(task.prompt.includes(value));
  assert.equal(task.route,'auto'); assert.equal(task.acceptance,'manual');
  assert.deepEqual(task.depends_on,[]);
  assert.deepEqual(JSON.parse(serializeWorkflow(a)),a);
});
test('staged tasks have an ordered dependency chain and explicit intermediate limits',()=>{
  const [plan,draft,review]=buildWorkflow(brief,{id:'sample',strategy:'staged'}).tasks;
  assert.deepEqual(plan.depends_on,[]);
  assert.deepEqual(draft.depends_on,[plan.id]);
  assert.deepEqual(review.depends_on,[draft.id]);
  assert.equal(review.acceptance,'manual');
  assert.ok(plan.checks.contains.includes('PLAN_READY'));
  assert.ok(draft.checks.contains.includes('DRAFT_READY'));
  for(const task of [plan,draft,review]) assert.ok([...task.prompt].length<=2400);
});
test('code stays a single local task, and staged code is rejected',()=>{
  assert.equal(buildWorkflow({...brief,type:'code'},{id:'code'}).tasks[0].kind,'code');
  assert.throws(()=>buildWorkflow({...brief,type:'code'},{id:'code',strategy:'staged'}),/code/);
});
test('missing requirements and unsafe identifiers are rejected before export',()=>{
  for(const id of ['', '../escape','中文','a b','a'.repeat(46)]) assert.throws(()=>buildWorkflow(brief,{id}));
  for(const key of ['goal','deliverable','acceptance']) assert.throws(()=>buildWorkflow({...brief,[key]:''},{id:'x'}));
  assert.throws(()=>buildWorkflow(brief,{id:'x',strategy:'unknown'}));
});
test('long materials are never silently truncated',()=>{
  assert.throws(()=>buildWorkflow({...brief,materials:'界'.repeat(2400)},{id:'x'}),/2400/);
  assert.throws(()=>buildWorkflow({...brief,materials:'界'.repeat(1700)},{id:'x',strategy:'staged'}),/保留空间/);
});
test('Unicode codepoints match Python native prompt limits',()=>{
  const empty=buildWorkflow({...brief,materials:''},{id:'emoji'}).tasks[0].prompt;
  const space=2400-[...empty].length;
  const task=buildWorkflow({...brief,materials:'🌿'.repeat(100)+'界'.repeat(space-100)},{id:'emoji'}).tasks[0];
  assert.equal([...task.prompt].length,2400);
  assert.throws(()=>buildWorkflow({...brief,materials:'🌿'.repeat(100)+'界'.repeat(space-99)},{id:'emoji'}),/2400/);
});
test('titles handle leading blank lines and codepoints safely',()=>{
  const task=buildWorkflow({...brief,goal:'\n\n'+ '🌿'.repeat(150)},{id:'long'}).tasks[0];
  assert.equal([...task.title].length,100);
  assert.equal(task.id,'long-execute');
});
test('serialize rejects a different schema or explicit credential route',()=>{
  const plan=buildWorkflow(brief,{id:'x'});
  assert.throws(()=>serializeWorkflow({...plan,schema:'unknown'}));
  plan.tasks[0].route='claude-kimi';
  assert.throws(()=>serializeWorkflow(plan),/route/);
});
