(() => {
  const file = location.pathname.split('/').pop().replace(/\.html$/, '') || 'index';
  const professional = file === 'painel' || file.endsWith('-profissional');
  const icons = {
    home: 'M3 10l9-7 9 7v10H3z M9 20v-7h6v7',
    search: 'M20 20l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
    calendar: 'M4 5h16v16H4z M8 2v6 M16 2v6 M4 11h16',
    heart: 'M12 20S2 14 2 8a5 5 0 0 1 10-2 5 5 0 0 1 10 2c0 6-10 12-10 12z',
    user: 'M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0 M3 21v-3a9 9 0 0 1 18 0v3',
    menu: 'M4 6h16 M4 12h16 M4 18h16',
    service: 'M4 4l16 16 M4 20L20 4 M7 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M7 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0'
  };
  const icon = key => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[key]}"/></svg>`;
  const links = professional
    ? [['painel','Resumo','home'],['agenda-profissional','Agenda','calendar'],['servicos-profissional','Serviços','service']]
    : [['explorar','Explorar','search'],['agendamentos','Agenda','calendar'],['favoritos','Favoritos','heart'],['minha-conta','Conta','user']];
  const nav = document.createElement('nav');
  nav.className = 'beauty-app-dock'; nav.setAttribute('aria-label', professional ? 'Atalhos do negócio' : 'Atalhos da Beauty Hub');
  nav.innerHTML = links.map(([route,label,key]) => `<a href="${route}.html" ${route === file ? 'aria-current="page"' : ''}>${icon(key)}<span>${label}</span></a>`).join('');
  if (professional) nav.insertAdjacentHTML('beforeend', `<button type="button" aria-haspopup="dialog" aria-label="Mais opções do negócio">${icon('menu')}<span>Mais</span></button>`);
  document.body.append(nav); document.body.classList.add('beauty-app-ready');
  function sheet(title) {
    const dialog = document.createElement('dialog'); dialog.className = 'beauty-app-sheet';
    const headingId = 'app-sheet-' + document.querySelectorAll('.beauty-app-sheet').length;
    dialog.setAttribute('aria-labelledby', headingId);
    dialog.innerHTML = `<div class="beauty-sheet-head"><h2 id="${headingId}">${title}</h2><button type="button" aria-label="Fechar ${title.toLowerCase()}">Fechar</button></div>`;
    dialog.querySelector('button').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientY < r.top || event.clientX < r.left || event.clientX > r.right || event.clientY > r.bottom) dialog.close(); }});
    return dialog;
  }
  if (professional) {
    const dialog = sheet('Seu negócio');
    const entries = [['orcamentos-profissional','Orçamentos'],['equipe-profissional','Profissionais'],['clientes-profissional','Clientes'],['negocio-profissional','Dados do negócio'],['minha-conta','Área do cliente'],['configuracoes','Acessibilidade e preferências'],['suporte','Ajuda']];
    dialog.insertAdjacentHTML('beforeend', `<nav class="beauty-sheet-menu" aria-label="Mais opções">${entries.map(([route,label])=>`<a href="${route}.html" ${file===route?'aria-current="page"':''}>${label}<span aria-hidden="true">↗</span></a>`).join('')}</nav>`);
    document.body.append(dialog); nav.querySelector('button').addEventListener('click', () => dialog.showModal());
  }
  // The dialog stays inside the search form, so its controls retain FormData participation.
  document.addEventListener('click', event => {
    const toggle = event.target.closest('[data-filter-toggle]');
    if (!toggle || !matchMedia('(max-width:1023px)').matches) return;
    event.stopImmediatePropagation();
    const panel = document.querySelector('#explore-filters');
    if (!panel) return;
    const marker = document.createComment('filters position'); panel.before(marker);
    const dialog = sheet('Filtros'); panel.closest('form').append(dialog);
    panel.classList.add('filters-open'); dialog.append(panel);
    const done = document.createElement('button'); done.type = 'button'; done.className = 'beauty-sheet-done'; done.textContent = 'Ver resultados';
    done.addEventListener('click', () => { panel.closest('form').requestSubmit(); dialog.close(); }); dialog.append(done);
    toggle.setAttribute('aria-expanded', 'true');
    dialog.addEventListener('close', () => { marker.replaceWith(panel); panel.classList.remove('filters-open'); toggle.setAttribute('aria-expanded','false'); dialog.remove(); toggle.focus(); }, {once:true});
    dialog.showModal();
  }, true);
  if (window.visualViewport) {
    const update = () => document.body.classList.toggle('beauty-keyboard-open', innerHeight - visualViewport.height > 150 && /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName));
    visualViewport.addEventListener('resize', update); document.addEventListener('focusout', () => setTimeout(update, 100));
  }
})();
