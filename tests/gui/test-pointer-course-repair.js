'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),os=require('os'),{_electron}=require('playwright-core');
const root=path.resolve(__dirname,'../..'),book='local-d4751bff47960ec6163862fc';let app;
(async()=>{
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 app=await _electron.launch({executablePath:require('electron'),args:[root,'--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'semeko-pointers-'))],cwd:root,env});
 let page;for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}
 await page.waitForFunction(()=>window.App?.ready);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(book=>CppCourse.navigate(book,book+'-course-363-lesson-2','vi'),book);
 await page.waitForFunction(()=>document.querySelector('#cpp-course main')?.textContent.includes('Tổng hợp khảo sát'));
 await page.locator('#cpp-course-language').selectOption('en');
 await page.waitForFunction(()=>document.querySelector('#cpp-course main')?.textContent.includes('Summarizing a poll'));
 await page.locator('[data-inline-example] summary').click();await page.locator('[data-inline-run]').click();
 await page.waitForFunction(()=>document.querySelector('.course-inline-run')?.textContent.includes('Highest Topic5 10'));
 assert.deepEqual(errors,[]);fs.mkdirSync(path.join(root,'plans/artifacts/gui'),{recursive:true});
 await page.screenshot({path:path.join(root,'plans/artifacts/gui/pointer-course-repair.png')});
 console.log('PASS Electron: Vietnamese/English polling lesson and inline compiled example, no renderer errors');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await app?.close();});
