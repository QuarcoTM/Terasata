/* Frontend interactions only. No payments, booking forms or fake admin UI. */
(async () => {
  'use strict';
  let d = window.TERASATA_CONTENT;
  if(window.TERASATA_BACKEND_ACTIVE===true){
   try{
    const response=await fetch('backend/api/public.php',{credentials:'same-origin',cache:'no-store'});
    if(!response.ok)throw Error('Public content unavailable');
    const result=await response.json();
    if(!result.ok||!result.content||!Array.isArray(result.content.categories))throw Error('Invalid public content');
    d=result.content;
   }catch(err){
    console.error('Live content unavailable:',err);
    d={...d,lunchByDate:{},news:[]};
   }
  }
  const mediaSrc=src=>{const v=String(src||'');return /^(?:terrace|main-hall|celebration-table|second-floor|bar)\.webp(?:\?.*)?$/i.test(v)?'assets/images/'+v:v;};
  if (!d) return;
  const $ = (s, parent=document) => parent.querySelector(s);
  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const page = document.body.dataset.page || 'home';
  const nav = [
    ['home', 'Начало', './'],
    ['menu', 'Меню', 'menu/'],
    ['lunch', 'Обедно меню', 'obedno-menu/'],
    ['events', 'Празненства и събития', 'praznenstva/'],
    ['gallery', 'Галерия', 'galeria/'],
    ['contacts', 'Контакти', 'kontakti/']
  ];

  // Temporary restaurant name in typography only. NOT a recreation of the logo.
  const header = $('#site-header');
  if (header) header.innerHTML = `
    <div class="header-shell container">
      <div class="brand">
        <a class="brand-home" href="./" aria-label="Терасата — начало"><span class="brand-name">Терасата</span><span class="brand-subtitle">РЕСТОРАНТ · КЮСТЕНДИЛ</span></a>
        <a class="brand-phone" href="${d.phoneHref}" aria-label="Обади се на ${esc(d.phoneDisplay)}">${phoneIcon()}<span>${esc(d.phoneDisplay)}</span></a>
      </div>
      <nav class="desktop-nav" aria-label="Основна навигация">
        ${nav.map(([id,name,href])=>`<a href="${href}" ${id===page?'aria-current="page"':''}>${name}</a>`).join('')}
      </nav>
      <a class="btn btn-gold header-call" href="${d.phoneHref}" aria-label="Резервирай маса по телефона">${phoneIcon()}<span>Резервирай маса</span></a>
      <button class="mobile-toggle" type="button" aria-label="Отвори менюто" aria-expanded="false" aria-controls="mobile-menu"><span></span><span></span><span></span></button>
    </div>
    <nav class="mobile-nav" id="mobile-menu" aria-label="Мобилна навигация" hidden>
      ${nav.map(([id,name,href])=>`<a href="${href}" ${id===page?'aria-current="page"':''}>${name}</a>`).join('')}
      <a class="mobile-call" href="${d.phoneHref}">${phoneIcon()} Резервирай маса · ${d.phoneDisplay}</a>
    </nav>`;

  const footer = $('#site-footer');
  if (footer) footer.innerHTML = `
    <div class="container footer-layout">
      <div class="footer-brand"><span class="brand-name">Терасата</span><span class="brand-subtitle">РЕСТОРАНТ · КЮСТЕНДИЛ</span></div>
      <div class="footer-col footer-location"><span class="footer-symbol" aria-hidden="true">⌖</span><div><p>${esc(d.addressDisplay)}</p><a class="footer-map-link" href="${d.mapsUrl}" target="_blank" rel="noopener noreferrer">Виж на картата →</a></div></div>
      <div class="footer-col footer-contact-phone"><span class="footer-symbol" aria-hidden="true">✆</span><a class="footer-phone" href="${d.phoneHref}">${d.phoneDisplay}</a></div>
      <div class="footer-col footer-hours"><span class="footer-symbol" aria-hidden="true">◷</span><p>Всеки ден<br>10:00 – 00:00</p></div>
      <div class="footer-col footer-social"><a href="${d.facebookUrl}" target="_blank" rel="noopener noreferrer">Facebook</a><a href="${d.instagramUrl}" target="_blank" rel="noopener noreferrer">Instagram</a></div>
    </div>
    <div class="footer-bottom container"><span>© <span id="copyright-year"></span> Ресторант „Терасата“</span></div>`;
  const year=$('#copyright-year'); if(year)year.textContent=new Date().getFullYear();

  const toggle=$('.mobile-toggle');
  const mobile=$('#mobile-menu');
  if(toggle && mobile){
    const close = () => {toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Отвори менюто');mobile.hidden=true;document.body.classList.remove('nav-open');};
    toggle.addEventListener('click',()=>{const expanded=toggle.getAttribute('aria-expanded')==='true';if(expanded){close();return;}toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Затвори менюто');mobile.hidden=false;document.body.classList.add('nav-open');});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!mobile.hidden){close();toggle.focus();}});
    mobile.addEventListener('click',e=>{if(e.target.closest('a'))close();});
    window.addEventListener('resize',()=>{if(innerWidth>=1050)close();});
  }

  // Use the configured number for every telephone action, including the static hero links.
  document.querySelectorAll('a[href^="tel:"]').forEach(anchor=>{
    anchor.href=d.phoneHref;
    anchor.childNodes.forEach(node=>{if(node.nodeType===3 && node.textContent.includes('089 295 9030'))node.textContent=node.textContent.replaceAll('089 295 9030',d.phoneDisplay);});
  });

  // The seven categories are taken from the supplied printed menu; no drinks/desserts.
  const cats=$('#category-grid');
  if(cats) cats.innerHTML=d.categories.map((c)=>`<a class="category-tile" href="menu/?cat=${encodeURIComponent(c.id)}"><span class="category-icon" aria-hidden="true">${categoryIcon(c.id)}</span><span class="tile-name">${esc(c.name)}</span><span class="category-arrow" aria-hidden="true">→</span></a>`).join('');

  const currentMenuDate = () => {
    const now = new Date();
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Sofia',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).formatToParts(now).map(p=>[p.type,p.value]));
    return { key:`${parts.year}-${parts.month}-${parts.day}`, weekday:parts.weekday };
  };
  const { key:todayKey, weekday } = currentMenuDate();
  // Viewing another date is possible only when this browser has a local editor draft.
  const requestedDate = new URLSearchParams(location.search).get('lunch_date');
  const testDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate||'') ? new Date(requestedDate+'T12:00:00Z') : null;
  const previewSelected = window.TERASATA_PREVIEW_ACTIVE === true && testDate && !Number.isNaN(testDate.getTime()) && testDate.toISOString().slice(0,10) === requestedDate;
  const selectedKey = previewSelected ? requestedDate : todayKey;
  const isWeekday = previewSelected ? ![0,6].includes(testDate.getUTCDay()) : !['Sat','Sun'].includes(weekday);
  const dayData = isWeekday ? (d.lunchByDate || {})[selectedKey] : null;
  const hasDishes = !!(dayData && Array.isArray(dayData.groups) && dayData.groups.some(g=>Array.isArray(g.items) && g.items.some(item=>String(item.name||'').trim() && String(item.price||'').trim())));
  const activeLunch = hasDishes && (dayData.published === true || previewSelected);
  const lunchDateLabel = new Intl.DateTimeFormat('bg-BG',{timeZone:'Europe/Sofia',day:'numeric',month:'long',year:'numeric'}).format(new Date(selectedKey+'T12:00:00Z'));
  // Refresh a public page when the Sofia calendar date has changed during an open session.
  if(!previewSelected){const refreshDate=()=>{if(currentMenuDate().key!==todayKey) location.reload();};document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshDate();});window.addEventListener('pageshow',refreshDate);}

  const renderLunch = () => {
    if(!activeLunch) return '';
    return `<div class="lunch-grid">${dayData.groups.filter(g=>g.items?.length).map(g=>`<section class="lunch-group"><h3>${esc(g.title)}</h3>${(g.weightNote?`<p class="lunch-weight">${esc(g.weightNote)}</p>`:'')}<ul>${g.items.map(item=>`<li><div><span class="lunch-item-title">${esc(item.name)}</span>${item.weight?`<small>${esc(item.weight)}</small>`:''}${item.soldOut?'<small class="sold-out">Изчерпано</small>':''}</div><strong>${esc(item.price)}</strong></li>`).join('')}</ul></section>`).join('')}</div>`;
  };
  const lunchHome=$('#lunch-home');
  if(lunchHome && activeLunch){
    $('#lunch-home-content').innerHTML=renderLunch();
    const el=$('#lunch-home-date'); if(el)el.textContent=lunchDateLabel;
    lunchHome.hidden=false;
  }
  const lunchSeparate=$('#lunch-standalone');
  if(lunchSeparate){
    const display=$('#lunch-standalone-content');
    if(activeLunch){
      display.innerHTML=`<div class="lunch-full-header"><p class="eyebrow">${previewSelected&&!dayData.published?'ПРЕГЛЕД НА ЧЕРНОВА':'АКТУАЛНО МЕНЮ'}</p><h2>${esc(lunchDateLabel)}</h2><p>Поръчки за вкъщи по телефона до 11:30 ч.</p></div>${renderLunch()}`;
    } else {
      const label=isWeekday?'За днес няма публикувано обедно меню.':'Обедно меню се предлага от понеделник до петък.';
      display.innerHTML=`<div class="empty-state"><span class="empty-symbol" aria-hidden="true">✳</span><h2>${label}</h2><p>Можете да разгледате постоянното ни меню.</p><a class="btn btn-gold" href="menu/">Разгледай основното меню <span aria-hidden="true">↗</span></a></div>`;
    }
  }

  const menuCategories=$('#menu-categories');
  if(menuCategories){
    const params=new URLSearchParams(location.search);
    const preview=window.TERASATA_PREVIEW_ACTIVE===true;
    const seasonal=d.seasonalMenu||{enabled:false,title:'Сезонно меню',description:'',items:[]};
    const itemsSeasonal=Array.isArray(seasonal.items)?seasonal.items:[];
    const showSeasonal=itemsSeasonal.length>0 && (seasonal.enabled===true || preview);
    const available=d.categories.concat(showSeasonal?[{id:'seasonal',name:seasonal.title||'Сезонно меню'}]:[]);
    const validIds=available.map(c=>c.id);
    let activeCat=params.get('cat');
    if(!validIds.includes(activeCat))activeCat=validIds[0];
    menuCategories.innerHTML=available.map(c=>'<button type="button" data-cat="'+esc(c.id)+'" aria-pressed="'+(c.id===activeCat)+'" '+(c.id==='seasonal'?'class="seasonal-menu-tab"':'')+'>'+(c.id==='seasonal'?'✦ ':'')+esc(c.name)+'</button>').join('');
    const contents=$('#menu-category-sections');
    const renderDish=item=>'<article class="dish-item"><div><h3>'+esc(item.name)+'</h3>'+(item.description?'<p>'+esc(item.description)+'</p>':'')+(item.allergens?.length?'<p class="dish-allergens">Алергени: '+esc(item.allergens.join(', '))+'</p>':'')+'<span class="dish-weight">'+esc(item.weight||'')+'</span></div><strong>'+esc(item.price||'')+'</strong></article>';
    contents.innerHTML=available.map(c=>{
      const special=c.id==='seasonal',items=special?itemsSeasonal:(d.regularMenu[c.id]||[]);
      const extra=special?'<p class="eyebrow seasonal-eyebrow">СПЕЦИАЛНИ СЕЗОННИ ПРЕДЛОЖЕНИЯ</p>'+(seasonal.description?'<p class="seasonal-description">'+esc(seasonal.description)+'</p>':'')+(preview&&!seasonal.enabled?'<p class="seasonal-preview-message">Локален преглед — сезонното меню е скрито за посетителите.</p>':''):'';
      const body=items.length?'<div class="dish-grid">'+items.map(renderDish).join('')+'</div>':'<p class="menu-pending">Предложенията в тази категория ще бъдат публикувани след потвърждение на актуалните ястия и цени.</p>';
      return '<section class="menu-section '+(special?'seasonal-menu-section ':'')+(c.id===activeCat?'is-active':'')+'" id="'+esc(c.id)+'" data-cat="'+esc(c.id)+'">'+extra+'<div class="menu-section-head"><h2>'+esc(c.name)+'</h2></div>'+body+'</section>';
    }).join('');
    const activateCategory=catId=>{
      [...menuCategories.querySelectorAll('button[data-cat]')].forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.cat===catId)));
      [...contents.querySelectorAll('.menu-section')].forEach(section=>section.classList.toggle('is-active',section.dataset.cat===catId));
      const nextParams=new URLSearchParams(location.search);
      nextParams.set('cat',catId);
      history.replaceState(null,'',location.pathname+'?'+nextParams.toString());
    };
    menuCategories.addEventListener('click',ev=>{
      const btn=ev.target.closest('button[data-cat]');
      if(btn)activateCategory(btn.dataset.cat);
    });
  }

  const galleryContainer=$('#gallery-grid');
  const galleryFilters=$('#gallery-filters');
  if(galleryContainer){
    const all=Array.isArray(d.gallery)?d.gallery:[];
    const categories=['Всички',...new Set(all.map(img=>img.category).filter(Boolean))];
    const show=(filter='Всички')=>{
      const visible=filter==='Всички'?all:all.filter(v=>v.category===filter);
      galleryContainer.innerHTML=visible.length?visible.map((g)=>`<button type="button" class="gallery-item" data-src="${esc(mediaSrc(g.src))}" data-alt="${esc(g.alt)}" aria-label="Отвори снимка: ${esc(g.title)}"><img src="${esc(mediaSrc(g.src))}" alt="${esc(g.alt)}" loading="lazy"><span>${esc(g.title)}</span></button>`).join(''):'<p class="empty-state gallery-empty">Няма снимки в тази категория.</p>';
      if(galleryFilters)[...galleryFilters.querySelectorAll('button')].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
    };
    if(galleryFilters){
      galleryFilters.innerHTML=categories.map(cat=>`<button type="button" class="filter-btn" data-filter="${esc(cat)}" aria-pressed="${cat==='Всички'}">${esc(cat)}</button>`).join('');
      galleryFilters.addEventListener('click',e=>{const btn=e.target.closest('button[data-filter]');if(btn)show(btn.dataset.filter);});
    }
    show();
    let previousFocus;
    let activeIndex=-1;
    const overlay=document.createElement('div');
    overlay.className='lightbox';
    overlay.hidden=true;
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','gallery-lightbox-title');
    overlay.innerHTML='<button type="button" class="lightbox-close" aria-label="Затвори снимката">×</button><img alt=""/><p id="gallery-lightbox-title"></p>';
    document.body.appendChild(overlay);
    const closeButton=overlay.querySelector('.lightbox-close');
    const photos=()=>[...galleryContainer.querySelectorAll('.gallery-item')];
    const showPhoto=(index)=>{
      const items=photos();
      if(!items.length)return;
      activeIndex=(index+items.length)%items.length;
      const selected=items[activeIndex];
      const picture=overlay.querySelector('img');
      picture.src=selected.dataset.src;
      picture.alt=selected.dataset.alt||selected.querySelector('span')?.textContent||'Снимка от ресторанта';
      overlay.querySelector('#gallery-lightbox-title').textContent=selected.querySelector('span')?.textContent||'Галерия';
    };
    const close=()=>{
      overlay.hidden=true;
      document.body.classList.remove('lightbox-open');
      overlay.querySelector('img').removeAttribute('src');
      activeIndex=-1;
      if(previousFocus?.isConnected)previousFocus.focus();
    };
    galleryContainer.addEventListener('click',e=>{
      const selected=e.target.closest('.gallery-item');
      if(!selected)return;
      previousFocus=selected;
      showPhoto(photos().indexOf(selected));
      overlay.hidden=false;
      document.body.classList.add('lightbox-open');
      closeButton.focus();
    });
    closeButton.addEventListener('click',close);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    document.addEventListener('keydown',e=>{
      if(overlay.hidden)return;
      if(e.key==='Escape'){e.preventDefault();close();}
      else if(e.key==='Tab'){e.preventDefault();closeButton.focus();}
      else if(e.key==='ArrowRight'){e.preventDefault();showPhoto(activeIndex+1);}
      else if(e.key==='ArrowLeft'){e.preventDefault();showPhoto(activeIndex-1);}
    });
  }

  const preview=$('#gallery-preview');
  if(preview){const shots=Array.isArray(d.gallery)?d.gallery:[];preview.innerHTML=shots.slice(0,5).map(g=>`<a href="galeria/" class="preview-photo"><img src="${esc(mediaSrc(g.src))}" alt="${esc(g.alt)}" loading="lazy"></a>`).join('');if(!shots.length){const gallerySection=preview.closest('section');if(gallerySection)gallerySection.hidden=true;}}

  const news=$('#news-section');
  if(news){
    const now = todayKey;
    const localPreview=window.TERASATA_PREVIEW_ACTIVE===true;
    const valid=(Array.isArray(d.news)?d.news:[]).filter(item=>localPreview||item.published && (!item.startDate||item.startDate<=now) && (!item.endDate||item.endDate>=now));
    if(valid.length){
      $('#news-grid').innerHTML=valid.slice(0,3).map(item=>`<article class="news-card">${item.image?`<img src="${esc(mediaSrc(item.image))}" alt="" loading="lazy">`:''}<div><p class="eyebrow">${localPreview&&!item.published?'ЧЕРНОВА · ':''}${esc(item.type||'Новина')}</p><h3>${esc(item.title)}</h3><p>${esc(item.text||'')}</p></div></article>`).join('');
      news.hidden=false;
    }
  }
})();
function phoneIcon(){return '<svg class="icon-phone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.35 1.91.68 2.81a2 2 0 0 1-.45 2.11L8.07 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.85.56 2.81.68A2 2 0 0 1 22 16.92z"/></svg>';}

// Hand-authored line icons, independent of any generated imagery.
function categoryIcon(id) {
 const paths = {
   'salati':'<path d="M4 12c0 5 4 8 8 8s8-3 8-8H4Z"/><path d="M7 8c1-3 3-4 5-3 0 2-1 4-4 5M12 10c1-4 4-5 7-4-1 3-3 4-6 5"/>',
   'predyastiya':'<path d="M3 17h18M5 17a7 7 0 0 1 14 0M12 10V8M9 8h6"/><path d="M6 20h12"/>',
   'kartofi':'<path d="M5 10h14l-2 11H7L5 10ZM7 10 6 3h3l1 7M10 10V2h3v8M14 10l1-7h3l-1 7"/>',
   'pasta-i-oriz':'<path d="M3 13h18c0 5-4 8-9 8s-9-3-9-8Z"/><path d="M7 10c0-2 2-2 2-4s-1-2-1-3M12 10c0-2 2-2 2-4s-1-2-1-3M17 10c0-2 2-2 2-4s-1-2-1-3"/>',
   'osnovni-yastiya':'<path d="M3 18h18M5 18a7 7 0 0 1 14 0M12 8V6M10 6h4M3 21h18"/>',
   'skara':'<path d="M3 10h18l-3 7H6l-3-7ZM7 17l-2 5M17 17l2 5M8 7l-1-4M12 7l1-4M16 7l1-4"/>',
   'riba-i-morski-darove':'<path d="M3 12c3-5 7-7 12-6l5-4v8l-3 2 3 2v8l-5-4c-5 1-9-1-12-6Z"/><circle cx="12.5" cy="10" r="1"/><path d="M6 12h5"/>'
 };
 return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">${paths[id]||''}</svg>`;
}
