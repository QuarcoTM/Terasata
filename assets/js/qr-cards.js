/* Restaurant "Terasata" QR-card generator. QR matrix uses qrcode-generator (MIT). */
(()=>{'use strict';
 const STORAGE='terasata_qr_links_v1';
 const types={lunch:'Обедно меню',main:'Основно меню'};
 const urls={
  lunch:new URL('obedno-menu/?utm_source=qr&utm_medium=table&utm_campaign=lunch',document.baseURI).href,
  main:new URL('menu/?utm_source=qr&utm_medium=table&utm_campaign=main-menu',document.baseURI).href
 };
 const valid=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&v.length<=900}catch{return false}};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 try{const v=JSON.parse(localStorage.getItem(STORAGE)||'null');if(v)for(const k of Object.keys(types))if(typeof v[k]==='string'&&valid(v[k]))urls[k]=v[k]}catch(_){}
 const dotRing=()=>{let s='';for(let n=0;n<3;n++)for(let k=0;k<26;k++){const angle=-1.17+(k/25)*2.34,y=593+Math.sin(angle)*(260+n*14),x=91-n*13-Math.cos(angle)*12;s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(2+n*.7)+'" fill="#d4ae5a" opacity=".36"/><circle cx="'+(800-x).toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(2+n*.7)+'" fill="#d4ae5a" opacity=".36"/>'}return s};
 function qr(url){
  if(typeof window.qrcode!=='function')throw Error('QR библиотеката не е заредена.');
  const code=window.qrcode(0,'M');code.addData(url,'Byte');code.make();
  const count=code.getModuleCount(),whole=count+8;
  let path='';
  for(let row=0;row<count;row++)for(let col=0;col<count;col++)if(code.isDark(row,col))path+='M'+(col+4)+' '+(row+4)+'h1v1h-1z';
  return '<svg x="112" y="302" width="576" height="576" viewBox="0 0 '+whole+' '+whole+'" shape-rendering="crispEdges"><rect width="'+whole+'" height="'+whole+'" fill="white"/><path fill="#101010" d="'+path+'"/></svg>';
 }
 function decoration(type){
  if(type==='lunch')return '<path d="M0 0H255L0 255zM800 1040v-205L595 1040z" fill="#f2c85c"/>'+dotRing();
  let leaves='<path d="M12 1023Q120 890 295 780" fill="none" stroke="#baa474" stroke-width="3" opacity=".55"/>';
  for(let i=0;i<9;i++){let x=16+i*27,y=1002-i*25;leaves+='<path d="M'+x+' '+y+'q-28 -9 -22 -40q29 3 31 31M'+x+' '+y+'q10 -27 46 -19q-9 34 -37 34" fill="#d8c79c" stroke="#c2ae7f" stroke-width="2" opacity=".5"/>'}
  return '<path d="M0 0H245L0 245z" fill="#efcb78"/>'+leaves+'<path d="M675 1020V868l58 -58 57 58V1020m-109 -97h99m-99 40h99" fill="none" stroke="#c9b99c" stroke-width="3" opacity=".38"/>';
 }
 function svg(type,url){
  if(!types[type]||!valid(url))throw Error('Необходим е валиден https:// адрес.');
  const lunch=type==='lunch',title=esc(types[type]);
  return '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1040" viewBox="0 0 800 1040" role="img" aria-label="Терасата, QR код за '+title+'">'
   +'<rect width="800" height="1040" fill="#fdfaf3"/>'+decoration(type)
   +'<rect x="23" y="23" width="754" height="994" rx="21" fill="none" stroke="#c49b3b" stroke-width="'+(lunch?2:4)+'"/>'
   +'<text x="400" y="172" fill="#272727" font-family="Georgia,serif" font-size="84" font-weight="700" text-anchor="middle">Терасата</text>'
   +'<text x="400" y="234" fill="#2b2927" font-family="Arial,sans-serif" font-size="19" letter-spacing="4" text-anchor="middle">РЕСТОРАНТ · КЮСТЕНДИЛ</text>'
   +'<path d="M290 259h220" fill="none" stroke="#e4b539" stroke-width="5" stroke-linecap="round"/>'
   +'<rect x="103" y="294" width="594" height="594" rx="10" fill="white" stroke="#d7b04b" stroke-width="'+(lunch?8:2)+'"/>'
   +qr(url)
   +'<rect x="161" y="911" width="478" height="86" fill="#f4c957" stroke="#252525" stroke-width="5"/>'
   +'<text x="400" y="970" font-family="Arial,sans-serif" font-size="44" font-weight="800" text-anchor="middle" fill="#222">'+title+'</text></svg>';
 }
 function download(filename,blob){
  const href=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=href;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(href),15000);
 }
 function saveSvg(type){download('terasata-'+type+'-qr.svg',new Blob([svg(type,urls[type])],{type:'image/svg+xml;charset=utf-8'}))}
 function savePng(type){
  const blob=new Blob([svg(type,urls[type])],{type:'image/svg+xml;charset=utf-8'}),u=URL.createObjectURL(blob);
  const image=new Image();
  image.onload=()=>{
   const canvas=document.createElement('canvas');canvas.width=2000;canvas.height=2600;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,2000,2600);URL.revokeObjectURL(u);
   canvas.toBlob(result=>{if(result)download('terasata-'+type+'-qr.png',result);else alert('PNG не може да бъде изтеглен. Използвайте SVG.')},'image/png');
  };
  image.onerror=()=>{URL.revokeObjectURL(u);alert('Неуспешно конвертиране. Използвайте SVG.')};
  image.src=u;
 }
 function print(type,mm){
  const el=document.querySelector('#qr-print-surface');
  if(!el)return;
  const width=[80,100,120].includes(mm)?mm:80;
  el.innerHTML=svg(type,urls[type]);el.style.width=width+'mm';el.style.height=(width*1.3)+'mm';el.hidden=false;
  const done=()=>{el.hidden=true;el.innerHTML='';window.removeEventListener('afterprint',done)};
  window.addEventListener('afterprint',done);
  window.print();
 }
 function item(type){
  const label=types[type];
  return '<article class="qr-panel"><div class="qr-panel-heading"><div><span class="eyebrow">ТАБЕЛКА ЗА МАСАТА</span><h2>'+label+'</h2></div><span class="badge green">QR код</span></div>'
   +'<div class="qr-preview" data-qr-preview="'+type+'">'+svg(type,urls[type])+'</div>'
   +'<div class="qr-link-controls"><label class="form-field">Адрес<input data-qr-input="'+type+'" type="url" class="field-input" value="'+esc(urls[type])+'" spellcheck="false"></label>'
   +'<button type="button" class="btn secondary slim" data-qr-action="apply" data-qr-type="'+type+'">Обнови адреса</button></div>'
   +'<div class="qr-panel-buttons"><label class="form-field">Размер<select data-qr-size="'+type+'" class="field-input"><option value="80">8 × 10,4 см</option><option value="100">10 × 13 см</option><option value="120">12 × 15,6 см</option></select></label>'
   +'<button class="btn primary" type="button" data-qr-action="print" data-qr-type="'+type+'">Принт</button>'
   +'<button class="btn secondary" type="button" data-qr-action="png" data-qr-type="'+type+'">PNG</button>'
   +'<button class="btn secondary" type="button" data-qr-action="svg" data-qr-type="'+type+'">SVG</button></div>'
   +'</article>';
 }
 function mount(container){
  if(!container)return;
  if(typeof window.qrcode!=='function'){container.innerHTML='<p class="empty">QR генераторът не е зареден. Презареди страницата.</p>';return}
  container.innerHTML='<div class="hint"><strong>Два отделни QR кода, готови за печат.</strong> Всеки отваря съответното меню. Адресите сочат към GitHub Pages; при собствен домейн ги обнови тук и разпечатай нови табелки. Линковете се пазят само в този браузър.</div><div class="qr-panels">'+item('lunch')+item('main')+'</div><div class="hint">Препоръка: принтирай по един пробен екземпляр, сканирай и двата кода с телефон и едва тогава постави табелките на масите.</div>';
  container.onclick=event=>{
   const button=event.target.closest('[data-qr-action]');
   if(!button)return;
   const type=button.dataset.qrType,action=button.dataset.qrAction;
   if(!types[type])return;
   if(action==='apply'){
    const input=container.querySelector('[data-qr-input="'+type+'"]'),value=input.value.trim();
    if(!valid(value)){input.setCustomValidity('Въведи валиден https:// адрес');input.reportValidity();return}
    input.setCustomValidity('');urls[type]=value;
    try{localStorage.setItem(STORAGE,JSON.stringify(urls))}catch(_){}
    container.querySelector('[data-qr-preview="'+type+'"]').innerHTML=svg(type,value);
    alert('Адресът е обновен. Отпечатай нов QR код при смяна на домейна.');
   }else if(action==='print')print(type,Number(container.querySelector('[data-qr-size="'+type+'"]').value));
   else if(action==='svg')saveSvg(type);
   else if(action==='png')savePng(type);
  };
  container.oninput=event=>{if(event.target.matches('[data-qr-input]'))event.target.setCustomValidity('')};
 }
 window.TERASATA_QR_CARDS={mount,svg,defaultUrls:{...urls}};
})();
