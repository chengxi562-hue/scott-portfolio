import {validateWorkspace,auditClaim,quoteMatch,safeUrl,exportMarkdown,buildHandoff} from './core.mjs';
const $ = s => document.querySelector(s);
const today = () => new Date().toISOString().slice(0,10);
const KEY = 'evidence-brief-v1';
const empty = () => ({version:1,title:'',scenario:'marketing',claims:[]});
let state=empty(),selected=null,editing=null,dirty=false,claimDirty=false,history=[];
const uid = () => crypto.randomUUID();
const guides={marketing:'关注用户是谁、样本是否代表目标人群、竞品信息日期，以及“相关”能否支持“因果”。',finance:'核对原始公告、统计期间、币种与单位，区分历史事实和未来预测。工具不提供买卖结论。',ai:'核对模型或产品版本、测试条件、计费口径，以及宣称的效率提升是否有实测依据。'};
const kinds={fact:'事实陈述',inference:'分析推断',hypothesis:'待验证假设'};
const relations={supports:'支持',contradicts:'反驳 / 冲突',context:'背景材料'};
const types={primary:'一手（用户标记）',secondary:'二手（用户标记）',unknown:'性质未确认'};
const clone=x=>JSON.parse(JSON.stringify(x));
let confirmationResolve = null, confirmationFocus = null;
async function ask(message) {
  if (confirmationResolve) return false;
  confirmationFocus = document.activeElement;
  $('#confirm-message').textContent = message;
  $('#confirm-dialog').showModal();
  $('#confirm-no').focus();
  return new Promise(resolve => { confirmationResolve = resolve; });
}
function resolveConfirmation(value) {
  const resolve = confirmationResolve; confirmationResolve = null;
  $('#confirm-dialog').close(); confirmationFocus?.focus(); if(resolve)resolve(value);
}
$('#confirm-yes').addEventListener('click',()=>resolveConfirmation(true));
$('#confirm-no').addEventListener('click',()=>resolveConfirmation(false));
$('#confirm-dialog').addEventListener('cancel',e=>{e.preventDefault();resolveConfirmation(false);});

function notify(message){$('#message').textContent=message;}
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
let saveStatus=$('#save-state').textContent;
function hasPendingInput(){return dirty||claimDirty||!!$('#claim-input').value.trim()||$('#brief-title').value.trim()!==state.title;}
function updateSaveStatus(){$('#save-state').textContent=hasPendingInput()?'有未保存内容：请保存表单或将输入加入清单；备份只包含已保存记录。':saveStatus;}
function save(){try{sessionStorage.setItem(KEY,JSON.stringify(state));saveStatus='已保存到本标签页 · 关闭标签页可能丢失，请导出 JSON 备份。';}catch(_){saveStatus='浏览器保存失败：当前内容仅在内存中，请立即导出 JSON 备份。';}updateSaveStatus();}
function commit(next,message){const clean=validateWorkspace(next);history.push(clone(state));if(history.length>10)history.shift();state=clean;save();if(message)notify(message);render();}
async function abandonDraft(){return (!dirty&&!claimDirty)||await ask('还有未保存的说法或来源内容。继续会放弃这些修改，是否继续？');}
function current(){return state.claims.find(c=>c.id===selected);}
function closeSource(){editing=null;dirty=false;$('#source-form').hidden=true;$('#source-error').textContent='';updateSaveStatus();}
function render(){
 $('#brief-title').value=state.title;$('#scenario').value=state.scenario;$('#scenario-guide').textContent=guides[state.scenario];$('#count').textContent=String(state.claims.length);$('#undo').disabled=!history.length;
 const list=$('#claim-list');list.replaceChildren();let pending=0;
 state.claims.forEach((claim,index)=>{const audit=auditClaim(claim,today());if(audit.issues.length)pending++;const button=node('button',undefined,'claim-choice');button.type='button';button.dataset.claim=claim.id;button.setAttribute('aria-pressed',String(selected===claim.id));button.append(node('small',String(index+1).padStart(2,'0')+' / '+kinds[claim.kind]),node('span',claim.text),node('em',audit.issues.length?audit.issues.length+' 项待复核':'已记录复核'));button.addEventListener('click',async()=>{if(!(await abandonDraft()))return;selected=claim.id;closeSource();render();$('#claim-name').focus({preventScroll:true});if(matchMedia('(max-width:680px)').matches)$('#claim-editor').scrollIntoView({block:'start',behavior:'instant'});});list.append(button);});
 $('#overview').textContent=state.claims.length?state.claims.length+' 条说法 · '+pending+' 条仍有待核验项':'尚未添加结论';
 const claim=current();$('#empty').hidden=!!claim;$('#claim-editor').hidden=!claim;
 if(!claim){claimDirty=false;updateSaveStatus();return;}
 $('#claim-name').textContent='说法 '+String(state.claims.indexOf(claim)+1).padStart(2,'0');$('#claim-text').value=claim.text;$('#claim-kind').value=claim.kind;claimDirty=false;
 const audit=auditClaim(claim,today());$('#review-title').textContent=audit.issues.length?'还需要核对这些问题':'复核记录完整 · 仍需你对结论负责';$('#issues').replaceChildren(...audit.issues.map(i=>node('li',i.message)));
 const container=$('#evidence-list');container.replaceChildren();
 if(!claim.evidence.length)container.append(node('p','还没有来源。可以先留作待核验，不必填一个看似权威的链接。','small'));
 claim.evidence.forEach(ev=>{const card=node('article',undefined,'evidence'),top=node('div',undefined,'evidence-top');top.append(node('h4',ev.title||'未命名来源'));if(safeUrl(ev.url)){const link=node('a','打开原始来源 ↗');link.href=ev.url;link.target='_blank';link.rel='noopener noreferrer';top.append(link);}card.append(top,node('p',[types[ev.sourceType],relations[ev.relation],'发布 '+(ev.publishedOn||'未知'),'查看 '+(ev.accessedOn||'未知')].join(' · '),'evidence-meta'));
 if(ev.quote)card.append(node('blockquote',ev.quote));
 const match=quoteMatch(ev.quote,ev.sourceText);card.append(node('span',(match==='matched'?'摘录在粘贴原文中命中':match==='mismatch'?'摘录与粘贴原文不符':'缺少摘录或上下文')+' · '+(ev.reviewed?'用户已记录复核':'尚未人工复核'),'evidence-state'));
 const buttons=node('div',undefined,'toolbar');const edit=node('button','编辑来源');edit.type='button';edit.addEventListener('click',async()=>openSource(ev));const remove=node('button','移除来源');remove.type='button';remove.addEventListener('click',async()=>{if(!(await abandonDraft()))return;const next=clone(state);next.claims.find(c=>c.id===selected).evidence=claim.evidence.filter(e=>e.id!==ev.id);closeSource();commit(next,'已移除来源，可用“撤销”恢复。');});buttons.append(edit,remove);card.append(buttons);container.append(card);});
 updateSaveStatus();
}
async function openSource(ev=null){if(!(await abandonDraft()))return;render();editing=ev?.id||null;dirty=false;$('#source-form').reset();$('#source-form-title').textContent=ev?'编辑来源':'补充来源';for(const [id,key] of [['title','title'],['url','url'],['published','publishedOn'],['accessed','accessedOn'],['type','sourceType'],['relation','relation'],['quote','quote'],['text','sourceText']])$('#source-'+id).value=ev?.[key]??({sourceType:'unknown',relation:'context',accessedOn:today()}[key]||'');$('#source-reviewed').checked=ev?.reviewed||false;$('#source-error').textContent='';$('#source-form').hidden=false;$('#source-title').focus();}
$('#source-form').addEventListener('input',e=>{dirty=true;updateSaveStatus();if(e.target.id!=='source-reviewed')$('#source-reviewed').checked=false;});
$('#source-form').addEventListener('submit',async e=>{e.preventDefault();if(claimDirty){$('#source-error').textContent='上方说法有未保存修改。请先保存说法，或取消说法修改后再保存来源。';return;}const ev={id:editing||uid(),title:$('#source-title').value.trim(),url:$('#source-url').value.trim(),publishedOn:$('#source-published').value,accessedOn:$('#source-accessed').value,sourceType:$('#source-type').value,relation:$('#source-relation').value,quote:$('#source-quote').value,sourceText:$('#source-text').value,reviewed:$('#source-reviewed').checked};const next=clone(state),claim=next.claims.find(c=>c.id===selected);if(editing)claim.evidence=claim.evidence.map(x=>x.id===editing?ev:x);else claim.evidence.push(ev);try{const validated=validateWorkspace(next);closeSource();commit(validated,'来源已保存；请查看实际核验缺口。');}catch(error){$('#source-error').textContent=error.message;}});
$('#cancel-source').addEventListener('click',async()=>{if(await abandonDraft())closeSource();});$('#add-source').addEventListener('click',async()=>openSource());
$('#add-claims').addEventListener('submit',async e=>{e.preventDefault();if(!(await abandonDraft()))return;const lines=$('#claim-input').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(!lines.length){notify('请先输入至少一条说法。');return;}const next=clone(state);const added=lines.map(text=>({id:uid(),text,kind:'hypothesis',evidence:[]}));next.claims.push(...added);try{const valid=validateWorkspace(next);closeSource();selected=added[0].id;commit(valid,'已按非空行加入 '+added.length+' 条，初始均为待验证假设。');$('#claim-input').value='';updateSaveStatus();}catch(error){notify(error.message);}});
$('#edit-claim').addEventListener('input',()=>{claimDirty=true;updateSaveStatus();});
$('#edit-claim').addEventListener('submit',async e=>{e.preventDefault();if(dirty&&!await ask('保存说法会放弃来源表单中未保存的修改。继续？'))return;const next=clone(state),claim=next.claims.find(c=>c.id===selected),text=$('#claim-text').value.trim(),kind=$('#claim-kind').value;if(claim.text!==text||claim.kind!==kind)claim.evidence.forEach(ev=>ev.reviewed=false);claim.text=text;claim.kind=kind;try{const validated=validateWorkspace(next);closeSource();commit(validated,'说法已保存；改动后的关系需要重新复核。');}catch(error){notify(error.message);}});
$('#remove-claim').addEventListener('click',async()=>{if(!(await abandonDraft()))return;const next=clone(state);next.claims=next.claims.filter(c=>c.id!==selected);selected=next.claims[0]?.id||null;closeSource();commit(next,'已移除此条，可用“撤销”恢复。');});
$('#brief-title').addEventListener('change',async()=>{if(!(await abandonDraft())){$('#brief-title').value=state.title;return;}closeSource();const next=clone(state);next.title=$('#brief-title').value.trim();commit(next);});$('#scenario').addEventListener('change',async()=>{if(!(await abandonDraft())){$('#scenario').value=state.scenario;return;}closeSource();const next=clone(state);next.scenario=$('#scenario').value;commit(next);});
$('#undo').addEventListener('click',async()=>{if(!(await abandonDraft())||!history.length)return;state=history.pop();selected=state.claims[0]?.id||null;closeSource();save();render();notify('已恢复上一步。');});
$('#new').addEventListener('click',async()=>{if(!(await abandonDraft()))return;if(state.claims.length&&!await ask('新建会替换当前工作区。可以先导出备份，也可以在本次会话中撤销。继续？'))return;selected=null;closeSource();commit(empty(),'已新建。此前工作区可用“撤销”恢复。');});
const secQuote='Anyone can access and download this information for free';
function sample(){return {version:1,title:'示例：一个 AI 商业研究工具，应该先解决什么问题？',scenario:'ai',claims:[{id:'sample-sec',text:'SEC 的 EDGAR 申报信息可由公众免费访问，能作为公司研究的原始材料入口。',kind:'fact',evidence:[{id:'source-sec',title:'SEC · Accessing EDGAR Data',url:'https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data',publishedOn:'2021-03-23',accessedOn:'2026-09-19',quote:secQuote,sourceText:secQuote,sourceType:'primary',relation:'supports',reviewed:true}]},{id:'sample-positioning',text:'让 AI 使用者在生成分析后核对出处，可能是一个值得验证的产品方向。',kind:'inference',evidence:[{id:'source-zotero',title:'Zotero 官方说明 · Notes（仅背景，未录入摘录）',url:'https://www.zotero.org/support/notes',publishedOn:'',accessedOn:'2026-09-19',quote:'',sourceText:'',sourceType:'primary',relation:'context',reviewed:false}]},{id:'sample-hypothesis',text:'待验证假设：该流程能减少研究返工。尚无访谈、对照测试或节省比例，不作为已测结果。',kind:'hypothesis',evidence:[]}]};}
$('#sample').addEventListener('click',async()=>{if(!(await abandonDraft()))return;if(state.claims.length&&!await ask('示例会替换当前工作区。原内容可在本次会话中撤销；重要内容请先备份。继续？'))return;const next=sample();selected=next.claims[0].id;closeSource();commit(next,'已打开公开来源示例：第一条有来源，第二条只有背景，第三条仍是假设。示例复核日期为 2026-09-19，不代表之后仍自动有效。');});
async function download(name,data,type){if(hasPendingInput()&&!await ask('当前有未保存的编辑。下载只包含上次保存的内容，是否继续？'))return false;const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);return true;}
$('#backup').addEventListener('click',async()=>{if(!await download('evidence-brief-'+today()+'.json',JSON.stringify(state,null,2),'application/json'))return;notify('已请求下载 JSON 备份；请确认浏览器下载完成。备份包含你粘贴的原文。');});
$('#import').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>2_000_000)throw Error('文件超过 2 MB，未导入。');const next=validateWorkspace(JSON.parse(await file.text()));if(!(await abandonDraft()))return;if(state.claims.length&&!await ask('导入会替换当前工作区，可在本次会话中撤销。继续？'))return;selected=next.claims[0]?.id||null;closeSource();commit(next,'导入成功。来源性质与复核标记来自文件内容，并非平台认证。');}catch(error){notify('导入失败，原内容保留：'+error.message);}});
let opener=null;
async function output(title,text,note){if(hasPendingInput()&&!await ask('当前有未保存的编辑。生成内容只使用上次保存的记录，是否继续？'))return;opener=document.activeElement;$('#output-title').textContent=title;$('#output-text').value=text;$('#output-note').textContent=note;$('#copy-state').textContent='';$('#output-dialog').showModal();}
$('#preview').addEventListener('click',async()=>output('简报预览',exportMarkdown(state,today()),'包括所有说法、来源与缺口；不会因为记录完整就宣称事实已被证实。'));
$('#export').addEventListener('click',async()=>{if(!await download('evidence-brief-'+today()+'.md',exportMarkdown(state,today()),'text/markdown;charset=utf-8'))return;notify('已请求下载 Markdown 简报；请确认浏览器下载完成。');});
$('#handoff').addEventListener('click',async()=>output('交给 AI 的复核任务',buildHandoff(state,'reviewer',today()),'工具不会替你发送。先检查内容，再复制到你正在使用的 AI；发送后由该服务处理所含资料。'));
$('#close-output').addEventListener('click',async()=>$('#output-dialog').close());$('#output-dialog').addEventListener('close',()=>opener?.focus());
$('#copy-output').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#output-text').value);$('#copy-state').textContent='已复制。';}catch(_){$('#copy-state').textContent='无法自动复制，请选中文本手动复制。';$('#output-text').focus();$('#output-text').select();}});
$('#theme').addEventListener('click',async()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';$('#theme').textContent=dark?'浅色':'深色';$('#theme').setAttribute('aria-pressed',String(dark));});
try{const stored=sessionStorage.getItem(KEY);if(stored){state=validateWorkspace(JSON.parse(stored));selected=state.claims[0]?.id||null;saveStatus='已恢复本标签页的资料 · 请导出 JSON 备份。';}}catch(_){notify('已有浏览器记录无法读取。尚未覆盖；请勿把此状态当作保存成功。');}
render();

$('#claim-input').addEventListener('input',updateSaveStatus);
$('#brief-title').addEventListener('input',updateSaveStatus);
window.addEventListener('beforeunload',event=>{if(hasPendingInput()){event.preventDefault();event.returnValue='';}});
