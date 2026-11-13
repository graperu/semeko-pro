'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const service=require('../../app/services/competitive/book-courses');
const courses=service.list();assert.equal(courses.length,4);let total=0;
for(const b of courses){
    const raw=fs.readFileSync(path.join(__dirname,'../../app/config/book-courses',b.id+'.pdf'));
    assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),b.sha256);
    let expected=1;for(const c of b.chapters){assert.equal(c.firstPage,expected);assert.ok(c.lastPage>=c.firstPage);expected=c.lastPage+1;
        const chapter=service.chapter(b.id,c.id);for(const ex of chapter.exercises){assert.equal(ex.courseId,b.id);assert.equal(ex.chapterId,c.id);assert.ok(ex.source.firstPage>=c.firstPage&&ex.source.firstPage<=c.lastPage);}
    }assert.equal(expected,b.pageCount+1);total+=b.pageCount;
}
assert.equal(total,3096);
assert.throws(()=>service.chapter('../x','1'));
console.log('PASS: four unchanged source books, 3,096 pages covered exactly once, chapters and exercise provenance');
