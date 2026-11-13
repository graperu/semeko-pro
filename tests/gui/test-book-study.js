'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),os=require('os'),{_electron}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../..'),id='local-7409ecfb47c5ebe53252e508-35';let app;
(async()=>{
 const books=require('../../app/config/book-courses/catalog.json').courses,book=books[1],chapter=book.chapters.find(c=>/^1\s/.test(c.title)),pageNumber=chapter.firstPage+1;
 const fixture=require('../fixtures/book-study.json'),pack=fixture[id];
 const theoryKey=book.id+'-p'+pageNumber+'-vi',theory=fixture[theoryKey];
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-study-gui-')),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 env.SEMEKO_STUDY_GLOBAL=path.join(ROOT,'tests/fixtures/book-study.json');
 app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+profile],env,cwd:ROOT});let page;
 for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}await page.waitForFunction(()=>window.App?.ready);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await app.evaluate((electron,{id,pack,theoryKey,theory})=>{const s=process.mainModule.require('./app/services/competitive/book-study');s.saveContent(id,pack);s.saveContent(theoryKey,theory);},{id,pack,theoryKey,theory});
 await page.evaluate(({book,page})=>BookCourses.openAt(book,page),{book:book.id,page:pageNumber});await page.locator('.book-page').waitFor();
 await page.locator('[data-study-bookmark]').click();await page.locator('.book-study-page-tools input[type=checkbox]').check();
 const notes=page.locator('.book-study-notes');await notes.locator('summary').click();await notes.locator('textarea').fill('ghi chú kiểm tra · EN/VI <b>literal</b>');
 await page.waitForFunction(({book,page})=>electronAPI.courseStudyState().then(r=>r.data.notes[book+':'+page]?.includes('<b>literal</b>')),{book:book.id,page:pageNumber});
 await page.locator('#book-study-language').selectOption('vi');await page.locator('.book-study-translation pre').waitFor({timeout:30000});assert.equal(await page.locator('.book-study-translation pre').textContent(),theory.text);
 await page.locator('#book-study-language').selectOption('en');await page.locator('.book-study-translation pre').waitFor({timeout:30000});assert.ok((await page.locator('.book-study-translation pre').textContent()).length>100);
 const search=page.locator('#book-study-toolbar input[type=search]');await search.fill('C++');await page.locator('#book-study-toolbar').evaluate(f=>f.requestSubmit());await page.locator('.book-pane main h3').filter({hasText:'Search results'}).waitFor();assert.ok(await page.locator('.book-pane main button').count()>0);
 await page.locator('#book-study-toolbar button').filter({hasText:'Bookmarks'}).click();assert.ok((await page.locator('.book-pane main').textContent()).includes('ghi chú kiểm tra'));
 await page.locator('#book-study-toolbar button').filter({hasText:'Content audit'}).click();await page.locator('.book-pane main h3').filter({hasText:'Chapter content audit'}).waitFor();
 await page.locator('#book-courses header button').click();await page.evaluate(id=>ProblemBrowser.openLibrary(id),id);
 await page.locator('.book-study-problem-tools select').selectOption('en');await page.waitForFunction(()=>document.getElementById('oj-statement').textContent.includes('Constraints'));
 assert.equal(await page.locator('.book-study-hints pre').count(),0);
 const hint=page.locator('.book-study-problem-tools button').filter({hasText:'Next hint'});for(let level=1;level<=3;level++){await hint.click();await page.waitForFunction(n=>document.querySelectorAll('.book-study-hints h4').length===n,level);assert.equal(await page.locator('.book-study-hints pre').count(),0);}
 await page.locator('.book-study-hints button').click();assert.ok((await page.locator('.book-study-hints pre').textContent()).includes('#include'));
 await page.locator('[data-study-strengthen]').click();await page.waitForFunction(()=>!document.getElementById('oj-start').disabled);
 const sourcePage=Number((await page.locator('#oj-source-page').textContent()).match(/\d+/)[0]);await page.locator('#oj-source-page').click();await page.waitForFunction(n=>document.querySelector('.book-page-tools input')?.value===String(n),sourcePage);
 await page.locator('#book-chapter-tools button').nth(1).click();const row=page.locator('[data-exercise-id="'+id+'"]');await row.locator(':scope>button.action-btn').click();
 await page.locator('select[aria-label="Exercise learning filter"]').selectOption('review');assert.equal(await page.locator('.book-study-exercise').count(),1);
 const saved=await page.evaluate(()=>electronAPI.courseStudyState());assert.ok(saved.data.exercises[id].review);assert.ok(saved.data.bookmarks[book.id+':'+pageNumber]);assert.ok(saved.data.chapters[book.id+':'+chapter.id].read);
 for(const [width,height]of [[1000,720],[760,520]]){await app.evaluate(({BrowserWindow},{width,height})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('index.html'));w.setSize(width,height);},{width,height});await page.waitForTimeout(150);assert.ok(await page.locator('#book-courses').evaluate(d=>d.scrollWidth<=d.clientWidth+2));}
 fs.mkdirSync(path.join(ROOT,'plans/artifacts/gui'),{recursive:true});await page.screenshot({path:path.join(ROOT,'plans/artifacts/gui/book-study-bilingual.png')});assert.deepEqual(errors,[]);
 console.log('PASS: real cached EN/VI problem/theory, three hint levels before code, verified-suite refresh, source-page jump, bookmarks/notes/read/review, search, audit and compact layout');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await app?.close();});
