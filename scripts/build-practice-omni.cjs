'use strict';
const {app,safeStorage}=require('electron'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..'),dir=path.join(process.env.LOCALAPPDATA,'SemekoPracticeAI');
app.setPath('userData',path.join(process.env.APPDATA,'sameko-dev-cpp'));app.disableHardwareAcceleration();app.commandLine.appendSwitch('disk-cache-dir',path.join(dir,'build-cache'));
app.whenReady().then(async()=>{
 fs.mkdirSync(dir,{recursive:true});const lock=path.join(dir,'builder.pid');
 try{const pid=Number(fs.readFileSync(lock,'utf8'));try{process.kill(pid,0);throw Error('Bộ biên soạn đang chạy');}catch(e){if(e.code!=='ESRCH')throw e;}}catch(e){if(e.code!=='ENOENT')throw e;}
 fs.writeFileSync(lock,String(process.pid));app.on('will-quit',()=>{try{if(fs.readFileSync(lock,'utf8')===String(process.pid))fs.unlinkSync(lock);}catch{}});
 const config=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'sameko-dev-cpp/translation-provider.json'),'utf8'));
 const url=new URL(config.baseUrl);if(!['localhost','127.0.0.1'].includes(url.hostname)||url.port!=='20130')throw Error('OmniRouter chưa được cấu hình');
 const key=safeStorage.decryptString(Buffer.from(config.encryptedKey,'base64'));
 const compiler=path.join(ROOT,'Sameko-GCC/bin/g++.exe');if(!fs.existsSync(compiler))throw Error('Chưa có GCC để kiểm chứng lời giải');
 const validator=require('../app/shared/practice-reference-validator');
 const repairFile=path.join(dir,'reference-repair.json'),study=require('../app/services/competitive/book-study');
 const repairs=()=>{try{return JSON.parse(fs.readFileSync(repairFile,'utf8'));}catch{return{};}};
 const watched=[__filename,repairFile,path.join(ROOT,'app/config/local-practice/catalog.json'),path.join(ROOT,'app/shared/practice-reference-validator.js'),path.join(ROOT,'app/services/competitive/book-courses.js')].map(file=>({file,time:fs.existsSync(file)?fs.statSync(file).mtimeMs:0}));let restartRequested=false;
 const output=path.join(ROOT,'app/config/local-practice/adapted.json');let saved={version:1,items:{}};try{saved=JSON.parse(fs.readFileSync(output,'utf8'));}catch{}
 const bookCatalog=require('../app/config/book-courses/catalog.json').courses,books=new Set(bookCatalog.map(b=>b.id));
 const bookService=require('../app/services/competitive/book-courses'),pageCache=new Map();
 async function sourceImage(id,page){const key=id+':'+page;if(!pageCache.has(key)){if(pageCache.size>=16)pageCache.delete(pageCache.keys().next().value);const work=(async()=>{const file=path.join(dir,'book-vision',id+'-'+page+'.jpg');if(!fs.existsSync(file))await new Promise((resolve,reject)=>require('child_process').execFile('python',['-X','utf8',path.join(ROOT,'scripts/render-book-page.py'),id,String(page),file],{windowsHide:true,timeout:45000},error=>error?reject(error):resolve()));return 'data:image/jpeg;base64,'+fs.readFileSync(file).toString('base64');})();pageCache.set(key,work);work.catch(()=>pageCache.delete(key));}return pageCache.get(key);}
 let items=[...require('../app/config/local-practice/catalog.json').items];
 // Start with clear, self-contained tasks already identified by the read pass.
 let reviews={};try{reviews=require('../app/config/local-practice/ai-reviewed.json').items;}catch{}
 items.sort((a,b)=>Number(!!reviews[b.id]?.isExercise)-Number(!!reviews[a.id]?.isExercise)||Number(books.has(b.source.id))-Number(books.has(a.source.id)));
 const limit=Number(process.env.SEMEKO_BUILD_LIMIT)||items.length,workers=Math.min(6,Number(process.env.SEMEKO_BUILD_WORKERS)||3);let next=0,ready=0,rejected=0,failed=0,active=0,phase='running';
 const save=()=>require('../app/shared/atomic-json-publish')(output,saved);
 const status=()=>fs.writeFileSync(path.join(dir,'build-status.json'),JSON.stringify({pid:process.pid,phase,total:items.length,ready:Object.values(saved.items).filter(i=>i.status==='ready').length,rejected:Object.values(saved.items).filter(i=>i.status==='excluded').length,failed:Object.values(saved.items).filter(i=>i.status==='failed').length,active,workers,model:config.model,updatedAt:Date.now()}));
 const system=`You are converting textbook programming exercises into complete Vietnamese stdin/stdout problems for a local educational judge. Read the original exercise, not just its heading. Preserve its mathematical/algorithmic learning objective. The user authorizes authoring missing I/O conventions, realistic finite constraints, deterministic tie-breaking rules, and test cases. Clearly distinguish this adaptation from verbatim source. Do NOT include a solution in statement sections.
 Return ONLY JSON with fields: {isProgramming:boolean,reason:string,title:string,statement:string,input:string,output:string,constraints:string,references:[string,string],testInputs:[string,...]}. All user-facing fields must be natural Vietnamese. Each reference is a COMPLETE C++17 stdin/stdout solution, two independently reasoned implementations (not identical copies). testInputs must contain >=10 valid stdin strings including minimal, typical, adversarial and boundary cases. Never return predicted outputs: the local validator will compute them from both programs and compare. Keep all original samples compatible. State exact output formatting, precision and tie breaking. No interactive prompts, OS/file/network APIs, clocks, randomness, external libraries or undefined behavior. Use ordinary C++ standard library headers. Do not use system, filesystem or file streams.
 Reject TOC, pure theory, MCQ, fill-in-the-blank, answer-only fragments and non-programming material with isProgramming=false and other text fields empty, references=[], testInputs=[]. A task referring to a missing class can be adapted into a self-contained console task if its core behavior is unambiguous; define all needed class behavior explicitly. Do not pretend a missing illustration or unknown requirement is known: reject if the objective cannot be recovered. If multiple exercises have been accidentally merged, reject rather than combine their requirements. Fixed-output beginner exercises may use empty stdin. For numeric algorithms test both special cases and nontrivial values within the stated bounds.`;
 async function worker(){for(;;){if(watched.some(w=>(fs.existsSync(w.file)?fs.statSync(w.file).mtimeMs:0)!==w.time)){restartRequested=true;return;}const index=next++;if(index>=Math.min(limit,items.length))return;const item=items[index];
  const raw=item.html.match(/<div class="native-exercise-body">([\s\S]*)<\/div><\/article>$/)?.[1]||'';
  const text=raw.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
  const fingerprint=crypto.createHash('sha256').update(text).digest('hex'),repair=repairs()[item.id],needsRepair=saved.items[item.id]?.status==='ready'&&repair?.referenceHash===study.suiteHash(saved.items[item.id]);if(saved.items[item.id]?.fingerprint===fingerprint&&['ready','excluded'].includes(saved.items[item.id].status)&&!needsRepair)continue;
  active++;status();let feedback=saved.items[item.id]?.error||(needsRepair?repair.error+'\nA legal counterexample input is:\n'+repair.input:'');
  for(let attempt=1;attempt<=3;attempt++){
   try{
    const sourceBook=bookCatalog.find(b=>b.id===item.source.id);
    const visionPages=sourceBook?[...new Set([item.source.firstPage,Math.min(item.source.firstPage+1,sourceBook.pageCount),item.source.lastPage])].slice(0,3):[];
    const prompt=JSON.stringify({originalTitle:item.title,sourceText:text.slice(0,22000),originalSamples:item.tests,previousValidationError:feedback,instruction:'Read the original page images when provided. Match ONLY this exercise number/title; ignore neighboring exercises and page headers. Images are primary authority for diagrams and formulas that text extraction damaged.'});
    const contentParts=[{type:'text',text:prompt}];for(const page of visionPages)contentParts.push({type:'image_url',image_url:{url:await sourceImage(item.source.id,page)}});
    const r=await fetch(config.baseUrl.replace(/\/$/,'')+'/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},signal:AbortSignal.timeout(180000),body:JSON.stringify({model:config.model,temperature:0,response_format:{type:'json_object'},max_tokens:14000,messages:[{role:'system',content:system},{role:'user',content:visionPages.length?contentParts:prompt}]})});
    if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json(),content=data.choices?.[0]?.message?.content||'';
    const value=JSON.parse(content.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
    if(typeof value.isProgramming!=='boolean')throw Error('Invalid problem schema');
    if(!value.isProgramming){saved.items[item.id]={status:'excluded',reason:String(value.reason||''),fingerprint,model:config.model};rejected++;save();break;}
    for(const field of ['title','statement','input','output','constraints'])if(typeof value[field]!=='string'||!value[field].trim()||value[field].length>20000)throw Error('Thiếu mục '+field);
    if(!Array.isArray(value.references)||value.references[0]?.replace(/\s/g,'')===value.references[1]?.replace(/\s/g,''))throw Error('Hai lời giải phải độc lập');
    if(needsRepair&&typeof repair.input==='string')value.testInputs.push(repair.input);
    const tests=await validator.validate(value,{compiler,sourceTests:item.tests||[]});
    saved.items[item.id]={status:'ready',fingerprint,model:config.model,validatedAt:Date.now(),title:value.title,statement:value.statement,input:value.input,output:value.output,constraints:value.constraints,tests,references:value.references,verification:{compiled:2,cases:tests.length,sourceCases:item.tests.length,visionPages}};ready++;save();break;
   }catch(e){feedback=e.message;fs.appendFileSync(path.join(dir,'build-errors.jsonl'),JSON.stringify({id:item.id,attempt,error:e.message,time:Date.now()})+'\n');if(attempt===3){failed++;saved.items[item.id]={status:'failed',fingerprint,error:e.message,model:config.model};save();}if(/HTTP (401|403|429|503)/.test(e.message))await new Promise(r=>setTimeout(r,msBackoff(attempt)));}
  }active--;status();
 }}
 function msBackoff(attempt){return Math.min(60000,10000*attempt);}
 for(let round=0;round<2;round++){next=0;status();await Promise.all(Array.from({length:workers},worker));if(restartRequested||!Object.values(saved.items).some(i=>i.status==='failed'))break;}
 if(restartRequested){phase='restarting';status();app.relaunch({args:process.argv.slice(1)});app.quit();return;}
 phase=Object.values(saved.items).some(i=>i.status==='failed')?'needs-review':'complete';status();console.log(JSON.stringify({ready,rejected,failed}));app.quit();
}).catch(e=>{console.error(e.message);app.exit(1);});
