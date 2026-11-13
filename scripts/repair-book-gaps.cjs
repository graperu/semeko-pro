'use strict';
const fs=require('fs'),path=require('path'),zlib=require('zlib');const ROOT=path.resolve(__dirname,'..');
const service=require('../app/services/competitive/book-study'),report=service.audit(),dir=path.join(ROOT,'app/config/local-practice');
const doc=JSON.parse(fs.readFileSync(path.join(dir,'catalog.json'),'utf8')),pages=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir,'source-pages.json.gz'))));
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const added=[];
for(const book of report)for(const chapter of book.chapters)for(const heading of chapter.unmapped){
    if(!/^\(|\b(?:write|create|implement|design|build|develop|modify|update|display|compute|calculate|print)\b/i.test(heading.title))continue;
    const id=book.id+'-gap-'+heading.number.replace(/\./g,'-')+'-'+heading.page;if(doc.items.some(i=>i.id===id))continue;
    const source=pages[book.id].pages.slice(heading.page-1,Math.min(heading.page+2,chapter.lastPage));const combined=source.join('\n\f\n');
    const number=heading.number.replace(/\./g,'\\.'),match=new RegExp('^\\s*\\**'+number+'[.]?\\s+','m').exec(combined);if(!match)continue;
    const bodyStart=match.index,after=combined.slice(bodyStart+match[0].length),chapterNo=heading.number.split('.')[0];
    const next=new RegExp('^\\s*\\**'+chapterNo+'\\.\\d+[.]?\\s+[A-Za-z(]','m').exec(after);
    const end=next?bodyStart+match[0].length+next.index:combined.length,body=combined.slice(bodyStart,end).trim();if(body.length<40)continue;
    const lastPage=heading.page+(combined.slice(0,end).match(/\f/g)||[]).length;
    doc.items.push({provider:'28tech',id,title:'Bài '+heading.number+'. '+heading.title,number:'',difficulty:'C++',tags:[book.title],paid:false,mode:'stdin',tests:[],url:'semeko://practice/'+id,source:{id:book.id,name:pages[book.id].name,firstPage:heading.page,lastPage},html:'<article class="native-exercise"><div class="native-exercise-body">'+escape(body)+'</div></article>',note:'Candidate recovered by chapter source audit; awaiting validation.'});added.push(id);
}
if(added.length){const write=require('../app/shared/fs-atomic').writeFileAtomicSync;write(path.join(dir,'catalog.json'),JSON.stringify(doc),'utf8');const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));manifest.exerciseCount=doc.items.length;manifest.maintenanceImports=[...(manifest.maintenanceImports||[]),{at:Date.now(),kind:'chapter-source-audit',ids:added}];write(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2),'utf8');}
console.log(JSON.stringify({recoveredCandidates:added.length,totalCandidates:doc.items.length}));
