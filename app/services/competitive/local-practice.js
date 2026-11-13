'use strict';
// Offline exercises imported from the user's archives. Detail is an individual
// exercise, never a document collection; provenance stays attached to the item.
let catalog,catalogTime=0,catalogIndex=new Map();
function all(){
    try{const fs=require('fs'),file=require('../../shared/content-library').config('local-practice/catalog.json'),time=fs.statSync(file).mtimeMs;if(!catalog||time!==catalogTime){catalog=JSON.parse(fs.readFileSync(file,'utf8')).items;catalogTime=time;sourceFingerprints.clear();}}
    catch(error){if(error.code!=='ENOENT')throw error;catalog=[];}
    if(catalogIndex.size!==catalog.length||catalogIndex._catalog!==catalog){catalogIndex=new Map(catalog.map(i=>[i.id,i]));catalogIndex._catalog=catalog;}return catalog;
}
const collator=new Intl.Collator('vi',{numeric:true,sensitivity:'base'});
let reviews={},reviewTime=0;
let adaptations={},adaptTime=0;
const sourceFingerprints=new Map();
function fingerprint(id){if(sourceFingerprints.has(id))return sourceFingerprints.get(id);all();const original=catalogIndex.get(id)?.html.match(/<div class="native-exercise-body">([\s\S]*)<\/div><\/article>$/)?.[1]||'';const text=original.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');const value=require('crypto').createHash('sha256').update(text).digest('hex');sourceFingerprints.set(id,value);return value;}
function adapted(id){try{const fs=require('fs'),file=require('../../shared/content-library').config('local-practice/adapted.json'),time=fs.statSync(file).mtimeMs;if(time!==adaptTime){adaptations=JSON.parse(fs.readFileSync(file,'utf8')).items||{};adaptTime=time;}}catch{}const value=adaptations[id];return value&&value.fingerprint===fingerprint(id)?value:undefined;}
function review(id){
    try{const fs=require('fs'),file=require('../../shared/content-library').config('local-practice/ai-reviewed.json'),time=fs.statSync(file).mtimeMs;if(time!==reviewTime){const next=JSON.parse(fs.readFileSync(file,'utf8'));reviews=next.items||{};reviewTime=time;}}catch{}
    const value=reviews[id];if(!value)return;
    return fingerprint(id)===value.fingerprint?value:undefined;
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function pageFurniture(text){return text.split('\n').filter(line=>!/^\s*(?:\d+\s+(?:Chapter|Chương)\s+\d+\b.*|(?:Chapter|Chương)\s+\d+[.\s].*|(?:Exercises|Programming Exercises|Self-Review Exercises)\s+\d+|\d+\s+(?:Exercises|Programming Exercises|Self-Review Exercises))\s*$/i.test(line)).join('\n');}
function decorate(item){
    let books;try{books=require('../../shared/content-library').json('book-courses/catalog.json').courses;}catch{books=[];}
    const book=books.find(b=>b.id===item.source.id),chapter=book?.chapters.find(c=>c.firstPage<=item.source.firstPage&&c.lastPage>=item.source.firstPage);
    return {...item,tags:chapter?[book.title,chapter.title]:item.tags,groupTitle:chapter?book.title+' · '+chapter.title:'C++ · '+item.tags[0],courseId:book?.id,chapterId:chapter?.id};
}
let listCache,listCachedAt=0,indexChecked=false;
function initialIndex(){if(indexChecked||process.env.SEMEKO_SKIP_PRACTICE_INDEX==='1')return;indexChecked=true;try{const fs=require('fs'),library=require('../../shared/content-library'),crypto=require('crypto'),index=JSON.parse(fs.readFileSync(library.config('local-practice/practice-index.json'),'utf8'));if(index.schema!==1||!Array.isArray(index.items)||index.items.length>100000)return;for(const [name,hash]of Object.entries(index.hashes||{})){if(!['catalog.json','adapted.json','ai-reviewed.json'].includes(name)||crypto.createHash('sha256').update(fs.readFileSync(library.config('local-practice/'+name))).digest('hex')!==hash)return;}if(!index.hashes?.['catalog.json'])return;return index.items;}catch{}}
exports.list=()=>{if(listCache&&Date.now()-listCachedAt<5000)return listCache;listCache=initialIndex()||buildList();listCachedAt=Date.now();return listCache;};
const buildList=()=>all().map(({html,tests,...item})=>decorate(item)).filter(i=>{
    const checked=review(i.id);
    // Book extraction is provisional. Keep the complete source in courses,
    // but do not present an unreviewed fragment as a ready-to-run CF problem.
    const ready=adapted(i.id);
    const study=require('./book-study'),issue=study.saved(i.id)?.qualityIssue,blocked=ready?.status==='ready'&&issue?.referenceHash===study.suiteHash(ready);
    return !blocked&&(!i.courseId||ready?.status==='ready')&&(ready?.status==='ready'||checked?.isExercise!==false)&&ready?.status!=='excluded'&&!/[.\u2026]{4,}\s*\d*\s*$/.test(i.title)&&!/(?:\bcontents\b|mục lục|^index$)/i.test(i.groupTitle);
}).map(i=>{const ready=adapted(i.id),checked=review(i.id);return ready?.status==='ready'?{...i,title:(i.title.replace(/^Bài\s+\*+/, 'Bài ').match(/^Bài\s+[\d.]+\s*/)?.[0]||'')+ready.title}:checked?.vi?{...i,title:(i.title.replace(/^Bài\s+\*+/, 'Bài ').match(/^Bài\s+[\d.]+\s*/)?.[0]||'')+checked.vi.title}:i;}).sort((a,b)=>{
    const session=i=>/BUOI\s*(\d+)/i.exec(i.tags[0]||'');const x=session(a),y=session(b);
    if(x&&y){const n=Number(x[1])-Number(y[1]);if(n)return n;}
    else if(!!x!==!!y)return x?-1:1;
    if(a.courseId&&a.courseId===b.courseId){const n=Number(a.chapterId)-Number(b.chapterId);if(n)return n;}
    return collator.compare(a.groupTitle,b.groupTitle)||collator.compare(a.title,b.title)||collator.compare(a.id,b.id);
});
function appendFigures(result,item,language){const locale=language==='en'?'en':'vi';for(const figure of item.figures||[]){try{const data=require('./course-figures').asset(figure.assetId),html='<figure class="practice-source-figure"><img src="'+data+'" alt="'+escape(figure.alt?.[locale]||'')+'"><figcaption>'+escape(figure.caption?.[locale]||'')+'</figcaption>'+((figure.legend||[]).length?'<small>'+escape(figure.legend.map(p=>p.label+' — '+p[locale]).join(' · '))+'</small>':'')+'</figure>';result.html=result.html.replace(/(<div class="section-title">(?:Đầu vào|Input)<\/div>)/,html+'$1');if(!result.html.includes(data))result.html+=html;}catch{result.html+='<p>'+escape(locale==='en'?'Source figure is temporarily unavailable.':'Hình nguồn hiện chưa tải được.')+'</p>';}}return result;}
exports.detail=(id,language='vi')=>{
    const item=all().find(item=>item.id===id);if(!item)return;
    const result=decorate(item);
    result.note=item.tests.length?item.tests.length+' test mẫu từ tài liệu.':'Nguồn không cung cấp test mẫu đã xác nhận.';
    const ready=adapted(id);
    if(ready?.status==='ready'){
        const study=require('./book-study'),pack=study.saved(id),hash=study.sourceHash(ready),validPack=pack?.sourceHash===hash?pack:null;
        if(pack?.qualityIssue?.referenceHash===study.suiteHash(ready))throw Error('Bài đang được sửa sau khi phát hiện lỗi ở test biên.');
        const text=language==='en'&&validPack?.en?validPack.en:ready;
        const suite=pack?.suite?.inputChecked===true&&pack.suite.sourceHash===hash&&pack.suite?.referenceHash===study.suiteHash(ready)?pack.suite:null;
        const tests=suite?.tests||ready.tests;
        const markdown=s=>require('marked').parse(escape(s));
        const en=language==='en'&&!!validPack?.en;
        result.title=(en?'Exercise '+(item.title.replace(/^Bài\s+\*+/, 'Bài ').match(/^Bài\s+([\d.]+)/)?.[1]||'')+' ':item.title.replace(/^Bài\s+\*+/, 'Bài ').match(/^Bài\s+[\d.]+\s*/)?.[0]||'')+text.title;
        const labels=en?['Problem','Input','Output','Constraints','Examples']:['Đề bài','Đầu vào','Đầu ra','Giới hạn','Ví dụ'];
        result.html='<article class="problem-statement local-cf-statement">'+['statement','input','output','constraints'].map((name,i)=>'<div class="section-title">'+labels[i]+'</div><div class="local-markdown">'+markdown(text[name])+'</div>').join('')+'<div class="section-title">'+labels[4]+'</div>'+tests.slice(0,3).map(t=>'<div class="sample-test"><div class="input"><div class="title">Input</div><pre>'+escape(t.input)+'</pre></div><div class="output"><div class="title">Output</div><pre>'+escape(t.output)+'</pre></div></div>').join('')+'</article>';
        result.tests=tests;result.referenceAnswer=ready.references[0];result.note=en?'Adapted from the book · '+tests.length+' tests checked against two C++ references.':'Bài chuẩn hóa từ sách · '+tests.length+' test đã chạy kiểm chứng bằng 2 lời giải C++.';
        result.language=en?'en':'vi';result.difficulty=validPack?.difficulty||'unclassified';result.hints=validPack?.hints?.[en?'en':'vi']||[];result.complexity=validPack?.complexity?.[en?'en':'vi'];result.testCoverage=suite?.coverage?.[en?'en':'vi'];
        appendFigures(result,item,en?'en':'vi');result.adapted=true;result.validationVersion=ready.validatedAt;result.verification=suite?{...ready.verification,cases:tests.length,extended:true}:ready.verification;return result;
    }
    const checked=review(id);
    if(checked?.isExercise===false)throw Error('Mục này không phải đề bài độc lập; xem nội dung trong khóa học gốc.');
    const body=item.html.match(/<div class="native-exercise-body">([\s\S]*)<\/div><\/article>$/)?.[1];
    if(body){
        const labels={'Input Format':'Đầu vào','Output Format':'Đầu ra','Constraints':'Giới hạn','Explanation':'Giải thích','Note':'Ghi chú'};
        const sampleStart=body.search(/^\s*Sample Input(?:\s+\d+)?\s*$/m);
        const lines=pageFurniture(sampleStart>=0&&result.tests.length?body.slice(0,sampleStart):body).split('\n');
        // A book exercise may consist of one sentence. That sentence is the
        // statement itself, not a redundant title that can be discarded.
        lines[0]=lines[0].replace(/^\s*(?:\[[^\]]+\]\.?\s*)?(?:Bài\s*\d+(?:\.\d+)?\s*[.:]?|\d+\.\d+\.?|\d+\.)\s*/i,'');
        const blocks=lines.join('\n').split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
        result.html='<article class="problem-statement local-cf-statement">'+blocks.map(s=>{
            if(labels[s])return '<div class="section-title">'+labels[s]+'</div>';
            if(/^Sample (?:Input|Output)\s*\d*$/i.test(s))return '<div class="section-title">'+s.replace('Sample Input','Ví dụ đầu vào').replace('Sample Output','Ví dụ đầu ra')+'</div>';
            return '<div class="local-statement-block">'+s+'</div>';
        }).join('')+'</article>';
    }
    if(checked?.isExercise){
        const text=checked.vi||checked;
        result.title=(item.title.replace(/^Bài\s+\*+/, 'Bài ').match(/^Bài\s+[\d.]+\s*/)?.[0]||'')+(text.title||checked.title);
        const sections=[['Đề bài',text.statement],['Đầu vào',text.input],['Đầu ra',text.output],['Giới hạn',text.constraints]];
        result.html='<article class="problem-statement local-cf-statement">'+sections.filter(([,text])=>text).map(([label,text])=>'<div class="section-title">'+label+'</div><div class="local-statement-block">'+escape(text)+'</div>').join('')+'</article>';
        result.aiReviewed=true;
    }
    if(result.tests.length)result.html+='<article class="local-cf-statement"><div class="section-title">Ví dụ</div>'+result.tests.map(t=>'<div class="sample-test"><div class="input"><div class="title">Input</div><pre>'+escape(t.input)+'</pre></div><div class="output"><div class="title">Output</div><pre>'+escape(t.output)+'</pre></div></div>').join('')+'</article>';
    const originalSamples=body?.match(/^\s*Sample Input(?:\s+\d+)?\s*$[\s\S]*/m)?.[0];
    if(originalSamples&&result.tests.length)result.html+='<details class="local-original-samples"><summary>Đối chiếu ví dụ và giải thích gốc</summary><pre>'+originalSamples+'</pre></details>';
    return appendFigures(result,item,language);
};
exports.progress=()=>{
    let classified=0,ready=0,rejected=0;
    for(const item of all()){const value=review(item.id);if(value?.reviewVersion!==2)continue;classified++;if(value.isExercise&&value.vi)ready++;else rejected++;}
    const validated=all().filter(i=>adapted(i.id)?.status==='ready').length;
    const adaptedRejected=all().filter(i=>adapted(i.id)?.status==='excluded').length;
    return {total:all().length,classified,ready,rejected,validated,adaptedRejected};
};
