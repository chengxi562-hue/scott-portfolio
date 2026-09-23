/* Folio homepage. Each enhancement is optional; native content stays available. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const projectIds = new Set(['research', 'knowledge', 'collaboration', 'xuanshu']);
  let language = 'zh';
  let languageReady = false;
  let closeMenu = () => {};
  const text = (zh, en) => language === 'en' ? en : zh;
  function stored(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function save(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  function state() { return history.state && typeof history.state === 'object' ? history.state : {}; }
  function rememberLanguage(url = location.href) {
    try { history.replaceState({ ...state(), siteLanguage: language }, '', url); } catch (_) {}
  }
  function updateThemeLabel() {
    const dark = root.dataset.theme === 'dark';
    const button = $('.theme-toggle');
    if (button) {
      button.textContent = dark ? text('浅色', 'Light') : text('深色', 'Dark');
      button.setAttribute('aria-label', dark ? text('切换到浅色模式', 'Switch to light mode') : text('切换到深色模式', 'Switch to dark mode'));
      button.setAttribute('aria-pressed', String(dark));
    }
    const themeColor = $('meta[name="theme-color"]');
    if (themeColor) themeColor.content = dark ? '#171d28' : '#f7f1e6';
  }
  function updateNavigationLabel() {
    const toggle = $('.nav-toggle');
    if (!toggle) return;
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.textContent = open ? text('关闭', 'Close') : text('菜单', 'Menu');
    toggle.setAttribute('aria-label', open ? text('关闭主导航', 'Close main navigation') : text('打开主导航', 'Open main navigation'));
  }
  function resetCopy() {
    const status = $('.copy-status');
    if (status) status.textContent = '';
    $$('.copy-fallback').forEach(field => field.remove());
  }
  function applyLanguage(next) {
    if (!languageReady) return;
    language = next === 'en' ? 'en' : 'zh';
    const dictionary = window.SITE_TRANSLATIONS[language];
    root.lang = language === 'en' ? 'en' : 'zh-CN';
    root.dataset.language = language;
    $$('[data-t]').forEach(element => { element.textContent = dictionary[element.dataset.t]; });
    ['alt', 'aria-label'].forEach(attribute => {
      $$('[data-t-' + attribute + ']').forEach(element => {
        element.setAttribute(attribute, dictionary[element.getAttribute('data-t-' + attribute)]);
      });
    });
    const button = $('.language-toggle');
    if (button) {
      button.textContent = language === 'en' ? '中文' : 'EN';
      button.setAttribute('aria-label', language === 'en' ? '切换到中文' : 'Switch to English');
    }
    document.title = dictionary.metaTitle;
    const metadata = {
      'meta[name="description"]': dictionary.metaDescription,
      'meta[property="og:title"]': dictionary.metaTitle,
      'meta[property="og:description"]': dictionary.metaDescription,
      'meta[name="twitter:title"]': dictionary.metaTitle,
      'meta[name="twitter:description"]': dictionary.metaDescription,
      'meta[property="og:image:alt"]': dictionary.fImageAlt,
      'meta[name="twitter:image:alt"]': dictionary.fImageAlt,
      'meta[property="og:locale"]': language === 'en' ? 'en_US' : 'zh_CN',
      'meta[property="og:locale:alternate"]': language === 'en' ? 'zh_CN' : 'en_US'
    };
    Object.entries(metadata).forEach(([selector, value]) => { const element = $(selector); if (element) element.content = value; });
    updateThemeLabel();
    updateNavigationLabel();
    resetCopy();
    save('site-language', language);
  }
  function setupLanguage() {
    const keys = new Set(['metaTitle', 'metaDescription', 'fImageAlt']);
    ['data-t', 'data-t-alt', 'data-t-aria-label'].forEach(attribute => {
      $$('[' + attribute + ']').forEach(element => keys.add(element.getAttribute(attribute)));
    });
    languageReady = ['zh', 'en'].every(code => {
      const dictionary = window.SITE_TRANSLATIONS?.[code];
      return dictionary && [...keys].every(key => typeof dictionary[key] === 'string');
    });
    if (!languageReady) return;
    const requested = new URL(location.href).searchParams.get('lang');
    applyLanguage(requested === 'en' || requested === 'zh' ? requested : stored('site-language'));
    rememberLanguage();
    const button = $('.language-toggle');
    if (!button) return;
    button.addEventListener('click', () => {
      applyLanguage(language === 'en' ? 'zh' : 'en');
      const url = new URL(location.href);
      url.searchParams.set('lang', language);
      rememberLanguage(url);
    });
    button.hidden = false;
  }
  function setupTheme() {
    const preference = matchMedia('(prefers-color-scheme: dark)');
    let choice = stored('site-theme');
    function apply() {
      root.dataset.theme = choice === 'dark' || choice === 'light' ? choice : preference.matches ? 'dark' : 'light';
      updateThemeLabel();
    }
    apply();
    const button = $('.theme-toggle');
    if (button) {
      button.addEventListener('click', () => {
        choice = root.dataset.theme === 'dark' ? 'light' : 'dark';
        save('site-theme', choice);
        apply();
      });
      button.hidden = false;
    }
    preference.addEventListener?.('change', () => { if (choice !== 'dark' && choice !== 'light') apply(); });
  }
  function setupNavigation() {
    const nav = $('#site-nav');
    const button = $('.nav-toggle');
    if (!nav || !button) return;
    const mobile = matchMedia('(max-width:640px)');
    const controls = button.closest('.header-controls');
    function placeNavigation() {
      if (!controls || controls.parentElement !== nav.parentElement) return;
      // Keep the source order aligned with the visible disclosure on mobile:
      // toggle, navigation links, then page content. Desktop keeps its own order.
      if (mobile.matches) controls.after(nav);
      else controls.before(nav);
    }
    function setOpen(open) {
      button.setAttribute('aria-expanded', String(open && mobile.matches));
      nav.hidden = mobile.matches && !open;
      updateNavigationLabel();
    }
    closeMenu = () => setOpen(false);
    button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        button.focus();
      }
    });
    document.addEventListener('click', event => {
      if (button.getAttribute('aria-expanded') === 'true' && !nav.contains(event.target) && !button.contains(event.target)) closeMenu();
    });
    mobile.addEventListener?.('change', () => {
      const previousFocus = document.activeElement;
      const focusWasInMenu = nav.contains(previousFocus);
      placeNavigation();
      closeMenu();
      if (mobile.matches && focusWasInMenu) button.focus();
      else if (focusWasInMenu) previousFocus.focus({ preventScroll: true });
    });
    placeNavigation();
    button.hidden = false;
    closeMenu();
  }
  function readRoute(hash = location.hash) {
    let fragment;
    try { fragment = decodeURIComponent(hash.replace(/^#/, '')); } catch (_) { return null; }
    const project = fragment.match(/^(?:project-)?(research|knowledge|collaboration|xuanshu)$/);
    if (project) return { id: project[1], project: project[1] };
    const part = fragment.match(/^(?:case-(research|knowledge|collaboration|xuanshu)-([012])|(research|knowledge|collaboration|xuanshu)-part-([012]))$/);
    if (part) {
      const name = part[1] || part[3];
      return { id: name + '-part-' + (part[2] || part[4]), project: name };
    }
    return fragment ? { id: fragment } : null;
  }
  function routeTarget(hash = location.hash) {
    const route = readRoute(hash);
    if (!route) return null;
    if (route.project && projectIds.has(route.project)) {
      const details = document.getElementById(route.project);
      if (details?.tagName === 'DETAILS') details.open = true;
    }
    const element = document.getElementById(route.id);
    if (!element) return null;
    let parent = element.parentElement;
    while (parent) {
      if (parent.tagName === 'DETAILS') parent.open = true;
      parent = parent.parentElement;
    }
    return element;
  }
  function focusTarget(element) {
    const focusable = element.tagName === 'DETAILS' ? $('summary', element) : element;
    if (!focusable) return;
    if (!focusable.hasAttribute('tabindex') && focusable.tagName !== 'SUMMARY') focusable.setAttribute('tabindex', '-1');
    focusable.focus({ preventScroll: true });
  }
  function restoreLocation() {
    if (languageReady) {
      const requested = new URL(location.href).searchParams.get('lang');
      const next = requested === 'zh' || requested === 'en' ? requested : state().siteLanguage;
      if ((next === 'zh' || next === 'en') && next !== language) applyLanguage(next);
    }
    const target = routeTarget();
    if (target && readRoute()?.project) requestAnimationFrame(() => target.scrollIntoView({ behavior: 'instant', block: 'start' }));
    rememberLanguage();
  }
  function setupRouting() {
    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest('a[href^="#"]');
      if (!anchor) return;
      const target = routeTarget(anchor.hash);
      if (!target) return;
      rememberLanguage();
      closeMenu();
      focusTarget(target);
      // Opening a native details element before the browser follows the hash
      // keeps both ordinary anchors and historical project links usable.
      if (anchor.hash === location.hash && readRoute(anchor.hash)?.project) {
        requestAnimationFrame(() => target.scrollIntoView({ behavior: 'instant', block: 'start' }));
      }
    });
    addEventListener('hashchange', restoreLocation);
    addEventListener('popstate', restoreLocation);
    restoreLocation();
  }
  function setupCopy() {
    const status = $('.copy-status');
    if (!status) return;
    $$('.copy[data-email]').forEach(button => {
      button.addEventListener('click', async () => {
        resetCopy();
        try {
          await navigator.clipboard.writeText(button.dataset.email);
          status.textContent = text('邮箱已复制。', 'Email copied.');
        } catch (_) {
          status.textContent = text('已选中邮箱，请手动复制。', 'Email selected. Please copy it manually.');
          const field = document.createElement('input');
          field.className = 'copy-fallback';
          field.readOnly = true;
          field.value = button.dataset.email;
          field.setAttribute('aria-label', text('待复制邮箱', 'Email address to copy'));
          status.after(field);
          field.focus();
          field.select();
        }
      });
      button.hidden = false;
    });
  }
  function enhance(setup, fallback) {
    try { setup(); } catch (_) { fallback?.(); }
  }
  enhance(setupLanguage, () => {
    languageReady = false;
    root.lang = 'zh-CN';
    const button = $('.language-toggle');
    if (button) button.hidden = true;
  });
  enhance(setupTheme, () => { const button = $('.theme-toggle'); if (button) button.hidden = true; });
  enhance(setupNavigation, () => {
    const nav = $('#site-nav'), button = $('.nav-toggle');
    if (nav) nav.hidden = false;
    if (button) button.hidden = true;
    closeMenu = () => {};
  });
  enhance(setupRouting);
  enhance(setupCopy);
})();
