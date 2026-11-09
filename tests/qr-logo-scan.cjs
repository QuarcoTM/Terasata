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
    const dataUrl=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
    try{
     const image=new Image();image.src=dataUrl;await image.decode();
     for(const pixels of [800,520,303]){
      const canvas=document.createElement('canvas');canvas.width=pixels;canvas.height=Math.round(pixels*1.3);
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(image,0,0,canvas.width,canvas.height);
      const imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
      const scan=window.jsQR(imageData.data,canvas.width,canvas.height,{inversionAttempts:'dontInvert'});
      all.push({type,pixels,expected,found:scan?.data||null});
     }
    }finally{URL.revokeObjectURL(dataUrl);}
   }
   return all;
  });
  for(const result of results){
   assert.equal(result.found,result.expected,
    'FAILED to decode '+result.type+' with original logo at '+result.pixels+'px card');
   console.log('Verified',result.type,result.pixels+'px','->',result.found);
  }
  console.log('6/6 real pixel-level QR scans passed; 303px width simulates 80mm printed cards at 96dpi.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
