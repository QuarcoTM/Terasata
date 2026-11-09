/* Decode the actual finished QR-card SVGs in Chromium at screen and minimum print sizes.
   This is an end-to-end scan of the branded QR, not merely a check that a QR matrix exists. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const puppeteer=require('puppeteer-core');

(async()=>{
 const root=path.resolve(__dirname,'..');
 const chrome=process.env.CHROME_PATH||'/usr/bin/google-chrome';
 const browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();
  await page.setContent('<!doctype html><html><head><base href="https://quarcotm.github.io/Terasata/"></head><body></body></html>');
  for(const file of ['assets/js/vendor/qrcode-generator.js','assets/js/qr-cards.js']){
   await page.addScriptTag({content:fs.readFileSync(path.join(root,file),'utf8')});
  }
  await page.addScriptTag({content:fs.readFileSync(require.resolve('jsqr'),'utf8')});
  const results=await page.evaluate(async()=>{
   const all=[];
   for(const type of ['lunch','main']){
    const expected=window.TERASATA_QR_CARDS.defaultUrls[type];
    const svg=window.TERASATA_QR_CARDS.svg(type,expected);
    const center=svg.match(/class="qr-center-emblem"[^>]*><rect[^>]* width="([\\d.]+)"/);
    if(!center||Number(center[1])!==24)throw Error('Maximum 24-module logo missing in '+type);
    const dataUrl=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
    try{
     const image=new Image();image.src=dataUrl;await image.decode();
     for(const pixels of [800,520,303,240,200]){
      const variants=pixels>=520?['plain']:['plain','blur04','rotate3','rotateMinus3','lowContrast'];
      for(const variant of variants){
       const canvas=document.createElement('canvas');canvas.width=pixels;canvas.height=Math.round(pixels*1.3);
       const ctx=canvas.getContext('2d',{willReadFrequently:true});
       ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
       if(variant==='blur04')ctx.filter='blur(0.4px)';
       else if(variant==='lowContrast')ctx.filter='contrast(82%) brightness(105%)';
       if(variant.startsWith('rotate')){
        ctx.translate(canvas.width/2,canvas.height/2);
        ctx.rotate((variant==='rotate3'?3:-3)*Math.PI/180);
        ctx.drawImage(image,-canvas.width*.91/2,-canvas.height*.91/2,canvas.width*.91,canvas.height*.91);
       }else ctx.drawImage(image,0,0,canvas.width,canvas.height);
       const imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
       const scan=window.jsQR(imageData.data,canvas.width,canvas.height,{inversionAttempts:'dontInvert'});
       all.push({type,pixels,variant,expected,found:scan?.data||null});
      }
     }
    }finally{URL.revokeObjectURL(dataUrl);}
   }
   return all;
  });
  for(const result of results){
   assert.equal(result.found,result.expected,
    'FAILED to decode '+result.type+' with maximum logo at '+result.pixels+'px '+result.variant);
   console.log('Verified',result.type,result.pixels+'px',result.variant,'->',result.found);
  }
  assert.equal(results.length,34,'Expected two codes × 17 print and camera conditions');
  console.log('34/34 real pixel-level QR scans passed with enlarged 24-module original logos.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
