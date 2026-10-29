// Progressive enhancement: content and actions remain usable without animation.
const root = document.documentElement;
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const animations = new Set();
let paused = false;
try { paused = localStorage.getItem('beauty-operations-motion') === 'paused'; } catch {}
const enabled = () => !paused && !preference.matches;
const control = document.createElement('button');
control.type = 'button';
control.className = 'bh-motion-control';
const apply = () => {
  root.classList.toggle('bh-motion-paused', !enabled());
  control.textContent = preference.matches ? 'Movimento reduzido' : paused ? 'Ativar animações' : 'Pausar animações';
  control.setAttribute('aria-label', preference.matches ? 'Movimento reduzido pelo dispositivo' : control.textContent);
  control.setAttribute('aria-pressed', String(!enabled()));
  control.disabled = preference.matches;
  if (!enabled()) { animations.forEach(animation => animation.cancel()); animations.clear(); }
};
control.addEventListener('click', () => {
  paused = !paused;
  try { localStorage.setItem('beauty-operations-motion', paused ? 'paused' : 'active'); } catch {}
  apply();
});
preference.addEventListener('change', apply);
document.querySelector('.bh-app > footer,body[data-operation="explore"] .site-footer')?.append(control);
apply();

const header = document.querySelector('.bh-app');
const title = header?.querySelector(':scope > h1');
if (title) {
  const hero = document.createElement('div');
  hero.className = 'bh-page-intro';
  header.insertBefore(hero, title);
  const eyebrow = header.querySelector(':scope > .eyebrow');
  if (eyebrow) hero.append(eyebrow);
  const description = title.nextElementSibling;
  hero.append(title);
  if (description?.tagName === 'P') hero.append(description);
  const mark = document.createElement('span');
  mark.className = 'bh-intro-mark';
  mark.setAttribute('aria-hidden', 'true');
  hero.append(mark);
}

const observed = new WeakSet();
const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    observer.unobserve(entry.target);
    if (!enabled() || !entry.target.animate) continue;
    const animation = entry.target.animate([
      {opacity: .35, transform: 'translateY(16px)'},
      {opacity: 1, transform: 'translateY(0)'}
    ], {duration: 520, easing: 'cubic-bezier(.2,.75,.25,1)'});
    animations.add(animation);
    animation.finished.catch(() => {}).finally(() => animations.delete(animation));
  }
}, {threshold: .08}) : null;
function enhance() {
  document.querySelectorAll('.bh-card,.bh-empty,.bh-page-intro,.explore-hero,.ritual-card,.salon-card,.explore-editorial').forEach(element => {
    if (observed.has(element)) return;
    observed.add(element);
    observer?.observe(element);
  });
}
enhance();
const content = document.querySelector('#operation');
if (content) new MutationObserver(enhance).observe(content, {childList: true, subtree: true});

// Keep the active destination visible in the horizontally scrolling mobile menu.
const nav = document.querySelector('.bh-nav');
const active = nav?.querySelector('[aria-current="page"]');
if (nav && active) nav.scrollLeft = Math.max(0, active.offsetLeft - nav.offsetLeft - 24);

let searchTimer;
document.addEventListener('input', event => {
  const form = event.target.closest('[data-form="search"]');
  if (!form) return;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { if (form.isConnected) form.requestSubmit(); }, 220);
});
document.addEventListener('change', event => {
  const form = event.target.closest('[data-form="search"]');
  if (form && event.target.tagName === 'SELECT') { clearTimeout(searchTimer); form.requestSubmit(); }
});
