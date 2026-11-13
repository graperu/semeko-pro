'use strict';
// Run with Electron, using the existing OS-encrypted provider key. Never logs keys.
const {app,safeStorage}=require('electron'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..'),crypto=require('crypto');
app.setPath('userData',path.join(process.env.APPDATA,'sameko-dev-cpp'));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disk-cache-dir',path.join(process.env.LOCALAPPDATA,'SemekoPracticeAI/cache'));
app.whenReady().then(async()=>{
 const config=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'sameko-dev-cpp/translation-provider.json'),'utf8'));
 const url=new URL(config.baseUrl);if(!['127.0.0.1','localhost'].includes(url.hostname)||url.port!=='20130')throw Error('OmniRouter tại cổng 20130 chưa được cấu hình');
 const key=safeStorage.decryptString(Buffer.from(config.encryptedKey,'base64'));
 const dir=path.join(process.env.LOCALAPPDATA,'SemekoPracticeAI');fs.mkdirSync(dir,{recursive:true});
 const lock=path.join(dir,'worker.pid');
 try{const old=Number(fs.readFileSync(lock,'utf8'));if(old){try{process.kill(old,0);throw Error('Đã có luồng rà bài đang chạy');}catch(e){if(e.code!=='ESRCH')throw e;}}}catch(e){if(e.code!=='ENOENT'&&e.code!=='ESRCH')throw e;}
 fs.writeFileSync(lock,String(process.pid));app.on('will-quit',()=>{try{if(fs.readFileSync(lock,'utf8')===String(process.pid))fs.unlinkSync(lock);}catch{}});
 const output=path.join(ROOT,'app/config/local-practice/ai-reviewed.json');let saved={version:1,items:{}};try{saved=JSON.parse(fs.readFileSync(output,'utf8'));}catch{}
 const bookIds=new Set(require('../app/config/book-courses/catalog.json').courses.map(b=>b.id));
 const items=[...require('../app/config/local-practice/catalog.json').items].sort((a,b)=>Number(bookIds.has(b.source.id))-Number(bookIds.has(a.source.id)));
 const translator=require('../app/services/competitive/statement-translation');
 let next=0,done=0,failed=0;const max=Number(process.env.SEMEKO_REVIEW_LIMIT)||items.length,workers=Math.min(8,Number(process.env.SEMEKO_REVIEW_WORKERS)||4);
 const status=()=>fs.writeFileSync(path.join(dir,'status.json'),JSON.stringify({pid:process.pid,model:config.model,total:items.length,reviewed:Object.keys(saved.items).length,done,failed,workers,updatedAt:Date.now()}));
 const normalize=s=>s.replace(/\s+/g,' ').trim();
 async function worker(){
  for(;;){const index=next++;if(index>=Math.min(max,items.length))return;const item=items[index];
   const raw=item.html.match(/<div class="native-exercise-body">([\s\S]*)<\/div><\/article>$/)?.[1]||'';
   const text=raw.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
   const fingerprint=crypto.createHash('sha256').update(text).digest('hex');
   if(saved.items[item.id]?.fingerprint===fingerprint&&saved.items[item.id]?.reviewVersion===2)continue;
   try{
    const response=await fetch(config.baseUrl.replace(/\/$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},signal:AbortSignal.timeout(90000),body:JSON.stringify({model:config.model,temperature:0,max_tokens:6000,messages:[{role:'system',content:'Review an extracted programming exercise. Return JSON only: {isExercise:boolean,kind:programming|knowledge|toc|incomplete,selfContained:boolean,title:string,statement:string,input:string,output:string,constraints:string,reason:string}. Accept only self-contained programming tasks with an actionable requirement. Reject table-of-contents, theory headings, fill-in-the-blank, multiple choice, knowledge questions, answers, merged multiple exercises, and tasks depending on a missing earlier class, figure or program. Set isExercise=false for rejected items and explain why. Read the supplied source carefully, do not treat a numbered heading as proof of an exercise. All statement/input/output/constraints MUST be exact contiguous quotations from the supplied text; do not invent I/O, tests or missing content. Use empty string for absent sections. Keep the original language and code unchanged. Title should be concise, omit exercise number. Do not include a solution in the statement.'},{role:'user',content:JSON.stringify({title:item.title,source:item.source,text:text.slice(0,22000)})}]})});
    if(!response.ok)throw Error('HTTP '+response.status);
    const data=await response.json(),content=data.choices?.[0]?.message?.content||'';const result=JSON.parse(content.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
    if(typeof result.isExercise!=='boolean'||typeof result.title!=='string')throw Error('Invalid review schema');
    for(const name of ['statement','input','output','constraints'])if(typeof result[name]!=='string'||result[name]&&!normalize(text).includes(normalize(result[name])))throw Error('Review changed source text');
    if(result.kind!=='programming'||result.selfContained!==true)result.isExercise=false;
    if(result.isExercise&&!result.statement.trim())throw Error('Empty exercise');
    if(result.isExercise){
     const names=['title','statement','input','output','constraints'],values=names.map(n=>result[n]||''),protectedValues=[];
     const protect=value=>value.replace(/^.*(?:#include|;\s*$).*$/gm,v=>'SEMEKO_KEEP_'+(protectedValues.push(v)-1)+'_END').replace(/SEMEKO_KEEP_\d+_END|\\[A-Za-z]+(?:\{[^}]*\})*|`[^`]*`|"[^"\n]*"|'[^'\n]*'|\b\d+(?:[.,]\d+)*\b/g,v=>/^SEMEKO_KEEP_/.test(v)?v:'SEMEKO_KEEP_'+(protectedValues.push(v)-1)+'_END');
     const nonempty=values.map((v,i)=>({text:protect(v),index:i})).filter(v=>v.text.trim());
     const translated=await translator.translate(nonempty.map(v=>v.text));const vi=Object.fromEntries(names.map(n=>[n,'']));
     translated.forEach((value,i)=>{vi[names[nonempty[i].index]]=value.replace(/SEMEKO_KEEP_(\d+)_END/g,(_,id)=>protectedValues[Number(id)]??'');});
     result.vi=vi;
    }
    saved.items[item.id]={...result,reviewVersion:2,fingerprint,model:config.model,reviewedAt:Date.now()};
    const tmp=output+'.tmp';fs.writeFileSync(tmp,JSON.stringify(saved));fs.renameSync(tmp,output);done++;status();
   }catch(e){failed++;fs.appendFileSync(path.join(dir,'errors.jsonl'),JSON.stringify({id:item.id,error:e.message,time:Date.now()})+'\n');status();if(/HTTP (401|403|429|503)/.test(e.message)){await new Promise(r=>setTimeout(r,15000));if(failed>=workers*3)return;}}
  }
 }
 status();await Promise.all(Array.from({length:workers},worker));status();console.log(JSON.stringify({done,failed,totalReviewed:Object.keys(saved.items).length}));app.quit();
}).catch(e=>{console.error(e.message);app.exit(1);});
