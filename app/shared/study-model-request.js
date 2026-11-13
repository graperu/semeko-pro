'use strict';
const fs=require('fs'),path=require('path');
function directory(){if(process.env.SEMEKO_MODEL_REQUEST_DIR)return process.env.SEMEKO_MODEL_REQUEST_DIR;let profile;try{profile=require('electron').app?.getPath('userData');}catch{}return path.join(profile||path.join(process.env.APPDATA||require('os').tmpdir(),'sameko-dev-cpp'),'book-study/model-requests');}
function cooldown(dir=directory()){try{return JSON.parse(fs.readFileSync(path.join(dir,'cooldown.json'),'utf8'));}catch{return{until:0};}}
function retryDelay(header,attempt,now=Date.now()){const seconds=Number(header);if(header&&Number.isFinite(seconds)&&seconds>=0)return Math.max(1000,seconds*1000);const date=Date.parse(header||'');if(Number.isFinite(date)&&date>now)return date-now;return Math.min(300000,30000*2**attempt);}
async function request(url,options,overrides={}){
 const dir=overrides.directory||directory(),now=overrides.now||Date.now,wait=overrides.wait||(ms=>new Promise(r=>setTimeout(r,ms))),fetcher=overrides.fetch||global.fetch,attempts=overrides.attempts||4;fs.mkdirSync(dir,{recursive:true});
 const lock=require('./process-lock');let last;
 for(let attempt=0;attempt<attempts;attempt++){
  let release;const queuedAt=now();
  while(!release){if(now()-queuedAt>600000){const error=Error('Study service queue timed out; retry later');error.code='STUDY_TRANSIENT';error.retryAt=Math.max(now()+60000,cooldown(dir).until||0);throw error;}const remaining=(cooldown(dir).until||0)-now();if(remaining>0){await wait(Math.min(remaining,30000));continue;}release=lock(path.join(dir,'request.owner'));if(!release)await wait(250);}
  try{
   // Another process may have announced a cooldown while this one waited for the lock.
   if((cooldown(dir).until||0)>now()){attempt--;continue;}
   const response=await fetcher(url,{...options,signal:AbortSignal.timeout(180000)});
   if(response.ok)return await response.json();
   const retryable=[408,429,500,502,503,504].includes(response.status);const error=Error('Study service HTTP '+response.status);error.status=response.status;error.code=retryable?'STUDY_TRANSIENT':'STUDY_HTTP';
   if(!retryable)throw error;
   const delay=retryDelay(response.headers?.get?.('retry-after'),attempt,now());error.retryAt=now()+delay;last=error;
   require('./atomic-json-publish')(path.join(dir,'cooldown.json'),{until:error.retryAt,status:response.status,updatedAt:now()});
  }catch(e){if(e.code==='STUDY_HTTP')throw e;if(e.code==='STUDY_TRANSIENT'){last=e;throw e;}last=Error('Study service connection failed');last.code='STUDY_TRANSIENT';last.retryAt=now()+retryDelay(null,attempt,now());require('./atomic-json-publish')(path.join(dir,'cooldown.json'),{until:last.retryAt,status:'network',updatedAt:now()});}
  finally{release();}
 }
 throw last||Error('Study service unavailable');
}
module.exports={request,cooldown,directory,retryDelay};
