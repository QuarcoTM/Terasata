/* Free-text restaurant notices: shown only when active within the Sofia-local date window. */
(async()=>{
 'use strict';
 let content=window.TERASATA_CONTENT;
 if(window.TERASATA_BACKEND_ACTIVE===true){
   try{
     const response=await fetch('backend/api/public.php',{credentials:'same-origin',cache:'no-store'});
     if(!response.ok)throw Error('Content unavailable');
     const result=await response.json();
     if(!result.ok||!result.content)throw Error('Invalid public content');
     content=result.content;
   }catch(err){console.warn('Notice temporarily unavailable:',err);return;}
 }
 const n=(window.TERASATA_I18N?.localizeContent(content)||content)?.siteNotice;
 if(!n||n.enabled!==true||typeof n.message!=='string'||!n.message.trim())return;
 const now=new Date(),pieces=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Sofia',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(x=>[x.type,x.value]));
 const today=[pieces.year,pieces.month,pieces.day].join('-');
 const date=/^\d{4}-\d{2}-\d{2}$/;
 if((n.startDate&&(!date.test(n.startDate)||today<n.startDate))||(n.endDate&&(!date.test(n.endDate)||today>n.endDate)))return;
 const header=document.getElementById('site-header');
 if(!header)return;
 const banner=document.createElement('aside');
 banner.className='restaurant-notice';
 banner.setAttribute('aria-label','Съобщение от ресторанта');
 const inner=document.createElement('div');
 inner.className='container restaurant-notice-inner';
 const dot=document.createElement('span');dot.className='restaurant-notice-dot';dot.setAttribute('aria-hidden','true');
 const message=document.createElement('p');message.textContent=n.message.trim();
 inner.append(dot,message);banner.append(inner);header.after(banner);
})();
