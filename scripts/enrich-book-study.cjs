'use strict';
const {app}=require('electron'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..'),dir=path.join(process.env.LOCALAPPDATA,'SemekoPracticeAI');
app.setPath('userData',path.join(process.env.APPDATA,'sameko-dev-cpp'));app.disableHardwareAcceleration();app.commandLine.appendSwitch('disk-cache-dir',path.join(dir,'study-cache'));
app.whenReady().then(async()=>{
 fs.mkdirSync(dir,{recursive:true});const release=require('../app/shared/process-lock')(path.join(dir,'book-study.owner'));if(!release)throw Error('Book enrichment already running');app.on('will-quit',release);
 const study=require('../app/services/competitive/book-study'),books=require('../app/config/book-courses/catalog.json').courses;
 const watched=[__filename,path.join(ROOT,'app/services/competitive/book-study.js')].map(file=>({file,time:fs.statSync(file).mtimeMs}));let restartRequested=false;
 const original=require('../app/config/local-practice/catalog.json').items,ready=require('../app/config/local-practice/adapted.json').items;
 const output=path.join(ROOT,'app/config/book-courses/study-content.json');let published={};try{published=JSON.parse(fs.readFileSync(output,'utf8'));}catch{}
 const publish=key=>{published[key]=study.saved(key);require('../app/shared/atomic-json-publish')(output,published);};
 const tasks=[];
 for(const book of books){tasks.push({key:'meta-'+book.id,kind:'meta',bookId:book.id});}
 for(const item of original.filter(i=>books.some(b=>b.id===i.source.id)&&ready[i.id]?.status==='ready'))tasks.push({key:item.id,kind:'exercise',id:item.id});
 for(const book of books)for(const chapter of book.chapters)tasks.push({key:'sections-'+book.id+'-'+chapter.id,kind:'sections',bookId:book.id,chapterId:chapter.id});
 if(process.env.SEMEKO_STUDY_THEORY!=='0')for(const book of books)for(let page=1;page<=book.pageCount;page++)for(const language of ['vi','en'])tasks.push({key:book.id+'-p'+page+'-'+language,kind:'theory',bookId:book.id,page,language});
 const max=Number(process.env.SEMEKO_STUDY_LIMIT)||Infinity,workers=Math.min(4,Number(process.env.SEMEKO_STUDY_WORKERS)||3);let next=0,done=0,failed=0,phase='running',authFailure=false,lastRefresh=0;const errors=[],known=new Set(tasks.map(t=>t.key));
 function refreshReady(){if(Date.now()-lastRefresh<15000)return;lastRefresh=Date.now();const updated=JSON.parse(fs.readFileSync(path.join(ROOT,'app/config/local-practice/adapted.json'),'utf8')).items,raw=JSON.parse(fs.readFileSync(path.join(ROOT,'app/config/local-practice/catalog.json'),'utf8')).items;const fresh=raw.filter(i=>!known.has(i.id)&&books.some(b=>b.id===i.source.id)&&updated[i.id]?.status==='ready').map(i=>({key:i.id,kind:'exercise',id:i.id}));for(const value of fresh)known.add(value.key);tasks.splice(next,0,...fresh);}
 const status=()=>fs.writeFileSync(path.join(dir,'study-status.json'),JSON.stringify({pid:process.pid,phase,total:tasks.length,scheduled:Math.min(max,tasks.length),done,failed,workers,published:Object.keys(published).length,updatedAt:Date.now()}));
 async function task(value){if(value.kind==='meta')await study.ensureMeta(value);else if(value.kind==='sections')await study.sectionMeta(value);else if(value.kind==='exercise'){await study.ensureProblem(value);await study.strengthen(value);}else await study.theory(value);publish(value.key);done++;status();}
 async function worker(){for(;;){if(authFailure)return;if(watched.some(w=>fs.statSync(w.file).mtimeMs!==w.time)){restartRequested=true;return;}refreshReady();const index=next++;if(index>=Math.min(max,tasks.length))return;const value=tasks[index];try{await task(value);}catch(e){failed++;errors.push(value);fs.appendFileSync(path.join(dir,'study-errors.jsonl'),JSON.stringify({key:value.key,kind:value.kind,error:e.message,time:Date.now()})+'\n');if(/HTTP (401|403)/.test(e.message))authFailure=true;status();if(/HTTP (429|503)|fetch failed/.test(e.message))await new Promise(r=>setTimeout(r,15000));}}}
 status();await Promise.all(Array.from({length:workers},worker));
 if(restartRequested){phase='restarting';status();app.relaunch({args:process.argv.slice(1)});app.quit();return;}
 if(!authFailure)for(const value of errors){try{await task(value);failed--;}catch{}status();}
 phase=authFailure?'waiting-service':failed?'needs-review':'complete';status();console.log(JSON.stringify({done,failed,published:Object.keys(published).length}));app.quit();
}).catch(e=>{console.error(e.message);app.exit(1);});
