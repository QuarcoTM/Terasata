/* EU Annex II numbers. Never infer allergens from the dish name. */
window.TERASATA_ALLERGENS=(()=>{
 'use strict';
 const labels=['Глутен','Ракообразни','Яйца','Риба','Фъстъци','Соя','Мляко','Ядки','Целина','Синап','Сусам','Сулфити','Лупина','Мекотели'];
 function codes(value){
  const items=Array.isArray(value)?value:String(value??'').split(/[,;|]/);
  const nums=items.map(s=>String(s).trim()).filter(s=>/^(?:[1-9]|1[0-4])$/.test(s)).map(Number);
  return [...new Set(nums)].sort((a,b)=>a-b);
 }
 function parseInput(value){
  const raw=String(value??'').trim();
  if(!raw)return {valid:true,codes:[]};
  const parts=raw.split(/[,;|]/).map(s=>s.trim());
  const valid=parts.every(s=>/^(?:[1-9]|1[0-4])$/.test(s));
  return {valid,codes:valid?codes(parts):[]};
 }
 function legendText(value){return codes(value).map(i=>i+' – '+labels[i-1]).join(' · ');}
 function legendHtml(value){return codes(value).map(i=>'<span>'+i+' – '+labels[i-1]+'</span>').join('');}
 return Object.freeze({labels:Object.freeze(labels),codes,parseInput,legendText,legendHtml});
})();
