'use strict';
const {app,BrowserWindow}=require('electron'),fs=require('fs'),path=require('path');
const {writeFileAtomicSync}=require('../../shared/fs-atomic');
const browser=require('./problem-browser');let running=false,workers=[],indexTask;
const workerModels=new Map();
const catalog=require('./bulk-catalog');
const loadSource=require('../../shared/async-limiter')(6);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const file=()=>path.join(app.getPath('userData'),'bulk-translation.json');
function read(){try{return JSON.parse(fs.readFileSync(file(),'utf8'));}catch(e){if(e.code!=='ENOENT')throw Error('Could not read translation queue; existing progress was preserved');return{items:[],providers:{},status:'idle'};}}
function write(job){fs.mkdirSync(path.dirname(file()),{recursive:true});job.current=job.items.filter(i=>i.status==='processing').map(i=>i.provider+':'+i.id).join(', ');require('../../shared/atomic-json-publish')(file(),job);}
function alive(job){try{if(!job.pid||job.status!=='running')return false;process.kill(job.pid,0);return true;}catch{return false;}}
function progress(){const job=read();return Object.fromEntries(catalog.providers.map(provider=>{
 const items=job.items.filter(i=>i.provider===provider);let recovered=new Set();
 if(provider==='leetcode')try{recovered=new Set(fs.readdirSync(path.join(app.getPath('userData'),'translation-recovered')).filter(n=>n.endsWith('.json')).map(n=>n.slice(0,-5)));}catch{}
 const done=items.filter(i=>i.status==='done'||recovered.has(i.id)).length,skipped=items.filter(i=>i.status==='skipped').length;
 const total=job.providers[provider]?.total||items.length;
 const failures=items.filter(i=>i.status==='failed'&&!recovered.has(i.id));
 const failedSource=failures.filter(i=>/Statement unavailable|Codeforces|platform returned|verification page/i.test(i.error||'')).length;
 return[provider,{done,total,percent:total?Number((100*done/total).toFixed(2)):0,failed:failures.length,failedSource,failedTranslation:failures.length-failedSource,retrying:items.filter(i=>i.status==='retry').length,skipped,available:total-skipped}];
}));}
function info(){const job=read();return{status:running||alive(job)?job.status:job.status==='running'?'paused':job.status,concurrency:(job.concurrency||1)+(job.claudeLane?Math.min(2,job.claudeLanes||1):0),providers:job.providers,total:job.items.length,done:job.items.filter(i=>i.status==='done').length,failed:job.items.filter(i=>i.status==='failed').length,skipped:job.items.filter(i=>i.status==='skipped').length,current:job.current,error:job.error,audit:job.audit||null};}
function pause(){const job=read();job.stop=true;job.manualPause=true;write(job);return info();}
function allowed(job,item){return !job.targetProviders?.length||job.targetProviders.includes(item.provider);}
async function supervise(){
 for(;;){try{await run();}catch(e){const job=read();job.status='paused';job.error=e.message;write(job);}
 const job=read();if(!job.continuous||job.manualPause||/HTTP 401|HTTP 403|Configure translation|unlock translation API key/.test(job.error||''))return;
 const retryable=job.items.some(i=>allowed(job,i)&&['failed','processing','retry','pending'].includes(i.status));
 if(!retryable&&!job.error)return;
 const delay=job.error?60000:job.items.some(i=>allowed(job,i)&&i.status==='pending')?0:300000;
 job.status='running';job.reconnectAt=Date.now()+delay;write(job);
 for(let i=0;i<delay/5000;i++){await wait(5000);if(read().manualPause){const state=read();state.status='paused';write(state);return;}}
 const next=read();for(const item of next.items)if(allowed(next,item)&&['failed','processing','retry'].includes(item.status)){item.status='pending';item.attempts=0;delete item.error;}next.stop=false;next.error='';next.reconnectAt=null;write(next);
 workers=workers.filter(w=>!w.isDestroyed());
 }
}
async function start(options={}){
 if(options.hackerRank){const job=read();job.targetProviders=[...new Set([...(job.targetProviders?.length?job.targetProviders:['leetcode','codeforces']),'hackerrank'])];job.priorityProviders=['hackerrank'];for(const item of job.items)if(item.provider==='hackerrank'&&item.status==='failed'&&/unlock translation API key|Configure.*translation/i.test(item.error||'')){item.status='pending';delete item.error;delete item.retryAt;}if(Number.isInteger(options.concurrency)&&options.concurrency>=1&&options.concurrency<=98)job.targetConcurrency=options.concurrency;write(job);}
 if(running||alive(read()))return info();if(!require('./statement-translation').info().hasKey)throw Error('Configure translation first');
 const release=require('../../shared/process-lock')(path.join(app.getPath('userData'),'bulk-translation.owner'));if(!release)return info();
 try{
 running=true;const job=read();for(const i of job.items)if(['processing','retry'].includes(i.status))i.status='pending';job.stop=false;job.manualPause=false;job.pid=process.pid;job.status='running';job.concurrency=Number.isInteger(job.targetConcurrency)&&job.targetConcurrency>=1&&job.targetConcurrency<=98?job.targetConcurrency:3;job.error='';write(job);
 const unique=new Map(),rank={done:5,skipped:4,processing:3,retry:2,pending:1,failed:0};for(const item of job.items){const key=item.provider+':'+item.id,old=unique.get(key);if(!old||(rank[item.status]||0)>(rank[old.status]||0))unique.set(key,item);}job.items=[...unique.values()];write(job);
 supervise().catch(e=>{const state=read();state.status='paused';state.error=e.message;write(state);}).finally(()=>{running=false;for(const w of workers)if(!w.isDestroyed())w.destroy();workers=[];release();});return info();
 }catch(e){running=false;release();throw e;}
}
async function indexOne(){
 if(indexTask)return indexTask;
 indexTask=(async()=>{const result=await catalog.index(read(),browser);if(!result)return false;let job=read();const {provider}=result;const known=new Set(job.items.map(i=>i.provider+':'+i.id));for(const item of result.items)if(!known.has(provider+':'+item.id)){job.items.push({provider,id:item.id,title:item.title,paid:item.paid,status:item.paid?'skipped':'pending'});known.add(provider+':'+item.id);}
 job.providers[provider]=result.state;if(provider==='hackerrank'&&result.state.complete)job.providers[provider].total=job.items.filter(i=>i.provider===provider).length;write(job);return true;
 })().finally(()=>{indexTask=null;});return indexTask;
}
function store(item){const job=read(),index=job.items.findIndex(i=>i.provider===item.provider&&i.id===item.id);job.items[index]=item;write(job);return job;}
async function lane(worker){let processed=0;
 for(;;){let job=read();if(job.stop)return;let item;
 if(processed%5===0)item=job.items.find(i=>allowed(job,i)&&(!job.priorityProviders?.length||job.priorityProviders.includes(i.provider))&&i.status==='failed'&&i.retryAt&&i.retryAt<=Date.now());
 if(item){item.attempts=0;delete item.retryAt;}
 else {item=job.items.find(i=>i.status==='pending'&&allowed(job,i)&&job.priorityProviders?.includes(i.provider));if(!item&&job.priorityProviders?.some(p=>!job.providers[p]?.complete)){if(await indexOne())continue;}if(!item)item=job.items.find(i=>i.status==='pending'&&allowed(job,i));}
 if(!item){if(await indexOne())continue;return;}
 item.status='processing';item.translationModel=workerModels.get(worker.webContents.id)||require('./statement-translation').info().model;write(job);
 try{
 const detail=await loadSource(()=>browser.detail(item.provider,item.id));
 if(detail.paid||!detail.html){item.status=detail.paid?'skipped':'failed';item.error=detail.paid?'Premium':detail.sourceError||'Statement unavailable';}
 else if(typeof detail.savedVietnamese==='string'&&detail.savedVietnamese.trim()&&!item.repairTranslation){item.status='done';delete item.error;delete item.retryAt;}
 else{
 const article=await worker.webContents.executeJavaScript('(async()=>{const d='+JSON.stringify({html:detail.html,provider:item.provider,original:detail.savedOriginal,saved:item.repairTranslation?detail.savedVietnamese:null})+';const source=d.saved&&d.original?d.original:await ProblemBrowser.safeStatement(d.html,d.provider);const original=d.provider==="codeforces"?await StatementTranslation.normalizeEnglish(source):source;return{original,translated:d.saved&&original===source?await StatementTranslation.repairArticle(original,d.saved):await StatementTranslation.translateArticle(original),englishGenerated:original!==source};})()');
 const sourceHash=require('crypto').createHash('sha256').update(article.original).digest('hex');
 const dir=path.join(app.getPath('userData'),'translated-articles',item.provider);fs.mkdirSync(dir,{recursive:true});const storedDetail={...detail};delete storedDetail.savedVietnamese;delete storedDetail.savedOriginal;writeFileAtomicSync(path.join(dir,item.id+'.json'),JSON.stringify({detail:storedDetail,...article,sourceHash,translatedFromHash:sourceHash}),'utf8');item.status='done';delete item.error;delete item.retryAt;delete item.repairTranslation;
 }
 }catch(e){item.status='failed';item.error=e.message;}
 const transient=!!item.error&&/HTTP 429|HTTP 5\d\d|connect|valid JSON|does not match|protected formulas|Statement unavailable|verification page|Codeforces.*(?:verification|HTTP|statement content)/i.test(item.error);
 if(transient){item.attempts=(item.attempts||0)+1;if(item.attempts<3)item.status='retry';}
 if(transient&&item.status==='failed')item.retryAt=Date.now()+300000;
 job=store(item);
 if(item.status==='retry'){await wait(15000*item.attempts);item.status='pending';store(item);continue;}
 if(item.error&&(/HTTP (401|403)$/.test(item.error)||/unlock translation API key|Configure.*translation/i.test(item.error))){job=read();job.stop=true;job.error=item.error;write(job);return;}
 // Back off only this lane when the API is busy; other lanes can still finish.
 if(item.error&&/HTTP 429|HTTP 5\d\d|connect|invalid response/.test(item.error))await wait(60000);
 // Unavailable individual statements stay in the failed queue; they must not
 // stop unrelated problems or another platform because of historical failures.
 await wait(500);if(++processed%10===0)await indexOne();
 }
}
async function run(){
 if(!workers.length)for(let i=0;i<Math.min(4,read().concurrency||3);i++){const w=new BrowserWindow({show:false,webPreferences:{preload:path.join(__dirname,'../../../preload.js'),sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});workers.push(w);w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.on('will-navigate',e=>e.preventDefault());await w.loadFile(path.join(__dirname,'../../../src/translation-worker.html'));}
 while(read().claudeLane&&workers.filter(w=>workerModels.has(w.webContents.id)).length<Math.min(2,read().claudeLanes||1)){const w=new BrowserWindow({show:false,webPreferences:{preload:path.join(__dirname,'../../../preload.js'),sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});workers.push(w);const senderId=w.webContents.id;workerModels.set(senderId,'ag/claude-sonnet-4-6');w.on('closed',()=>workerModels.delete(senderId));w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.on('will-navigate',e=>e.preventDefault());await w.loadFile(path.join(__dirname,'../../../src/translation-worker.html'));}
 // Each article owns its detached DOM and translation arrays. Independent async
 // lanes can share a renderer without opening a Chromium process per article.
 const defaults=workers.filter(w=>!workerModels.has(w.webContents.id)),claude=workers.filter(w=>workerModels.has(w.webContents.id));
 const tasks=Array.from({length:read().concurrency||3},(_,i)=>lane(defaults[i%defaults.length]));tasks.push(...claude.map(w=>lane(w)));
 const results=await Promise.allSettled(tasks);const failed=results.find(r=>r.status==='rejected');let job=read();if(failed){job.stop=true;job.error=failed.reason?.message||'Worker failed';write(job);}
 if(!job.stop)await require('./translation-audit')({worker:defaults[0],dir:path.join(app.getPath('userData'),'translated-articles'),read,write,allowed});
 job=read();job.status=job.stop?'paused':'complete';write(job);
}
module.exports={start,pause,info:()=>({...info(),platforms:progress()}),modelForSender:id=>workerModels.get(id)};
