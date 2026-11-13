'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),os=require('os'),{_electron}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../..');let app;
(async()=>{
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'semeko-course-'))],env,cwd:ROOT});let page;
 for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}await page.waitForFunction(()=>window.App?.ready);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.locator('#btn-book-courses').click();const dialog=page.locator('#cpp-course');await dialog.waitFor();assert.equal(await dialog.locator('img,iframe,canvas').count(),0);assert.ok((await dialog.textContent()).includes('Chương trình đầu tiên'));
 await dialog.locator('[data-complete]').click();assert.ok((await dialog.locator('fieldset').textContent()).includes('Trả lời đúng'));
 await dialog.locator('[data-answer="0"]').click();await dialog.locator('[data-complete]').click();await page.waitForFunction(()=>document.querySelector('#cpp-course main h2').textContent.startsWith('2.'));
 await dialog.locator('#cpp-course-language').selectOption('en');assert.equal(await dialog.locator('main h2').textContent(),'2. Variables and types');assert.ok((await dialog.textContent()).includes('✓ 1. Your first program'));
 await dialog.locator('nav button').filter({hasText:'Chapter practice'}).first().click();assert.equal(await dialog.locator('.cpp-course-task').count(),3);
 await dialog.locator('.cpp-course-task').first().locator('button').filter({hasText:'Write solution'}).click();await page.waitForFunction(()=>App.tabs.some(t=>t.testState?.problem?.problemId==='cpp-course-sum'));
 await page.evaluate(()=>getActiveEditor().getModel().setValue(CppCourseContent.exercises[0].solution));await page.evaluate(()=>runAllTests());const results=await page.evaluate(()=>batchTestResults);assert.equal(results.length,5);assert.ok(results.every(r=>r.status==='AC'),JSON.stringify(results));
 await page.evaluate(()=>CppCourse.open());await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('index.html')).setSize(800,600));assert.ok(await dialog.evaluate(d=>d.scrollWidth<=d.clientWidth+2));
 fs.mkdirSync(path.join(ROOT,'plans/artifacts/gui'),{recursive:true});await page.screenshot({path:path.join(ROOT,'plans/artifacts/gui/cpp-course.png')});assert.deepEqual(errors,[]);console.log('PASS authored bilingual lessons, no PDF/images, quiz gate, saved progress, fixed practice tests, real GCC 5/5 AC and compact layout');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await app?.close();});
