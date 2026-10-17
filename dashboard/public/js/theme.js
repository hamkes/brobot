/* ============================================================
   ✨ Brobot — theme controller (dark by default, light optional)
   ============================================================ */
(function () {
  const KEY = 'brobot.theme';
  const root = document.documentElement;

  function current() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function updateButtons(theme) {
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('data-current', theme);
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('title', theme === 'dark' ? 'Light mode' : 'Dark mode');
    });
  }

  function apply(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem(KEY, next);
    } catch (e) {
      /* storage unavailable */
    }
    updateButtons(next);
    document.dispatchEvent(new CustomEvent('brobot:theme', { detail: { theme: next } }));
  }

  function toggle() {
    apply(current() === 'dark' ? 'light' : 'dark');
  }

  function init() {
    updateButtons(current());
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', toggle);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.Theme = {
    apply,
    toggle,
    get theme() {
      return current();
    }
  };
})();
