'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
// Compare saved pairs locally. Only unchanged, recognizably untranslated prose
// is queued for repair; code, formulas and sample I/O are excluded in the DOM.
module.exports=async({worker,dir,read,write,allowed})=>{
 let job=read();if(!job.auditEnabled||job.stop||job.items.some(i=>allowed(job,i)&&i.status==='pending'))return;
 const items=job.items.filter(i=>allowed(job,i)&&i.status==='done');let checked=0,queued=0;
 job.audit={status:'checking',checked:0,total:items.length,queued:0};write(job);
 for(let at=0;at<items.length;at+=10){
  if(read().stop)return;
  const rows=[];
  for(const item of items.slice(at,at+10)){
   try{const doc=JSON.parse(fs.readFileSync(path.join(dir,item.provider,item.id+'.json'),'utf8'));
    if(doc.detail?.id!==item.id||doc.detail?.provider!==item.provider||typeof doc.original!=='string'||typeof doc.translated!=='string')throw Error('Invalid saved translation pair');
    const fingerprint=crypto.createHash('sha256').update('en-vi-audit-v1'+doc.original+'\0'+doc.translated).digest('hex');
    if(item.auditFingerprint!==fingerprint)rows.push({provider:item.provider,id:item.id,original:doc.original,translated:doc.translated,fingerprint});
   }catch{rows.push({provider:item.provider,id:item.id,missing:true});}
  }
  const results=rows.length?await worker.webContents.executeJavaScript('('+JSON.stringify(rows)+').map(r=>({provider:r.provider,id:r.id,fingerprint:r.fingerprint,missing:r.missing,remaining:r.missing?1:StatementTranslation.auditArticle(r.original,r.translated)}))'):[];
  job=read();if(job.stop)return;
  for(const result of results){const item=job.items.find(i=>i.provider===result.provider&&i.id===result.id);if(!item||item.status!=='done')continue;
   if(result.remaining){item.needsReview=true;item.untranslatedFragments=result.remaining;
    if((item.auditAttempts||0)<2){item.auditAttempts=(item.auditAttempts||0)+1;item.status='pending';item.repairTranslation=true;delete item.auditFingerprint;queued++;}
   }else{item.auditFingerprint=result.fingerprint;delete item.needsReview;delete item.untranslatedFragments;}
  }
  checked+=Math.min(10,items.length-at);job.audit={status:'checking',checked,total:items.length,queued};write(job);
 }
 job=read();job.audit={status:queued?'repairing':'checked',checked,total:items.length,queued,needsReview:job.items.filter(i=>i.needsReview).length,checkedAt:new Date().toISOString()};write(job);
};
