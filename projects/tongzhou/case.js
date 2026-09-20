/* 同舟 · AI 协作 — 主题切换（仅 localStorage 与系统偏好，无 fetch） */
(function () {
  "use strict";

  var STORAGE_KEY = "site-theme";
  var button = document.getElementById("theme-toggle");
  var root = document.documentElement;

  if (!button) {
    return;
  }

  function readStoredTheme() {
    try {
      var value = window.localStorage.getItem(STORAGE_KEY);
      if (value === "dark" || value === "light") {
        return value;
      }
    } catch (e) {
      /* 存储不可用时忽略 */
    }
    return null;
  }

  function writeStoredTheme(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      /* 存储不可用时忽略 */
    }
  }

  function currentTheme() {
    var stored = readStoredTheme();
    if (stored) {
      return stored;
    }
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
      button.setAttribute("aria-pressed", "true");
      button.textContent = "浅色模式";
    } else {
      root.removeAttribute("data-theme");
      button.setAttribute("aria-pressed", "false");
      button.textContent = "深色模式";
    }
  }

  applyTheme(currentTheme());

  button.addEventListener("click", function () {
    var next = root.dataset.theme === "dark" ? "light" : "dark";
    writeStoredTheme(next);
    applyTheme(next);
  });
})();
