'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),{_electron}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../..'),pool=require('../fixtures/release-platform-solutions'),reportDir=path.join(ROOT,'plans/artifacts/testing');
fs.mkdirSync(reportDir,{recursive:true});const choiceFile=path.join(reportDir,'release-1.4.1-platform-selection.json');
let selection;
if(fs.existsSync(choiceFile))selection=JSON.parse(fs.readFileSync(choiceFile));
else{const seed=crypto.randomBytes(4).readUInt32LE();let state=seed;const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};selection={seed,scope:'Random 10 per platform from the recorded solution-supported candidate pool; public examples only',pool:Object.fromEntries(Object.entries(pool).map(([p,v])=>[p,Object.keys(v)])),chosen:{}};for(const [provider,codes]of Object.entries(pool)){const ids=Object.keys(codes);for(let i=ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}selection.chosen[provider]=ids.slice(0,10);}fs.writeFileSync(choiceFile,JSON.stringify(selection,null,2));}
let app;const report={started:new Date().toISOString(),selection,results:[],failures:[]};
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-release-platform-')),user=path.join(process.env.APPDATA,'sameko-dev-cpp');
 for(const [provider,ids]of Object.entries(selection.chosen)){const dest=path.join(profile,'translated-articles',provider);fs.mkdirSync(dest,{recursive:true});for(const id of ids)fs.copyFileSync(path.join(user,'translated-articles',provider,id+'.json'),path.join(dest,id+'.json'));}
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+profile],env,cwd:ROOT});let page;for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}await page.waitForFunction(()=>window.App?.ready);await page.evaluate(()=>ensureMonaco());
 for(const [provider,ids]of Object.entries(selection.chosen))for(const id of ids){try{
  const row=await page.evaluate(async({provider,id,code})=>{
   const response=await electronAPI.ojProblemDetail({provider,id});if(!response.ok)throw Error(response.error);const d=response.data;
   const html=await ProblemBrowser.safeStatement(d.html,provider),doc=new DOMParser().parseFromString(html,'text/html'),tests=ProblemBrowser.sampleTests(d);
   const source=new DOMParser().parseFromString(d.html,'text/html');
   const expectedSamples=provider==='codeforces'?source.querySelectorAll('.sample-test .input pre').length:d.examples?.length;
   if(!tests.length)throw Error('No runnable public samples extracted');
   if(expectedSamples!==tests.length)throw Error('Public example count mismatch: source '+expectedSamples+', app '+tests.length);
   await handleProblemReceived({name:d.title,url:d.url,sourcePlatform:provider,solutionMode:provider==='leetcode'?'function':'stdin',functionMetadata:d.metadata,tests},{newTab:true,starter:code,extension:'cpp'});
   await runAllTests();return{provider,id,title:d.title,officialURL:d.url,expectedSamples,tests:tests.map(t=>({input:t.input,output:t.output})),results:batchTestResults.map(r=>({status:r.status,actual:r.actualOutput??r.output,error:r.error})),statementChars:doc.body.textContent.length,mathErrors:doc.querySelectorAll('.katex-error').length};
  },{provider,id,code:pool[provider][id]});
  row.passed=row.results.length===row.tests.length&&row.results.every(r=>r.status==='AC')&&row.mathErrors===0;report.results.push(row);if(!row.passed)report.failures.push({provider,id,reason:'Sample or formula rendering failure',results:row.results,mathErrors:row.mathErrors});console.log((row.passed?'PASS':'FAIL')+' '+provider+' '+id+': '+row.tests.length+' public samples; '+row.results.map(r=>r.status).join(','));
 }catch(error){report.failures.push({provider,id,error:error.message});console.error('FAIL',provider,id,error.message);}fs.writeFileSync(path.join(reportDir,'release-1.4.1-platform-samples.json'),JSON.stringify(report,null,2));}
 assert.strictEqual(report.results.length,20);assert.strictEqual(report.failures.length,0,JSON.stringify(report.failures));
 await page.screenshot({path:path.join(ROOT,'plans/artifacts/gui/release-1.4.1-platform-samples.png')});
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{report.finished=new Date().toISOString();fs.writeFileSync(path.join(reportDir,'release-1.4.1-platform-samples.json'),JSON.stringify(report,null,2));await app?.close();console.log('TOTAL',report.results.length,'problems,',report.results.reduce((n,r)=>n+r.tests.length,0),'public samples,',report.failures.length,'failures');});
