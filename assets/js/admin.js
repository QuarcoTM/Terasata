/* ТЕРАСАТА — local-only content editor. This is not authentication or a real server. */
(()=>{'use strict';
const BASE=window.TERASATA_CONTENT;
const mediaSrc=src=>{const v=String(src||'');return /^(?:terrace|main-hall|celebration-table|second-floor|bar)\.webp(?:\?.*)?$/i.test(v)?'assets/images/'+v:v;};
const KEY='terasata_editor_v1';
const SECURE=window.TERASATA_SECURE||null;
let secureQueue=Promise.resolve(),secureBlocked=false;
const deepcopy=x=>JSON.parse(JSON.stringify(x));
const qs=(s,parent=document)=>parent.querySelector(s);
const qsa=(s,parent=document)=>Array.from(parent.querySelectorAll(s));
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{let p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Sofia',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).formatToParts(new Date()).map(v=>[v.type,v.value]));return `${p.year}-${p.month}-${p.day}`};
const dateIsWeekday=s=>{const d=new Date(`${s}T12:00:00Z`);return Number.isFinite(d.getTime())&&d.getUTCDay()!==0&&d.getUTCDay()!==6};
const formatDisplayDate=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||'')))return String(s||'');const [y,m,d]=String(s).split('-');return `${d}-${m}-${y}`};
const newState=()=>({format:'terasata-local-v1',content:deepcopy(BASE),staff:[],savedAt:null});
let state=newState(),view='dashboard',activeCategory='predyastiya',activeDate=today(),lunchGroup='Салати',galleryFilter='Всички',editorHandler=null,toastTimer;
if(!SECURE){try{const stored=JSON.parse(localStorage.getItem(KEY)||'null');if(stored&&stored.format==='terasata-local-v1'&&stored.content?.categories?.length&&stored.content.regularMenu)state=stored}catch(err){console.warn('Local draft could not be loaded:',err)}}
const titles={dashboard:['Общ преглед','Всичко важно за проекта на едно място.'],lunch:['Обедно меню','Подготвяй различно меню за всяка дата от понеделник до петък.'],regular:['Постоянно меню','Редактирай ястия, грамажи, описания, цени и алергени.'],gallery:['Галерия','Реални снимки, категории и подредба на галерията.'],news:['Актуално','Новини, събития и специални предложения само на началната страница.'],settings:['Настройки','Контакти и основна информация за ресторанта.'],staff:['Служители и права','Само проект на бъдещите служебни профили — без реален вход.'],transfer:['Архив и експорт','Запази копие на данните или подготви файл за ръчно публикуване.']};
function notice(t){const box=qs('#toast');box.textContent=t;box.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.classList.remove('show'),3200)}
function save(){
 state.savedAt=new Date().toISOString();
 if(SECURE){
  if(secureBlocked){notice('Записът е блокиран след грешка. Обнови страницата.');return false;}
  const snapshot=deepcopy(state.content);
  qs('#save-indicator').textContent='Запис в сървъра…';
  secureQueue=secureQueue.then(async()=>{
   if(secureBlocked)return;
   const response=await fetch('backend/api/document.php',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':SECURE.csrf},body:JSON.stringify({version:SECURE.version,content:snapshot})});
   const result=await response.json().catch(()=>({error:'Невалиден отговор'}));
   if(!response.ok||!result.ok)throw Error(result.error||'Сървърна грешка');
   SECURE.version=result.version;
   qs('#save-indicator').textContent='Запазено в сървъра';
  }).catch(err=>{
   secureBlocked=true;qs('#save-indicator').textContent='ГРЕШКА при запазване';
   notice('Промените НЕ са записани. '+String(err.message||err)+' Обнови страницата.');
  });
  return true;
 }
 try{localStorage.setItem(KEY,JSON.stringify(state));qs('#save-indicator').textContent='Запазено локално';return true}
 catch(ex){notice('Недостатъчно място в браузъра. Експортирай копие и намали снимките.');return false}
}
function btn(label,action,cls='secondary',extra=''){return `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${e(label)}</button>`}
function rowActions(idx,actions){return `<div class="row-actions">${actions.map(([name,action,cls])=>btn(name,`${action}:${idx}`,cls||'secondary','')).join('')}</div>`}
function setView(next){if(!titles[next])return;if(SECURE&&next==='staff'&&SECURE.user.role!=='owner')return;if(SECURE&&next!=='dashboard'&&next!=='transfer'&&next!=='staff'&&SECURE.user.role!=='owner'&&!SECURE.user.permissions[next])return;view=next;qsa('#admin-nav button').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));qs('#view-eyebrow').textContent='ТЕРАСАТА · РЕДАКТОР';qs('#view-title').textContent=titles[view][0];qs('#view-description').textContent=titles[view][1];render()}
function render(){const content=qs('#view-content'),tools=qs('#view-tools');tools.innerHTML='';switch(view){case 'dashboard':renderDashboard(content);break;case 'lunch':renderLunch(content,tools);break;case 'regular':renderRegular(content,tools);break;case 'gallery':renderGallery(content,tools);break;case 'news':renderNews(content,tools);break;case 'settings':renderSettings(content);break;case 'staff':renderStaff(content,tools);break;case 'transfer':renderTransfer(content);break;}}
const countDishes=()=>state.content.categories.reduce((n,c)=>n+(state.content.regularMenu[c.id]||[]).length,0);
function renderDashboard(el){const noOfDays=Object.values(state.content.lunchByDate||{}).filter(d=>d.published).length;el.innerHTML=`<div class="stats"><div class="stat"><strong>${countDishes()}</strong><span>ястия в постоянното меню</span></div><div class="stat"><strong>${state.content.categories.length}</strong><span>категории</span></div><div class="stat"><strong>${state.content.gallery.length}</strong><span>снимки в галерията</span></div><div class="stat"><strong>${noOfDays}</strong><span>публикувани дневни менюта</span></div></div><div class="hint"><strong>Работен режим:</strong> ${SECURE?'Работа със защитен сървър и база данни. Промените се публикуват след потвърден успешен запис.':'Всички промени остават само в този браузър. За преглед отвори сайта с <b>?preview=1</b>. За реално публикуване трябва ръчно да качиш експортирания файл в GitHub. Няма пароли и няма свързване към сървър.'}</div><div class="cards"><article class="card"><h2>Обедно меню</h2><p>Меню по дата, категории, изчерпани ястия и Facebook визия.</p>${btn('Отвори редактора','go:lunch','primary')}</article><article class="card"><h2>Постоянно меню</h2><p>Сегашните 40 ястия и възможност за промени без работа с код.</p>${btn('Редактирай ястия','go:regular')}</article><article class="card"><h2>Галерия и новини</h2><p>Качвай само реални фотографии и създавай временни публикации.</p>${btn('Към галерията','go:gallery')}</article><article class="card"><h2>Архивиране</h2><p>Сваляй резервно копие и подготвяй content.js за GitHub.</p>${btn('Архив и експорт','go:transfer')}</article></div>`}
function renderRegular(el,tools){
 const cats=state.content.categories;
 activeCategory=cats.some(c=>c.id===activeCategory)?activeCategory:cats[0].id;
 const categoryIndex=cats.findIndex(c=>c.id===activeCategory);
 const current=cats[categoryIndex];
 const items=state.content.regularMenu[activeCategory]||[];
 tools.innerHTML=btn('Добави ястие','dish-add','primary')+'<a class="btn secondary" href="menu/?preview=1&amp;cat='+encodeURIComponent(activeCategory)+'" target="_blank" rel="noopener">Преглед в сайта ↗</a>';
 el.innerHTML='<div class="tabs" role="group" aria-label="Категории">'
  +cats.map(c=>'<button type="button" data-cat="'+e(c.id)+'" aria-pressed="'+(activeCategory===c.id)+'">'+e(c.name)+' ('+(state.content.regularMenu[c.id]||[]).length+')</button>').join('')
  +'</div><div class="panel"><div class="section-head"><h2>'+e(current.name)+'</h2><div class="row-actions">'
  +btn('Категория ↑','cat-up','secondary slim',categoryIndex===0?'disabled':'')
  +btn('Категория ↓','cat-down','secondary slim',categoryIndex===cats.length-1?'disabled':'')
  +'<span class="badge">'+items.length+' ястия</span></div></div>'
  +'<div class="rows">'
  +(items.length?items.map((dish,i)=>{
    const details=[dish.weight||'',dish.description||'',...(Array.isArray(dish.allergens)&&dish.allergens.length?['Алергени: '+dish.allergens.join(', ')]:[])].filter(Boolean).join(' · ');
    return '<div class="list-row"><div><strong>'+e(dish.name)+'</strong><small>'+e(details)+'</small></div><div class="row-actions">'
      +'<span class="price">'+e(dish.price||'')+'</span>'
      +btn('↑','dish-up:'+i,'secondary slim',i===0?'disabled aria-label="Първо ястие"':'aria-label="Премести '+e(dish.name)+' нагоре"')
      +btn('↓','dish-down:'+i,'secondary slim',i===items.length-1?'disabled aria-label="Последно ястие"':'aria-label="Премести '+e(dish.name)+' надолу"')
      +btn('Редакция','dish-edit:'+i,'secondary slim')
      +btn('Изтрий','dish-delete:'+i,'danger slim')
      +'</div></div>';
   }).join(''):'<p class="empty">Все още няма ястия в тази категория. Можеш да ги добавиш по-късно.</p>')
  +'</div></div><p class="mini muted">Подредбата на категориите и ястията се запазва при експорт на content.js. Цените са от хартиеното меню и не са потвърдени като актуални.</p>';
}
function dishModal(idx){
 const sourceId=activeCategory;
 const arr=state.content.regularMenu[sourceId]||[];
 const item=Number.isInteger(idx)?arr[idx]:{};
 if(!item)return;
 const currentName=state.content.categories.find(c=>c.id===sourceId)?.name||'';
 openEditor(idx===null?'Ново ястие':'Редакция на ястие',[
 ['name','Наименование','text',item.name||'',true],
 ['category','Категория','select',currentName,true,state.content.categories.map(c=>c.name)],
 ['weight','Грамаж','text',item.weight||''],
 ['price','Цена (с валута)','text',item.price||'',true],
 ['description','Описание','textarea',item.description||''],
 ['allergens','Алергени (разделени със запетая)','text',(item.allergens||[]).join(', ')]
 ],data=>{
  const name=String(data.name||'').trim();
  const price=String(data.price||'').trim();
  if(!name||!price){notice('Въведи наименование и цена');return false}
  const targetCategory=state.content.categories.find(c=>c.name===data.category);
  if(!targetCategory){notice('Избери валидна категория');return false}
  const updated={name,weight:String(data.weight||'').trim(),price};
  if(String(data.description||'').trim())updated.description=data.description.trim();
  if(String(data.allergens||'').trim())updated.allergens=data.allergens.split(',').map(s=>s.trim()).filter(Boolean);
  if(idx===null) (state.content.regularMenu[targetCategory.id] ||= []).push(updated);
  else if(sourceId===targetCategory.id)arr[idx]=updated;
  else {
   arr.splice(idx,1);
   (state.content.regularMenu[targetCategory.id] ||= []).push(updated);
  }
  activeCategory=targetCategory.id;
  return save();
 });
}
function getDay(){if(!state.content.lunchByDate)state.content.lunchByDate={};return state.content.lunchByDate[activeDate]}
function defaultDay(){return {published:false,groups:[{title:'Салати',weightNote:'250 г',items:[]},{title:'Супи',weightNote:'350 мл',items:[]},{title:'Готвено',weightNote:'450 г',items:[]}]}}
function ensureDay(){return state.content.lunchByDate[activeDate]||(state.content.lunchByDate[activeDate]=defaultDay())}

function defaultPosterSettings(){return {footerItems:[
 {label:'Питка 250гр.',price:'1.45€'},
 {label:'Чабата 120гр.',price:'0.97€'},
 {label:'Хляб филия',price:'0.15€'},
 {label:'Хляб филия препечен',price:'0.15€'},
 {label:'Хляб филия пълнозърнест',price:'0.15€'},
 {label:'Люта чушка 1бр.',price:'0.15€'}],dessertTitle:'Десерти:',dessertText:'Попитайте Вашия сервитьор!',slantedBrand:'Ресторант Терасата'} }
function ensurePosterSettings(){if(!state.content.lunchPoster||!Array.isArray(state.content.lunchPoster.footerItems)){state.content.lunchPoster=defaultPosterSettings()}else{const defaults=defaultPosterSettings();state.content.lunchPoster.footerItems=defaults.footerItems.map((d,i)=>Object.assign({},d,state.content.lunchPoster.footerItems[i]||{}));state.content.lunchPoster.dessertTitle=state.content.lunchPoster.dessertTitle||defaults.dessertTitle;state.content.lunchPoster.dessertText=state.content.lunchPoster.dessertText||defaults.dessertText;state.content.lunchPoster.slantedBrand=state.content.lunchPoster.slantedBrand||defaults.slantedBrand}return state.content.lunchPoster}
function lunchPosterModal(){const p=ensurePosterSettings();openEditor('Цени на хлебчета и люта чушка',[
 ['p0','Цена: Питка 250гр.','text',p.footerItems[0].price||''],
 ['p1','Цена: Чабата 120гр.','text',p.footerItems[1].price||''],
 ['p2','Цена: Хляб филия','text',p.footerItems[2].price||''],
 ['p3','Цена: Хляб филия препечен','text',p.footerItems[3].price||''],
 ['p4','Цена: Хляб филия пълнозърнест','text',p.footerItems[4].price||''],
 ['p5','Цена: Люта чушка 1бр.','text',p.footerItems[5].price||'']
 ],data=>{const n=ensurePosterSettings();['p0','p1','p2','p3','p4','p5'].forEach((k,i)=>n.footerItems[i].price=String(data[k]||'').trim());return save()})}
function renderLunch(el,tools){tools.innerHTML=btn('Facebook визия','fb-view')+btn('Хлебчета и десерти','lunch-footer')+btn('Добави категория','lunch-add-group','primary')+`<a class="btn secondary" href="obedno-menu/?preview=1&amp;lunch_date=${e(activeDate)}" target="_blank" rel="noopener">Преглед на датата ↗</a><a class="btn secondary" href="./?preview=1&amp;lunch_date=${e(activeDate)}" target="_blank" rel="noopener">Преглед на началната ↗</a>`;const d=ensureDay(),weekend=!dateIsWeekday(activeDate);el.innerHTML=`<div class="toolbar"><div class="toolbar-left"><label class="form-field">Дата <input id="lunch-date" class="field-input" type="date" value="${e(activeDate)}"></label><span class="badge ${d?.published?'green':'yellow'}">${d?.published?'Публикувано':'Чернова / няма меню'}</span></div><div class="toolbar-right">${btn('Копирай предишното меню','lunch-copy')}${btn(d?.published?'Върни в чернова':(SECURE?'Публикувай':'Одобри локално'),'lunch-publish',d?.published?'secondary':'primary')}</div></div>${weekend?'<div class="hint">Събота и неделя няма обедно меню. Публикуването за тези дати е забранено.</div>':''}<div class="hint">${SECURE?'Публикуването се извършва чрез сървъра и е видимо след успешен запис. Дневното меню се показва само в съответния делничен ден.':'На сайта менюто се показва само за съответния делничен ден, след одобрение и качване на експортирания content.js в GitHub. Бутонът „Одобри локално“ сам по себе си НЕ обновява публичния сайт. „Преглед на датата“ показва и чернови само в този браузър.'} Поръчки за вкъщи по телефона до 11:30 ч.</div><div class="lunch-sections">${d?d.groups.map((g,gi)=>`<section class="group-panel"><div class="section-head"><div><h3>${e(g.title)}</h3><small class="muted">${e(g.weightNote||'')}</small></div>${btn('Изтрий','lunch-delete-group:'+gi,'danger slim')}</div><div class="rows">${g.items.length?g.items.map((it,ii)=>`<div class="list-row"><div><strong>${e(it.name)}</strong><small>${e(it.weight||'')} ${it.soldOut?' · ИЗЧЕРПАНО':''}</small></div><div class="row-actions"><span class="price">${e(it.price)}</span>${btn(it.soldOut?'Налично':'Изчерпано',`lunch-sold:${gi}:${ii}`,'secondary slim')}${btn('Ред.',`lunch-edit:${gi}:${ii}`,'secondary slim')}${btn('×',`lunch-delete:${gi}:${ii}`,'danger slim')}</div></div>`).join(''):'<div class="empty">Няма добавени ястия.</div>'}</div><div style="margin-top:15px">${btn('+ Добави ястие',`lunch-add:${gi}`,'secondary slim')}</div></section>`).join(''):'<div class="empty">Няма подготвено меню за избраната дата. Добави категория или копирай предишно меню.</div>'}</div>`}
function lunchItemModal(gi,ii){const group=ensureDay().groups[gi];if(!group)return;const old=ii===null?{}:group.items[ii];openEditor(ii===null?'Добавяне на обедно ястие':'Редакция на обедно ястие', [['name','Ястие','text',old.name||'',true],['weight','Грамаж (по желание)','text',old.weight||''],['price','Цена','text',old.price||'',true]],data=>{if(!data.name.trim()||!data.price.trim()){notice('Въведи име и цена');return false}const item={name:data.name.trim(),weight:data.weight.trim(),price:data.price.trim(),soldOut:!!old.soldOut};if(ii===null)group.items.push(item);else group.items[ii]=item;return save()})}

const GALLERY_DEFAULT_CATEGORIES=['Тераси','Вътрешни зали','Празненства','Храна','Други'];
let galleryUploadCategory='Тераси';
function galleryCategoryOptions(){
 const existing=[...(state.content.galleryCategories||[]),...(state.content.gallery||[]).map(g=>g.category)];
 return [...new Set([...GALLERY_DEFAULT_CATEGORIES,...existing].map(s=>String(s||'').trim()).filter(Boolean))];
}
function galleryCategoryModal(){
 openEditor('Добавяне на категория в галерията',[
 ['category','Име на категория','text','',true]
 ],data=>{
  const category=String(data.category||'').trim();
  if(category.length<2||category.length>50||category.toLowerCase()==='всички'){notice('Въведи валидно име (2–50 знака).');return false;}
  if(galleryCategoryOptions().some(c=>c.toLocaleLowerCase('bg-BG')===category.toLocaleLowerCase('bg-BG'))){notice('Тази категория вече съществува.');return false;}
  (state.content.galleryCategories ||= []).push(category);
  galleryUploadCategory=category;galleryFilter=category;
  return save();
 });
}
function renderGallery(el,tools){
 const items=state.content.gallery||[];
 const categories=galleryCategoryOptions();
 if(!categories.includes(galleryUploadCategory))galleryUploadCategory='Тераси';
 if(galleryFilter!=='Всички'&&!categories.includes(galleryFilter))galleryFilter='Всички';
 tools.innerHTML='<label class="btn primary file-label">+ Добави реални снимки <input id="photo-input" type="file" multiple accept="image/jpeg,image/png,image/webp"></label>'
 +'<label class="form-field photo-category-field">Категория за новите снимки<select id="photo-category">'+categories.map(c=>'<option value="'+e(c)+'" '+(galleryUploadCategory===c?'selected':'')+'>'+e(c)+'</option>').join('')+'</select></label>'
 +btn('+ Нова категория','gallery-add-category','secondary')
 +'<a class="btn secondary" href="galeria/?preview=1" target="_blank" rel="noopener">Преглед на галерията ↗</a>';
 const visibleIndices=items.map((g,i)=>i).filter(i=>galleryFilter==='Всички'||items[i].category===galleryFilter);
 el.innerHTML='<div class="hint">Използвай само истински снимки от ресторанта. JPG/PNG/WebP до 12 MB; файловете се намаляват за локален преглед. Пази оригиналите отделно. За публичния сайт трябва експорт на content.js и качване в GitHub.</div>'
 +'<div class="tabs" aria-label="Категории">'+['Всички',...categories].map(c=>'<button type="button" data-gallery-filter="'+e(c)+'" aria-pressed="'+(galleryFilter===c)+'">'+e(c)+' ('+(c==='Всички'?items.length:items.filter(g=>g.category===c).length)+')</button>').join('')+'</div>'
 +(visibleIndices.length?'<div class="gallery-grid">'+visibleIndices.map((idx,i)=>{
  const g=items[idx];
  return '<article class="gallery-card"><img src="'+e(mediaSrc(g.src))+'" alt="'+e(g.alt||g.title)+'" loading="lazy"><div class="details"><strong>'+e(g.title)+'</strong><small>'+e(g.category)+'</small><div class="row-actions">'
  +btn('Редакция','gallery-edit:'+idx,'secondary slim')
  +btn('↑','gallery-up:'+idx,'secondary slim',i===0?'disabled':'aria-label="Премести снимката нагоре"')
  +btn('↓','gallery-down:'+idx,'secondary slim',i===visibleIndices.length-1?'disabled':'aria-label="Премести снимката надолу"')
  +btn('Изтрий','gallery-delete:'+idx,'danger slim')
  +'</div></div></article>';
 }).join('')+'</div>':'<div class="empty">В тази категория още няма снимки.</div>');
 qs('#photo-input')?.addEventListener('change',importPhotos);
 qs('#photo-category')?.addEventListener('change',ev=>{galleryUploadCategory=ev.target.value;});
}
async function importPhotos(ev){
 const files=[...ev.target.files];let added=0;
 const category=galleryUploadCategory;
 for(const file of files){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024){
   notice('Поддържат се JPG/PNG/WebP до 12 MB на снимка.');continue;
  }
  try{
   let dataUrl;
   if(SECURE){
    if(file.size>5*1024*1024)throw Error('Файлът надвишава 5 MB');
    const form=new FormData();form.append('photo',file);
    const response=await fetch('backend/api/upload.php',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':SECURE.csrf},body:form});
    const result=await response.json();
    if(!response.ok||!result.ok)throw Error(result.error||'Неуспешно качване');
    dataUrl=result.src;
   }else dataUrl=await resizeImage(file);
   state.content.gallery.push({src:dataUrl,title:file.name.replace(/\.[^.]+$/,''),alt:'Снимка от ресторант „Терасата“',category});
   if(save())added++;else state.content.gallery.pop();
  }catch(err){notice('Неуспешно прочитане: '+file.name);}
 }
 galleryFilter=category;
 render();
 notice(added?'Добавени '+added+' снимки в „'+category+'“. Пази оригиналите отделно.':'Няма добавени снимки.');
}
function resizeImage(file){
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{
   try{
    const scale=Math.min(1,1100/Math.max(img.naturalWidth,img.naturalHeight));
    const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    canvas.getContext('2d').drawImage(img,0,0,w,h);
    const result=canvas.toDataURL('image/webp',.72);
    URL.revokeObjectURL(url);resolve(result);
   }catch(err){URL.revokeObjectURL(url);reject(err);}
  };
  img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Invalid image'));};
  img.src=url;
 });
}
function galleryModal(i){
 const g=state.content.gallery?.[i];if(!g)return;
 openEditor('Редакция на снимка',[
 ['title','Заглавие','text',g.title,true],
 ['alt','Описание на снимката','text',g.alt||''],
 ['category','Категория','select',g.category,false,galleryCategoryOptions()]
 ],data=>{
  if(!String(data.title||'').trim()){notice('Въведи заглавие.');return false;}
  const cat=galleryCategoryOptions().find(c=>c===data.category);if(!cat)return false;
  g.title=data.title.trim();g.alt=String(data.alt||'').trim()||g.title;g.category=cat;
  return save();
 });
}
function moveGalleryPhoto(index,delta){
 const photos=state.content.gallery||[];
 const positions=photos.map((g,i)=>i).filter(i=>galleryFilter==='Всички'||photos[i].category===galleryFilter);
 const current=positions.indexOf(index),target=current+delta;
 if(current<0||target<0||target>=positions.length)return;
 [photos[positions[current]],photos[positions[target]]]=[photos[positions[target]],photos[positions[current]]];
 save();render();
}
const NEWS_TYPES=['Новина','Събитие','Специално предложение'];
function newsStatus(item){
 if(!item.published)return 'Чернова';
 const date=today();
 if(item.startDate&&item.startDate>date)return 'Планирана';
 if(item.endDate&&item.endDate<date)return 'Изтекла';
 return 'Активна';
}
function renderNews(el,tools){
 tools.innerHTML=btn('Нова публикация','news-add','primary')+'<a class="btn secondary" href="./?preview=1" target="_blank" rel="noopener">Преглед на началната ↗</a>';
 const items=state.content.news||[];
 el.innerHTML='<div class="hint">Новините, събитията и специалните предложения се показват само на началната страница. Публикуването тук е локално; за публичната версия е необходим експорт на content.js в GitHub. При локален преглед се виждат и черновите.</div>'
 +'<div class="panel"><div class="rows">'
 +(items.length?items.map((n,i)=>{
  const status=newsStatus(n);
  const dates=(n.startDate?formatDisplayDate(n.startDate):'без начална дата')+' — '+(n.endDate?formatDisplayDate(n.endDate):'без крайна дата');
  return '<div class="list-row"><div><strong>'+e(n.title)+'</strong><small>'+e(n.type||'Новина')+' · '+e(status)+' · '+e(dates)+'</small><small>'+e(n.text||'')+'</small>'+((n.image)?'<small>С избрана реална снимка</small>':'')+'</div><div class="row-actions">'
   +btn('↑','news-up:'+i,'secondary slim',i===0?'disabled':'')
   +btn('↓','news-down:'+i,'secondary slim',i===items.length-1?'disabled':'')
   +btn('Редакция','news-edit:'+i,'secondary slim')
   +btn('Изтрий','news-delete:'+i,'danger slim')
   +'</div></div>';
 }).join(''):'<p class="empty">Няма публикации. Не добавяме измислени събития или предложения.</p>')
 +'</div></div>';
}
function newsModal(i){
 const n=i===null?{}:state.content.news[i];
 if(!n)return;
 const photos=state.content.gallery||[];
 const photoChoices=['Без снимка',...photos.map((g,idx)=>'Снимка №'+(idx+1)+': '+g.title+' ('+g.category+')')];
 const existingPhotoIndex=photos.findIndex(g=>g.src===n.image);
 const unmatchedPhoto=!!n.image&&existingPhotoIndex===-1;
 if(unmatchedPhoto)photoChoices.push('Запази вече избраната снимка');
 const chosen=existingPhotoIndex>=0?photoChoices[existingPhotoIndex+1]:(unmatchedPhoto?photoChoices.at(-1):photoChoices[0]);
 openEditor(i===null?'Нова публикация':'Редакция на публикация',[
 ['title','Заглавие','text',n.title||'',true],
 ['type','Вид публикация','select',NEWS_TYPES.includes(n.type)?n.type:'Новина',true,NEWS_TYPES],
 ['text','Кратко описание','textarea',n.text||'',true],
 ['imageChoice','Снимка (само реални снимки от галерията)','select',chosen,false,photoChoices],
 ['startDate','Показване от','date',n.startDate||''],
 ['endDate','Показване до','date',n.endDate||''],
 ['published','Одобрена за публикуване','checkbox',!!n.published]
 ],data=>{
  if(!String(data.title||'').trim()||!String(data.text||'').trim()){notice('Въведи заглавие и текст.');return false;}
  if(data.startDate&&data.endDate&&data.startDate>data.endDate){notice('Крайната дата е преди началната.');return false;}
  if(!NEWS_TYPES.includes(data.type)){notice('Избери вид публикация.');return false;}
  const selection=photoChoices.indexOf(data.imageChoice);
  if(selection<0)return false;
  const image=selection===0?'':selection<=photos.length?photos[selection-1].src:(n.image||'');
  const item={title:data.title.trim(),type:data.type,text:data.text.trim(),startDate:data.startDate,endDate:data.endDate,published:!!data.published};
  if(image)item.image=image;
  if(i===null)(state.content.news ||= []).push(item);else state.content.news[i]=item;
  return save();
 });
}
function moveNews(index,delta){
 const list=state.content.news||[];
 const j=index+delta;if(index<0||index>=list.length||j<0||j>=list.length)return;
 [list[index],list[j]]=[list[j],list[index]];
 save();render();
}
function renderSettings(el){const c=state.content;el.innerHTML=`<form id="settings-form" class="panel"><div class="form-settings">${[['restaurantName','Име на ресторанта'],['phoneDisplay','Телефон'],['addressDisplay','Адрес'],['facebookUrl','Facebook'],['instagramUrl','Instagram'],['mapsUrl','Линк към карта']].map(([id,label])=>`<label class="form-field">${label}<input name="${id}" type="${id.endsWith('Url')?'url':id==='phoneDisplay'?'tel':'text'}" value="${e(c[id]||'')}" required></label>`).join('')}</div><div class="toolbar-row"><button type="submit" class="btn primary">Запази настройките</button></div></form><div class="hint">Работно време: всеки ден 10:00–00:00 ч. · Без имейл и без онлайн поръчки. Не сме добавяли оригинално лого, тъй като файлът му още липсва.</div>`;qs('#settings-form').addEventListener('submit',ev=>{ev.preventDefault();const fd=new FormData(ev.target);for(const [k,v] of fd){c[k]=String(v).trim()}for(const k of ['mapsUrl','facebookUrl','instagramUrl']){if(!/^https?:\/\//i.test(c[k])){notice('Линковете трябва да започват с https://');return}}const phone=c.phoneDisplay.replace(/\D/g,'');if(phone.length<9||phone.length>13){notice('Провери телефонния номер');return}c.phoneHref='tel:+359'+(phone.startsWith('0')?phone.slice(1):phone);if(save())notice('Настройките са запазени локално')})}
const PERMS=[['lunch','Обедно меню'],['regular','Постоянно меню'],['gallery','Галерия'],['news','Актуално'],['settings','Настройки']];
function renderStaff(el,tools){if(SECURE){tools.innerHTML='';el.innerHTML='<div class="panel"><h2>Реални служебни профили</h2><p>Индивидуален вход и ограничени права, проверявани от сървъра.</p><a class="btn primary" href="backend/panel/users.php">Управление на служители ↗</a></div>';return;}tools.innerHTML=btn('+ Примерен служител','staff-add','primary');el.innerHTML=`<div class="hint"><strong>Само проект на права.</strong> Този редактор е публичен HTML файл и няма автентикация. Не въвеждай истински потребителски имена, пароли или лични данни. Настоящите настройки не ограничават достъпа — реалните служебни профили ще се активират едва през PHP.</div><div class="panel"><h2>Главен администратор</h2><p class="mini">Пълен достъп до всички модули. 2FA ще е по избор в истинската система.</p></div>${state.staff.map((u,i)=>`<div class="panel"><div class="section-head"><h2>${e(u.label)}</h2>${btn('Премахни',`staff-delete:${i}`,'danger slim')}</div><p class="mini muted">Демо права: ${PERMS.filter(([id])=>u.permissions[id]).map(x=>x[1]).join(', ')||'няма'}</p>${btn('Промени правата',`staff-edit:${i}`)}</div>`).join('')}`}
function staffModal(i){const s=i===null?{label:'Примерен служител',permissions:{lunch:true}}:state.staff[i];openEditor('Права на служител (демонстрация)',[['label','Наименование на примерен профил','text',s.label,true],...PERMS.map(([id,label])=>['perm_'+id,label,'checkbox',!!s.permissions[id]])],data=>{if(!data.label.trim())return false;const permissions={};PERMS.forEach(([id])=>permissions[id]=!!data['perm_'+id]);const item={label:data.label.trim(),permissions};if(i===null)state.staff.push(item);else state.staff[i]=item;return save()})}
function renderTransfer(el){if(SECURE){el.innerHTML='<div class="panel"><h2>Сървърно публикуване</h2><p>Промените се записват в базата данни. Пази резервно JSON копие на сигурно място.</p>'+btn('Изтегли JSON архив','export-json','primary')+'</div>';return;}el.innerHTML=`<div class="split"><section class="panel"><h2>Резервно копие</h2><p class="mini muted">Запазва всички редакции, включително примерните права. JSON може да се импортира по-късно в същия редактор.</p><div class="toolbar-row">${btn('Изтегли JSON архив','export-json','primary')}<label class="btn secondary file-label">Импортирай JSON<input type="file" id="import-json" accept=".json,application/json"></label></div></section><section class="panel"><h2>Файл за сайта</h2><p class="mini muted">Генерира <strong>content.js</strong> за ръчно заместване в GitHub → assets/js/content.js. Това е единственият начин промените да станат видими за всички, докато няма хостинг.</p>${btn('Изтегли content.js','export-site','primary')}<p class="download-help">Нищо не се публикува автоматично. Снимките, добавени през редактора, се вграждат в този файл и може да го направят голям.</p></section></div><section class="panel"><h2>Локален преглед</h2><p class="mini muted">Отваря сайта в режим за преглед с текущите промени. Работи само в същия браузър и на същия адрес (GitHub Pages или локален сървър).</p><a href="./?preview=1" target="_blank" rel="noopener" class="btn secondary">Отвори началната ↗</a> <a href="menu/?preview=1" target="_blank" rel="noopener" class="btn secondary">Отвори менюто ↗</a><div class="danger-zone">${btn('Изчисти всички локални редакции','reset','danger')}</div></section>`;qs('#import-json')?.addEventListener('change',importJson)}
function download(filename,blob){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
function exportJSON(){download('terasata-archive.json',new Blob([JSON.stringify(state,null,2)],{type:'application/json;charset=utf-8'}))}
function exportSite(){// Staff information is intentionally never published with website content.
 const str='/** Терасата — експортирано съдържание от локалния редактор. */\nwindow.TERASATA_CONTENT = '+JSON.stringify(state.content,null,2)+';\n';download('content.js',new Blob([str],{type:'text/javascript;charset=utf-8'}));notice('Файлът content.js е готов за GitHub: assets/js/content.js')}
async function importJson(event){const f=event.target.files?.[0];if(!f)return;if(f.size>7*1024*1024){notice('Архивът е прекалено голям.');return}try{const obj=JSON.parse(await f.text());if(obj.format!=='terasata-local-v1'||!Array.isArray(obj.content?.categories)||!obj.content?.regularMenu||!Array.isArray(obj.content?.gallery)||!Array.isArray(obj.content?.news)){throw Error('Неподдържан формат')}if(!confirm('Да заменя ли текущите локални редакции с тези от архива?'))return;state={format:'terasata-local-v1',content:obj.content,staff:Array.isArray(obj.staff)?obj.staff:[],savedAt:obj.savedAt||null};if(save()){render();notice('Архивът е зареден')}}catch(err){notice('Невалиден или неподдържан JSON архив')}}
function openEditor(title,fields,handler){editorHandler=handler;qs('#dialog-title').textContent=title;const wrap=qs('#dialog-fields');wrap.innerHTML=fields.map(([name,label,type,value,required,options])=>`<label class="form-field">${e(label)}${type==='textarea'?`<textarea name="${e(name)}" ${required?'required':''}>${e(value)}</textarea>`:type==='select'?`<select name="${e(name)}">${(options||[]).map(o=>`<option ${o===value?'selected':''} value="${e(o)}">${e(o)}</option>`).join('')}</select>`:type==='checkbox'?`<span class="notice-check"><input type="checkbox" name="${e(name)}" ${value?'checked':''}> Да</span>`:`<input type="${e(type)}" name="${e(name)}" value="${e(value)}" ${required?'required':''} maxlength="250">`}</label>`).join('');qs('#edit-dialog').showModal()}
qs('#edit-form').addEventListener('submit',event=>{event.preventDefault();const form=new FormData(event.target);const result={};qsa('#dialog-fields [name]').forEach(node=>{result[node.name]=node.type==='checkbox'?node.checked:form.get(node.name)||''});const ok=editorHandler?.(result);if(ok){qs('#edit-dialog').close();render();notice(SECURE?'Изпратено за сървърен запис.':'Запазено локално')}});
qs('#dialog-close').addEventListener('click',()=>qs('#edit-dialog').close());qs('#dialog-cancel').addEventListener('click',()=>qs('#edit-dialog').close());
if(SECURE){qsa('#admin-nav button[data-view]').forEach(button=>{
 const v=button.dataset.view;
 if(v==='staff'&&SECURE.user.role!=='owner')button.remove();
 if(!['dashboard','staff','transfer'].includes(v)&&SECURE.user.role!=='owner'&&!SECURE.user.permissions[v])button.remove();
});}
qs('#admin-nav').addEventListener('click',ev=>{const b=ev.target.closest('[data-view]');if(b)setView(b.dataset.view)});
qs('#workspace').addEventListener('change',ev=>{if(ev.target.id==='lunch-date'&&ev.target.value){activeDate=ev.target.value;render()}});
qs('#workspace').addEventListener('click',ev=>{const tab=ev.target.closest('[data-cat]');if(tab){activeCategory=tab.dataset.cat;render();return}const filter=ev.target.closest('[data-gallery-filter]');if(filter){galleryFilter=filter.dataset.galleryFilter;render();return}const b=ev.target.closest('[data-action]');if(!b)return;const [act,a1,a2]=b.dataset.action.split(':');const idx=a1==null?null:Number(a1);switch(act){
case'go':setView(a1);break;
case'dish-add':dishModal(null);break;
case'dish-edit':dishModal(idx);break;
case'dish-delete':if(confirm('Сигурен ли си, че искаш да изтриеш ястието?')){state.content.regularMenu[activeCategory].splice(idx,1);save();render()}break;
case'dish-up':case'dish-down':{
 const list=state.content.regularMenu[activeCategory]||[];
 const target=act==='dish-up'?idx-1:idx+1;
 if(Number.isInteger(idx)&&idx>=0&&idx<list.length&&target>=0&&target<list.length){
  [list[idx],list[target]]=[list[target],list[idx]];
  save();render();
 }
 break;
}
case'cat-up':case'cat-down':{
 const list=state.content.categories;
 const current=list.findIndex(c=>c.id===activeCategory);
 const target=act==='cat-up'?current-1:current+1;
 if(current>=0&&target>=0&&target<list.length){
  [list[current],list[target]]=[list[target],list[current]];
  save();render();
 }
 break;
}
case'lunch-add-group':openEditor('Нова категория за обедното меню',[['title','Категория','text','',true],['weightNote','Общ грамаж (по желание)','text','']],data=>{if(!data.title.trim())return false;ensureDay().groups.push({title:data.title.trim(),weightNote:data.weightNote.trim(),items:[]});return save()});break;
case'lunch-delete-group':if(confirm('Да изтрия категорията и ястията в нея?')){ensureDay().groups.splice(idx,1);save();render()}break;
case'lunch-add':lunchItemModal(idx,null);break;
case'lunch-edit':lunchItemModal(idx,Number(a2));break;
case'lunch-delete':if(confirm('Изтриване на ястието?')){ensureDay().groups[idx].items.splice(Number(a2),1);save();render()}break;
case'lunch-sold':{const it=ensureDay().groups[idx].items[Number(a2)];it.soldOut=!it.soldOut;save();render();break}
case'lunch-publish':{if(!dateIsWeekday(activeDate)){notice('Обедно меню не се публикува през уикенда.');return}const d=ensureDay();if(!d.published&&!d.groups.some(g=>g.items?.length)){notice('Първо добави поне едно ястие.');return}d.published=!d.published;save();render();notice(d.published?(SECURE?'Публикуването е изпратено за запис в сървъра.':'Одобрено локално. За публично показване експортирай content.js и го качи в GitHub.'):'Менюто е чернова');break}
case'lunch-copy':{const keys=Object.keys(state.content.lunchByDate).filter(key=>key<activeDate&&state.content.lunchByDate[key]?.groups?.some(g=>g.items.length)).sort().reverse();if(!keys.length){notice('Няма предишно подготвено меню.');return}if(getDay()?.groups?.some(g=>g.items?.length)&&!confirm('Текущото меню ще бъде заменено. Продължаваме ли?'))return;state.content.lunchByDate[activeDate]=deepcopy(state.content.lunchByDate[keys[0]]);state.content.lunchByDate[activeDate].published=false;save();render();notice('Копирано като чернова');break}
case'fb-view':openFB();break;
case'lunch-footer':lunchPosterModal();break;
case'gallery-add-category':galleryCategoryModal();break;
case'gallery-edit':galleryModal(idx);break;
case'gallery-up':moveGalleryPhoto(idx,-1);break;
case'gallery-down':moveGalleryPhoto(idx,1);break;
case'gallery-delete':if(confirm('Да изтрия тази снимка от локалната галерия?')){state.content.gallery.splice(idx,1);save();render()}break;
case'news-add':newsModal(null);break;
case'news-edit':newsModal(idx);break;
case'news-up':moveNews(idx,-1);break;
case'news-down':moveNews(idx,1);break;
case'news-delete':if(confirm('Да изтрия публикацията?')){state.content.news.splice(idx,1);save();render()}break;
case'staff-add':staffModal(null);break;
case'staff-edit':staffModal(idx);break;
case'staff-delete':if(confirm('Да премахна примерния профил?')){state.staff.splice(idx,1);save();render()}break;
case'export-json':exportJSON();break;
case'export-site':if(!SECURE)exportSite();break;
case'reset':if(SECURE){notice('Няма локално нулиране в защитения режим.');break;}if(confirm('Това ще изтрие всички локални редакции на това устройство. Изтегли архив предварително!')){localStorage.removeItem(KEY);state=newState();render();notice('Върнати са началните данни')}break;
}});
function openFB(){
  if(!window.TERASATA_POSTER){notice('Генераторът не е зареден. Провери дали lunch-poster.js е качен в GitHub.');return}
  window.TERASATA_POSTER.open({day:getDay(),date:activeDate,settings:ensurePosterSettings(),download,notice});
}

setView('dashboard');
})();
