(() => {
  'use strict';

  const feedback = document.querySelector('[data-customer-feedback]');
  const say = (message) => { if (feedback) feedback.textContent = message; };

  const activateTab = (button, buttonSelector, panelSelector, keyName) => {
    const key = button.dataset[keyName];
    document.querySelectorAll(buttonSelector).forEach((item) => {
      const selected = item === button;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll(panelSelector).forEach((panel) => {
      panel.hidden = panel.dataset[keyName.replace('Tab', 'Panel')] !== key;
    });
  };

  document.querySelectorAll('[data-appointment-tab]').forEach((button) => {
    button.addEventListener('click', () => activateTab(button, '[data-appointment-tab]', '[data-appointment-panel]', 'appointmentTab'));
  });
  document.querySelectorAll('[data-review-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.reviewTab;
      document.querySelectorAll('[data-review-tab]').forEach((item) => {
        const selected = item === button;
        item.classList.toggle('is-active', selected);
        item.setAttribute('aria-selected', String(selected));
      });
      document.querySelectorAll('[data-review-card]').forEach((card) => {
        card.hidden = filter !== 'all' && card.dataset.reviewStatus !== filter;
      });
    });
  });

  document.querySelectorAll('[data-dialog-open]').forEach((button) => {
    button.addEventListener('click', () => document.getElementById(button.dataset.dialogOpen)?.showModal());
  });
  document.querySelectorAll('[data-dialog-close]').forEach((button) => {
    button.addEventListener('click', () => button.closest('dialog')?.close());
  });
  document.querySelectorAll('.customer-dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  });

  document.querySelectorAll('[data-reschedule-slot]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-reschedule-slot]').forEach((item) => item.classList.remove('is-selected'));
      button.classList.add('is-selected');
      say(`Novo horário selecionado: ${button.textContent.trim()}.`);
    });
  });
  document.querySelectorAll('[data-demo-customer-action]').forEach((button) => {
    button.addEventListener('click', () => say(button.dataset.message || 'Ação preparada para a API da Beauty Hub.'));
  });

  const favoriteGrid = document.querySelector('[data-favorites-grid]');
  const favoriteSearch = document.querySelector('[data-favorites-search]');
  const favoriteCategory = document.querySelector('[data-favorites-category]');
  const favoriteSort = document.querySelector('[data-favorites-sort]');
  const favoriteCount = document.querySelector('[data-favorites-count]');
  const favoriteEmpty = document.querySelector('[data-favorites-empty]');
  const favoriteToast = document.querySelector('[data-favorite-toast]');
  let removedFavorite = null;
  const favoriteSlugs = {
    'Studio Aurora': 'studio-aurora',
    'Ateliê Nara': 'atelie-nara',
    'Casa Lume': 'casa-lume',
    'Bela Trama': 'bela-trama',
  };

  favoriteGrid?.querySelectorAll('[data-favorite-card]').forEach((card) => {
    const slug = favoriteSlugs[card.dataset.name];
    if (!slug) return;
    card.querySelectorAll('a[href^="espaco.html"]').forEach((link) => {
      const booking = new URL(link.href, location.href).searchParams.has('agendar');
      link.href = `espaco.html?slug=${encodeURIComponent(slug)}${booking ? '&agendar=1' : ''}`;
    });
  });

  const filterFavorites = () => {
    if (!favoriteGrid) return;
    const query = (favoriteSearch?.value || '').trim().toLocaleLowerCase('pt-BR');
    const category = favoriteCategory?.value || 'all';
    const cards = [...favoriteGrid.querySelectorAll('[data-favorite-card]')];
    cards.forEach((card) => {
      const searchable = `${card.dataset.name} ${card.dataset.category} ${card.dataset.search || ''}`.toLocaleLowerCase('pt-BR');
      card.hidden = Boolean((query && !searchable.includes(query)) || (category !== 'all' && card.dataset.category !== category));
    });
    const visible = cards.filter((card) => !card.hidden);
    if (favoriteSort?.value === 'rating') visible.sort((a, b) => Number(b.dataset.rating) - Number(a.dataset.rating));
    if (favoriteSort?.value === 'name') visible.sort((a, b) => a.dataset.name.localeCompare(b.dataset.name, 'pt-BR'));
    visible.forEach((card) => favoriteGrid.append(card));
    if (favoriteCount) favoriteCount.textContent = `${visible.length} ${visible.length === 1 ? 'favorito' : 'favoritos'}`;
    if (favoriteEmpty) favoriteEmpty.hidden = visible.length !== 0;
  };
  [favoriteSearch, favoriteCategory, favoriteSort].forEach((control) => control?.addEventListener(control === favoriteSearch ? 'input' : 'change', filterFavorites));
  favoriteGrid?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-favorite-remove]');
    if (!button) return;
    const card = button.closest('[data-favorite-card]');
    if (!card) return;
    removedFavorite = { card, next: card.nextElementSibling };
    card.remove();
    if (favoriteToast) favoriteToast.hidden = false;
    filterFavorites();
  });
  document.querySelector('[data-undo-favorite]')?.addEventListener('click', () => {
    if (!removedFavorite || !favoriteGrid) return;
    favoriteGrid.insertBefore(removedFavorite.card, removedFavorite.next && removedFavorite.next.parentNode === favoriteGrid ? removedFavorite.next : null);
    removedFavorite = null;
    if (favoriteToast) favoriteToast.hidden = true;
    filterFavorites();
  });
  filterFavorites();

  document.querySelectorAll('[data-review-text]').forEach((textarea) => {
    const output = textarea.closest('.review-text-wrap')?.querySelector('[data-review-counter]');
    const update = () => { if (output) output.textContent = `${textarea.value.length}/500`; };
    textarea.addEventListener('input', update);
    update();
  });
  document.querySelectorAll('[data-review-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const rating = form.querySelector('input[type="radio"]:checked');
      const text = form.querySelector('[data-review-text]');
      if (!rating || !text || text.value.trim().length < 12) {
        say('Escolha uma nota e escreva pelo menos 12 caracteres.');
        return;
      }
      const card = form.closest('[data-review-card]');
      if (card) card.dataset.reviewStatus = 'published';
      const response = document.createElement('div');
      response.className = 'review-response';
      const heading = document.createElement('strong');
      heading.textContent = 'Avaliação publicada';
      const comment = document.createElement('p');
      comment.textContent = text.value.trim();
      response.append(heading, comment);
      form.replaceChildren(response);
      say(`Sua avaliação de ${rating.value} estrelas foi publicada.`);
    });
  });

  const preferencesKey = 'beauty-hub-customer-preferences';
  const canStorePreference = (name) => /^(?:pref_|notify_|privacy_)/.test(name);
  let savedPreferences = {};
  try { savedPreferences = JSON.parse(localStorage.getItem(preferencesKey) || '{}'); } catch (_) {}
  document.querySelectorAll('[data-settings-form] input, [data-settings-form] select, [data-settings-form] textarea').forEach((control) => {
    if (canStorePreference(control.name) && Object.prototype.hasOwnProperty.call(savedPreferences, control.name)) {
      if (control.type === 'checkbox') control.checked = Boolean(savedPreferences[control.name]);
      else control.value = savedPreferences[control.name];
    }
  });
  document.querySelector('[data-settings-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = {};
    new FormData(event.currentTarget).forEach((value, key) => {
      if (canStorePreference(key)) data[key] = value;
    });
    event.currentTarget.querySelectorAll('input[type="checkbox"][name]').forEach((input) => {
      if (canStorePreference(input.name)) data[input.name] = input.checked;
    });
    try { localStorage.setItem(preferencesKey, JSON.stringify(data)); } catch (_) {}

    const currentPassword = event.currentTarget.elements.current_password?.value || '';
    const newPassword = event.currentTarget.elements.new_password?.value || '';
    if (!currentPassword && !newPassword) {
      say('Suas preferências foram salvas.');
      return;
    }
    if (!currentPassword || !newPassword) {
      say('Preencha a senha atual e a nova senha para fazer a alteração.');
      return;
    }
    if (newPassword.length < 8) {
      say('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    const submit = event.currentTarget.querySelector('[data-settings-save]');
    if (submit) {
      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
    }
    try {
      const { default: api } = await import('./api.js');
      const user = await api.auth.getUser();
      await api.auth.signIn({ email: user.email, password: currentPassword });
      await api.auth.updatePassword(newPassword);
      event.currentTarget.elements.current_password.value = '';
      event.currentTarget.elements.new_password.value = '';
      say('Preferências salvas e senha atualizada com segurança.');
    } catch (error) {
      say(error?.code === 'AUTH_REQUIRED' ? 'Entre novamente para alterar sua senha.' : 'Não foi possível alterar a senha. Confira a senha atual.');
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
      }
    }
  });
  document.querySelectorAll('[data-theme-choice]').forEach((button) => {
    const sync = () => button.classList.toggle('is-active', document.documentElement.dataset.theme === button.dataset.themeChoice);
    button.addEventListener('click', () => {
      const desired = button.dataset.themeChoice;
      if (document.documentElement.dataset.theme !== desired) document.querySelector('[data-theme-toggle]')?.click();
      document.querySelectorAll('[data-theme-choice]').forEach((item) => item.classList.toggle('is-active', item.dataset.themeChoice === desired));
      say(`Tema ${desired === 'dark' ? 'preto' : 'claro'} ativado.`);
    });
    sync();
  });
})();
