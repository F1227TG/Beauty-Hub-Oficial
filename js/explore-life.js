const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photoNames={hair:'02-cabelos',nails:'03-unhas',makeup:'05-maquiagem',wellness:'06-bem-estar'};
const rituals=[['cabel','Cabelo','Um novo movimento','hair'],['unha','Unhas','Beleza nos detalhes','nails'],['maqui','Maquiagem','Seu brilho, do seu jeito','makeup'],['estet','Bem-estar','Tempo para respirar','wellness']];
export function ritualStrip(categories){
 return `<section class="ritual-discovery" id="explore-services" aria-labelledby="ritual-title"><div class="ritual-heading"><div><p class="eyebrow">O que combina com seu dia?</p><h2 id="ritual-title">Explore os <em>serviços.</em></h2></div><p>Escolha um cuidado para explorar.</p></div><div class="ritual-track">${rituals.map(([match,label,description,image])=>{const category=categories.find(c=>`${c.slug||''} ${c.name}`.toLowerCase().includes(match));return `<button type="button" class="ritual-card" data-ritual-category="${escape(category?.id||'')}" data-ritual-search="${category?'':escape(label)}" aria-pressed="false"><img src="assets/images/marketplace/${photoNames[image]}.webp" alt="" width="1254" height="1254" loading="lazy" decoding="async"><span class="ritual-shade"></span><span class="ritual-caption"><small>${description}</small><strong>${label}</strong></span><span class="ritual-arrow" aria-hidden="true">↗</span></button>`;}).join('')}</div></section>`;
}
export function editorial(){return `<section class="explore-editorial"><div class="editorial-detail" aria-hidden="true"><span>Seu tempo.</span><span>Seu cuidado.</span><span>Seu ritmo.</span></div><div><p class="eyebrow">Beleza que cabe na sua vida</p><h2>Um momento para você.<br><em>Onde fizer sentido.</em></h2><p>No espaço de um profissional ou no conforto da sua casa. Descubra as modalidades e combine os detalhes antes de agendar.</p><button type="button" class="button button-primary" data-discover-home>Explorar atendimento em casa <span aria-hidden="true">↗</span></button></div></section>`;}
const form=()=>document.querySelector('[data-form="search"]');
function showResults(){const target=document.querySelector('.results-panel');target?.scrollIntoView({behavior:document.documentElement.classList.contains('bh-motion-paused')?'auto':'smooth',block:'start'});}
document.addEventListener('click',event=>{
 const card=event.target.closest('[data-ritual-category]');
 if(card){const f=form();if(!f)return;const radio=[...f.elements.category].find(r=>r.value===card.dataset.ritualCategory);if(radio)radio.checked=true;f.elements.search.value=card.dataset.ritualSearch;f.requestSubmit();showResults();}
 if(event.target.closest('[data-discover-home]')){const f=form();if(!f)return;f.querySelector('[name="mode"][value="home"]').checked=true;f.requestSubmit();showResults();}
 const toggle=event.target.closest('[data-filter-toggle]');if(toggle){const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));document.querySelector('.filters-panel')?.classList.toggle('filters-open',open);}
});
export function syncExplore(){
 const f=form();if(!f)return;
 document.querySelectorAll('[data-ritual-category]').forEach(card=>card.setAttribute('aria-pressed',String(card.dataset.ritualCategory?f.elements.category.value===card.dataset.ritualCategory:Boolean(card.dataset.ritualSearch)&&f.elements.search.value===card.dataset.ritualSearch)));
 const chosen=['category','mode','pricing','min_price','max_price'].filter(name=>Boolean(f.elements[name]?.value)).length+(f.elements.rating?.checked?1:0);
 const count=document.querySelector('[data-filter-number]');if(count)count.textContent=chosen?` · ${chosen}`:'';
}

document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const panel=document.querySelector('.filters-panel.filters-open');if(panel){panel.classList.remove('filters-open');const button=document.querySelector('[data-filter-toggle]');button?.setAttribute('aria-expanded','false');button?.focus();}});
