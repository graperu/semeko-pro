'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),os=require('os'),{_electron}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../..');let app;
(async()=>{
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'semeko-books-'))],env,cwd:ROOT});
 let page;for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}await page.waitForFunction(()=>window.App?.ready);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.locator('#btn-book-courses').click();
 await page.waitForFunction(()=>document.querySelector('.book-page')?.complete&&document.querySelector('.book-page')?.naturalWidth>0,null,{timeout:60000});
 assert.equal(await page.locator('#book-courses>select option').count(),4);
 const books=await page.locator('#book-courses>select option').evaluateAll(nodes=>nodes.map(n=>n.value));
 for(const id of books){await page.locator('#book-courses>select').selectOption(id);await page.waitForFunction(()=>document.querySelector('.book-page')?.complete&&document.querySelector('.book-page')?.naturalWidth>0,null,{timeout:60000});assert.ok(await page.locator('.book-body nav [data-chapter]').count()>5);}
 await page.locator('#book-courses>select').selectOption(books[0]);await page.locator('[data-chapter="1"]').click();
 await page.waitForFunction(()=>document.querySelector('.book-page')?.naturalWidth>0,null,{timeout:60000});
 const sectionJump=page.locator('#book-chapter-tools select');assert.ok(await sectionJump.isVisible());const sectionPage=await sectionJump.locator('option').nth(1).getAttribute('value');await sectionJump.selectOption(sectionPage);await page.waitForFunction(n=>document.querySelector('.book-page-tools input')?.value===n,sectionPage,{timeout:60000});
 fs.mkdirSync(path.join(ROOT,'plans/artifacts/gui'),{recursive:true});await page.screenshot({path:path.join(ROOT,'plans/artifacts/gui/book-course-chapter.png')});
 await page.locator('#book-chapter-tools button').nth(1).click();
 if(await page.locator('.book-pane main .oj-result').count()){
  await page.locator('.book-pane main .oj-result').first().click();await page.locator('#oj-browser').waitFor({state:'visible'});await page.waitForFunction(()=>!document.getElementById('oj-start').disabled);
  assert.equal(await page.locator('#book-courses').evaluate(e=>e.open),false);
 }else assert.ok((await page.locator('.book-pane main').textContent()).includes('Chưa có bài tách riêng'));
 assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: all four books rendered inside app, chapter navigation, individual exercise handoff, no page errors');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await app?.close();});
