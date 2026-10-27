(() => {
  'use strict';

  const root = document.documentElement;
  const toggle = document.querySelector('[data-theme-toggle]');
  const icon = document.querySelector('[data-theme-icon]');
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  const applyTheme = (theme) => {
    const next = theme === 'dark' ? 'dark' : 'light';
    root.dataset.theme = next;
    if (toggle) toggle.setAttribute('aria-label', next === 'dark' ? 'Ativar tema claro' : 'Ativar tema preto');
    if (icon) icon.textContent = next === 'dark' ? '☀' : '☾';
    if (themeMeta) themeMeta.setAttribute('content', next === 'dark' ? '#0e0b0d' : '#fffaf8');
  };

  applyTheme(root.dataset.theme);

  toggle?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('beauty-hub-theme', next); } catch (_) {}
  });
})();
