/* Zero-dependency smoke tests for the static Terasata site. Run: node --test tests/site-smoke.test.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const pages=[
 ['Начало','index.html','./'],
 ['Меню','menu/index.html','../'],
 ['Обедно меню','obedno-menu/index.html','../'],
 ['Празненства','praznenstva/index.html','../'],
 ['Галерия','galeria/index.html','../'],
 ['Контакти','kontakti/index.html','../'],
 ['Редактор','admin/index.html','../']
];
const project='https://example.test/Terasata/';

for(const [name,file,base] of pages){
 test(name+': clean route and internal resources',()=>{
  assert(exists(file),file+' is missing');
  const html=read(file);
  assert(html.includes('<base href="'+base+'">'),'Incorrect base URL');
  assert(html.includes('name="viewport"'),'Missing responsive viewport');
  assert(html.includes('charset="utf-8"'),'Missing UTF-8');
  const served=new URL(file.endsWith('/index.html')?file.slice(0,-10):'',project);
  const baseURL=new URL(base,served);
  const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
  for(const ref of refs){
   const url=new URL(ref,baseURL);
   if(url.origin!==new URL(project).origin||!url.pathname.startsWith('/Terasata/'))continue;
   const relative=decodeURIComponent(url.pathname.slice('/Terasata/'.length));
   const item=!relative||relative.endsWith('/')?relative+'index.html':relative;
   assert(exists(item),'Broken link in '+file+': '+ref+' -> '+item);
  }
  for(const ref of refs)assert(!/^(?:[a-z-]+\.html)(?:[?#]|$)/.test(ref),'Old URL remains: '+ref);
 });
 if(file!=='admin/index.html'){
  test(name+': public metadata',()=>{
   const html=read(file);
   assert(/<title>[^<]+<\/title>/.test(html),'Missing title');
   assert(html.includes('name="description"'),'Missing SEO description');
   assert(html.includes('property="og:title"'),'Missing share title');
   assert(html.includes('property="og:description"'),'Missing share description');
   assert((html.match(/<h1(?:\s|>)/g)||[]).length===1,'Expected one H1');
  });
 }
}

test('Public photos are real optimized WebP files',()=>{
 const files=['terrace.webp','main-hall.webp','second-floor.webp','bar.webp','celebration-table.webp'];
 for(const img of files){
  const b=fs.readFileSync(path.join(root,'assets/images',img));
  assert.equal(b.toString('ascii',0,4),'RIFF','Invalid WebP header: '+img);
  assert.equal(b.toString('ascii',8,12),'WEBP','Invalid WebP type: '+img);
  assert(b.length>1000,'Empty image: '+img);
 }
});

test('JavaScript syntax',()=>{
 for(const f of ['assets/js/site.js','assets/js/site-preview.js','assets/js/content.js','assets/js/admin.js','assets/js/lunch-poster.js','assets/js/analytics.js','assets/js/analytics-config.js','assets/js/vendor/qrcode-generator.js','assets/js/qr-cards.js']){
  execFileSync(process.execPath,['--check',path.join(root,f)],{stdio:'pipe'});
 }
});

test('Restaurant structured data matches published contact details',()=>{
 const html=read('index.html');
 const match=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
 assert(match,'Missing restaurant structured data');
 const json=JSON.parse(match[1]);
 assert.equal(json['@type'],'Restaurant');
 assert.equal(json.telephone,'+359892959030');
 assert.equal(json.address.addressLocality,'Кюстендил');
 assert.equal(json.address.addressCountry,'BG');
});

test('Old HTML URLs redirect to clean folders',()=>{
 for(const slug of ['menu','obedno-menu','praznenstva','galeria','kontakti','admin']){
  assert(exists(slug+'.html'),'Missing legacy redirect for '+slug);
  assert(read(slug+'.html').includes('location.replace('),'Redirect is missing for '+slug);
 }
});

test('Local preview does not publish private drafts',()=>{
 const preview=read('assets/js/site-preview.js');
 assert(preview.includes("params.get('preview')!=='1'"),'Preview must be opt-in');
 assert(preview.includes('TERASATA_PREVIEW_ACTIVE=true'),'Local draft flag missing');
 assert(read('admin/index.html').includes('noindex,nofollow'),'Editor must remain unindexed');
});

test('Lunch menu is date-gated for Sofia and not shown on weekends',()=>{
 const script=read('assets/js/site.js');
 assert(script.includes("timeZone:'Europe/Sofia'"),'Local timezone missing');
 assert(script.includes("['Sat','Sun']"),'Weekend hiding missing');
 assert(script.includes('dayData.published === true'),'Public approval guard missing');
});

test('Image and style paths use structured asset folders',()=>{
 assert(read('assets/css/styles.css').includes('../images/leaf-ornament.svg'),'Missing ornamental asset');
 assert(read('assets/js/site.js').includes('assets/images/'),'Missing gallery image path mapping');
});

test('Admin menu is initially hidden and lunch is the primary section',()=>{
 const html=read('admin/index.html');
 const js=read('assets/js/admin.js');
 const css=read('assets/css/admin.css');
 assert.match(html,/id="admin-nav"[^>]*hidden/,'Navigation should be hidden at startup');
 assert(html.indexOf('data-view="lunch"')<html.indexOf('data-view="dashboard"'),'Lunch should precede dashboard');
 assert(html.includes('id="admin-menu-toggle"')&&html.includes('aria-expanded="false"'));
 assert(html.includes('id="admin-menu-backdrop"'));
 assert(js.includes("let state=newState(),view='lunch'"),'Lunch not the initial view');
 assert(js.includes("sessionStorage.getItem(UI_KEY)"),'Last section is not remembered');
 assert(js.includes("sessionStorage.setItem(UI_KEY"),'Active section is not saved');
 assert(js.includes('setView(startView,true)'),'Last view is not restored');
 assert(js.includes("restoredNav.scrollY"),'Scroll position is not restored');
 assert(js.includes("if(event.key==='Escape'"),'Escape keyboard closing missing');
 assert(css.includes('.admin-menu-popover[hidden]'),'Hidden nav CSS missing');
});

test('View-specific commands are grouped in an accessible actions menu',()=>{
 const script=read('assets/js/admin.js');
 const css=read('assets/css/admin.css');
 assert(script.includes('function wrapViewActions(tools)'),'Missing action menu renderer');
 assert(script.includes('while(tools.firstChild)options.appendChild(tools.firstChild)'),'Buttons should be moved without losing listeners');
 assert(script.includes("details.className='admin-actions-menu'"),'Missing dropdown details');
 assert(script.includes("summary.setAttribute('aria-label'"),'Missing accessible label');
 assert(css.includes('.admin-actions-options'),'Actions menu style missing');
 assert(css.includes('.admin-actions-trigger'),'Actions button style missing');
});

test('SEO canonical and social image match the six public routes',()=>{
 const expected=['','menu/','obedno-menu/','praznenstva/','galeria/','kontakti/'];
 const rootUrl='https://quarcotm.github.io/Terasata/';
 for(const slug of expected){
  const html=read(slug+'index.html');
  assert(html.includes('rel="canonical" href="'+rootUrl+slug+'"'),slug+' wrong canonical');
  assert(html.includes('property="og:url" content="'+rootUrl+slug+'"'),slug+' wrong og:url');
  assert(html.includes('property="og:image" content="'+rootUrl+'assets/images/terrace.webp"'),slug+' wrong og:image');
  assert(html.includes('assets/js/analytics.js?v=1'),slug+' analytics script omitted');
 }
 const sitemap=read('sitemap.xml');
 for(const slug of expected)assert(sitemap.includes('<loc>'+rootUrl+slug+'</loc>'),'Missing sitemap route '+slug);
 assert(!sitemap.includes('/admin/'),'Do not index admin');
 assert(read('robots.txt').includes('Sitemap: '+rootUrl+'sitemap.xml'));
});
test('Analytics is disabled until configured and admin sessions are excluded',()=>{
 const config=read('assets/js/analytics-config.js');
 const collector=read('assets/js/analytics.js');
 const admin=read('admin/index.html');
 const script=read('assets/js/admin.js');
 assert(config.includes("websiteId:''"),'Statistics must not transmit without an ID');
 assert(collector.includes('if(!active || !page || preview'),'Preview tracking must be excluded');
 assert(collector.includes("params.get('utm_source')==='qr'"),'QR events are missing');
 for(const ev of ['qr_menu_open','phone_click','directions_click','menu_click'])assert(collector.includes(ev),'Missing event '+ev);
 assert(admin.includes('data-view="stats"'),'Statistics admin section missing');
 assert(script.includes('function renderStats(el,tools)'));
 assert(script.includes('Статистиката не е активирана'));
});

test('Print-ready QR cards are available with two distinct real codes',()=>{
 const admin=read('admin/index.html'),script=read('assets/js/admin.js'),qr=read('assets/js/qr-cards.js');
 const css=read('assets/css/admin.css');
 assert(admin.includes('data-view="qr"'),'QR section missing');
 assert(admin.includes('assets/js/vendor/qrcode-generator.js?v=1'),'Bundled QR generator missing');
 assert(admin.includes('assets/js/qr-cards.js?v=1'),'QR card module missing');
 assert(admin.includes('id="qr-print-surface"'),'Print surface missing');
 assert(script.includes('function renderQrCards(el)'),'Admin routing missing');
 for(const text of ['Обедно меню','Основно меню','utm_campaign=lunch','utm_campaign=main-menu','window.print()','savePng(type)','saveSvg(type)','getModuleCount()','isDark(row,col)'])
  assert(qr.includes(text),'Missing QR capability '+text);
 assert(css.includes('@media print'),'Print CSS missing');
});
test('Both URLs are independently encoded into high-contrast QR matrices',()=>{
 const vm=require('node:vm');
 const context={document:{baseURI:'https://quarcotm.github.io/Terasata/'},localStorage:{getItem:()=>null},URL,console};
 context.window=context; // Browser globals and window point to the same object.
 vm.createContext(context);
 vm.runInContext(read('assets/js/vendor/qrcode-generator.js'),context);
 vm.runInContext(read('assets/js/qr-cards.js'),context);
 const qr=context.window.TERASATA_QR_CARDS;
 const lunch=qr.svg('lunch',qr.defaultUrls.lunch);
 const main=qr.svg('main',qr.defaultUrls.main);
 assert(qr.defaultUrls.lunch.startsWith('https://quarcotm.github.io/Terasata/obedno-menu/?'));
 assert(qr.defaultUrls.main.startsWith('https://quarcotm.github.io/Terasata/menu/?'));
 assert(lunch.includes('Обедно меню')&&main.includes('Основно меню'));
 assert(lunch.includes('shape-rendering="crispEdges"')&&main.includes('shape-rendering="crispEdges"'));
 assert(lunch.includes('fill="#101010"')&&main.includes('fill="#101010"'));
 const lunchModules=lunch.match(/<path fill="#101010" d="([^"]+)"/)[1];
 const mainModules=main.match(/<path fill="#101010" d="([^"]+)"/)[1];
 assert(lunchModules.length>3000&&mainModules.length>3000,'QR matrices must have encoded modules');
 assert.notEqual(lunchModules,mainModules,'Different menu URLs must generate different QR matrices');
});


test('Seasonal menu is an optional tab within the permanent menu',()=>{
 const content=read('assets/js/content.js');
 const frontend=read('assets/js/site.js');
 const admin=read('assets/js/admin.js');
 const html=read('menu/index.html');
 assert(content.includes("seasonalMenu: {enabled:false,title:'Сезонно меню',description:'',items:[]}"),'Must start hidden and empty');
 assert(frontend.includes("const showSeasonal=itemsSeasonal.length>0 && (seasonal.enabled===true || preview)"),'Guest must only see enabled seasonal with dishes');
 assert(frontend.includes("id:'seasonal'"),'Seasonal tab must be on permanent menu');
 assert(frontend.includes("nextParams.set('cat',catId)"),'Menu tab selection must preserve other params');
 assert(admin.includes('function renderSeasonal(el,tools,cats)'));
 assert(admin.includes('function seasonalDishModal(idx)'));
 assert(admin.includes('function seasonalDetailsModal()'));
 assert(admin.includes("case'season-toggle'"));
 assert(admin.includes('if(!s.enabled&&!s.items.length)'), 'Publishing an empty seasonal menu must be rejected');
 assert(/assets\/js\/site\.js\?v=[\w.-]+/.test(html),'Frontend script missing');
 assert(!exists('seasonal/index.html'),'Do not create a third menu or require new QR code');
 const seed=JSON.parse(read('backend/seed/content.json'));
 assert.deepEqual(seed.seasonalMenu,{enabled:false,title:'Сезонно меню',description:'',items:[]});
 assert.equal(seed.categories.reduce((n,c)=>n+(seed.regularMenu[c.id]||[]).length,0),68,'Original 40 plus 28 new dishes must remain');
});
test('Seasonal menu visitor-visibility decision',()=>{
 const code=read('assets/js/site.js');
 const decision=code.match(/const showSeasonal=([^;]+);/);
 assert(decision,'Seasonal visibility logic missing');
 const result=new Function('itemsSeasonal','seasonal','preview','return ('+decision[1]+');');
 const sample=[{name:'Тест',price:'5,00 €'}];
 assert.equal(result([], {enabled:true},false),false,'Never show empty');
 assert.equal(result(sample,{enabled:false},false),false,'Hide disabled on public page');
 assert.equal(result(sample,{enabled:true},false),true,'Show enabled on public page');
 assert.equal(result(sample,{enabled:false},true),true,'Draft is previewable only in local preview');
});


test('Desktop-only five visual fixes retain mobile fallback icons and old pages',()=>{
 const home=read('index.html');
 const css=read('assets/css/styles.css');
 const js=read('assets/js/site.js');
 const guard=css.indexOf('/* Desktop-only refinement. Existing phone and tablet rules are untouched. */');
 assert(guard>0,'Desktop-only styles absent');
 const suffix=css.slice(guard,css.indexOf('/* Readable Cyrillic typography on desktop and legacy Windows monitors.',guard));
 assert(suffix.includes('@media (min-width:1050px)'),'Desktop breakpoint absent');
 assert(!suffix.includes('@media (max-width:'),'Desktop patch must not change phone rules');
 assert(suffix.includes('.events-split {width:min(calc(100% - 112px),1360px)'),'Event photo not inset');
 assert(suffix.includes('.hero-shade {background:linear-gradient('),'Hero contrast unchanged');
 assert(suffix.includes('.category-tile .category-arrow::before'),'Missing reliable category arrows');
 assert(suffix.includes('.hero-actions .btn > span[aria-hidden="true"]::before'),'Missing reliable button arrows');
 for(const glyph of ['⌖','✆','◷']){
  assert(js.includes('footer-icon-fallback">'+glyph+'</span>'),'Mobile fallback glyph missing: '+glyph);
 }
 assert(js.includes('footer-desktop-icon'),'SVG footer icon missing');
 assert(js.includes('<circle cx="12" cy="12" r="9"/>'),'SVG clock drawing missing');
 assert(js.includes('>Facebook</span>')&&js.includes('>Instagram</span>'),'Social links missing their labels');
 assert(/styles\.css\?v=20261027-centered-watermark-v1/.test(home));
 for(const route of ['','menu/','obedno-menu/','praznenstva/','galeria/','kontakti/']){
  const html=read(route+'index.html');
  assert(/styles\.css\?v=20261027-centered-watermark-v1/.test(html),'CSS cache not updated for '+route);
  assert(/site\.js\?v=20261027-centered-watermark-v1/.test(html),'JS cache not updated for '+route);
 }
});


test('Desktop Cyrillic readability is consistent across every public page, without mobile edits',()=>{
 const css=read('assets/css/styles.css');
 const start=css.indexOf('/* Readable Cyrillic typography on desktop and legacy Windows monitors.');
 assert(start>=0,'Readable desktop typography block is missing');
 const patch=css.slice(start,css.indexOf('/* Complete paper menu: exactly two horizontally scrollable category rows. */',start));
 assert(patch.includes('@media (min-width:1050px), (min-width:800px) and (hover:hover) and (pointer:fine)'),'Desktop-only breakpoint and old-screen fallback missing');
 assert(!patch.includes('@media (max-width:'),'Do not modify existing phone media rules');
 for(const selector of ['.hero h1','.hero-copy p','.page-intro h1','.category-tile .tile-name','.dish-item h3','.footer-brand .brand-subtitle','.footer-col .footer-map-link','.footer-social a','.events-copy p','.space-card h3','.gallery-item span','.detail-block p']){
  assert(patch.includes(selector),'Missing readability coverage: '+selector);
 }
 assert(patch.includes('Arial, Tahoma'),'Bulgarian Cyrillic should use Windows-safe font fallback');
 for(const slug of ['','menu/','obedno-menu/','praznenstva/','galeria/','kontakti/'])
  assert(/styles\.css\?v=20261027-centered-watermark-v1/.test(read(slug+'index.html')),'Old CSS cache on '+slug);
});

test('Printed menu adds 9 salads and 4 new categories with 28 dishes',()=>{
 const seed=JSON.parse(read('backend/seed/content.json'));
 assert.equal(seed.categories.length,12);
 for(const [id,n] of [['salati',9],['sandvichi',4],['garnituri',6],['hlyab',3],['deserti',6]]){
  assert.equal(seed.regularMenu[id].length,n,id);
  assert(seed.regularMenu[id].every(x=>x.price.endsWith(' €')),'Missing euro price in '+id);
 }
 assert.equal(seed.regularMenu.kartofi[3].weight,'300 г','Original menu preserved');
 assert.equal(seed.regularMenu.garnituri[0].weight,'150 г','Side portion differs from regular potatoes');
 const values=require('node:vm');const ctx={window:{}};values.runInNewContext(read('assets/js/content.js'),ctx);
 assert.equal(ctx.window.TERASATA_CONTENT.categories.length,12,'Static content matches seed');
 assert.equal(ctx.window.TERASATA_CONTENT.regularMenu.salati.length,9);
});

test('Napkin emblem, two-row swipe categories and mobile social icons',()=>{
 const svg=read('assets/images/terasata-mark-original.svg');
 const js=read('assets/js/site.js'),css=read('assets/css/styles.css');
 assert(svg.includes('viewBox="0 0 427 500"'),'Original source silhouette missing');
 assert(!js.includes('class="brand-mark"'),'Remove the top-left header logo');
 assert(js.includes('class="footer-brand-mark"'),'Keep footer identity');
 const home=read('index.html');
 assert(home.includes('class="hero-watermark"'),'Original emblem must be in the hero');
 assert(home.includes('src="assets/images/terasata-mark-original.svg"'),'Watermark must use the existing emblem');
 assert(css.includes('.hero-watermark {'),'Centered watermark styling missing');
 for(const c of ['sandvichi','garnituri','hlyab','deserti'])assert(js.includes("'"+c+"':"),'Missing homepage category icon');
 assert(css.includes('grid-template-rows:repeat(2,minmax(78px,auto))'));
 assert(css.includes('grid-auto-flow:column'));
 assert(css.includes('.menu-anchor-nav {'));
 assert(css.includes('.footer-social .footer-desktop-icon {display:block'),'Mobile social icons must be visible');
 for(const slug of ['','menu/','obedno-menu/','praznenstva/','galeria/','kontakti/']){
  const html=read(slug+'index.html');
  assert(/styles\.css\?v=20261027-centered-watermark-v1/.test(html));
  assert(/site\.js\?v=20261027-centered-watermark-v1/.test(html));
 }
});


test('Gold and parchment scrollbars use native scrolling across site and admin',()=>{
 const publicCss=read('assets/css/styles.css'),adminCss=read('assets/css/admin.css');
 const publicMark=publicCss.indexOf('/* Restaurant-themed scrollbars: warm parchment track, gold thumb.');
 const adminMark=adminCss.indexOf('/* Same brand-colored scrollbars in the admin, without changing scrolling logic.');
 assert(publicMark>0&&adminMark>0,'Scrollbar style blocks missing');
 const pub=publicCss.slice(publicMark),adm=adminCss.slice(adminMark);
 for(const style of [pub,adm]){
   assert(style.includes('scrollbar-color: #a7843c #f3ede1;'),'Missing branded scrollbar colors');
   assert(style.includes('::-webkit-scrollbar-thumb'),'WebKit/Chromium thumb missing');
   assert(style.includes('border-radius: 999px;'),'Scrollbar should have rounded corners');
   assert(style.includes('background: #765820;'),'Scrollbar hover color missing');
 }
 for(const route of ['','menu/','obedno-menu/','praznenstva/','galeria/','kontakti/']){
   assert(/styles\.css\?v=20261027-centered-watermark-v1/.test(read(route+'index.html')),'Missing public CSS cache refresh '+route);
 }
 assert(read('admin/index.html').includes('admin.css?v=20261027-lunch-alg-v1'),'Missing admin CSS cache refresh');
 assert(pub.includes('.category-grid, .menu-anchor-nav'),'Category scrolling should retain gold thumb');
 assert(!pub.includes('overflow: hidden'),'Scrollbar theme must not hide the native scrollbars');
});

test('Sushi is a dedicated empty category without invented products or prices',()=>{
 const seed=JSON.parse(read('backend/seed/content.json'));
 const content=read('assets/js/content.js');
 const site=read('assets/js/site.js');
 const admin=read('assets/js/admin.js');
 const i=seed.categories.findIndex(c=>c.id==='sushi');
 assert(i>0 && seed.categories[i-1].id==='riba-i-morski-darove','Sushi category should follow fish');
 assert.equal(seed.categories[i].name,'Суши');
 assert.deepEqual(seed.regularMenu.sushi,[],'Do not invent sushi items');
 assert.equal(seed.categories.reduce((n,c)=>n+(seed.regularMenu[c.id]||[]).length,0),68,'Keep original 68 dishes');
 assert(content.includes("{ id: 'sushi', name: 'Суши' }"));
 assert(content.includes('"sushi": []'));
 assert(site.includes("'sushi':"),'Homepage icon needed');
 assert(admin.includes('function ensureSushiCategory(content)'),'Older local drafts must gain the new category');
 assert(admin.includes("localStorage.setItem(KEY,JSON.stringify(state))"),'Existing drafts should persist category migration');
 const vm=require('node:vm'),context={window:{}};
 vm.runInNewContext(content,context);
 assert.deepEqual(Array.from(context.window.TERASATA_CONTENT.regularMenu.sushi),[]);
});

test('One Sushi evening per week is an opt-in announcement, not an everyday category',()=>{
 const seed=JSON.parse(read('backend/seed/content.json'));
 assert.deepEqual(seed.sushiNight,{enabled:true,weekday:6,startTime:'18:00',endTime:'23:00',demo:true});
 assert.equal(seed.categories.length,12);
 assert.equal(seed.categories.reduce((n,c)=>n+(seed.regularMenu[c.id]||[]).length,0),68);
 const site=read('assets/js/site.js');
 const raw=site.match(/const sushiReady=([^;]+);/);
 assert(raw,'Sushi public visibility condition missing');
 const visible=new Function('sushi','sushiClock','return ('+raw[1]+');');
 const valid=t=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t);
 const config={enabled:true,weekday:5,startTime:'18:00',endTime:'22:00'};
 assert.equal(visible(config,valid),true);
 assert.equal(visible({...config,enabled:false},valid),false);
 assert.equal(visible({...config,weekday:null},valid),false);
 assert.equal(visible({...config,startTime:''},valid),false);
 assert.equal(visible({...config,endTime:'18:00'},valid),false);
 assert(site.includes("publicCategories=d.categories.filter(c=>c.id!=='sushi'||sushiReady||previewActive)"));
 assert(site.includes("name:'Суши'"));
 assert(site.includes('const sushiWhen='),'Weekly schedule must remain visible');
 const admin=read('assets/js/admin.js');
 assert(admin.includes("activeCategory==='sushi'?sushiSchedulePanel()"));
 assert(admin.includes('function sushiScheduleModal()'));
 assert(admin.includes("case'sushi-toggle'"));
 assert(admin.includes("if(!s.enabled&&!sushiConfigured(s))"));
});

test('Sushi Saturday example is immediately visible, honestly labelled and editable',()=>{
 const content=read('assets/js/content.js'),seed=JSON.parse(read('backend/seed/content.json'));
 assert(content.includes("sushiNight: {enabled:true,weekday:6,startTime:'18:00',endTime:'23:00',demo:true}"));
 assert.equal(seed.sushiNight.demo,true);
 const site=read('assets/js/site.js');
 assert(site.includes('Примерен график за представяне, не е потвърден от ресторанта.'));
 assert(site.includes("const sushiDemo=sushi.demo===true;"));
 assert(site.includes('Видовете суши и цените ще бъдат добавени'));
 const admin=read('assets/js/admin.js');
 assert(admin.includes('demo:true};changed=true'),'Existing local drafts should get the sample schedule');
 assert(admin.includes('s.demo=false;'),'Saving confirmed schedule must clear demonstration label');
 assert(admin.includes('ДЕМО ГРАФИК'));
 assert.equal(seed.categories.length,12);
 assert.deepEqual(seed.regularMenu.sushi,[]);
 assert.equal(seed.categories.reduce((n,c)=>n+(seed.regularMenu[c.id]||[]).length,0),68);
});

test('Saturday demo shows a grammatically correct schedule directly on homepage',()=>{
 const site=read('assets/js/site.js');
 assert(site.includes("const sushiPrefix=[3,6,7].includes(sushi.weekday)?'Всяка ':'Всеки ';"));
 assert(site.includes('sushi-tile-date'),'Visitors should see example times without opening permanent menu');
 assert(read('assets/css/styles.css').includes('.category-tile .sushi-tile-date'));
});


test('Sushi has short public and admin label without changing weekly demo schedule',()=>{
 const frontend=read('assets/js/site.js'),admin=read('assets/js/admin.js');
 const data=JSON.parse(read('backend/seed/content.json'));
 assert(frontend.includes("name:'Суши'"));
 assert(frontend.includes('<strong>Суши</strong>'));
 assert(!frontend.includes('Суши вечер'));
 assert(admin.includes('<h2>Суши</h2>'));
 assert(!admin.includes('Суши вечер'));
 assert.deepEqual(data.sushiNight,{enabled:true,weekday:6,startTime:'18:00',endTime:'23:00',demo:true});
 assert.deepEqual(data.regularMenu.sushi,[]);
 for(const p of ['','menu/','obedno-menu/','praznenstva/','galeria/','kontakti/']){
  assert(/site\.js\?v=20261027-centered-watermark-v1/.test(read(p+'index.html')),p+' old public script cache');
 }
 assert(read('admin/index.html').includes('admin.js?v=20261027-lunch-alg-v1'),'Admin script cache not updated');
});


test('Lunch numbered allergens accept only explicit 1-14 values',()=>{
 const vm=require('node:vm'),ctx={window:{}};
 vm.runInNewContext(read('assets/js/allergens.js'),ctx);
 const a=ctx.window.TERASATA_ALLERGENS;
 assert.equal(a.labels.length,14);
 assert.equal(a.legendText([1,3,7]),'1 – Глутен · 3 – Яйца · 7 – Мляко');
 assert.equal(JSON.stringify(a.codes(['7',1,7,'3'])),'[1,3,7]');
 assert.equal(JSON.stringify(a.parseInput('1,3,7').codes),'[1,3,7]');
 assert.equal(a.parseInput('1,15').valid,false);
 assert.equal(a.parseInput('мляко').valid,false);
 assert.equal(a.parseInput('').valid,true);
});
test('Lunch logo and little allergen numbers are in public menus, A4 poster and editor',()=>{
 const site=read('assets/js/site.js'),admin=read('assets/js/admin.js'),poster=read('assets/js/lunch-poster.js');
 for(const page of ['index.html','obedno-menu/index.html']){
  const html=read(page);
  assert(html.includes('assets/js/allergens.js?v=20261027-alg-v1'));
  assert(html.includes('assets/images/terasata-mark-original.svg'));
 }
 const adminPage=read('admin/index.html');
 assert(adminPage.includes('assets/js/allergens.js?v=20261027-alg-v1'));
 assert(adminPage.includes('assets/js/lunch-poster.js?v=20261027-lunch-alg-v1'));
 assert(site.includes('lunch-allergen-sup')&&site.includes('lunch-allergen-legend'));
 assert(admin.includes('allergens:parsed.codes'));
 assert(admin.includes('Алергени — номера 1–14'));
 assert(poster.includes("assets/images/terasata-mark-original.svg"));
 assert(poster.includes('ctx.drawImage(logoImage'));
 assert(poster.includes("const superscript=allergenNumbers.join(',')"));
 assert(poster.includes('measureLastLineWidth'));
 assert(poster.includes('ALLERGENS.legendText(used)'));
 assert(poster.includes('exportButton.disabled=true'));
 assert(exists('assets/images/terasata-mark-original.svg'));
});

test('Home hero shows one centered watermark without repeating the header name',()=>{
 const html=read('index.html');
 const js=read('assets/js/site.js');
 const css=read('assets/css/styles.css');
 assert.equal((html.match(/class="hero-watermark"/g)||[]).length,1,'Expected exactly one hero watermark');
 assert(js.includes('class="brand-phone"'),'Keep mobile telephone link');
 assert(!js.includes('class="brand-home"'),'Header brand must be removed');
 assert(!js.includes('class="brand-mark"'),'Header emblem must be removed');
 const start=css.indexOf('.hero-watermark {');
 assert(start>=0,'Watermark styles missing');
 const rule=css.slice(start,css.indexOf('}',start));
 for(const value of ['top:50%','left:50%','opacity:.25','pointer-events:none'])
  assert(rule.includes(value),'Watermark must remain centered and noninteractive: '+value);
 assert(html.includes('class="hero-photo" src="assets/images/terrace.webp"'),'Actual restaurant photograph must be preserved');
});
