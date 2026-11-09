/* Temporary empirical search for the largest decodable central original logo.
   Prints per-size pass results for the real lunch and main links, at small-card resolutions. */
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
  for(const file of ['assets/js/vendor/qrcode-generator.js','assets/js/qr-cards.js'])
   await page.addScriptTag({content:fs.readFileSync(path.join(root,file),'utf8')});
  await page.addScriptTag({content:fs.readFileSync(require.resolve('jsqr'),'utf8')});
  const out=await page.evaluate(async()=>{
   const results={};
   for(const type of ['lunch','main']){
    const url=window.TERASATA_QR_CARDS.defaultUrls[type];
    const rows=[];
    for(let side=8;side<=28;side++){
     const svg=window.TERASATA_QR_CARDS.svg(type,url,side);
     const view=svg.match(/width="576" height="576" viewBox="0 0 (\d+)/);
     const emblem=svg.match(/class="qr-center-emblem"[^>]*><rect[^>]* width="([\d.]+)"/);
     const actual=Number(emblem?.[1]||0);
     if(actual!==side){rows.push({side,actual,scores:[]});continue;}
     const object=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
     const scores=[];
     try{
      const img=new Image();img.src=object;await img.decode();
      for(const pixels of [800,520,303,240,200]){
       const canvas=document.createElement('canvas');canvas.width=pixels;canvas.height=Math.round(pixels*1.3);
       const ctx=canvas.getContext('2d',{willReadFrequently:true});
       ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
       ctx.drawImage(img,0,0,canvas.width,canvas.height);
       const image=ctx.getImageData(0,0,canvas.width,canvas.height);
       const scanned=window.jsQR(image.data,canvas.width,canvas.height,{inversionAttempts:'dontInvert'});
       scores.push(scanned?.data===url?1:0);
      }
     }finally{URL.revokeObjectURL(object);}
     rows.push({side,actual,scores});
    }
    results[type]=rows;
   }
   return results;
  });
  for(const [type,rows] of Object.entries(out)){
   console.log(type.toUpperCase()+' 800,520,303,240,200 px:');
   for(const {side,actual,scores} of rows)console.log('SIZE '+side+' MODULES real='+actual+' scan='+scores.join(''));
   console.log('MAX_ALL_5 '+type+': '+Math.max(0,...rows.filter(x=>x.scores.length===5&&x.scores.every(Boolean)).map(x=>x.side)));
   console.log('MAX_303 '+type+': '+Math.max(0,...rows.filter(x=>x.scores[2]===1).map(x=>x.side)));
  }
  const stress=await page.evaluate(async()=>{
   const results={};
   for(const type of ['lunch','main']){
    const url=window.TERASATA_QR_CARDS.defaultUrls[type],list=[];
    for(const side of [21,22,23,24,25]){
     const svg=window.TERASATA_QR_CARDS.svg(type,url,side);
     const object=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
     const checks=[];
     try{
      const img=new Image();img.src=object;await img.decode();
      for(const pixels of [303,240,200]){
       for(const variant of ['plain','blur04','rotate3','rotateMinus3','lowContrast']){
        const canvas=document.createElement('canvas');canvas.width=pixels;canvas.height=Math.round(pixels*1.3);
        const ctx=canvas.getContext('2d',{willReadFrequently:true});
        ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
        if(variant==='blur04')ctx.filter='blur(0.4px)';
        if(variant==='lowContrast')ctx.filter='contrast(82%) brightness(105%)';
        if(variant.startsWith('rotate')){
         ctx.translate(canvas.width/2,canvas.height/2);
         ctx.rotate((variant==='rotate3'?3:-3)*Math.PI/180);
         ctx.drawImage(img,-canvas.width*.91/2,-canvas.height*.91/2,canvas.width*.91,canvas.height*.91);
        }else ctx.drawImage(img,0,0,canvas.width,canvas.height);
        const pix=ctx.getImageData(0,0,canvas.width,canvas.height);
        const result=window.jsQR(pix.data,canvas.width,canvas.height,{inversionAttempts:'dontInvert'});
        checks.push({pixels,variant,ok:result?.data===url});
       }
      }
     }finally{URL.revokeObjectURL(object);}
     list.push({side,passes:checks.filter(c=>c.ok).length,total:checks.length,failed:checks.filter(c=>!c.ok).map(c=>c.pixels+'-'+c.variant)});
    }
    results[type]=list;
   }
   return results;
  });
  for(const [type,rows] of Object.entries(stress)){
   console.log('STRESS '+type.toUpperCase());
   for(const row of rows)console.log('STRESS_SIDE '+row.side+' PASS '+row.passes+'/'+row.total+' FAILS '+row.failed.join(','));
  }
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
