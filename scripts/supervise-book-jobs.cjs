'use strict';
const fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const ROOT=path.resolve(__dirname,'..'),dir=path.join(process.env.LOCALAPPDATA,'SemekoPracticeAI');fs.mkdirSync(dir,{recursive:true});
const release=require('../app/shared/process-lock')(path.join(dir,'supervisor.owner'));if(!release){console.log('Book job supervisor already running');process.exit(0);}
const jobs=[{name:'builder',script:'build-practice-omni.cjs',status:'build-status.json',env:{SEMEKO_BUILD_WORKERS:'2'}},{name:'study',script:'enrich-book-study.cjs',status:'study-status.json',env:{SEMEKO_STUDY_WORKERS:'3'}}];
const log=text=>fs.appendFileSync(path.join(dir,'supervisor.log'),new Date().toISOString()+' '+text+'\n');
function alive(pid){try{process.kill(pid,0);return true;}catch{return false;}}
function status(job){try{return JSON.parse(fs.readFileSync(path.join(dir,job.status),'utf8'));}catch{return{};}}
async function tick(){
 for(const job of jobs){const data=status(job);if(job.child&&alive(job.child.pid)||data.pid&&alive(data.pid))continue;if(data.phase==='complete')continue;
  if(Date.now()<(job.next||0))continue;
  if((job.rounds||0)>=4){log(job.name+' requires manual review after four recovery rounds');job.next=Infinity;continue;}
  try{const response=await fetch('http://127.0.0.1:20130/api/health',{signal:AbortSignal.timeout(2000)});if(!response.ok)continue;}catch{continue;}
  const env={...process.env,...job.env};delete env.ELECTRON_RUN_AS_NODE;
  const fd=fs.openSync(path.join(dir,job.name+'-supervised.log'),'a');const child=spawn(require('electron'),[path.join(ROOT,'scripts',job.script)],{cwd:ROOT,env,windowsHide:true,stdio:['ignore',fd,fd]});fs.closeSync(fd);job.child=child;job.rounds=(job.rounds||0)+1;log(job.name+' started '+child.pid);
  child.on('exit',(code,signal)=>{log(job.name+' exited '+code+' '+signal);job.child=null;job.next=Date.now()+60000;});
 }
}
void tick();setInterval(()=>void tick().catch(e=>log(e.message)),20000);
process.once('SIGTERM',()=>{release();process.exit(0);});
