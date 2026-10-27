(() => {
  'use strict';

  const cards = [...document.querySelectorAll('[data-salon-grid] .salon-card')];
  const categoryInputs = [...document.querySelectorAll('input[name="category"]')];
  const searchForm = document.querySelector('[data-explore-search]');
  const count = document.querySelector('[data-result-count]');
  const empty = document.querySelector('[data-empty-results]');
  const queryInput = searchForm?.elements.namedItem('query');
  const locationInput = searchForm?.elements.namedItem('location');
  const normalize = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  let query = '';
  let place = '';

  cards.forEach((card) => {
    const slug = card.dataset.slug;
    if (!slug) return;
    card.querySelectorAll('a[href^="espaco.html"]').forEach((link) => {
      const booking = new URL(link.href, location.href).searchParams.has('agendar');
      link.href = `espaco.html?slug=${encodeURIComponent(slug)}${booking ? '&agendar=1' : ''}`;
    });
  });

  const applyFilters = () => {
    const category = categoryInputs.find((input) => input.checked)?.value || 'all';
    let visible = 0;
    cards.forEach((card) => {
      const categories = card.dataset.category?.split(' ') || [];
      const matchCategory = category === 'all' || categories.includes(category);
      const matchQuery = !query || normalize(`${card.dataset.name} ${card.textContent}`).includes(query);
      const locationText = normalize(`${card.dataset.location || ''} ${card.querySelector('.salon-type')?.textContent || ''}`);
      const matchLocation = !place || locationText.includes(place);
      const show = matchCategory && matchQuery && matchLocation;
      card.hidden = !show;
      if (show) visible += 1;
    });
    if (count) count.textContent = `${visible} ${visible === 1 ? 'espaço' : 'espaços'}`;
    if (empty) empty.hidden = visible !== 0;
  };

  categoryInputs.forEach((input) => input.addEventListener('change', applyFilters));
  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(searchForm);
    query = normalize(data.get('query'));
    place = normalize(data.get('location'));
    const next = new URL(location.href);
    query ? next.searchParams.set('query', query) : next.searchParams.delete('query');
    place ? next.searchParams.set('location', place) : next.searchParams.delete('location');
    history.replaceState(null, '', next);
    applyFilters();
  });

  document.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
    categoryInputs.forEach((input) => { input.checked = input.value === 'all'; });
    document.querySelectorAll('.filters-panel input[type="checkbox"]').forEach((input) => { input.checked = false; });
    searchForm?.reset();
    query = '';
    place = '';
    history.replaceState(null, '', location.pathname);
    applyFilters();
  });

  document.querySelectorAll('[data-favorite]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const active = button.classList.toggle('is-active');
      button.textContent = active ? '♥' : '♡';
      button.setAttribute('aria-pressed', String(active));
    });
  });

  const params = new URLSearchParams(location.search);
  query = normalize(params.get('query') || params.get('servico'));
  place = normalize(params.get('location') || params.get('local'));
  if (queryInput) queryInput.value = params.get('query') || params.get('servico') || '';
  if (locationInput) locationInput.value = params.get('location') || params.get('local') || '';
  const incoming = params.get('categoria');
  const map = { cabelo: 'hair', unhas: 'nails', olhar: 'brows', maquiagem: 'makeup' };
  if (incoming && map[incoming]) {
    const target = categoryInputs.find((input) => input.value === map[incoming]);
    if (target) target.checked = true;
  }
  applyFilters();
})();
