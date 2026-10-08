/* Privacy-minded, opt-in-to-enable, cookie-free Umami integration.
   No network connection is made while websiteId is empty.
   https://docs.umami.is/docs/tracker-functions */
(()=>{
  'use strict';
  const config=window.TERASATA_ANALYTICS||{};
  const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
  const active=uuid.test(config.websiteId||'');
  const page=document.body?.dataset.page||'';
  const preview=new URLSearchParams(location.search).get('preview')==='1';
  // Do not track administrator activity, local drafts or site previews.
  if(!active || !page || preview || location.hostname==='localhost' || location.hostname==='127.0.0.1')return;
  const script=document.createElement('script');
  script.src='https://cloud.umami.is/script.js';
  script.async=true;
  script.dataset.websiteId=config.websiteId;
  script.dataset.excludeSearch='true';
  script.dataset.doNotTrack='true';
  script.onload=()=>{
    const params=new URLSearchParams(location.search);
    if(params.get('utm_source')==='qr' && params.get('utm_medium')==='table'){
      window.umami?.track('qr_menu_open',{section:page});
    }
  };
  document.head.appendChild(script);
  document.addEventListener('click',event=>{
    const link=event.target.closest?.('a[href]');
    if(!link || typeof window.umami?.track!=='function')return;
    const href=link.getAttribute('href')||'';
    let eventName='';
    if(/^tel:/i.test(href))eventName='phone_click';
    else if(/^https:\/\/(?:www\.)?google\.[^/]+\/maps/i.test(href))eventName='directions_click';
    else if(/^(?:\.\/)?(?:menu|obedno-menu)\/(?:[?#].*)?$/i.test(href))eventName='menu_click';
    if(eventName)window.umami.track(eventName,{section:page});
  },{passive:true});
})();
