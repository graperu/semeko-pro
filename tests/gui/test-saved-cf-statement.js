'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),{_electron}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../..');let app;
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-saved-cf-'));
 const dir=path.join(profile,'translated-articles/codeforces');fs.mkdirSync(dir,{recursive:true});
 const original='<div class="header"><div class="title">A. Saved statement</div></div><p>Find the sum of two integers.</p><div class="sample-test"><div class="input"><div class="title">Input</div><pre>2 3</pre></div><div class="output"><div class="title">Output</div><pre>5</pre></div></div>';
 fs.writeFileSync(path.join(dir,'1-A.json'),JSON.stringify({original,translated:'<p>Tính tổng hai số nguyên.</p>',detail:{provider:'codeforces',id:'1-A',html:'old',title:'Saved statement'}}));
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+profile],env,cwd:ROOT});
 let page;for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}
 await page.waitForFunction(()=>typeof ensureMonaco==='function');await page.evaluate(()=>ensureMonaco());await page.waitForFunction(()=>window.App?.ready);
 const detail=await app.evaluate(async()=>{global.fetch=async()=>({ok:true,text:async()=>JSON.stringify({status:'OK',result:{problems:[{contestId:1,index:'A',name:'Saved statement'}]}})});return process.mainModule.require('./app/services/competitive/problem-browser').detail('codeforces','1-A');});
 assert.strictEqual(detail.savedOriginal,original);assert(detail.html.startsWith('<div class="problem-statement">'));
 const rendered=await page.evaluate(async detail=>{const html=await ProblemBrowser.safeStatement(detail.html,'codeforces');const el=document.getElementById('oj-statement');el.innerHTML=html;document.getElementById('oj-browser').showModal();return{text:el.textContent,inputs:[...el.querySelectorAll('.input pre')].map(p=>p.textContent),outputs:[...el.querySelectorAll('.output pre')].map(p=>p.textContent)};},detail);
 assert(rendered.text.includes('Find the sum'));assert.deepStrictEqual(rendered.inputs,['2 3']);assert.deepStrictEqual(rendered.outputs,['5']);
 await app.evaluate(()=>{process.mainModule.require('./app/services/competitive/statement-translation').translate=async texts=>texts;});
 const long=await page.evaluate(async()=>{const text='Given an array, return the answer. '.repeat(5000);const html=await StatementTranslation.translateArticle('<p>'+text+'</p>');const div=document.createElement('div');div.innerHTML=html;return{length:div.textContent.length,expected:text.length};});assert.strictEqual(long.length,long.expected);
 const fallback=await page.evaluate(async()=>{const render=katex.render;katex.render=()=>{throw Error('Expected node of symbol group type');};try{return await ProblemBrowser.safeStatement('<div class="problem-statement"><p>Preserved question</p><span data-statement-math="inline">x_i</span><pre>1 2</pre></div>','codeforces');}finally{katex.render=render;}});assert(fallback.includes('Preserved question'));assert(fallback.includes('x_i'));assert(fallback.includes('<pre>1 2</pre>'));
 const recovered=path.join(process.env.APPDATA,'sameko-dev-cpp/codeforces-statements/en/2073-A.html');
 if(fs.existsSync(recovered)){
  const actual=await page.evaluate(async html=>{const safe=await ProblemBrowser.safeStatement(html,'codeforces');const el=document.getElementById('oj-statement');el.innerHTML=safe;const images=[...el.querySelectorAll('img')];await Promise.all(images.map(async img=>{img.loading='eager';await img.decode();}));return{images:images.length,decoded:images.every(i=>i.naturalWidth>0),text:el.textContent};},fs.readFileSync(recovered,'utf8'));
  assert.strictEqual(actual.images,2);assert(actual.decoded);assert(actual.text.includes('Control Towers'));
  await page.screenshot({path:path.join(ROOT,'plans/artifacts/source-recovery/2073-A-in-app.png')});
 }
 console.log('PASS saved CF content and samples, 170KB prose batching, formula fallback, recovered original PDF pages decode in real app');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>await app?.close());
