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
function renderLunch(el,tools){tools.innerHTML=btn('Facebook визия','fb-view')+btn('Добави категория','lunch-add-group','primary');const d=ensureDay(),weekend=!dateIsWeekday(activeDate);el.innerHTML=`<div class="toolbar"><div class="toolbar-left"><label class="form-field">Дата <input id="lunch-date" class="field-input" type="date" value="${e(activeDate)}"></label><span class="badge ${d?.published?'green':'yellow'}">${d?.published?'Публикувано':'Чернова / няма меню'}</span></div><div class="toolbar-right">${btn('Копирай предишното меню','lunch-copy')}${btn(d?.published?'Върни в чернова':'Публикувай','lunch-publish',d?.published?'secondary':'primary')}</div></div>${weekend?'<div class="hint">Събота и неделя няма обедно меню. Публикуването за тези дати е забранено.</div>':''}<div class="hint">Менюто се показва на началната само ако има публикувани ястия за днешната дата и денят е делничен. Поръчки за вкъщи по телефона до 11:30 ч.; ястията са до изчерпване.</div><div class="lunch-sections">${d?d.groups.map((g,gi)=>`<section class="group-panel"><div class="section-head"><div><h3>${e(g.title)}</h3><small class="muted">${e(g.weightNote||'')}</small></div>${btn('Изтрий','lunch-delete-group:'+gi,'danger slim')}</div><div class="rows">${g.items.length?g.items.map((it,ii)=>`<div class="list-row"><div><strong>${e(it.name)}</strong><small>${e(it.weight||'')} ${it.soldOut?' · ИЗЧЕРПАНО':''}</small></div><div class="row-actions"><span class="price">${e(it.price)}</span>${btn(it.soldOut?'Налично':'Изчерпано',`lunch-sold:${gi}:${ii}`,'secondary slim')}${btn('Ред.',`lunch-edit:${gi}:${ii}`,'secondary slim')}${btn('×',`lunch-delete:${gi}:${ii}`,'danger slim')}</div></div>`).join(''):'<div class="empty">Няма добавени ястия.</div>'}</div><div style="margin-top:15px">${btn('+ Добави ястие',`lunch-add:${gi}`,'secondary slim')}</div></section>`).join(''):'<div class="empty">Няма подготвено меню за избраната дата. Добави категория или копирай предишно меню.</div>'}</div>`}
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
 const day=getDay();
 if(!day||!day.groups.some(g=>g.items?.length)){notice('Подготви поне едно обедно ястие за тази дата.');return}
 const W=1240,H=1754,ink='#343042',yellow='#f4cf57',paper='#fcfcfb';
 const measure=document.createElement('canvas').getContext('2d');
 const slots=[
  {kind:'left',x:82,w:468,headY:318,textY:446,textBottom:878,textX:101,priceX:519,textW:306,font:29,line:37,priceFont:28},
  {kind:'right',x:692,w:468,headY:318,textY:446,textBottom:878,textX:712,priceX:1126,textW:306,font:29,line:37,priceFont:28},
  {kind:'wide',x:74,w:1092,headY:894,textY:1025,textBottom:1360,textX:95,priceX:1132,textW:885,font:31,line:39,priceFont:29}
 ];
 const footerLines=[
  'Питка 250гр. 1.45€    Чабата 120гр. 0.97€',
  'Хляб филия 0.15€    Хляб филия препечен 0.15€',
  'Хляб филия пълнозърнест 0.15€    Люта чушка 1бр. 0.15€'
 ];
 const titleFor=(g)=>{const t=String(g.title||'').trim().toLowerCase(); if(t==='салати') return 'Салати'; if(t==='супи') return 'Супи'; return 'Готвено';};
 const weightFor=(g)=>{const t=String(g.title||'').trim().toLowerCase(); if(t==='салати') return '/250гр./'; if(t==='супи') return '/350мл./'; return '/450гр./';};
 const textStyle=(slot)=>`italic 700 ${slot.font}px Arial, sans-serif`;
 function wrap(text,maxWidth,font){
  measure.font=font;
  const words=String(text??'').trim().split(/\s+/).filter(Boolean);
  const lines=[];let line='';
  for(const word of words){
   const candidate=line?`${line} ${word}`:word;
   if(measure.measureText(candidate).width<=maxWidth){line=candidate;continue}
   if(line){lines.push(line);line=''}
   if(measure.measureText(word).width<=maxWidth){line=word;continue}
   let part='';
   for(const ch of word){if(part&&measure.measureText(part+ch).width>maxWidth){lines.push(part);part=''}part+=ch}
   line=part;
  }
  if(line)lines.push(line);
  return lines.length?lines:[''];
 }
 function normalizeName(item){return String(item.name||'').replace(/\s+/g,' ').trim();}
 function normalizeNotes(item){const bits=[]; if(item.weight) bits.push(String(item.weight)); return bits.join(' · ');}
 const rowHeight=(item,slot)=>{const lines=wrap(normalizeName(item),slot.textW,textStyle(slot));const note=normalizeNotes(item);const sub=note?wrap(note,slot.textW,'23px Arial, sans-serif'):[];return {item,lines,sub,height:Math.max(58,lines.length*slot.line+sub.length*26+14+(item.soldOut?21:0))}};
 const groups=day.groups.filter(g=>Array.isArray(g.items)&&g.items.length).map(g=>({title:titleFor(g),weightNote:weightFor(g),items:[...g.items],continuation:false}));
 if(!groups.length){notice('Няма въведени ястия за визуализация.');return}
 const pages=[];
 while(groups.length){
  const placements=[];
  for(let i=0;i<slots.length&&groups.length;i++){
   const slot=slots[i],g=groups[0];
   let used=0;const selected=[];
   while(g.items.length){
    const r=rowHeight(g.items[0],slot);
    if(selected.length&&slot.textY+used+r.height>slot.textBottom)break;
    if(slot.textY+used+r.height>slot.textBottom)break;
    selected.push(r);used+=r.height;g.items.shift();
   }
   if(!selected.length) continue;
   placements.push({slot:i,title:g.title,weightNote:g.weightNote,continued:g.continuation,rows:selected});
   if(!g.items.length)groups.shift();else g.continuation=true;
  }
  if(!placements.length)throw Error('Невъзможно разположение на обедното меню');
  pages.push(placements);
 }
 const dialog=document.createElement('dialog');dialog.className='fb-dialog';
 dialog.innerHTML=`<div class="dialog-header"><h2>A4 визия · ${e(activeDate)}</h2><button type="button" class="close" aria-label="Затвори">×</button></div><div style="padding:20px"><canvas id="fb-canvas" width="${W}" height="${H}" class="preview-frame" aria-label="A4 преглед на обедното меню"></canvas><p class="download-help">Визията следва показания от теб шаблон: A4 формат, долни хлебчета и текстов воден знак. Съдържанието идва от обедното меню в администрацията.</p><div class="toolbar-row"><label class="form-field">Страница <select id="fb-page">${pages.map((_,i)=>`<option value="${i}">${i+1} от ${pages.length}</option>`).join('')}</select></label><button class="btn primary" type="button" id="fb-download">Изтегли PNG</button></div></div>`;
 document.body.appendChild(dialog);
 const close=()=>{dialog.close();dialog.remove()};
 dialog.querySelector('.close').onclick=close;
 dialog.addEventListener('click',ev=>{if(ev.target===dialog)close()});
 dialog.showModal();
 function dottedArc(cx,cy,r,start,end,count,size,ctx){ctx.save();ctx.fillStyle='#73706a';ctx.globalAlpha=.20;for(let n=0;n<count;n++){const a=start+(end-start)*n/(count-1);ctx.beginPath();ctx.arc(cx+Math.cos(a)*r,cy+Math.sin(a)*r,size,0,Math.PI*2);ctx.fill()}ctx.restore()}
 function drawCenterWatermark(ctx){ctx.save();ctx.globalAlpha=.13;ctx.strokeStyle='#66616a';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(503,940);ctx.lineTo(503,1180);ctx.moveTo(554,930);ctx.lineTo(554,1180);ctx.moveTo(605,920);ctx.lineTo(605,1180);ctx.moveTo(656,930);ctx.lineTo(656,1180);ctx.moveTo(707,940);ctx.lineTo(707,1180);ctx.stroke();ctx.beginPath();ctx.moveTo(470,1182);ctx.quadraticCurveTo(603,1110,740,1182);ctx.stroke();ctx.beginPath();ctx.moveTo(500,946);ctx.quadraticCurveTo(603,852,706,946);ctx.stroke();ctx.restore()}
 function drawSheet(canvas,index){
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle=paper;ctx.fillRect(0,0,W,H);
  ctx.fillStyle=yellow;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(1020,0);ctx.lineTo(676,514);ctx.lineTo(0,1452);ctx.closePath();ctx.fill();
  ctx.fillStyle='#f5f4f2';ctx.beginPath();ctx.moveTo(1038,0);ctx.lineTo(W,0);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.lineTo(0,1464);ctx.closePath();ctx.fill();
  ctx.fillStyle='#f5ce56';ctx.fillRect(194,82,852,138);
  ctx.strokeStyle=ink;ctx.lineWidth=11;ctx.strokeRect(194,82,852,138);
  ctx.fillStyle=ink;ctx.textAlign='center';ctx.font='bold 82px Arial, sans-serif';ctx.fillText('Обедно меню',620,178);
  const placements=pages[index];
  if(placements.some(b=>b.slot===0||b.slot===1)){ctx.strokeStyle='#726b71';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(620,375);ctx.lineTo(620,865);ctx.stroke();}
  dottedArc(281,701,185,Math.PI*.53,Math.PI*1.60,25,3.6,ctx); dottedArc(281,701,209,Math.PI*.53,Math.PI*1.60,27,3.4,ctx); dottedArc(281,701,233,Math.PI*.53,Math.PI*1.60,29,3.2,ctx);
  dottedArc(920,670,150,-Math.PI*.72,Math.PI*.50,24,3.6,ctx); dottedArc(920,670,173,-Math.PI*.72,Math.PI*.50,26,3.4,ctx); dottedArc(920,670,196,-Math.PI*.72,Math.PI*.50,28,3.2,ctx);
  drawCenterWatermark(ctx);
  for(const block of placements){
   const slot=slots[block.slot];
   const isWide=slot.kind==='wide';
   const bw=isWide?250:230, bh=isWide?100:92, bx=isWide?495:slot.x+73, titleY=slot.headY;
   ctx.fillStyle='rgba(255,252,246,.78)';ctx.fillRect(bx,titleY,bw,bh);
   ctx.strokeStyle=ink;ctx.lineWidth=6;ctx.strokeRect(bx,titleY,bw,bh);
   ctx.fillStyle=ink;ctx.textAlign='center';ctx.font='italic bold 29px Arial, sans-serif';ctx.fillText(block.title,bx+bw/2,titleY+35);ctx.font='italic 25px Arial, sans-serif';ctx.fillText(block.weightNote,bx+bw/2,titleY+69);
   let y=slot.textY;
   for(const {item,lines,sub,height} of block.rows){
    ctx.fillStyle=ink;ctx.beginPath();ctx.arc(slot.textX-17,y+14,9,0,Math.PI*2);ctx.fill();
    ctx.textAlign='left';ctx.font=textStyle(slot);lines.forEach((line,i)=>ctx.fillText(line,slot.textX,y+20+i*slot.line));
    if(sub.length){ctx.font='23px Arial, sans-serif';ctx.fillStyle='#49454a';sub.forEach((line,i)=>ctx.fillText(line,slot.textX,y+22+lines.length*slot.line+i*26));}
    ctx.font=`italic bold ${slot.priceFont}px Arial, sans-serif`;ctx.fillStyle=ink;ctx.textAlign='right';ctx.fillText(String(item.price||''),slot.priceX,y+22);
    if(item.soldOut){ctx.textAlign='left';ctx.font='bold 20px Arial, sans-serif';ctx.fillStyle='#8f302e';ctx.fillText('ИЗЧЕРПАНО',slot.textX,y+height-4)}
    y+=height;
   }
  }
  ctx.save();ctx.translate(365,1490);ctx.rotate(-.23);ctx.globalAlpha=.28;ctx.fillStyle='#6d676d';ctx.font='italic 76px Georgia, serif';ctx.textAlign='center';ctx.fillText('Ресторант Терасата',0,0);ctx.restore();
  ctx.textAlign='center';ctx.fillStyle='#342f42';ctx.font='italic bold 22px Arial, sans-serif'; let fy=1512; footerLines.forEach((line,i)=>ctx.fillText(line,620,fy+i*34));
  ctx.font='italic bold 24px Arial, sans-serif';ctx.fillText('Десерти:',620,1635); ctx.font='italic bold 30px Arial, sans-serif';ctx.fillText('Попитайте Вашия сервитьор!',620,1677);
  if(pages.length>1){ctx.textAlign='right';ctx.fillStyle='#4b4750';ctx.font='20px Arial, sans-serif';ctx.fillText(`${index+1} / ${pages.length}`,1150,1715)}
 }
 const canvas=dialog.querySelector('canvas');drawSheet(canvas,0);
 dialog.querySelector('#fb-page').addEventListener('change',ev=>drawSheet(canvas,Number(ev.target.value)));
 dialog.querySelector('#fb-download').addEventListener('click',()=>{const i=Number(dialog.querySelector('#fb-page').value); canvas.toBlob(blob=>{if(blob){download(`terasata-obedno-a4-${activeDate}-${i+1}.png`,blob);notice(`Изтеглено изображение ${i+1} от ${pages.length}`)}else notice('Неуспешно генериране на PNG')},'image/png');});
}


setView('dashboard');
})();
