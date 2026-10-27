/* Social-ready lunch menu images: independent from the approved A4 generator. */
(()=>{'use strict';
 const YELLOW='#f8d35e',WHITE='#faf9f7',INK='#272923';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const euro=value=>{const n=String(value??'').trim().replace(/\s*€/g,'').trim();return n?n+' €':'';};
 const dateBG=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').reverse().join('.'):String(value||'');
 const SETTINGS={
  post:{width:1080,height:1350,contentTop:330,contentBottom:1170,titleTop:66,titleBaseline:162,dateY:270},
  story:{width:1080,height:1920,contentTop:430,contentBottom:1710,titleTop:140,titleBaseline:236,dateY:347}
 };
 function wrap(ctx,text,maxWidth,font){
  ctx.font=font;
  const words=String(text??'').trim().split(/\s+/).filter(Boolean),lines=[];
  let part='';
  for(const word of words){
   const trial=part?part+' '+word:word;
   if(ctx.measureText(trial).width<=maxWidth){part=trial;continue;}
   if(part){lines.push(part);part='';}
   if(ctx.measureText(word).width<=maxWidth){part=word;continue;}
   let piece='';
   for(const character of word){
    if(piece&&ctx.measureText(piece+character).width>maxWidth){lines.push(piece);piece='';}
    piece+=character;
   }
   part=piece;
  }
  if(part)lines.push(part);
  return lines.length?lines:[''];
 }
 function pagesFor(day,kind){
  const config=SETTINGS[kind],scratch=document.createElement('canvas').getContext('2d');
  if(!config||!scratch)throw Error('Неуспешно генериране на изображението.');
  const groups=(day?.groups||[]).filter(g=>Array.isArray(g.items)&&g.items.some(x=>String(x.name||'').trim()&&String(x.price||'').trim()));
  const pages=[];let page=[],cursor=config.contentTop,itemsOnPage=0;
  function finish(){if(itemsOnPage){pages.push(page);page=[];cursor=config.contentTop;itemsOnPage=0;}}
  for(const group of groups){
   const name=String(group.title||'Други').trim();
   for(const item of group.items){
    if(!String(item.name||'').trim()||!String(item.price||'').trim())continue;
    const lines=wrap(scratch,item.name,695,'600 32px Arial, sans-serif');
    const note=String(item.weight||'').trim();
    const row={lines,note,price:euro(item.price),soldOut:!!item.soldOut,
      height:Math.max(69,lines.length*43+(note||item.soldOut?25:0)+17)};
    let last=page[page.length-1],isNew=!last||last.title!==name;
    const required=row.height+(isNew?84:0);
    if(cursor+required>config.contentBottom){
     if(!itemsOnPage)throw Error('Някое ястие има прекалено дълго име. Съкратете го, за да се побере.');
     finish();last=null;isNew=true;
    }
    if(isNew){last={title:name,weightNote:String(group.weightNote||''),items:[]};page.push(last);cursor+=84;}
    last.items.push(row);cursor+=row.height;itemsOnPage++;
   }
  }
  finish();return pages;
 }
 function background(ctx,W,H){
  ctx.fillStyle=WHITE;ctx.fillRect(0,0,W,H);
  ctx.fillStyle=YELLOW;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(W,0);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(92,78,49,.2)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(W,0);ctx.stroke();
 }
 function draw(ctx,kind,date,page,idx,count,logo){
  const config=SETTINGS[kind],{width:W,height:H}=config;
  ctx.clearRect(0,0,W,H);background(ctx,W,H);
  if(logo?.complete&&logo.naturalWidth>0){
   ctx.save();ctx.globalAlpha=.10;
   const width=440,height=width*500/427;
   ctx.drawImage(logo,(W-width)/2,H*.40,width,height);
   ctx.restore();
  }
  const boxY=config.titleTop;
  ctx.fillStyle='rgba(255,251,240,.95)';ctx.fillRect(80,boxY,920,164);
  ctx.strokeStyle=INK;ctx.lineWidth=4;ctx.strokeRect(80,boxY,920,164);
  ctx.fillStyle=INK;ctx.textAlign='center';ctx.font='bold 73px Arial, sans-serif';
  ctx.fillText('Обедно меню',W/2,config.titleBaseline);
  ctx.font='600 30px Arial, sans-serif';ctx.fillText(dateBG(date),W/2,config.dateY);
  let y=config.contentTop;
  for(const section of page){
   ctx.fillStyle='rgba(255,251,239,.95)';
   ctx.fillRect(78,y,924,66);
   ctx.fillStyle=INK;ctx.textAlign='left';ctx.font='bold 39px Arial, sans-serif';
   ctx.fillText(section.title,99,y+44,790);
   if(section.weightNote){
    ctx.font='500 23px Arial, sans-serif';ctx.textAlign='right';
    ctx.fillText(section.weightNote,976,y+42,200);
   }
   ctx.strokeStyle='#877250';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.moveTo(88,y+75);ctx.lineTo(991,y+75);ctx.stroke();
   y+=84;
   for(const row of section.items){
    ctx.textAlign='left';ctx.fillStyle=INK;ctx.font='600 32px Arial, sans-serif';
    row.lines.forEach((line,i)=>ctx.fillText(line,103,y+33+i*43,704));
    ctx.textAlign='right';ctx.font='bold 31px Arial, sans-serif';
    ctx.fillText(row.price,980,y+34,165);
    if(row.note||row.soldOut){
     ctx.textAlign='left';ctx.fillStyle=row.soldOut?'#963e35':'#5e574d';
     ctx.font='500 21px Arial, sans-serif';
     ctx.fillText([row.note,row.soldOut?'ИЗЧЕРПАНО':''].filter(Boolean).join(' · '),103,y+33+row.lines.length*43);
    }
    y+=row.height;
   }
  }
  const footerY=H-82;
  ctx.strokeStyle='rgba(100,81,44,.5)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(90,footerY-50);ctx.lineTo(990,footerY-50);ctx.stroke();
  ctx.fillStyle=INK;ctx.textAlign='center';ctx.font='bold 42px Arial, sans-serif';
  ctx.fillText('Терасата',W/2,footerY);
  if(count>1){ctx.textAlign='right';ctx.font='500 21px Arial, sans-serif';ctx.fillText((idx+1)+' / '+count,985,footerY);}
 }
 function open({day,date,kind,download,notice}){
  if(!SETTINGS[kind])return;
  if(!day?.groups?.some(g=>g.items?.some(it=>String(it.name||'').trim()&&String(it.price||'').trim()))){
   notice('Няма въведено меню за тази дата.');return;
  }
  let pages;
  try{pages=pagesFor(day,kind);}catch(err){notice(err.message);return;}
  if(!pages.length){notice('Няма ястия за изображението.');return;}
  const cfg=SETTINGS[kind],label=kind==='story'?'Story':'Публикация';
  const dialog=document.createElement('dialog');dialog.className='fb-dialog social-dialog';
  dialog.innerHTML=`<div class="dialog-header"><h2>${esc(label)} · ${esc(dateBG(date))}</h2><button type="button" class="close" aria-label="Затвори">×</button></div><div class="poster-dialog-body"><canvas class="preview-frame" width="${cfg.width}" height="${cfg.height}" aria-label="${esc(label)} за обедното меню"></canvas><p class="download-help">${cfg.width} × ${cfg.height} px · ${pages.length} ${pages.length===1?'изображение':'изображения'}. Всяка страница запазва четими цени и ястия.</p><div class="toolbar-row"><label class="form-field">Изображение <select class="social-page">${pages.map((_,i)=>`<option value="${i}">${i+1} от ${pages.length}</option>`).join('')}</select></label><button type="button" class="btn primary social-download" disabled>Изтегли PNG</button></div></div>`;
  document.body.appendChild(dialog);
  const close=()=>{dialog.close();dialog.remove();};
  dialog.querySelector('.close').addEventListener('click',close);
  dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  dialog.addEventListener('close',()=>dialog.remove());
  dialog.showModal();
  const canvas=dialog.querySelector('canvas'),selector=dialog.querySelector('.social-page'),button=dialog.querySelector('.social-download');
  const ctx=canvas.getContext('2d'),logo=new Image();
  if(!ctx){notice('Вашият браузър не поддържа генератора.');close();return;}
  const redraw=()=>draw(ctx,kind,date,pages[Number(selector.value||0)],Number(selector.value||0),pages.length,logo);
  logo.onload=()=>{if(!dialog.isConnected)return;redraw();button.disabled=false;};
  logo.onerror=()=>notice('Оригиналното лого не можа да се зареди. Изтеглянето е блокирано.');
  logo.src=new URL('assets/images/terasata-mark-original.svg',document.baseURI).href;
  redraw();selector.addEventListener('change',redraw);
  button.addEventListener('click',()=>{
   if(!logo.complete||!logo.naturalWidth)return;
   const index=Number(selector.value||0);
   canvas.toBlob(blob=>{
    if(!blob){notice('Неуспешно генериране на PNG.');return;}
    download('terasata-obedno-'+kind+'-'+date+'-'+(index+1)+'.png',blob);
    notice('Изображението е готово.');
   },'image/png');
  });
 }
 window.TERASATA_SOCIAL_POSTER={open,pagesFor};
})();
