'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),os=require('os'),{_electron}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../..');let app;
(async()=>{
 const store=require('../../app/config/local-practice/adapted.json').items;
 const entry=Object.entries(store).find(([,v])=>v.status==='ready'&&v.title==='Mã ASCII của ký tự')||Object.entries(store).find(([,v])=>v.status==='ready');assert.ok(entry,'Need a compiled and verified adaptation');const [id,problem]=entry;
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'semeko-adapted-'))],env,cwd:ROOT});
 let page;for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}await page.waitForFunction(()=>window.App?.ready);
 await page.evaluate(id=>ProblemBrowser.openLibrary(id),id);await page.waitForFunction(()=>!document.getElementById('oj-start').disabled);
 assert.equal(await page.locator('#oj-statement .sample-test').count(),3);assert.ok((await page.locator('#oj-source-page').textContent()).startsWith('Tr. '));
 const headings=await page.locator('#oj-statement .section-title').allTextContents();for(const name of ['Đề bài','Đầu vào','Đầu ra','Giới hạn','Ví dụ'])assert.ok(headings.includes(name));
 assert.ok(!(await page.locator('#oj-statement').textContent()).includes('#include'));
 fs.mkdirSync(path.join(ROOT,'plans/artifacts/gui'),{recursive:true});await page.screenshot({path:path.join(ROOT,'plans/artifacts/gui/adapted-practice-cf.png')});
 await page.locator('#oj-start').click();await page.waitForFunction(()=>window.App?.tabs.some(t=>t.testState?.problem?.tests?.length>=8));
 await page.evaluate(code=>getActiveEditor().getModel().setValue(code),problem.references[0]);
 assert.ok(await page.locator('#input-area').evaluate(n=>n.readOnly));assert.ok(await page.locator('#expected-area').evaluate(n=>n.readOnly));
 await page.evaluate(()=>runAllTests());
 const results=await page.evaluate(()=>batchTestResults);assert.ok(results.length>=problem.tests.length);assert.ok(results.every(r=>r.status==='AC'),JSON.stringify(results));
 const emptyExpected=await page.evaluate(async input=>{
  const response=await electronAPI.runTest({exePath:App.exePath,input,expectedOutput:'',timeLimit:3000,testMeta:{expectedPresent:true}});return response;
 },problem.tests.find(t=>t.output.trim()).input);
 assert.equal(emptyExpected.status,'WA','Explicit empty expected output must still be judged');
 await page.screenshot({path:path.join(ROOT,'plans/artifacts/gui/adapted-practice-all-tests.png')});
 console.log('PASS: Vietnamese CF structure, 3 Input/Output example boxes, corner source page, hidden solution, locked tests, real app GCC '+results.length+'/'+results.length+' AC');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await app?.close();});
