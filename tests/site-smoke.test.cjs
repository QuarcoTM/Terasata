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
 for(const f of ['assets/js/site.js','assets/js/site-preview.js','assets/js/content.js','assets/js/admin.js','assets/js/lunch-poster.js']){
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
