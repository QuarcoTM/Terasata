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
 // Self-contained version of the existing original napkin emblem. Keeping the
 // authentic SVG path inline is essential: printed SVG and PNG export must
 // remain crisp without loading an external image or tainting the canvas.
 const originalMarkPath='M90,35L88,38L90,36L95,37L89,40L91,42L89,43L94,46L98,56L106,66L107,64L109,66L109,71L115,77L115,80L113,79L112,81L113,88L110,91L112,94L110,139L113,212L110,307L111,339L109,339L107,352L99,352L93,356L95,354L98,355L93,359L95,362L105,362L109,365L99,460L96,472L27,474L27,481L241,482L274,480L426,480L426,472L378,472L374,465L374,455L376,453L381,461L383,459L378,446L377,435L375,436L376,426L373,415L374,362L379,360L382,363L399,355L393,353L375,353L374,356L373,353L155,354L132,353L130,351L130,272L132,258L143,236L158,214L174,196L198,176L213,171L231,172L242,182L238,191L231,190L231,183L222,191L231,196L243,195L249,191L249,186L243,178L246,175L263,185L330,210L356,215L361,214L394,219L405,218L412,226L414,243L416,241L416,222L414,216L407,213L384,214L358,211L359,208L378,207L362,206L344,201L342,203L340,200L331,200L324,196L311,194L308,189L305,191L300,186L298,188L296,185L293,186L291,182L290,184L285,183L279,176L281,178L278,179L275,176L277,175L249,158L275,175L273,176L250,164L245,158L224,144L217,135L235,149L216,133L215,135L214,131L211,131L168,84L151,58L147,56L150,58L147,59L148,63L175,99L220,145L211,142L198,134L158,93L140,68L136,66L130,55L124,52L123,54L131,64L131,67L155,95L192,131L190,132L145,98L116,68L113,63L115,62L105,53L106,51L101,46L102,44L94,38L96,37ZM174,362L177,365L178,404L180,399L180,369L183,363L223,363L225,365L233,440L225,459L223,472L173,473L170,469L171,452L180,465L179,456L171,440L169,414L170,369ZM156,363L159,376L158,385L165,419L164,445L158,457L157,471L155,473L113,473L119,366L124,365L119,458L122,459L128,366L137,363ZM292,362L301,424L300,445L295,456L293,470L291,472L242,473L238,467L237,454L241,453L245,463L248,462L239,435L238,367L241,363L244,365L246,396L247,365L249,363ZM359,361L362,365L364,405L368,424L367,447L361,459L360,470L352,472L308,472L306,455L308,453L313,461L315,456L310,442L306,438L308,435L305,415L306,371L304,369L307,368L309,362L315,364L320,361ZM157,356L178,356ZM308,354L306,356L300,355ZM115,93L121,165L126,193L127,346L124,353L120,352L120,267L118,258L119,238L113,105ZM121,83L129,88L128,90L150,112L157,115L159,120L225,165L222,168L213,167L206,169L178,187L160,206L134,245L131,243L131,238L140,220L166,190L159,193L150,203L148,202L147,206L144,206L144,210L141,211L133,226L130,218L129,179L125,160L126,149L124,148L121,110L119,108L118,86Z';
 function originalMark(){
  return '<svg x="360" y="31" width="80" height="94" viewBox="0 0 427 500" aria-hidden="true"><path fill="#302b23" fill-rule="evenodd" d="'+originalMarkPath+'"/></svg>';
 }
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
   +originalMark()
   +'<text x="400" y="201" fill="#272727" font-family="Georgia,serif" font-size="76" font-weight="700" text-anchor="middle">Терасата</text>'
   +'<text x="400" y="248" fill="#2b2927" font-family="Arial,sans-serif" font-size="19" letter-spacing="4" text-anchor="middle">РЕСТОРАНТ · КЮСТЕНДИЛ</text>'
   +'<path d="M290 269h220" fill="none" stroke="#e4b539" stroke-width="5" stroke-linecap="round"/>'
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
