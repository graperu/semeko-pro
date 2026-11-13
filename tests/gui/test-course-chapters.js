'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),os=require('os'),{_electron}=require('playwright-core');
const root=path.resolve(__dirname,'../..');let app;
(async()=>{
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 app=await _electron.launch({executablePath:require('electron'),args:[root,'--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'semeko-chapters-'))],env,cwd:root});
 let page;for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}
 await page.waitForFunction(()=>window.App?.ready);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.locator('#btn-book-courses').click();const dialog=page.locator('#cpp-course');await dialog.waitFor();
 const data=await page.evaluate(()=>CppCourseContent);assert.equal(data.chapters.length,8);assert.equal(data.lessons.length,26);assert.equal(data.exercises.length,24);
 assert.equal(await dialog.locator('.course-upcoming').count(),0);
 for(const chapter of data.chapters){
  const lessons=data.lessons.filter(l=>l.chapterId===chapter.id);assert.ok(lessons.length>=3);
  for(const lesson of lessons){
   await page.evaluate(id=>CppCourse.navigate('',id,'vi'),lesson.id);
   assert.equal(await dialog.locator('main h2').textContent(),lesson.title.vi);
   assert.equal(await dialog.locator('.course-example > pre').count(),1);
   await dialog.locator('#cpp-course-language').selectOption('en');
   assert.equal(await dialog.locator('main h2').textContent(),lesson.title.en);
   await dialog.locator('[data-answer="'+lesson.quiz.answer+'"]').click();
   assert.ok((await dialog.locator('.cpp-course-quiz').textContent()).includes('Correct.'));
  }
  const section=dialog.locator('.course-chapter').filter({has:page.locator('[data-lesson="'+lessons.at(-1).id+'"]')});
  await section.getByRole('button',{name:'Chapter practice',exact:true}).click();
  assert.equal(await dialog.locator('.cpp-course-task').count(),3);
  const chapterExercises=data.exercises.filter(e=>e.chapterId===chapter.id);
  for(const exercise of chapterExercises)assert.ok((await dialog.locator('main').textContent()).includes(exercise.title.en));
  const exam=await page.evaluate(async id=>electronAPI.courseToolsExam({bookId:'',chapterId:id}),chapter.id);
  assert.ok(exam.ok,JSON.stringify(exam));assert.equal(exam.data.questions.length,lessons.length);
  assert.ok(exam.data.questions.every(q=>lessons.some(l=>l.id===q.lessonId)),'Questions must stay in their chapter');
 }
 await page.evaluate(()=>CppCourse.navigate('','sort-search','vi'));
 fs.mkdirSync(path.join(root,'plans/artifacts/gui'),{recursive:true});await page.screenshot({path:path.join(root,'plans/artifacts/gui/course-all-chapters.png')});
 assert.deepEqual(errors,[]);console.log('PASS all 8 chapters: 26 lessons in VI/EN, quick checks, 24 chapter-specific tasks, chapter-specific exams and no pending placeholders');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await app?.close();});
