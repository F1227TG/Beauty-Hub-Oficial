(() => {
  'use strict';

  const profiles = {
    'studio-aurora': {
      name: 'Studio Aurora',
      type: 'Salão de beleza',
      location: 'Pinheiros, São Paulo',
      rating: '4,9',
      reviews: 128,
      status: 'Aberto agora',
      hours: 'até 20:00',
      price: '$$',
      priceLabel: 'preço intermediário',
      distance: '1,2 km',
      description: 'Cabelo, unhas e maquiagem em um ambiente contemporâneo e acolhedor.',
      categories: ['hair', 'nails', 'makeup'],
      team: [['LA', 'Larissa Almeida', 'Cachos, corte e coloração', '4,9'], ['NS', 'Nina Souza', 'Manicure e nail art', '5,0'], ['BM', 'Bianca Melo', 'Maquiagem e penteados', '4,8']],
    },
    'casa-lume': {
      name: 'Casa Lume',
      type: 'Estúdio de beleza',
      location: 'Vila Madalena, São Paulo',
      rating: '4,8',
      reviews: 96,
      status: 'Agenda hoje',
      hours: 'até 19:00',
      price: '$$',
      priceLabel: 'preço intermediário',
      distance: '2,4 km',
      description: 'Sobrancelhas, cílios e maquiagem com acabamento leve e natural.',
      categories: ['brows', 'makeup'],
      team: [['CF', 'Camila Freitas', 'Design de sobrancelhas e cílios', '4,9'], ['BR', 'Bianca Rocha', 'Maquiagem natural e social', '4,8']],
    },
    'atelie-nara': {
      name: 'Ateliê Nara',
      type: 'Nail studio',
      location: 'Jardins, São Paulo',
      rating: '5,0',
      reviews: 74,
      status: 'Próximo horário amanhã',
      hours: 'abre às 09:00',
      price: '$$',
      priceLabel: 'preço intermediário',
      distance: '3,1 km',
      description: 'Manicure, pedicure, alongamento e nail art autoral.',
      categories: ['nails'],
      team: [['NL', 'Nara Lima', 'Alongamento e nail art', '5,0'], ['NS', 'Nina Santos', 'Manicure e pedicure', '4,9']],
    },
    'bela-trama': {
      name: 'Bela Trama',
      type: 'Especialista em cachos',
      location: 'Moema, São Paulo',
      rating: '4,9',
      reviews: 112,
      status: 'Aberto agora',
      hours: 'até 20:00',
      price: '$$',
      priceLabel: 'preço intermediário',
      distance: '4,6 km',
      description: 'Cuidado especializado para texturas, cachos e cabelos naturais.',
      categories: ['hair'],
      team: [['AS', 'Ana Souza', 'Corte a seco e finalização', '4,9'], ['JM', 'Jéssica Moura', 'Tranças e tratamentos', '4,9']],
    },
    'essenza-beauty': {
      name: 'Essenza Beauty',
      type: 'Beauty studio',
      location: 'Tatuapé, São Paulo',
      rating: '4,7',
      reviews: 83,
      status: 'Agenda no sábado',
      hours: 'abre às 09:00',
      price: '$$$',
      priceLabel: 'experiência premium',
      distance: '8,2 km',
      description: 'Produção completa para eventos, ensaios e momentos especiais.',
      categories: ['hair', 'makeup'],
      team: [['BR', 'Bianca Rocha', 'Maquiagem social e noivas', '4,8'], ['LP', 'Luiza Prado', 'Penteados e finalização', '4,7']],
    },
    'bloom-beauty-bar': {
      name: 'Bloom Beauty Bar',
      type: 'Beauty bar',
      location: 'Perdizes, São Paulo',
      rating: '4,8',
      reviews: 105,
      status: 'Agenda hoje',
      hours: 'até 21:00',
      price: '$$',
      priceLabel: 'preço intermediário',
      distance: '3,8 km',
      description: 'Serviços rápidos para unhas, sobrancelhas e cílios.',
      categories: ['brows', 'nails'],
      team: [['CF', 'Camila Freitas', 'Sobrancelhas e lash lifting', '4,9'], ['NS', 'Nina Santos', 'Manicure express', '4,8']],
    },
  };

  const profileSlug = new URLSearchParams(location.search).get('slug') || 'studio-aurora';
  const profile = profiles[profileSlug] || profiles['studio-aurora'];

  const createServiceRow = ({ name, description, duration, price }) => {
    const row = document.createElement('article');
    row.className = 'service-row';
    row.dataset.service = '';
    row.dataset.name = name;
    row.dataset.price = String(price);
    row.dataset.duration = String(duration);
    const copy = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = name;
    const detail = document.createElement('p');
    detail.textContent = description;
    const meta = document.createElement('span');
    meta.textContent = `${duration} min • a partir de R$ ${price}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.addService = '';
    button.setAttribute('aria-pressed', 'false');
    button.textContent = 'Adicionar';
    copy.append(title, detail, meta);
    row.append(copy, button);
    return row;
  };

  const ensureBrowsServices = () => {
    const servicesSection = document.querySelector('#servicos');
    const emptyState = servicesSection?.querySelector('[data-empty-services]');
    if (!servicesSection || !emptyState) return;
    const group = document.createElement('div');
    group.className = 'service-group';
    group.dataset.serviceGroup = '';
    const heading = document.createElement('h3');
    heading.append('Olhar ');
    const count = document.createElement('span');
    count.textContent = '2 serviços';
    heading.append(count);
    group.append(
      heading,
      createServiceRow({ name: 'Design de sobrancelhas', description: 'Mapeamento e acabamento personalizado.', duration: 35, price: 65 }),
      createServiceRow({ name: 'Lash lifting', description: 'Curvatura e definição dos cílios naturais.', duration: 60, price: 120 }),
    );
    emptyState.before(group);
  };

  const hydrateProfile = () => {
    ensureBrowsServices();
    document.title = `${profile.name} — Beauty Hub`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', `Conheça ${profile.name}, veja serviços, profissionais e horários na Beauty Hub.`);
    const cover = document.querySelector('.space-cover');
    cover?.setAttribute('aria-label', profile.name);
    const coverImage = cover?.querySelector('img');
    if (coverImage) coverImage.alt = `Ambiente de ${profile.name}`;
    const name = document.querySelector('.space-cover-copy h1');
    const type = document.querySelector('.space-cover-copy p');
    if (name) name.textContent = profile.name;
    if (type) type.textContent = `${profile.type} • ${profile.location}`;
    document.querySelector('.space-summary')?.setAttribute('aria-label', `Informações de ${profile.name}`);

    const summary = [...document.querySelectorAll('.space-summary > div > span')];
    const rating = summary[0]?.querySelector('strong');
    const reviewCount = summary[0]?.querySelector('small');
    if (rating) rating.textContent = profile.rating;
    if (reviewCount) reviewCount.textContent = `${profile.reviews} avaliações verificadas`;
    const status = summary[1]?.querySelector('strong');
    const hours = summary[1]?.querySelector('small');
    if (status) status.textContent = profile.status;
    if (hours) hours.textContent = profile.hours;
    const price = summary[2]?.querySelector('strong');
    const priceLabel = summary[2]?.querySelector('small');
    if (price) price.textContent = profile.price;
    if (priceLabel) priceLabel.textContent = profile.priceLabel;
    const distance = summary[3]?.querySelector('strong');
    if (distance) distance.textContent = profile.distance;
    const description = document.querySelector('[data-space-description]');
    if (description) description.textContent = profile.description;
    const featuredReview = document.querySelector('[data-featured-review]');
    if (featuredReview) {
      featuredReview.textContent = `Adorei a experiência. ${profile.team[0][1]} entendeu exatamente o que eu queria e explicou cada etapa com muita atenção.`;
    }

    const categoryNames = { Cabelo: 'hair', Unhas: 'nails', Maquiagem: 'makeup', Olhar: 'brows' };
    document.querySelectorAll('[data-service-group]').forEach((group) => {
      const label = group.querySelector('h3')?.firstChild?.textContent?.trim();
      const available = profile.categories.includes(categoryNames[label]);
      group.dataset.spaceAvailable = String(available);
      group.hidden = !available;
    });

    const teamGrid = document.querySelector('.team-grid');
    if (teamGrid) {
      const members = profile.team.map(([initials, memberName, specialty, memberRating], index) => {
        const article = document.createElement('article');
        const avatar = document.createElement('span');
        avatar.className = `avatar avatar-${['one', 'two', 'three'][index] || 'one'}`;
        avatar.textContent = initials;
        const copy = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = memberName;
        const detail = document.createElement('p');
        detail.textContent = specialty;
        const score = document.createElement('small');
        score.textContent = `★ ${memberRating} • atendimento verificado`;
        copy.append(title, detail, score);
        article.append(avatar, copy);
        return article;
      });
      teamGrid.replaceChildren(...members);
    }

    const reviewScore = document.querySelector('.review-score strong');
    const reviewTotal = document.querySelector('.review-score small');
    if (reviewScore) reviewScore.textContent = profile.rating;
    if (reviewTotal) reviewTotal.textContent = `de ${profile.reviews} avaliações`;
  };

  hydrateProfile();

  const selected = new Map();
  const count = document.querySelector('[data-service-count]');
  const empty = document.querySelector('[data-booking-empty]');
  const selectedPanel = document.querySelector('[data-booking-selected]');
  const selectedList = document.querySelector('[data-selected-list]');
  const datePicker = document.querySelector('[data-date-picker]');
  const totalPrice = document.querySelector('[data-total-price]');
  const totalDuration = document.querySelector('[data-total-duration]');
  const continueButton = document.querySelector('[data-continue-booking]');

  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  const renderBooking = () => {
    const items = [...selected.values()];
    const hasItems = items.length > 0;
    if (count) count.textContent = `${items.length} ${items.length === 1 ? 'item' : 'itens'}`;
    if (empty) empty.hidden = hasItems;
    if (selectedPanel) selectedPanel.hidden = !hasItems;
    if (datePicker) datePicker.hidden = !hasItems;
    if (continueButton) continueButton.disabled = !hasItems;
    if (selectedList) {
      const lines = items.map((item) => {
        const line = document.createElement('div');
        line.className = 'booking-line';
        const summary = document.createElement('span');
        const name = document.createElement('strong');
        name.textContent = item.name;
        const duration = document.createElement('small');
        duration.textContent = `${item.duration} min`;
        const price = document.createElement('strong');
        price.textContent = money.format(item.price);
        summary.append(name, duration);
        line.append(summary, price);
        return line;
      });
      selectedList.replaceChildren(...lines);
    }
    const price = items.reduce((sum, item) => sum + item.price, 0);
    const duration = items.reduce((sum, item) => sum + item.duration, 0);
    if (totalPrice) totalPrice.textContent = money.format(price);
    if (totalDuration) totalDuration.textContent = duration >= 60 ? `${Math.floor(duration / 60)} h ${duration % 60 ? `${duration % 60} min` : ''}`.trim() : `${duration} min`;
  };

  document.querySelectorAll('[data-service]').forEach((row) => {
    const button = row.querySelector('[data-add-service]');
    button?.addEventListener('click', () => {
      const name = row.dataset.name;
      if (!name) return;
      if (selected.has(name)) {
        selected.delete(name);
        row.classList.remove('is-selected');
        button.textContent = 'Adicionar';
        button.setAttribute('aria-pressed', 'false');
      } else {
        selected.set(name, { name, price: Number(row.dataset.price), duration: Number(row.dataset.duration) });
        row.classList.add('is-selected');
        button.textContent = 'Remover';
        button.setAttribute('aria-pressed', 'true');
      }
      renderBooking();
    });
  });

  document.querySelectorAll('.date-picker > div > button, .time-grid button').forEach((button) => {
    button.addEventListener('click', () => {
      button.parentElement?.querySelectorAll('button').forEach((item) => item.classList.remove('is-selected'));
      button.classList.add('is-selected');
    });
  });

  const search = document.querySelector('[data-service-search]');
  search?.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll('[data-service]').forEach((row) => {
      const groupAvailable = row.closest('[data-service-group]')?.dataset.spaceAvailable !== 'false';
      const show = groupAvailable && (!query || row.textContent.toLowerCase().includes(query));
      row.hidden = !show;
      if (show) visible += 1;
    });
    document.querySelectorAll('[data-service-group]').forEach((group) => {
      group.hidden = group.dataset.spaceAvailable === 'false' || !group.querySelector('[data-service]:not([hidden])');
    });
    const noResults = document.querySelector('[data-empty-services]');
    if (noResults) noResults.hidden = visible !== 0;
  });

  document.querySelector('[data-space-favorite]')?.addEventListener('click', (event) => {
    const button = event.currentTarget;
    const active = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? '♥ Salvo' : '♡ Salvar';
  });

  document.querySelector('[data-share]')?.addEventListener('click', (event) => {
    event.currentTarget.textContent = 'Link pronto';
  });

  continueButton?.addEventListener('click', () => {
    continueButton.textContent = 'Etapa pronta para conectar ao login';
  });

  if (new URLSearchParams(location.search).has('agendar')) document.querySelector('#servicos')?.scrollIntoView({ block: 'start' });
  renderBooking();
})();
