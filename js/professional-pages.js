(() => {
  'use strict';

  document.body.dataset.requireRole = 'professional';
  import('./session-guard.js');

  const toast = document.querySelector('[data-pro-toast]');
  let toastTimer;
  let lastTrigger = null;
  const notify = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3200);
  };
  const dispatch = (name, detail = {}) => document.dispatchEvent(new CustomEvent(name, { detail }));

  const openOverlay = (name, trigger) => {
    const overlay = document.querySelector(`[data-pro-overlay="${name}"]`);
    if (!overlay) return;
    lastTrigger = trigger;
    overlay.hidden = false;
    overlay.querySelector('input, select, textarea, button')?.focus();
  };
  const closeOverlay = (overlay) => {
    overlay.hidden = true;
    lastTrigger?.focus();
    lastTrigger = null;
  };
  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open-modal]');
    if (opener) openOverlay(opener.dataset.openModal, opener);
    const closer = event.target.closest('[data-close-overlay]');
    if (closer) closeOverlay(closer.closest('[data-pro-overlay]'));
    const overlay = event.target.matches?.('[data-pro-overlay]') ? event.target : null;
    if (overlay) closeOverlay(overlay);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const open = document.querySelector('[data-pro-overlay]:not([hidden])');
    if (open) closeOverlay(open);
  });

  document.querySelectorAll('[data-calendar-view]').forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.calendarView;
      document.querySelectorAll('[data-calendar-view]').forEach((item) => item.classList.toggle('is-active', item === button));
      document.querySelectorAll('[data-calendar-panel]').forEach((panel) => { panel.hidden = panel.dataset.calendarPanel !== view; });
    });
  });
  document.querySelectorAll('[data-week-nav]').forEach((button) => button.addEventListener('click', () => notify(`Agenda ${button.dataset.weekNav === 'today' ? 'posicionada na semana atual' : 'atualizada'}.`)));
  document.querySelectorAll('[data-confirm-appointment]').forEach((button) => button.addEventListener('click', () => { button.closest('article')?.remove(); notify('Agendamento confirmado.'); dispatch('beautyhub:appointment-status-changed', { status: 'confirmed' }); }));

  const serviceSearch = document.querySelector('[data-service-search]');
  const serviceCategory = document.querySelector('[data-service-category]');
  const serviceStatus = document.querySelector('[data-service-status]');
  const clientSearch = document.querySelector('[data-client-search]');
  const clientSegment = document.querySelector('[data-client-segment]');
  const filterRows = (selector, query, category, status) => {
    document.querySelectorAll(selector).forEach((row) => {
      const haystack = `${row.dataset.search || ''} ${row.textContent}`.toLocaleLowerCase('pt-BR');
      row.hidden = Boolean((query && !haystack.includes(query)) || (category && category !== 'all' && row.dataset.category !== category) || (status && status !== 'all' && row.dataset.status !== status));
    });
  };
  const filterServices = () => filterRows('[data-service-row]', (serviceSearch?.value || '').trim().toLocaleLowerCase('pt-BR'), serviceCategory?.value, serviceStatus?.value);
  [serviceSearch, serviceCategory, serviceStatus].forEach((control) => control?.addEventListener(control === serviceSearch ? 'input' : 'change', filterServices));
  const filterClients = () => filterRows('[data-client-row]', (clientSearch?.value || '').trim().toLocaleLowerCase('pt-BR'), null, clientSegment?.value);
  [clientSearch, clientSegment].forEach((control) => control?.addEventListener(control === clientSearch ? 'input' : 'change', filterClients));

  document.addEventListener('change', (event) => {
    if (event.target.matches('[data-service-online]')) {
      notify(event.target.checked ? 'Reserva online ativada.' : 'Reserva online pausada.');
      dispatch('beautyhub:service-saved', { id: event.target.closest('[data-service-id]')?.dataset.serviceId, online: event.target.checked });
    }
  });
  document.querySelectorAll('[data-service-action]').forEach((button) => button.addEventListener('click', () => notify(`Ação “${button.dataset.serviceAction}” preparada para este serviço.`)));
  document.querySelectorAll('[data-client-action]').forEach((button) => button.addEventListener('click', () => notify(`Ação “${button.dataset.clientAction}” preparada para esta cliente.`)));
  document.querySelectorAll('[data-member-action]').forEach((button) => button.addEventListener('click', () => notify(`Ação “${button.dataset.memberAction}” preparada para a profissional.`)));

  document.querySelectorAll('[data-settings-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.settingsTab;
      document.querySelectorAll('[data-settings-tab]').forEach((item) => item.classList.toggle('is-active', item === button));
      document.querySelectorAll('[data-settings-panel]').forEach((panel) => { panel.hidden = panel.dataset.settingsPanel !== tab; });
    });
  });
  const businessForm = document.querySelector('[data-business-form]');
  const businessKey = 'beautyhub.pro.v1.business';
  if (businessForm) {
    try {
      const saved = JSON.parse(localStorage.getItem(businessKey) || '{}');
      Object.entries(saved).forEach(([key, value]) => {
        const control = businessForm.elements.namedItem(key);
        if (!control) return;
        if (control.type === 'checkbox' && typeof value === 'boolean') control.checked = value;
        else if (typeof value === 'string') control.value = value;
      });
    } catch (_) {}
    businessForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(businessForm));
      businessForm.querySelectorAll('input[type="checkbox"][name]').forEach((input) => {
        data[input.name] = input.checked;
      });
      try { localStorage.setItem(businessKey, JSON.stringify(data)); } catch (_) {}
      document.querySelector('[data-preview-name]')?.replaceChildren(document.createTextNode(data.name || 'Studio Aurora'));
      notify('Configurações do negócio salvas.');
      dispatch('beautyhub:business-settings-saved', data);
    });
  }
  document.querySelectorAll('[data-pro-form]').forEach((form) => form.addEventListener('submit', (event) => { event.preventDefault(); closeOverlay(form.closest('[data-pro-overlay]')); notify('Informações salvas na experiência local.'); }));
})();
