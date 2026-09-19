(function () {
  'use strict';
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const projects = ['research', 'knowledge', 'collaboration'];
  let project = 'research', step = 0, language = 'zh';
  const text = (zh, en) => language === 'en' ? en : zh;
  document.body.classList.add('js');
  $$('.js-only').forEach(el => el.hidden = false);
  function save(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  function themeLabel() {
    const dark = root.dataset.theme === 'dark';
    $('.theme-toggle').textContent = dark ? text('浅色模式', 'Light') : text('深色模式', 'Dark');
    $('.theme-toggle').setAttribute('aria-pressed', String(dark));
    $('.theme-toggle').setAttribute('aria-label', dark ? text('切换到浅色模式', 'Switch to light mode') : text('切换到深色模式', 'Switch to dark mode'));
  }
  $('.theme-toggle').addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    save('site-theme', root.dataset.theme); themeLabel();
  });
  function renderCase() {
    const card = document.getElementById(project);
    $('.case-page-number').textContent = '0' + (step + 1);
    $('#case-heading').textContent = $('h3', card).textContent;
    const fragment = document.createDocumentFragment();
    fragment.append($$('.case h4', card)[step].cloneNode(true), $$('.case p', card)[step].cloneNode(true));
    $('#case-content').replaceChildren(fragment);
    $('#case-position').textContent = (step + 1) + ' / 3';
    $('#case-next').textContent = step === 2 ? text('下一个项目 →', 'Next project →') : text('下一步 →', 'Next step →');
    $$('[data-project]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.project === project)));
    $$('[data-step]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.step) === step)));
    $('#share-status').textContent = '';
  }
  function changeLanguage(next) {
    language = next === 'en' ? 'en' : 'zh';
    root.lang = language === 'en' ? 'en' : 'zh-CN';
    root.dataset.language = language;
    const dictionary = window.SITE_TRANSLATIONS[language];
    $$('[data-t]').forEach(el => { el.textContent = dictionary[el.dataset.t]; });
    ['alt', 'aria-label'].forEach(attr => $$('[data-t-' + attr + ']').forEach(el => el.setAttribute(attr, dictionary[el.getAttribute('data-t-' + attr)])));
    $('.language-toggle').textContent = language === 'en' ? '中文' : 'EN';
    $('.language-toggle').setAttribute('aria-label', text('Switch to English', '切换到中文'));
    document.title = text('弋承熙 · 商业、AI 与日常实践', 'Yi Chengxi · Business, AI & Everyday Practice');
    $('meta[name="description"]').content = text('弋承熙的个人实践网站：在商业、AI 与日常问题之间，记录可解释的判断、流程与结果。', 'A personal fieldbook by Yi Chengxi: projects, decisions and practical explorations across business and AI.');
    $$('.card .art img').forEach(img => { const id = img.closest('.card').id; img.src = 'assets/project-' + id + (language === 'en' ? '-en' : '') + '.svg'; });
    themeLabel(); renderCase(); $('.copy-status').textContent = '';
    save('site-language', language);
  }
  let initial = 'zh';
  try { initial = localStorage.getItem('site-language') || 'zh'; } catch (_) {}
  const urlLang = new URL(location.href).searchParams.get('lang');
  if (urlLang === 'en' || urlLang === 'zh') initial = urlLang;
  changeLanguage(initial);
  $('.language-toggle').addEventListener('click', () => {
    changeLanguage(language === 'en' ? 'zh' : 'en');
    const url = new URL(location.href); url.searchParams.set('lang', language); history.replaceState(null, '', url);
  });
  const toggle = $('.nav-toggle'), nav = $('#site-nav'), mobile = matchMedia('(max-width:640px)');
  function closeMenu() { toggle.setAttribute('aria-expanded', 'false'); nav.hidden = mobile.matches; }
  closeMenu(); mobile.addEventListener('change', closeMenu);
  toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); nav.hidden = !open; });
  nav.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { closeMenu(); toggle.focus(); } });
  function setCase(p, s, updateUrl = true) {
    project = p; step = s; renderCase();
    if (updateUrl) history.replaceState(null, '', '#case-' + project + '-' + step);
  }
  function fromHash() {
    const match = location.hash.match(/^#case-(research|knowledge|collaboration)-([012])$/);
    if (match) { setCase(match[1], Number(match[2]), false); $('.case-explorer').scrollIntoView({behavior:'instant', block:'start'}); }
    else { const card = projects.includes(location.hash.slice(1)) && document.getElementById(location.hash.slice(1)); if (card) $('details', card).open = true; }
  }
  $$('[data-project]').forEach(b => b.addEventListener('click', () => setCase(b.dataset.project, 0)));
  $$('[data-step]').forEach(b => b.addEventListener('click', () => setCase(project, Number(b.dataset.step))));
  $('#case-next').addEventListener('click', () => step < 2 ? setCase(project, step + 1) : setCase(projects[(projects.indexOf(project) + 1) % projects.length], 0));
  $$('.case-link').forEach(link => link.addEventListener('click', event => { event.preventDefault(); setCase(link.closest('.card').id, 0); $('.case-explorer').scrollIntoView({behavior:'instant', block:'start'}); $('#case-heading').focus({preventScroll:true}); }));
  addEventListener('hashchange', fromHash); fromHash();
  async function copy(value, status, success) {
    try { await navigator.clipboard.writeText(value); status.textContent = success; }
    catch (_) { status.textContent = text('复制未成功，请手动复制。', 'Could not copy. Please copy manually.'); }
  }
  $('#share-case').addEventListener('click', () => {
    const url = new URL(location.href); url.hash = 'case-' + project + '-' + step; url.searchParams.set('lang', language);
    copy(url.href, $('#share-status'), text('案例链接已复制。', 'Case link copied.'));
  });
  $('.copy').addEventListener('click', () => copy($('.copy').dataset.email, $('.copy-status'), text('邮箱已复制。', 'Email copied.')));
  if ('IntersectionObserver' in window) {
    const sections = $$('main > section');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { $$('nav a').forEach(a => a.getAttribute('href') === '#' + entry.target.id ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current')); }
    }), {rootMargin:'-15% 0px -65% 0px'});
    sections.forEach(section => observer.observe(section));
  }
})();
