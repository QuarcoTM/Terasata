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
 const context={window:{},document:{baseURI:'https://quarcotm.github.io/Terasata/'},localStorage:{getItem:()=>null},URL,console};
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
 assert(lunch.length>15000&&main.length>15000&&lunch!==main,'QR patterns must be distinct');
});
