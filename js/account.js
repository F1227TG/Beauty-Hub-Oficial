(() => {
  'use strict';
  if (document.body.dataset.page === 'dashboard') {
    document.body.dataset.requireRole = 'professional';
    import('./session-guard.js');
  }
  const accountFeedback = document.querySelector('[data-account-feedback]');
  document.querySelectorAll('[data-demo-action]').forEach((button) => {
    button.addEventListener('click', () => {
      if (accountFeedback) accountFeedback.textContent = 'A interface está pronta; esta ação será conectada à agenda na etapa de backend.';
    });
  });

  const dashboardFeedback = document.querySelector('[data-dashboard-feedback]');
  document.querySelectorAll('[data-dashboard-action]').forEach((button) => {
    button.addEventListener('click', () => {
      if (dashboardFeedback) dashboardFeedback.textContent = `Ação “${button.textContent.trim()}” pronta para receber o fluxo funcional.`;
    });
  });
})();
