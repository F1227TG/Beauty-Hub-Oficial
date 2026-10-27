(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('beauty-js');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const nav = document.querySelector('.site-header .main-nav');
  const headerActions = document.querySelector('.site-header .header-actions');
  const installMenu = (container, target, id, label) => {
    target.id ||= id;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'beauty-menu-toggle';
    button.textContent = label;
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', target.id);
    container.append(button);
    const close = () => {
      target.classList.remove('is-open');
      button.setAttribute('aria-expanded', 'false');
    };
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      target.classList.toggle('is-open', open);
    });
    target.addEventListener('click', event => { if (event.target.closest('a')) close(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') { close(); button.focus(); }
    });
    matchMedia('(max-width: 980px)').addEventListener('change', close);
  };
  if (nav && headerActions) {
    // Account links also remain reachable inside the mobile disclosure.
    headerActions.querySelectorAll('a').forEach(link => {
      const copy = link.cloneNode(true);
      copy.className = 'beauty-mobile-account-link';
      nav.append(copy);
    });
    installMenu(headerActions, nav, 'beauty-navigation', 'Menu');
  }
  const sidebar = document.querySelector('.dashboard-sidebar');
  if (sidebar) installMenu(sidebar, sidebar, 'professional-navigation', 'Menu');

  const marketing = ['home', 'professionals'].includes(document.body.dataset.page);
  let paused = motion.matches;
  let transition;
  if (marketing) {
    const items = [...document.querySelectorAll('.hero-copy,.hero-stage,.category-strip .section-intro,.category-card,.how-copy,.steps,.beauty-editorial-image,.beauty-editorial-copy,.beauty-discover .section-intro,.beauty-discover-layout,.beauty-professional-invite > div,.beauty-ecosystem,.professional-hero-copy,.professional-hero-visual,.resource-grid article,.business-types,.professional-cta')];
    if ('IntersectionObserver' in window && !motion.matches) {
      root.classList.add('beauty-motion');
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
      }, { threshold: .08 });
      items.forEach(item => { item.classList.add('beauty-reveal'); observer.observe(item); });
    }
    const footer = document.querySelector('.site-footer');
    if (footer) {
      const control = document.createElement('button');
      control.className = 'beauty-motion-toggle';
      control.type = 'button';
      const apply = () => {
        root.classList.toggle('beauty-paused', paused);
        control.setAttribute('aria-pressed', String(paused));
        control.disabled = motion.matches;
        control.textContent = motion.matches ? 'Movimento reduzido pelo dispositivo' : paused ? 'Ativar animações' : 'Pausar animações';
        if (paused) transition?.cancel();
      };
      control.addEventListener('click', () => { paused = !paused; apply(); });
      motion.addEventListener('change', event => { paused = event.matches; apply(); });
      apply(); footer.append(control);
    }
  }

  const rituals = {
    cabelo: ['category-hair.webp', 'Inspiração de cuidado com o cabelo', 'Do corte à finalização, encontre espaço para expressar quem você é.', 'Explorar cabelo'],
    unhas: ['category-nails.webp', 'Inspiração de cuidado com as unhas', 'Cores, formas e pequenos detalhes que acompanham a sua personalidade.', 'Explorar unhas'],
    maquiagem: ['category-makeup.webp', 'Inspiração de maquiagem', 'Para uma celebração, uma nova fase ou simplesmente para você.', 'Explorar maquiagem']
  };
  document.querySelectorAll('[data-ritual]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.ritual;
    const [file, alt, description, action] = rituals[key];
    document.querySelectorAll('[data-ritual]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    const image = document.querySelector('#ritual-image');
    image.src = `assets/images/${file}`; image.alt = alt;
    document.querySelector('#ritual-description').textContent = description;
    const link = document.querySelector('#ritual-link');
    link.href = `explorar.html?categoria=${key}`; link.textContent = `${action} ↗`;
    transition?.cancel();
    if (!paused && !motion.matches) transition = document.querySelector('.beauty-discover-result').animate([{opacity:.3,transform:'translateY(12px)'},{opacity:1,transform:'none'}], {duration:400,easing:'ease-out'});
  }));

  // Wide data grids scroll inside their own region, including with a keyboard.
  document.querySelectorAll('.pro-table,.pro-agenda-scroll').forEach(region => {
    region.tabIndex = 0;
    region.setAttribute('role','region');
    region.setAttribute('aria-label',region.classList.contains('pro-table') ? 'Tabela de dados, role horizontalmente para mais colunas' : 'Agenda semanal, role horizontalmente para outros dias');
  });
})();
