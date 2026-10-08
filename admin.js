/* ТЕРАСАТА — local-only content editor. This is not authentication or a real server. */
(()=>{'use strict';
const BASE=window.TERASATA_CONTENT;
const KEY='terasata_editor_v1';
const deepcopy=x=>JSON.parse(JSON.stringify(x));
const qs=(s,parent=document)=>parent.querySelector(s);
const qsa=(s,parent=document)=>Array.from(parent.querySelectorAll(s));
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{let p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Sofia',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).formatToParts(new Date()).map(v=>[v.type,v.value]));return `${p.year}-${p.month}-${p.day}`};
const dateIsWeekday=s=>{const d=new Date(`${s}T12:00:00Z`);return Number.isFinite(d.getTime())&&d.getUTCDay()!==0&&d.getUTCDay()!==6};
const formatDisplayDate=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||'')))return String(s||'');const [y,m,d]=String(s).split('-');return `${d}-${m}-${y}`};
const newState=()=>({format:'terasata-local-v1',content:deepcopy(BASE),staff:[],savedAt:null});
let state=newState(),view='dashboard',activeCategory='predyastiya',activeDate=today(),lunchGroup='Салати',galleryFilter='Всички',editorHandler=null,toastTimer;
try{const stored=JSON.parse(localStorage.getItem(KEY)||'null');if(stored&&stored.format==='terasata-local-v1'&&stored.content?.categories?.length&&stored.content.regularMenu)state=stored}catch(err){console.warn('Local draft could not be loaded:',err)}
const titles={dashboard:['Общ преглед','Всичко важно за проекта на едно място.'],lunch:['Обедно меню','Подготвяй различно меню за всяка дата от понеделник до петък.'],regular:['Постоянно меню','Редактирай ястия, грамажи, описания, цени и алергени.'],gallery:['Галерия','Използвай само истински снимки от ресторанта и неговите събития.'],news:['Актуално','Кратки новини и предложения само на началната страница.'],settings:['Настройки','Контакти и основна информация за ресторанта.'],staff:['Служители и права','Само проект на бъдещите служебни профили — без реален вход.'],transfer:['Архив и експорт','Запази копие на данните или подготви файл за ръчно публикуване.']};
function notice(t){const box=qs('#toast');box.textContent=t;box.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.classList.remove('show'),3200)}
function save(){state.savedAt=new Date().toISOString();try{localStorage.setItem(KEY,JSON.stringify(state));qs('#save-indicator').textContent='Запазено локално';return true}catch(ex){notice('Недостатъчно място в браузъра. Експортирай копие и намали снимките.');return false}}
function btn(label,action,cls='secondary',extra=''){return `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${e(label)}</button>`}
function rowActions(idx,actions){return `<div class="row-actions">${actions.map(([name,action,cls])=>btn(name,`${action}:${idx}`,cls||'secondary','')).join('')}</div>`}
function setView(next){if(!titles[next])return;view=next;qsa('#admin-nav button').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));qs('#view-eyebrow').textContent='ТЕРАСАТА · РЕДАКТОР';qs('#view-title').textContent=titles[view][0];qs('#view-description').textContent=titles[view][1];render()}
function render(){const content=qs('#view-content'),tools=qs('#view-tools');tools.innerHTML='';switch(view){case 'dashboard':renderDashboard(content);break;case 'lunch':renderLunch(content,tools);break;case 'regular':renderRegular(content,tools);break;case 'gallery':renderGallery(content,tools);break;case 'news':renderNews(content,tools);break;case 'settings':renderSettings(content);break;case 'staff':renderStaff(content,tools);break;case 'transfer':renderTransfer(content);break;}}
const countDishes=()=>state.content.categories.reduce((n,c)=>n+(state.content.regularMenu[c.id]||[]).length,0);
function renderDashboard(el){const noOfDays=Object.values(state.content.lunchByDate||{}).filter(d=>d.published).length;el.innerHTML=`<div class="stats"><div class="stat"><strong>${countDishes()}</strong><span>ястия в постоянното меню</span></div><div class="stat"><strong>${state.content.categories.length}</strong><span>категории</span></div><div class="stat"><strong>${state.content.gallery.length}</strong><span>снимки в галерията</span></div><div class="stat"><strong>${noOfDays}</strong><span>публикувани дневни менюта</span></div></div><div class="hint"><strong>Работен режим:</strong> Всички промени остават само в този браузър. За преглед отвори сайта с <b>?preview=1</b>. За реално публикуване трябва ръчно да качиш експортирания файл в GitHub. Няма пароли и няма свързване към сървър.</div><div class="cards"><article class="card"><h2>Обедно меню</h2><p>Меню по дата, категории, изчерпани ястия и Facebook визия.</p>${btn('Отвори редактора','go:lunch','primary')}</article><article class="card"><h2>Постоянно меню</h2><p>Сегашните 40 ястия и възможност за промени без работа с код.</p>${btn('Редактирай ястия','go:regular')}</article><article class="card"><h2>Галерия и новини</h2><p>Качвай само реални фотографии и създавай временни публикации.</p>${btn('Към галерията','go:gallery')}</article><article class="card"><h2>Архивиране</h2><p>Сваляй резервно копие и подготвяй content.js за GitHub.</p>${btn('Архив и експорт','go:transfer')}</article></div>`}
function renderRegular(el,tools){tools.innerHTML=btn('Добави ястие','dish-add','primary');const cats=state.content.categories;activeCategory=cats.some(c=>c.id===activeCategory)?activeCategory:cats[0].id;const items=state.content.regularMenu[activeCategory]||[];el.innerHTML=`<div class="tabs" role="group" aria-label="Категории">${cats.map(c=>`<button type="button" data-cat="${e(c.id)}" aria-pressed="${activeCategory===c.id}">${e(c.name)} (${(state.content.regularMenu[c.id]||[]).length})</button>`).join('')}</div><div class="panel"><div class="section-head"><h2>${e(cats.find(c=>c.id===activeCategory)?.name)}</h2><span class="badge">${items.length} ястия</span></div><div class="rows">${items.length?items.map((dish,i)=>`<div class="list-row"><div><strong>${e(dish.name)}</strong><small>${e(dish.weight)}${dish.description?' · '+e(dish.description):''}${dish.allergens?.length?' · Алергени: '+e(dish.allergens.join(', ')):''}</small></div><div class="row-actions"><span class="price">${e(dish.price)}</span>${rowActions(i,[['Редакция','dish-edit'],['Изтрий','dish-delete','danger slim']])}</div></div>`).join(''):'<p class="empty">Все още няма ястия в тази категория. Можеш да ги добавиш по-късно.</p>'}</div></div><p class="mini muted">Цените в началното меню са преписани от хартиените снимки и не са потвърдени като актуални.</p>`}
function dishModal(idx){const arr=state.content.regularMenu[activeCategory]||[];const item=Number.isInteger(idx)?arr[idx]:{};openEditor(idx===null?'Ново ястие':'Редакция на ястие',[
['name','Наименование','text',item.name||'',true],['weight','Грамаж','text',item.weight||''],['price','Цена (с валута)','text',item.price||''],['description','Описание','textarea',item.description||''],['allergens','Алергени (разделени със запетая)','text',(item.allergens||[]).join(', ')]],data=>{if(!data.name.trim()){notice('Въведи наименование');return false}const itemNew={name:data.name.trim(),weight:data.weight.trim(),price:data.price.trim()};if(data.description.trim())itemNew.description=data.description.trim();if(data.allergens.trim())itemNew.allergens=data.allergens.split(',').map(s=>s.trim()).filter(Boolean);if(idx===null)arr.push(itemNew);else arr[idx]=itemNew;state.content.regularMenu[activeCategory]=arr;return save()})}
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
function lunchPosterModal(){const p=ensurePosterSettings();openEditor('Хлебчета, люта чушка и долен текст',[
 ['p0','Цена: Питка 250гр.','text',p.footerItems[0].price||''],
 ['p1','Цена: Чабата 120гр.','text',p.footerItems[1].price||''],
 ['p2','Цена: Хляб филия','text',p.footerItems[2].price||''],
 ['p3','Цена: Хляб филия препечен','text',p.footerItems[3].price||''],
 ['p4','Цена: Хляб филия пълнозърнест','text',p.footerItems[4].price||''],
 ['p5','Цена: Люта чушка 1бр.','text',p.footerItems[5].price||''],
 ['dessertTitle','Заглавие за десертите','text',p.dessertTitle||''],
 ['dessertText','Текст за десертите','text',p.dessertText||''],
 ['slantedBrand','Наклонен долен надпис','text',p.slantedBrand||'']
 ],data=>{const n=ensurePosterSettings();['p0','p1','p2','p3','p4','p5'].forEach((k,i)=>n.footerItems[i].price=String(data[k]||'').trim());n.dessertTitle=String(data.dessertTitle||'').trim()||'Десерти:';n.dessertText=String(data.dessertText||'').trim()||'Попитайте Вашия сервитьор!';n.slantedBrand=String(data.slantedBrand||'').trim()||'Ресторант Терасата';return save()})}
function renderLunch(el,tools){tools.innerHTML=btn('Facebook визия','fb-view')+btn('Хлебчета и десерти','lunch-footer')+btn('Добави категория','lunch-add-group','primary');const d=ensureDay(),weekend=!dateIsWeekday(activeDate);el.innerHTML=`<div class="toolbar"><div class="toolbar-left"><label class="form-field">Дата <input id="lunch-date" class="field-input" type="date" value="${e(activeDate)}"></label><span class="badge ${d?.published?'green':'yellow'}">${d?.published?'Публикувано':'Чернова / няма меню'}</span></div><div class="toolbar-right">${btn('Копирай предишното меню','lunch-copy')}${btn(d?.published?'Върни в чернова':'Публикувай','lunch-publish',d?.published?'secondary':'primary')}</div></div>${weekend?'<div class="hint">Събота и неделя няма обедно меню. Публикуването за тези дати е забранено.</div>':''}<div class="hint">Менюто се показва на началната само ако има публикувани ястия за днешната дата и денят е делничен. Поръчки за вкъщи по телефона до 11:30 ч.</div><div class="lunch-sections">${d?d.groups.map((g,gi)=>`<section class="group-panel"><div class="section-head"><div><h3>${e(g.title)}</h3><small class="muted">${e(g.weightNote||'')}</small></div>${btn('Изтрий','lunch-delete-group:'+gi,'danger slim')}</div><div class="rows">${g.items.length?g.items.map((it,ii)=>`<div class="list-row"><div><strong>${e(it.name)}</strong><small>${e(it.weight||'')} ${it.soldOut?' · ИЗЧЕРПАНО':''}</small></div><div class="row-actions"><span class="price">${e(it.price)}</span>${btn(it.soldOut?'Налично':'Изчерпано',`lunch-sold:${gi}:${ii}`,'secondary slim')}${btn('Ред.',`lunch-edit:${gi}:${ii}`,'secondary slim')}${btn('×',`lunch-delete:${gi}:${ii}`,'danger slim')}</div></div>`).join(''):'<div class="empty">Няма добавени ястия.</div>'}</div><div style="margin-top:15px">${btn('+ Добави ястие',`lunch-add:${gi}`,'secondary slim')}</div></section>`).join(''):'<div class="empty">Няма подготвено меню за избраната дата. Добави категория или копирай предишно меню.</div>'}</div>`}
function lunchItemModal(gi,ii){const group=ensureDay().groups[gi];if(!group)return;const old=ii===null?{}:group.items[ii];openEditor(ii===null?'Добавяне на обедно ястие':'Редакция на обедно ястие', [['name','Ястие','text',old.name||'',true],['weight','Грамаж (по желание)','text',old.weight||''],['price','Цена','text',old.price||'',true]],data=>{if(!data.name.trim()||!data.price.trim()){notice('Въведи име и цена');return false}const item={name:data.name.trim(),weight:data.weight.trim(),price:data.price.trim(),soldOut:!!old.soldOut};if(ii===null)group.items.push(item);else group.items[ii]=item;return save()})}
function renderGallery(el,tools){tools.innerHTML=`<label class="btn primary file-label">+ Добави реални снимки <input id="photo-input" type="file" multiple accept="image/jpeg,image/png,image/webp"></label>`;const items=state.content.gallery;const cats=['Всички',...new Set(items.map(g=>g.category))];if(!cats.includes(galleryFilter))galleryFilter='Всички';el.innerHTML=`<div class="hint">Качи JPG, PNG или WebP от ресторанта. Снимките се свиват автоматично, за да се съхранят локално. <strong>Това не е голям файлов склад:</strong> пази и оригиналите отделно. Не използваме AI снимки.</div><div class="tabs">${cats.map(c=>`<button type="button" data-gallery-filter="${e(c)}" aria-pressed="${galleryFilter===c}">${e(c)}</button>`).join('')}</div><div class="gallery-grid">${items.map((g,i)=>({...g,i})).filter(g=>galleryFilter==='Всички'||g.category===galleryFilter).map(g=>`<article class="gallery-card"><img src="${e(g.src)}" alt="${e(g.alt)}"><div class="details"><strong>${e(g.title)}</strong><small>${e(g.category)}</small><div class="row-actions">${btn('Редакция',`gallery-edit:${g.i}`,'secondary slim')}${btn('↑',`gallery-up:${g.i}`,'secondary slim')}${btn('↓',`gallery-down:${g.i}`,'secondary slim')}${btn('Изтрий',`gallery-delete:${g.i}`,'danger slim')}</div></div></article>`).join('')}</div>`;qs('#photo-input')?.addEventListener('change',importPhotos)}
async function importPhotos(ev){const files=[...ev.target.files];let added=0;for(const file of files){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024){notice('Поддържат се JPG/PNG/WebP до 12 MB на снимка.');continue}try{const dataUrl=await resizeImage(file);state.content.gallery.push({src:dataUrl,title:file.name.replace(/\.[^.]+$/,''),alt:'Снимка на ресторант „Терасата“',category:'Тераси'});if(save())added++;else state.content.gallery.pop()}catch(err){notice(`Неуспешно прочитане: ${file.name}`)}}notice(added?`Добавени ${added} снимки. Запази оригиналите отделно.`:'Няма добавени снимки.');render()}
function resizeImage(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{const s=Math.min(1,1100/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.max(1,Math.round(img.naturalWidth*s)),h=Math.max(1,Math.round(img.naturalHeight*s));const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);URL.revokeObjectURL(url);resolve(canvas.toDataURL('image/webp',.72))};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('image'))};img.src=url})}
function galleryModal(i){const g=state.content.gallery[i];openEditor('Редакция на снимка',[['title','Заглавие','text',g.title,true],['alt','Описание за достъпност','text',g.alt||''],['category','Категория','select',g.category,false,['Тераси','Вътрешни зали','Празненства','Храна','Други']]],data=>{g.title=data.title.trim();g.alt=data.alt.trim();g.category=data.category;return save()})}
function renderNews(el,tools){tools.innerHTML=btn('Нова публикация','news-add','primary');const items=state.content.news||[];el.innerHTML=`<div class="hint">Активните публикации се появяват само на началната страница. Когато няма активни, секцията изчезва.</div><div class="panel"><div class="rows">${items.length?items.map((n,i)=>`<div class="list-row"><div><strong>${e(n.title)}</strong><small>${e(n.text||'')}<br>${e(n.startDate||'без начало')} — ${e(n.endDate||'без край')} · ${n.published?'Публикувана':'Чернова'}</small></div>${rowActions(i,[['Редакция','news-edit'],['Изтрий','news-delete','danger slim']])}</div>`).join(''):'<p class="empty">Още няма публикации. Това е нормално — няма да показваме измислени събития.</p>'}</div></div>`}
function newsModal(i){const n=i===null?{}:state.content.news[i];openEditor(i===null?'Нова публикация':'Редакция на публикация',[['title','Заглавие','text',n.title||'',true],['text','Кратко описание','textarea',n.text||'',true],['startDate','Показване от','date',n.startDate||''],['endDate','Показване до','date',n.endDate||''],['published','Публикувана','checkbox',!!n.published]],data=>{if(!data.title.trim()||!data.text.trim()){notice('Въведи заглавие и текст');return false}if(data.startDate&&data.endDate&&data.startDate>data.endDate){notice('Крайната дата е преди началната');return false}const item={title:data.title.trim(),text:data.text.trim(),startDate:data.startDate,endDate:data.endDate,published:!!data.published};if(i===null)state.content.news.push(item);else state.content.news[i]=item;return save()})}
function renderSettings(el){const c=state.content;el.innerHTML=`<form id="settings-form" class="panel"><div class="form-settings">${[['restaurantName','Име на ресторанта'],['phoneDisplay','Телефон'],['addressDisplay','Адрес'],['facebookUrl','Facebook'],['instagramUrl','Instagram'],['mapsUrl','Линк към карта']].map(([id,label])=>`<label class="form-field">${label}<input name="${id}" type="${id.endsWith('Url')?'url':id==='phoneDisplay'?'tel':'text'}" value="${e(c[id]||'')}" required></label>`).join('')}</div><div class="toolbar-row"><button type="submit" class="btn primary">Запази настройките</button></div></form><div class="hint">Работно време: всеки ден 10:00–00:00 ч. · Без имейл и без онлайн поръчки. Не сме добавяли оригинално лого, тъй като файлът му още липсва.</div>`;qs('#settings-form').addEventListener('submit',ev=>{ev.preventDefault();const fd=new FormData(ev.target);for(const [k,v] of fd){c[k]=String(v).trim()}for(const k of ['mapsUrl','facebookUrl','instagramUrl']){if(!/^https?:\/\//i.test(c[k])){notice('Линковете трябва да започват с https://');return}}const phone=c.phoneDisplay.replace(/\D/g,'');if(phone.length<9||phone.length>13){notice('Провери телефонния номер');return}c.phoneHref='tel:+359'+(phone.startsWith('0')?phone.slice(1):phone);if(save())notice('Настройките са запазени локално')})}
const PERMS=[['lunch','Обедно меню'],['regular','Постоянно меню'],['gallery','Галерия'],['news','Актуално'],['settings','Настройки']];
function renderStaff(el,tools){tools.innerHTML=btn('+ Примерен служител','staff-add','primary');el.innerHTML=`<div class="hint"><strong>Само проект на права.</strong> Този редактор е публичен HTML файл и няма автентикация. Не въвеждай истински потребителски имена, пароли или лични данни. Настоящите настройки не ограничават достъпа — реалните служебни профили ще се активират едва през PHP.</div><div class="panel"><h2>Главен администратор</h2><p class="mini">Пълен достъп до всички модули. 2FA ще е по избор в истинската система.</p></div>${state.staff.map((u,i)=>`<div class="panel"><div class="section-head"><h2>${e(u.label)}</h2>${btn('Премахни',`staff-delete:${i}`,'danger slim')}</div><p class="mini muted">Демо права: ${PERMS.filter(([id])=>u.permissions[id]).map(x=>x[1]).join(', ')||'няма'}</p>${btn('Промени правата',`staff-edit:${i}`)}</div>`).join('')}`}
function staffModal(i){const s=i===null?{label:'Примерен служител',permissions:{lunch:true}}:state.staff[i];openEditor('Права на служител (демонстрация)',[['label','Наименование на примерен профил','text',s.label,true],...PERMS.map(([id,label])=>['perm_'+id,label,'checkbox',!!s.permissions[id]])],data=>{if(!data.label.trim())return false;const permissions={};PERMS.forEach(([id])=>permissions[id]=!!data['perm_'+id]);const item={label:data.label.trim(),permissions};if(i===null)state.staff.push(item);else state.staff[i]=item;return save()})}
function renderTransfer(el){el.innerHTML=`<div class="split"><section class="panel"><h2>Резервно копие</h2><p class="mini muted">Запазва всички редакции, включително примерните права. JSON може да се импортира по-късно в същия редактор.</p><div class="toolbar-row">${btn('Изтегли JSON архив','export-json','primary')}<label class="btn secondary file-label">Импортирай JSON<input type="file" id="import-json" accept=".json,application/json"></label></div></section><section class="panel"><h2>Файл за сайта</h2><p class="mini muted">Генерира <strong>content.js</strong> за ръчно заместване в GitHub. Това е единственият начин промените да станат видими за всички, докато няма хостинг.</p>${btn('Изтегли content.js','export-site','primary')}<p class="download-help">Нищо не се публикува автоматично. Снимките, добавени през редактора, се вграждат в този файл и може да го направят голям.</p></section></div><section class="panel"><h2>Локален преглед</h2><p class="mini muted">Отваря сайта в режим за преглед с текущите промени. Работи само в същия браузър и на същия адрес (GitHub Pages или локален сървър).</p><a href="index.html?preview=1" target="_blank" rel="noopener" class="btn secondary">Отвори началната ↗</a> <a href="menu.html?preview=1" target="_blank" rel="noopener" class="btn secondary">Отвори менюто ↗</a><div class="danger-zone">${btn('Изчисти всички локални редакции','reset','danger')}</div></section>`;qs('#import-json')?.addEventListener('change',importJson)}
function download(filename,blob){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
function exportJSON(){download('terasata-archive.json',new Blob([JSON.stringify(state,null,2)],{type:'application/json;charset=utf-8'}))}
function exportSite(){// Staff information is intentionally never published with website content.
 const str='/** Терасата — експортирано съдържание от локалния редактор. */\nwindow.TERASATA_CONTENT = '+JSON.stringify(state.content,null,2)+';\n';download('content.js',new Blob([str],{type:'text/javascript;charset=utf-8'}));notice('Файлът content.js е готов за ръчно качване в GitHub')}
async function importJson(event){const f=event.target.files?.[0];if(!f)return;if(f.size>7*1024*1024){notice('Архивът е прекалено голям.');return}try{const obj=JSON.parse(await f.text());if(obj.format!=='terasata-local-v1'||!Array.isArray(obj.content?.categories)||!obj.content?.regularMenu||!Array.isArray(obj.content?.gallery)||!Array.isArray(obj.content?.news)){throw Error('Неподдържан формат')}if(!confirm('Да заменя ли текущите локални редакции с тези от архива?'))return;state={format:'terasata-local-v1',content:obj.content,staff:Array.isArray(obj.staff)?obj.staff:[],savedAt:obj.savedAt||null};if(save()){render();notice('Архивът е зареден')}}catch(err){notice('Невалиден или неподдържан JSON архив')}}
function openEditor(title,fields,handler){editorHandler=handler;qs('#dialog-title').textContent=title;const wrap=qs('#dialog-fields');wrap.innerHTML=fields.map(([name,label,type,value,required,options])=>`<label class="form-field">${e(label)}${type==='textarea'?`<textarea name="${e(name)}" ${required?'required':''}>${e(value)}</textarea>`:type==='select'?`<select name="${e(name)}">${(options||[]).map(o=>`<option ${o===value?'selected':''} value="${e(o)}">${e(o)}</option>`).join('')}</select>`:type==='checkbox'?`<span class="notice-check"><input type="checkbox" name="${e(name)}" ${value?'checked':''}> Да</span>`:`<input type="${e(type)}" name="${e(name)}" value="${e(value)}" ${required?'required':''} maxlength="250">`}</label>`).join('');qs('#edit-dialog').showModal()}
qs('#edit-form').addEventListener('submit',event=>{event.preventDefault();const form=new FormData(event.target);const result={};qsa('#dialog-fields [name]').forEach(node=>{result[node.name]=node.type==='checkbox'?node.checked:form.get(node.name)||''});const ok=editorHandler?.(result);if(ok){qs('#edit-dialog').close();render();notice('Запазено локално')}});
qs('#dialog-close').addEventListener('click',()=>qs('#edit-dialog').close());qs('#dialog-cancel').addEventListener('click',()=>qs('#edit-dialog').close());
qs('#admin-nav').addEventListener('click',ev=>{const b=ev.target.closest('[data-view]');if(b)setView(b.dataset.view)});
qs('#workspace').addEventListener('change',ev=>{if(ev.target.id==='lunch-date'&&ev.target.value){activeDate=ev.target.value;render()}});
qs('#workspace').addEventListener('click',ev=>{const tab=ev.target.closest('[data-cat]');if(tab){activeCategory=tab.dataset.cat;render();return}const filter=ev.target.closest('[data-gallery-filter]');if(filter){galleryFilter=filter.dataset.galleryFilter;render();return}const b=ev.target.closest('[data-action]');if(!b)return;const [act,a1,a2]=b.dataset.action.split(':');const idx=a1==null?null:Number(a1);switch(act){
case'go':setView(a1);break;
case'dish-add':dishModal(null);break;
case'dish-edit':dishModal(idx);break;
case'dish-delete':if(confirm('Сигурен ли си, че искаш да изтриеш ястието?')){state.content.regularMenu[activeCategory].splice(idx,1);save();render()}break;
case'lunch-add-group':openEditor('Нова категория за обедното меню',[['title','Категория','text','',true],['weightNote','Общ грамаж (по желание)','text','']],data=>{if(!data.title.trim())return false;ensureDay().groups.push({title:data.title.trim(),weightNote:data.weightNote.trim(),items:[]});return save()});break;
case'lunch-delete-group':if(confirm('Да изтрия категорията и ястията в нея?')){ensureDay().groups.splice(idx,1);save();render()}break;
case'lunch-add':lunchItemModal(idx,null);break;
case'lunch-edit':lunchItemModal(idx,Number(a2));break;
case'lunch-delete':if(confirm('Изтриване на ястието?')){ensureDay().groups[idx].items.splice(Number(a2),1);save();render()}break;
case'lunch-sold':{const it=ensureDay().groups[idx].items[Number(a2)];it.soldOut=!it.soldOut;save();render();break}
case'lunch-publish':{if(!dateIsWeekday(activeDate)){notice('Обедно меню не се публикува през уикенда.');return}const d=ensureDay();if(!d.published&&!d.groups.some(g=>g.items?.length)){notice('Първо добави поне едно ястие.');return}d.published=!d.published;save();render();notice(d.published?'Менюто е отбелязано като публикувано':'Менюто е чернова');break}
case'lunch-copy':{const keys=Object.keys(state.content.lunchByDate).filter(key=>key<activeDate&&state.content.lunchByDate[key]?.groups?.some(g=>g.items.length)).sort().reverse();if(!keys.length){notice('Няма предишно подготвено меню.');return}if(getDay()?.groups?.some(g=>g.items?.length)&&!confirm('Текущото меню ще бъде заменено. Продължаваме ли?'))return;state.content.lunchByDate[activeDate]=deepcopy(state.content.lunchByDate[keys[0]]);state.content.lunchByDate[activeDate].published=false;save();render();notice('Копирано като чернова');break}
case'fb-view':openFB();break;
case'lunch-footer':lunchPosterModal();break;
case'gallery-edit':galleryModal(idx);break;
case'gallery-up':if(idx>0){[state.content.gallery[idx],state.content.gallery[idx-1]]=[state.content.gallery[idx-1],state.content.gallery[idx]];save();render()}break;
case'gallery-down':if(idx<state.content.gallery.length-1){[state.content.gallery[idx],state.content.gallery[idx+1]]=[state.content.gallery[idx+1],state.content.gallery[idx]];save();render()}break;
case'gallery-delete':if(confirm('Да изтрия тази снимка от локалната галерия?')){state.content.gallery.splice(idx,1);save();render()}break;
case'news-add':newsModal(null);break;
case'news-edit':newsModal(idx);break;
case'news-delete':if(confirm('Да изтрия публикацията?')){state.content.news.splice(idx,1);save();render()}break;
case'staff-add':staffModal(null);break;
case'staff-edit':staffModal(idx);break;
case'staff-delete':if(confirm('Да премахна примерния профил?')){state.staff.splice(idx,1);save();render()}break;
case'export-json':exportJSON();break;
case'export-site':exportSite();break;
case'reset':if(confirm('Това ще изтрие всички локални редакции на това устройство. Изтегли архив предварително!')){localStorage.removeItem(KEY);state=newState();render();notice('Върнати са началните данни')}break;
}});
function openFB(){
 const d=getDay(); if(!d||!d.groups.some(g=>g.items?.length)){notice('Подготви поне едно обедно ястие за тази дата.');return}
 const poster=ensurePosterSettings();
 const W=1240,H=1754,ink='#343042',yellow='#f2cf59',paper='#fcfcfb',softWhite='rgba(252,251,247,.92)';
 const measure=document.createElement('canvas').getContext('2d');
 const BOXES=[
  {type:'col',x:78,y:318,w:472,h:555,textX:98,priceX:520,textW:318,titleX:113,titleW:190},
  {type:'col',x:690,y:318,w:472,h:555,textX:710,priceX:1130,textW:318,titleX:916,titleW:192},
  {type:'wide',x:78,y:896,w:1084,h:500,textX:98,priceX:1130,textW:895,titleX:495,titleW:250}
 ];
 const pageBottomNote='Поръчки за вкъщи до 11:30 ч.';
 function drawArcDots(ctx,cx,cy,r1,r2,count,start,end){ctx.save();ctx.fillStyle='#7a757a';ctx.globalAlpha=.23;for(let ring=0;ring<3;ring++){const r=r1+ring*(r2-r1)/2;const c=count+ring*2;for(let i=0;i<c;i++){const a=start+(end-start)*(i/(c-1));ctx.beginPath();ctx.arc(cx+Math.cos(a)*r,cy+Math.sin(a)*r,3.2-ring*0.2,0,Math.PI*2);ctx.fill()}}ctx.restore()}
 function drawCenterWatermark(ctx){ctx.save();ctx.globalAlpha=.16;ctx.strokeStyle='#7a757a';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(510,778);ctx.lineTo(510,1082);ctx.moveTo(562,756);ctx.lineTo(562,1082);ctx.moveTo(614,740);ctx.lineTo(614,1082);ctx.moveTo(666,756);ctx.lineTo(666,1082);ctx.moveTo(718,778);ctx.lineTo(718,1082);ctx.stroke();ctx.beginPath();ctx.moveTo(486,1085);ctx.quadraticCurveTo(613,1007,741,1085);ctx.stroke();ctx.beginPath();ctx.moveTo(500,780);ctx.quadraticCurveTo(612,664,724,780);ctx.stroke();ctx.restore()}
 function wrap(text,maxWidth,font){measure.font=font;const words=String(text||'').replace(/\s+/g,' ').trim().split(' ').filter(Boolean);const out=[];let line='';for(const w of words){const test=line?line+' '+w:w;if(measure.measureText(test).width<=maxWidth){line=test;continue}if(line)out.push(line);line=w;if(measure.measureText(line).width<=maxWidth)continue;let part='';for(const ch of line){if(part&&measure.measureText(part+ch).width>maxWidth){out.push(part);part=''}part+=ch}line=part}if(line)out.push(line);return out.length?out:['']}
 function titleFor(slotIndex,group){if(slotIndex===0)return group.title||'Салати'; if(slotIndex===1)return group.title||'Супи'; return group.title||'Готвено'}
 function subtitleFor(slotIndex,group){if(group.weightNote)return '/'+String(group.weightNote).replace(/^\/+|\/+$/g,'')+'/'; return slotIndex===0?'/250гр./':slotIndex===1?'/350мл./':'/450гр./'}
 function rowLayout(item,box){const mainFont=box.type==='wide'?'italic 700 28px Arial':'italic 700 26px Arial'; const noteFont='21px Arial'; const nameLines=wrap(item.name,box.textW,mainFont); const note=(item.weight||'').trim(); const noteLines=note?wrap(note,box.textW,noteFont):[]; const sold=item.soldOut?18:0; const height=Math.max(52,nameLines.length*(box.type==='wide'?34:32)+noteLines.length*24+14+sold); return {item,nameLines,noteLines,height,mainFont,noteFont}}
 // build pages with 3 layout boxes per page
 const sourceGroups=d.groups.filter(g=>g.items&&g.items.length).map(g=>({title:g.title,weightNote:g.weightNote,items:deepcopy(g.items),continued:false}));
 const pages=[];
 while(sourceGroups.length){
   const page=[];
   for(let i=0;i<BOXES.length && sourceGroups.length;i++){
     const group=sourceGroups[0], box=BOXES[i], rows=[]; let used=0;
     while(group.items.length){
       const row=rowLayout(group.items[0],box);
       const capacity=box.h-(box.type==='wide'?140:130);
       if(rows.length && used+row.height>capacity) break;
       if(!rows.length && used+row.height>capacity) break;
       rows.push(row); used+=row.height; group.items.shift();
     }
     if(rows.length){page.push({box,slotIndex:i,title:titleFor(i,group),subtitle:subtitleFor(i,group),continued:group.continued,rows});}
     if(!group.items.length) sourceGroups.shift(); else group.continued=true;
   }
   if(!page.length) break;
   pages.push(page);
 }
 const overlay=document.createElement('dialog'); overlay.className='fb-dialog';
 overlay.innerHTML=`<div class="dialog-header"><h2>A4 визуализация · ${e(formatDisplayDate(activeDate))}</h2><button type="button" class="close" aria-label="Затвори">×</button></div><div style="padding:20px"><canvas id="fb-canvas" width="${W}" height="${H}" class="preview-frame"></canvas><div class="toolbar-row"><label class="form-field">Страница <select id="fb-page">${pages.map((_,i)=>`<option value="${i}">${i+1} от ${pages.length}</option>`).join('')}</select></label><button class="btn primary" type="button" id="fb-download">Изтегли PNG</button></div></div>`;
 document.body.appendChild(overlay); const close=()=>{overlay.close();overlay.remove()}; overlay.querySelector('.close').onclick=close; overlay.addEventListener('click',ev=>{if(ev.target===overlay)close()}); overlay.showModal();
 function renderPage(canvas,pageIndex){
   const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,W,H);
   ctx.fillStyle=paper; ctx.fillRect(0,0,W,H);
   ctx.fillStyle=yellow; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(1045,0); ctx.lineTo(740,450); ctx.lineTo(0,1458); ctx.closePath(); ctx.fill();
   ctx.fillStyle='#f4f4f2'; ctx.beginPath(); ctx.moveTo(1048,0); ctx.lineTo(W,0); ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.lineTo(0,1458); ctx.closePath(); ctx.fill();
   // Title box
   ctx.fillStyle=yellow; ctx.fillRect(190,82,856,132); ctx.strokeStyle=ink; ctx.lineWidth=9; ctx.strokeRect(190,82,856,132);
   ctx.fillStyle=ink; ctx.textAlign='center'; ctx.font='bold 82px Arial, sans-serif'; ctx.fillText('Обедно меню',618,172);
   // Vertical separator
   ctx.strokeStyle='#8d8890'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(620,372); ctx.lineTo(620,865); ctx.stroke();
   drawArcDots(ctx,240,690,120,170,18,Math.PI*0.65,Math.PI*1.6);
   drawArcDots(ctx,957,668,116,166,18,-Math.PI*0.65,Math.PI*0.45);
   drawCenterWatermark(ctx);
   const page=pages[pageIndex];
   page.forEach(block=>{
     const {box}=block; const isWide=box.type==='wide';
     const hx=box.titleX, hy=box.y+6, hw=box.titleW, hh=isWide?100:92;
     ctx.fillStyle=softWhite; ctx.fillRect(hx,hy,hw,hh); ctx.strokeStyle=ink; ctx.lineWidth=6; ctx.strokeRect(hx,hy,hw,hh);
     ctx.fillStyle=ink; ctx.textAlign='center'; ctx.font='italic 700 26px Arial'; ctx.fillText(block.title,hx+hw/2,hy+35); ctx.font='italic 700 22px Arial'; ctx.fillText(block.subtitle,hx+hw/2,hy+67);
     let y=box.y+140;
     block.rows.forEach(row=>{
       ctx.fillStyle=ink; ctx.beginPath(); ctx.arc(box.textX-18,y+10,8,0,Math.PI*2); ctx.fill();
       ctx.textAlign='left'; ctx.font=row.mainFont; row.nameLines.forEach((line,i)=>ctx.fillText(line,box.textX,y+16+i*(box.type==='wide'?34:32)));
       let after=y+16+row.nameLines.length*(box.type==='wide'?34:32)-6;
       if(row.noteLines.length){ctx.font=row.noteFont; ctx.fillStyle='#4b4750'; row.noteLines.forEach((line,i)=>ctx.fillText(line,box.textX,after+22+i*24)); after=after+row.noteLines.length*24}
       ctx.fillStyle=ink; ctx.font='italic 700 27px Arial'; ctx.textAlign='right'; ctx.fillText(String(row.item.price||''),box.priceX,y+16);
       if(row.item.soldOut){ctx.textAlign='left'; ctx.font='bold 18px Arial'; ctx.fillStyle='#973737'; ctx.fillText('ИЗЧЕРПАНО',box.textX,y+row.height-2)}
       y+=row.height;
     });
   });
   // slanted brand
   ctx.save(); ctx.translate(318,1505); ctx.rotate(-0.22); ctx.globalAlpha=.32; ctx.fillStyle='#777179'; ctx.textAlign='center'; ctx.font='italic 72px Georgia, serif'; ctx.fillText(poster.slantedBrand,0,0); ctx.restore();
   // footer items - 3 centered lines
   const items=poster.footerItems;
   const l1=`${items[0].label} ${items[0].price}    ${items[1].label} ${items[1].price}`;
   const l2=`${items[2].label} ${items[2].price}    ${items[3].label} ${items[3].price}`;
   const l3=`${items[4].label} ${items[4].price}    ${items[5].label} ${items[5].price}`;
   ctx.fillStyle=ink; ctx.textAlign='center'; ctx.font='italic 700 22px Arial'; ctx.fillText(l1,620,1532); ctx.fillText(l2,620,1566); ctx.fillText(l3,620,1600);
   ctx.font='italic 700 26px Arial'; ctx.fillText(poster.dessertTitle,620,1648); ctx.font='italic 700 30px Arial'; ctx.fillText(poster.dessertText,620,1692);
   if(pages.length>1){ctx.textAlign='right'; ctx.font='18px Arial'; ctx.fillText(`${pageIndex+1}/${pages.length}`,1160,1715)}
 }
 const canvas=overlay.querySelector('#fb-canvas'); renderPage(canvas,0);
 overlay.querySelector('#fb-page').addEventListener('change',ev=>renderPage(canvas,Number(ev.target.value)));
 overlay.querySelector('#fb-download').addEventListener('click',()=>{const i=Number(overlay.querySelector('#fb-page').value); canvas.toBlob(blob=>{if(blob) download(`terasata-obedno-a4-${activeDate}-${i+1}.png`,blob)},'image/png');});
}

setView('dashboard');
})();
