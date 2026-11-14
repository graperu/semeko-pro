'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),os=require('os'),{_electron}=require('playwright-core');
const root=path.resolve(__dirname,'../..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-hr-translation-'));let app;
(async()=>{
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 app=await _electron.launch({executablePath:require('electron'),args:[root,'--user-data-dir='+profile],env,cwd:root});let page;
 for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}await page.waitForFunction(()=>window.App?.ready);
 await app.evaluate(()=>{
  const tr=process.mainModule.require('./app/services/competitive/statement-translation');tr.info=()=>({hasKey:true,model:'test'});tr.translate=async texts=>texts.map(t=>'Bản dịch '+t);
  const browser=process.mainModule.require('./app/services/competitive/problem-browser');browser.list=async({provider,track})=>({items:[{id:'common',title:'Shared'},{id:'hr-'+track,title:track}],total:2,pageSize:30});
  browser.detail=async(provider,id)=>({provider,id,url:'https://www.hackerrank.com/challenges/'+id+'/problem',html:'<p>Find the sum of two numbers.</p><pre>2 3\n5</pre><code>int x = 1;</code><img src="https://www.hackerrank.com/image.png" alt="Diagram">',snippets:{cpp:'int main(){}'}});
 });
 fs.writeFileSync(path.join(profile,'bulk-translation.json'),JSON.stringify({items:[{provider:'leetcode',id:'kept',status:'done'},{provider:'codeforces',id:'1-A',status:'pending'}],providers:{leetcode:{complete:true,total:1},codeforces:{complete:true,total:1}},targetProviders:['leetcode','codeforces'],targetConcurrency:2,claudeLane:true,status:'idle'}));
 const started=await app.evaluate(()=>process.mainModule.require('./app/services/competitive/bulk-translation').start({hackerRank:true,onlyHackerRank:true,claudeLane:false,concurrency:6}));assert.equal(started.concurrency,6);
 let state;for(let i=0;i<200;i++){state=await page.evaluate(()=>electronAPI.translationBulk('info'));if(state.data.status==='complete')break;await new Promise(r=>setTimeout(r,100));}
 assert.equal(state.data.status,'complete',JSON.stringify(state));assert.equal(state.data.platforms.hackerrank.done,7);assert.equal(state.data.platforms.hackerrank.total,7);assert.equal(state.data.platforms.leetcode.done,1);
 const scoped=JSON.parse(fs.readFileSync(path.join(profile,'bulk-translation.json'),'utf8'));assert.deepEqual(scoped.targetProviders,['hackerrank']);assert.equal(scoped.claudeLane,false);assert.equal(scoped.items.find(i=>i.provider==='codeforces').status,'pending');
 const article=JSON.parse(fs.readFileSync(path.join(profile,'translated-articles/hackerrank/common.json'),'utf8'));
 assert.ok(article.translated.includes('Bản dịch'));assert.ok(article.translated.includes('<pre>2 3\n5</pre>'));assert.ok(article.translated.includes('int x = 1;'));assert.ok(article.translated.includes('https://www.hackerrank.com/image.png'));assert.equal(article.detail.snippets.cpp,'int main(){}');
 assert.equal(article.sourceHash,article.translatedFromHash);
 await app.evaluate(()=>process.mainModule.require('./app/services/competitive/bulk-translation').start({hackerRank:true,allProviders:true,claudeLane:false,concurrency:6}));
 for(let i=0;i<200;i++){state=await page.evaluate(()=>electronAPI.translationBulk('info'));if(state.data.status==='complete')break;await new Promise(r=>setTimeout(r,100));}
 assert.equal(state.data.status,'complete');assert.equal(state.data.platforms.codeforces.done,1);assert.equal(state.data.platforms.hackerrank.done,7);assert.equal(state.data.platforms.leetcode.done,1);
 console.log('PASS real renderer pipeline: HackerRank six-track indexing, cross-track deduplication, progress, saved EN/VI pair, untouched samples/code/image and preserved LC progress (mock translation API)');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await app?.close();});
