'use strict';
const fs=require('fs'),path=require('path');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
module.exports=function importExercises(task,exercises,{directory=path.join(__dirname,'../../config/local-practice')}={}){
 if(!Array.isArray(exercises)||!exercises.length)return[];
 const file=path.join(directory,'catalog.json'),manifestFile=path.join(directory,'manifest.json');
 const release=require('../../shared/process-lock')(file+'.course-owner');if(!release)throw Error('Exercise catalog is being updated');
 try{const catalog=JSON.parse(fs.readFileSync(file,'utf8')),book=require('../../shared/content-library').json('book-courses/catalog.json').courses.find(b=>b.id===task.bookId),ids=[];let changed=false;
 for(const e of exercises){const number=String(e.number).trim().replace(/^[*★]+\s*/,''),parts=/^(\d+(?:\.\d+)*)(?:\s*\(([a-z0-9]+)\)|([a-z]))?$/i.exec(number);if(!parts||!Number.isInteger(e.page)||e.page<task.firstPage||e.page>task.lastPage||!e.title?.vi||!e.title?.en||!e.task?.vi||!e.task?.en)throw Error('Invalid source exercise extraction');
 const existing=catalog.items.find(i=>i.source.id===task.bookId&&i.source.firstPage<=task.lastPage&&i.source.lastPage>=task.firstPage&&i.title.match(/(?:Bài|Exercise)\s+(\d+(?:\.\d+)*)/i)?.[1]===parts[1]);if(existing){ids.push(existing.id);if(e.figures?.length&&JSON.stringify(existing.figures)!==JSON.stringify(e.figures)){existing.figures=e.figures;changed=true;}continue;}
 const id=task.bookId+'-course-ex-'+e.page+'-'+(parts[1]+(parts[2]||parts[3]?'-'+(parts[2]||parts[3]):'')).replace(/\./g,'-');ids.push(id);if(catalog.items.some(i=>i.id===id))continue;const title='Bài '+e.number+'. '+e.title.vi;
 catalog.items.push({provider:'28tech',id,title,number:String(e.number),difficulty:'C++',tags:[book.title],paid:false,mode:'stdin',tests:[],figures:e.figures||[],url:'semeko://practice/'+id,source:{id:book.id,name:book.sourceName,firstPage:e.page,lastPage:e.page},html:'<article class="native-exercise"><h3>'+escape(title)+'</h3><div class="native-exercise-body">'+escape(e.task.en)+'</div></article>',note:'Source exercise recovered during course authoring; pending reference validation.'});changed=true;
 }if(changed){require('../../shared/atomic-json-publish')(file,catalog);const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));manifest.exerciseCount=catalog.items.length;require('../../shared/atomic-json-publish')(manifestFile,manifest);}return ids;
 }finally{release();}
};
