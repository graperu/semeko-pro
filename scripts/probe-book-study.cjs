'use strict';
const {app}=require('electron'),path=require('path');
app.setPath('userData',path.join(process.env.APPDATA,'sameko-dev-cpp'));app.disableHardwareAcceleration();app.commandLine.appendSwitch('disk-cache-dir',path.join(process.env.LOCALAPPDATA,'SemekoPracticeAI/probe-cache'));
app.whenReady().then(async()=>{
 const study=require('../app/services/competitive/book-study'),books=require('../app/config/book-courses/catalog.json').courses;
 const id='local-7409ecfb47c5ebe53252e508-35';const pack=await study.ensureProblem({id}),suite=await study.strengthen({id});
 const book=books[1],page=book.chapters.find(c=>/^1\s/.test(c.title)).firstPage+1;
 const en=await study.theory({bookId:book.id,page,language:'en'}),vi=await study.theory({bookId:book.id,page,language:'vi'});
 const first=books[0],firstChapter=first.chapters.find(c=>41>=c.firstPage&&41<=c.lastPage);
 await study.theory({bookId:first.id,page:41,language:'en'});await study.theory({bookId:first.id,page:41,language:'vi'});
 await study.sectionMeta({bookId:book.id,chapterId:book.chapters.find(c=>page>=c.firstPage&&page<=c.lastPage).id});await study.sectionMeta({bookId:first.id,chapterId:firstChapter.id});
 console.log(JSON.stringify({exercise:id,bilingual:!!pack.en&&!!pack.vi,hintLevels:pack.hints.en.length,verifiedTests:suite.tests.length,theoryBook:book.id,page,englishCharacters:en.text.length,vietnameseCharacters:vi.text.length}));app.quit();
}).catch(e=>{console.error(e.message);app.exit(1);});
