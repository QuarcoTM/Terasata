/* Local draft preview: no server publishing. */
(()=>{'use strict';
const params=new URLSearchParams(location.search);
if(params.get('preview')!=='1')return;
try{
 const data=JSON.parse(localStorage.getItem('terasata_editor_v1')||'null');
 if(data?.format==='terasata-local-v1'&&data.content?.categories?.length&&Array.isArray(data.content.gallery)){
  window.TERASATA_CONTENT=data.content;window.TERASATA_PREVIEW_ACTIVE=true;
 }
}catch(_){/* fall back to public content */}
document.addEventListener('DOMContentLoaded',()=>{
 const strip=document.createElement('div');strip.setAttribute('role','status');
 strip.style.cssText='position:relative;z-index:1000;background:#e9d5a3;color:#5e461f;font:700 12px/1.5 system-ui;text-align:center;padding:9px 13px';
 const date=params.get('lunch_date');
 const selected=/^\d{4}-\d{2}-\d{2}$/.test(date||'')?date.split('-').reverse().join('.'):null;
 strip.textContent=window.TERASATA_PREVIEW_ACTIVE?'ЛОКАЛЕН ПРЕГЛЕД · '+(selected?'Меню за '+selected+' · ':'')+'Виждаш своите чернови, не публичната версия.':'ЛОКАЛЕН ПРЕГЛЕД · На това устройство няма запазени чернови.';
 const back=document.createElement('a');back.href='admin/';back.textContent='Към редактора ↗';back.style.cssText='text-decoration:underline;margin-left:12px';strip.append(back);document.body.prepend(strip);
 const base=new URL(document.baseURI),routes=new Set(['','menu/','obedno-menu/','praznenstva/','galeria/','kontakti/']);
 document.querySelectorAll('a[href]').forEach(a=>{
  const u=new URL(a.href,location.href);
  if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname))return;
  const relative=u.pathname.slice(base.pathname.length);
  if(!routes.has(relative))return;
  u.searchParams.set('preview','1');
  if(selected&&(relative===''||relative==='obedno-menu/'))u.searchParams.set('lunch_date',date);
  a.href=u.href;
 });
});
})();
