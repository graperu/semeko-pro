'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),Module=require('module');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-browser-submit-')),load=Module._load,realTimeout=setTimeout,previous=process.env.SEMEKO_OFFICIAL_BROWSER;
delete process.env.SEMEKO_OFFICIAL_BROWSER;
let connected=true,mode='preflight',lcPosts=0,cfPosts=0,cfLists=0,seen=[],events=[];
fs.writeFileSync(path.join(root,'official-submissions.json'),JSON.stringify({connections:{7:{leetcode:{handle:'LCUser',transport:'bridge'},codeforces:{handle:'CFUser',transport:'bridge'}}},history:[]}));
const bridge={connected:()=>connected,stop(){},command:async(id,provider,command)=>{
 assert.strictEqual(id,'7');seen.push(command);
 if(command.action==='identity')return{handle:'CFUser'};
 if(command.action==='cf-submit'){cfPosts++;assert.strictEqual(command.payload.code,'int main(){}');assert.strictEqual(command.payload.expectedHandle,'CFUser');assert.strictEqual(command.payload.extension,'cpp');return{posted:true,ids:['124']};}
 assert.strictEqual(command.action,'request');const p=command.payload;
 if(provider==='codeforces'){assert(p.url.includes('/api/user.status'));return{status:'OK',result:[{id:++cfLists===1?100:124,verdict:'OK',passedTestCount:50}]};}
 if(p.url.endsWith('/graphql/')){const body=JSON.parse(p.options.body);return body.query.includes('userStatus')?{data:{userStatus:{isSignedIn:true,username:'LCUser'}}}:{data:{question:{questionId:'1'}}};}
 if(p.url.endsWith('/submit/')){
  assert.strictEqual(p.operation,'submit');assert.strictEqual(p.expectedHandle,'LCUser');
  if(mode==='preflight')return{posted:false,error:'Account changed before POST'};
  lcPosts++;if(mode==='uncertain')return{posted:true,error:'Connection lost after POST'};
  assert.strictEqual(JSON.parse(p.options.body).typed_code,'class Solution {}');return{posted:true,data:{submission_id:'123'}};
 }
 if(p.url.endsWith('/check/'))return{state:'SUCCESS',status_code:10,status_msg:'Accepted',total_correct:57,total_testcases:57};
 throw Error('Unexpected request');
}};
class BrowserWindow{constructor(){throw Error('Browser-backed submission must not open Electron');}static getAllWindows(){return[{isDestroyed:()=>false,webContents:{getURL:()=>'/index.html',send:(channel,data)=>events.push({...data})}}];}}
Module._load=function(name,...args){if(name==='electron')return{app:{getPath:()=>root},BrowserWindow};if(name==='./platform-session-bridge')return bridge;if(name==='./accounts')return{ensureSession:async()=>{},info:()=>({github:{id:7}}),submissionURL:url=>url.includes('codeforces.com')?{provider:'codeforces',url:'https://codeforces.com/problemset/submit/4/A'}:{provider:'leetcode',url:'https://leetcode.com/problems/two-sum/description/'}};return load.call(this,name,...args);};
global.setTimeout=(fn,ms,...args)=>realTimeout(fn,ms===4000?1:ms,...args);
const service=require('../../app/services/official-submissions');
async function wait(ticket){for(let i=0;i<200;i++){const job=service.info(7).history.find(j=>j.ticket===ticket);if(['finished','error','unknown'].includes(job?.phase))return job;await new Promise(r=>realTimeout(r,5));}throw Error('No result');}
(async()=>{
 const value={url:'https://leetcode.com/problems/two-sum/',code:'class Solution {}',extension:'cpp',expectedOwner:7,expectedHandle:'LCUser'};
 const rejected=await wait((await service.submit(value)).ticket);assert.strictEqual(rejected.phase,'error');assert.strictEqual(lcPosts,0);
 mode='success';const accepted=await wait((await service.submit(value)).ticket);assert.strictEqual(accepted.accepted,true);assert.strictEqual(accepted.total,57);assert.strictEqual(lcPosts,1);
 const cf=await wait((await service.submit({url:'https://codeforces.com/problemset/problem/4/A?locale=en',code:'int main(){}',extension:'cxx',expectedHandle:'CFUser'})).ticket);assert(cf.accepted);assert.strictEqual(cfPosts,1);assert.strictEqual(cf.problemURL,'https://codeforces.com/problemset/problem/4/A');assert(!seen.some(c=>c.action==='navigate'),'Submit must not foreground Chrome');
 mode='uncertain';const lost={...value,code:'uncertain source'};assert.strictEqual((await wait((await service.submit(lost)).ticket)).phase,'unknown');await assert.rejects(service.submit({...lost,url:value.url+'?locale=en'}),/chưa rõ/);assert.strictEqual(lcPosts,2,'No automatic POST replay');
 connected=false;const before=service.info(7).history.length;await assert.rejects(service.submit(value),/ngắt/);assert.strictEqual(service.info(7).history.length,before);
 assert(events.some(e=>e.phase==='judging'));console.log('PASS CF/LC bridge submits exact source once without foregrounding browser, preflight retry allowed, post uncertainty blocked across URL variants, disconnect blocked before history (simulated providers)');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{Module._load=load;global.setTimeout=realTimeout;if(previous===undefined)delete process.env.SEMEKO_OFFICIAL_BROWSER;else process.env.SEMEKO_OFFICIAL_BROWSER=previous;});
