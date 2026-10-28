/* End-to-end checks in real Chromium for BG/EN, mobile layout and WCAG accessibility.
   CI installs the temporary audit dependencies; the public site ships no new JS package. */
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const puppeteer=require('puppeteer-core');
const axe=require('axe-core');
const PORT=8765,origin='http://127.0.0.1:'+PORT+'/Terasata/';
const browserExecutable=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{
  cwd:path.resolve(__dirname,'../..'),stdio:'ignore'
 });
 let browser;
 try{
  for(let attempt=0;attempt<50;attempt++){
   try{const test=await fetch(origin);if(test.ok)break;}catch(_){}
   await pause(150);
  }
  browser=await puppeteer.launch({headless:true,executablePath:browserExecutable,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  const routes=['','menu/','obedno-menu/','praznenstva/','galeria/','kontakti/'];
  const issues=[];
  page.on('pageerror',error=>issues.push('JavaScript error: '+error.message));
  for(const lang of ['bg','en']){
   for(const route of routes){
    await page.setViewport({width:390,height:844,deviceScaleFactor:2});
    const dest=origin+(lang==='en'?'en/':'')+route;
    await page.goto(dest,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForSelector('.language-trigger',{timeout:12000});
    const ui=await page.evaluate(()=>({
     htmlLang:document.documentElement.lang,flag:document.querySelector('.language-trigger')?.textContent.trim(),
     overflows:document.documentElement.scrollWidth>window.innerWidth+2,
     headings:document.querySelectorAll('main h1').length,
     hiddenMenu:document.querySelector('#site-language-menu')?.hidden
    }));
    assert.equal(ui.htmlLang,lang,dest+' lang');
    assert.equal(ui.flag,lang==='en'?'🇬🇧':'🇧🇬',dest+' selected flag');
    assert.equal(ui.hiddenMenu,true,dest+' language menu must be closed initially');
    assert.equal(ui.headings,1,dest+' should have one H1');
    if(ui.overflows)issues.push(dest+' has horizontal overflow on a phone');
    await page.addScriptTag({content:axe.source});
    const result=await page.evaluate(()=>window.axe.run(document,{
     runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}
    }));
    const serious=result.violations.filter(v=>v.impact==='critical'||v.impact==='serious');
    for(const violation of serious)
     issues.push(lang+' '+route+' '+violation.id+' '+violation.impact+': '+violation.nodes.slice(0,3).map(n=>n.target.join(' ')).join(', '));
    console.log(lang.toUpperCase(),route||'home','axe violations',result.violations.length,'serious',serious.length);
   }
  }
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.language-trigger');
  const initial=page.url();
  await page.click('.language-trigger');
  assert.equal(page.url(),initial,'Touching flag must not immediately navigate');
  await page.waitForSelector('#site-language-menu:not([hidden])');
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.click('#site-language-menu button[data-lang="en"]')]);
  assert(page.url().includes('/Terasata/en/'),'Flag menu must navigate to distinct English URL');
  await page.waitForSelector('.language-trigger');
  await page.goto(origin+'en/menu/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.dish-allergens');
  const text=await page.$eval('.dish-allergens',node=>node.textContent);
  assert(text.startsWith('Allergens: '),'Permanent menu allergen list must be English: '+text);
  await page.goto(origin+'en/kontakti/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.contact-amenities');
  const amenities=await page.$eval('.contact-amenities',node=>node.textContent);
  assert(amenities.includes('Highchairs for babies and toddlers'),'English amenities absent: '+amenities);
  assert(!amenities.includes('Детски'),'English amenities still Bulgarian');
  if(issues.length){console.error(issues.join('\n'));process.exitCode=1;}
  else console.log('12 BG/EN mobile pages, flag navigation and serious WCAG checks passed.');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
