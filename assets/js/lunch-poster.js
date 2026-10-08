/* Терасата — самостоятелен A4 генератор. Не променя останалия админ панел. */
(function () {
  'use strict';
  const W = 1240, H = 1754;
  const INK = '#302c3b', YELLOW = '#f8d35e', WHITE = '#faf9f7';
  const CATS = [
    {name:'Салати', gm:'/250гр./', x:112, priceX:530, bodyY:375, endY:750, font:29, leading:36, nameW:295, headingX:192, headingY:238, headingW:260, headingH:116},
    {name:'Супи', gm:'/350мл./', x:671, priceX:1064, bodyY:375, endY:750, font:29, leading:36, nameW:270, headingX:786, headingY:238, headingW:263, headingH:116},
    {name:'Готвено', gm:'/450гр./', x:113, priceX:1010, bodyY:941, endY:1315, font:30, leading:38, nameW:760, headingX:455, headingY:760, headingW:325, headingH:138}
  ];
  const escapeHtml = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('-') : value;
  const hasLine = (ctx,text,maxWidth,font) => {ctx.font=font; return ctx.measureText(text).width<=maxWidth;};
  function wrap(ctx,text,width,font) {
    ctx.font=font;
    const lines=[], words=String(text||'').trim().split(/\s+/).filter(Boolean);
    let current='';
    for (const word of words) {
      const next=current ? `${current} ${word}` : word;
      if(ctx.measureText(next).width<=width){current=next;continue;}
      if(current){lines.push(current);current='';}
      if(ctx.measureText(word).width<=width){current=word;continue;}
      let part='';for(const character of word){if(part && ctx.measureText(part+character).width>width){lines.push(part);part='';}part+=character;}current=part;
    }
    if(current)lines.push(current);
    return lines.length?lines:[''];
  }
  function defaultFooter(){return [
    {label:'Питка 250гр.',price:'1.45€'}, {label:'Чабата 120гр.',price:'0.97€'},
    {label:'Хляб филия',price:'0.15€'}, {label:'Хляб филия препечен',price:'0.15€'},
    {label:'Хляб филия пълнозърнест',price:'0.15€'}, {label:'Люта чушка 1бр.',price:'0.15€'}
  ];}
  function parseGroups(day){
    const all=(day?.groups||[]).filter(g=>Array.isArray(g.items));
    const find=name=>all.find(g=>String(g.title||'').toLocaleLowerCase('bg-BG').trim()===name.toLocaleLowerCase('bg-BG'));
    const salads=find('Салати')?.items||[]; const soups=find('Супи')?.items||[];
    const cooked=all.filter(g=>!['салати','супи'].includes(String(g.title||'').toLocaleLowerCase('bg-BG').trim())).flatMap(g=>g.items);
    return [salads,soups,cooked];
  }
  function makePages(day){
    const groups=parseGroups(day),tester=document.createElement('canvas').getContext('2d');
    const arrays=groups.map((items,index)=>{
      const conf=CATS[index], font=`italic 700 ${conf.font}px Arial, sans-serif`, rowNoteFont='19px Arial, sans-serif';
      return items.map(item=>{
        const lines=wrap(tester,item.name,conf.nameW,font);
        const note=String(item.weight||'').trim();
        const sub=note ? wrap(tester,note,conf.nameW,rowNoteFont) : [];
        const height=Math.max(49,lines.length*conf.leading+sub.length*22+12+(item.soldOut?18:0));
        return {item,lines,sub,height,font,rowNoteFont};
      });
    });
    const pages=[];let nextIndexes=[0,0,0];
    while(nextIndexes.some((n,i)=>n<arrays[i].length)){
      const page=[];let progress=false;
      for(let i=0;i<3;i++){
        const conf=CATS[i],cap=conf.endY-conf.bodyY;
        let used=0;const rows=[];
        while(nextIndexes[i]<arrays[i].length){
          const row=arrays[i][nextIndexes[i]];
          if(used+row.height>cap)break;
          rows.push(row);used+=row.height;nextIndexes[i]++;progress=true;
        }
        page.push(rows);
      }
      if(!progress)throw Error('Едно от ястията е прекалено дълго за A4. Съкратете текста или разделете описанието.');
      pages.push(page);
    }
    return pages;
  }
  function drawDots(ctx,cx,cy,start,end){
    ctx.save();ctx.fillStyle='#807b7e';ctx.globalAlpha=.25;
    for(let col=0;col<4;col++)for(let i=0;i<22;i++){
      const a=start+(end-start)*i/21, radius=115+col*13;
      ctx.beginPath();ctx.arc(cx+Math.cos(a)*radius,cy+Math.sin(a)*radius,2.3+(col%2)*.2,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function drawWatermark(ctx){
    // Decorative architecture motif. Original logo asset is not available;
    // no inaccurate reconstruction is presented as the original logo.
    ctx.save();ctx.strokeStyle='#68626d';ctx.globalAlpha=.16;ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(470,1020);ctx.lineTo(470,750);ctx.moveTo(518,1020);ctx.lineTo(518,730);
    ctx.moveTo(566,1020);ctx.lineTo(566,711);ctx.moveTo(614,1020);ctx.lineTo(614,703);
    ctx.moveTo(662,1020);ctx.lineTo(662,718);ctx.moveTo(710,1020);ctx.lineTo(710,739);
    ctx.moveTo(460,1023);ctx.bezierCurveTo(540,1005,639,1005,725,1023);
    ctx.moveTo(477,742);ctx.quadraticCurveTo(584,658,702,742);ctx.stroke();ctx.restore();
  }
  function drawFitted(ctx,text,x,y,maxWidth,font,maxHeight=40){
    ctx.font=font;ctx.textAlign='center';
    if(ctx.measureText(text).width>maxWidth){
      // Only footer items are short. Do not crop long labels.
      let size=parseInt(font.match(/\d+px/)?.[0]||'20',10);
      while(size>16){size--;ctx.font=font.replace(/\d+px/,`${size}px`);if(ctx.measureText(text).width<=maxWidth)break;}
    }
    ctx.fillText(text,x,y);
  }
  function draw(canvas,pages,pageIndex,settings,date){
    const ctx=canvas.getContext('2d'),footer=(settings.footerItems||defaultFooter()).map((item,i)=>({label:defaultFooter()[i].label,price:String(item?.price??defaultFooter()[i].price)}));
    ctx.clearRect(0,0,W,H);ctx.fillStyle=WHITE;ctx.fillRect(0,0,W,H);
    ctx.fillStyle=YELLOW;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(1140,0);ctx.lineTo(0,1635);ctx.closePath();ctx.fill();
    ctx.fillStyle='#fafaf9';ctx.beginPath();ctx.moveTo(1140,0);ctx.lineTo(W,0);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.lineTo(0,1635);ctx.closePath();ctx.fill();
    ctx.fillStyle=YELLOW;ctx.fillRect(0,0,1140,46);
    // Title box: matches original placement near the upper edge.
    ctx.fillStyle=YELLOW;ctx.fillRect(253,42,772,151);ctx.strokeStyle=INK;ctx.lineWidth=10;ctx.strokeRect(253,42,772,151);
    ctx.fillStyle=INK;ctx.textAlign='center';ctx.font='bold 94px Arial, sans-serif';ctx.fillText('Обедно меню',640,147);
    ctx.font='italic 21px Arial, sans-serif';ctx.fillText(fmtDate(date),640,226);
    ctx.strokeStyle=INK;ctx.lineWidth=2.3;ctx.beginPath();ctx.moveTo(627,270);ctx.lineTo(627,750);ctx.stroke();
    drawDots(ctx,315,670,Math.PI*.55,Math.PI*1.52);drawDots(ctx,951,610,-Math.PI*.7,Math.PI*.5);drawWatermark(ctx);
    pages[pageIndex].forEach((rows,index)=>{
      const conf=CATS[index],borderY=conf.headingY,bodyStart=conf.bodyY;
      // Always show section headings, with same short dark outline.
      ctx.fillStyle=index===0?'rgba(255,224,120,.52)':'rgba(255,251,246,.34)';
      ctx.fillRect(conf.headingX,borderY,conf.headingW,conf.headingH);
      ctx.strokeStyle=INK;ctx.lineWidth=6;ctx.strokeRect(conf.headingX,borderY,conf.headingW,conf.headingH);
      ctx.fillStyle=INK;ctx.textAlign='center';ctx.font='italic bold 38px Arial, sans-serif';ctx.fillText(conf.name,conf.headingX+conf.headingW/2,borderY+49);
      ctx.font='italic bold 31px Arial, sans-serif';ctx.fillText(conf.gm,conf.headingX+conf.headingW/2,borderY+92);
      let y=bodyStart;
      rows.forEach(({item,lines,sub,height,font,rowNoteFont})=>{
        ctx.fillStyle=INK;ctx.beginPath();ctx.arc(conf.x-15,y+10,8,0,Math.PI*2);ctx.fill();
        ctx.textAlign='left';ctx.font=font;
        lines.forEach((line,i)=>ctx.fillText(line,conf.x,y+17+i*conf.leading));
        if(sub.length){ctx.fillStyle='#45414a';ctx.font=rowNoteFont;sub.forEach((line,i)=>ctx.fillText(line,conf.x,y+17+lines.length*conf.leading+i*22));}
        ctx.fillStyle=INK;ctx.textAlign='right';ctx.font='italic 700 25px Arial, sans-serif';ctx.fillText(String(item.price||''),conf.priceX,y+17);
        if(item.soldOut){ctx.textAlign='left';ctx.fillStyle='#a14634';ctx.font='bold 16px Arial';ctx.fillText('ИЗЧЕРПАНО',conf.x,y+height-2);}
        y+=height;
      });
    });
    // Slanted original-name watermark (not an invented image-based brand logo).
    ctx.save();ctx.translate(W/2,1350);ctx.rotate(-.18);ctx.globalAlpha=.52;ctx.fillStyle='#6b666e';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='italic 96px Georgia, serif';ctx.fillText('Ресторант Терасата',0,0);ctx.restore();
    // Footer: four lines as in the supplied flyer, editable PRICES only.
    ctx.fillStyle=INK;ctx.textAlign='center';
    const footerLines=[
      footer[0].label+' '+footer[0].price+'    '+footer[1].label+' '+footer[1].price,
      footer[2].label+' '+footer[2].price+'    '+footer[3].label+' '+footer[3].price,
      footer[4].label+' '+footer[4].price,
      footer[5].label+' '+footer[5].price
    ];
    [1399,1445,1491,1537].forEach((y,i)=>drawFitted(ctx,footerLines[i],620,y,1050,'italic bold 29px Arial, sans-serif'));
    ctx.fillStyle=INK;ctx.font='italic bold 36px Arial, sans-serif';ctx.textAlign='center';
    ctx.fillText('Десерти:',620,1616);
    ctx.font='italic bold 41px Arial, sans-serif';ctx.fillText('Попитайте Вашия сервитьор!',620,1665);
    if(pages.length>1){ctx.textAlign='right';ctx.font='18px Arial';ctx.fillText(`${pageIndex+1} / ${pages.length}`,1167,1707);}
  }
  function open({day,date,settings,download,notice}){
    if(!day||!day.groups?.some(g=>g.items?.length)){notice('Няма въведено обедно меню за тази дата.');return;}
    let pages;
    try{pages=makePages(day);}catch(err){notice(err.message);return;}
    const dialog=document.createElement('dialog');dialog.className='fb-dialog';
    dialog.innerHTML=`<div class="dialog-header"><h2>Обедно меню A4 · ${escapeHtml(fmtDate(date))}</h2><button type="button" class="close" aria-label="Затвори">×</button></div><div class="poster-dialog-body"><canvas id="fb-canvas" width="${W}" height="${H}" class="preview-frame" aria-label="Генерирано A4 обедно меню"></canvas><p class="download-help">A4 · ${pages.length} ${pages.length===1?'страница':'страници'}. За промяна на цените на хлебчетата и лютата чушка: бутон „Хлебчета и десерти“.</p><div class="toolbar-row"><label class="form-field">Страница <select id="fb-page">${pages.map((_,i)=>`<option value="${i}">${i+1} от ${pages.length}</option>`).join('')}</select></label><button class="btn primary" type="button" id="fb-download">Изтегли PNG A4</button></div></div>`;
    document.body.appendChild(dialog);
    const close=()=>{dialog.close();dialog.remove();};dialog.querySelector('.close').onclick=close;
    dialog.addEventListener('click',e=>{if(e.target===dialog)close();});dialog.showModal();
    const canvas=dialog.querySelector('#fb-canvas');const selector=dialog.querySelector('#fb-page');
    const redraw=()=>draw(canvas,pages,Number(selector.value||0),settings,date);
    redraw();selector.addEventListener('change',redraw);
    dialog.querySelector('#fb-download').addEventListener('click',()=>{const index=Number(selector.value||0);canvas.toBlob(blob=>{if(blob){download(`terasata-obedno-A4-${date}-${index+1}.png`,blob);notice('Готова A4 визуализация')}else notice('Неуспешно генериране на PNG');},'image/png');});
  }
  window.TERASATA_POSTER={open,makePages,draw,defaultFooter};
})();
