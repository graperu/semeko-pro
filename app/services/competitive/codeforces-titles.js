'use strict';
const fs=require('fs'),path=require('path');
module.exports=async items=>{
 const russian=items.filter(p=>/[\u0400-\u04ff]/.test(p.title));if(!russian.length)return items;
 try{const {app}=require('electron'),file=path.join(app.getPath('userData'),'codeforces-titles-en.json');let titles={};try{titles=JSON.parse(fs.readFileSync(file,'utf8')).titles||{};}catch{}
  const missing=russian.filter(p=>titles[p.id]?.source!==p.title||!titles[p.id]?.english);
  const service=require('./statement-translation');
  if(missing.length&&service.info().hasKey){const values=await service.translate(missing.map(p=>p.title),undefined,false,'en');missing.forEach((p,i)=>{if(values[i]&&!/[\u0400-\u04ff]/.test(values[i]))titles[p.id]={source:p.title,english:values[i]};});require('../../shared/fs-atomic').writeFileAtomicSync(file,JSON.stringify({version:1,titles}),'utf8');}
  return items.map(p=>titles[p.id]?.source===p.title?{...p,title:titles[p.id].english,titleOriginal:p.title,titleEnglishGenerated:true}:p);
 }catch{return items;}
};
