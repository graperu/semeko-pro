'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const atomic=require('../../shared/fs-atomic').writeFileAtomicSync;
const pending=new Map(),limit=require('../../shared/async-limiter')(3);
const root=()=>process.env.SEMEKO_STUDY_DATA||path.join(require('electron').app?.getPath('userData')||require('os').tmpdir(),'book-study');
function id(value){if(typeof value!=='string'||!/^[a-zA-Z0-9-]{1,160}$/.test(value))throw Error('Invalid study identifier');return value;}
function read(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
function write(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});atomic(file,JSON.stringify(value),'utf8');}
const globalFile=process.env.SEMEKO_STUDY_GLOBAL||require('../../shared/content-library').config('book-courses/study-content.json');let globals={},globalTime=0;
function globalContent(){try{const time=fs.statSync(globalFile).mtimeMs;if(time!==globalTime){globals=read(globalFile,{});globalTime=time;}}catch(e){if(e.code!=='ENOENT')throw e;}return globals;}
function saved(key){id(key);const local=read(path.join(root(),'content',key+'.json'),null),global=globalContent()[key];if(!local)return global||null;if(!global)return local;const value=(global.updatedAt||0)>(local.updatedAt||0)?{...local,...global}:{...global,...local};if(global.suite&&(!local.suite||(global.suite.updatedAt||0)>(local.suite.updatedAt||0)))value.suite=global.suite;if(global.qualityIssue&&(!local.qualityIssue||global.qualityIssue.at>local.qualityIssue.at))value.qualityIssue=global.qualityIssue;return value;}
function saveContent(key,value){id(key);const file=path.join(root(),'content',key+'.json');fs.mkdirSync(path.dirname(file),{recursive:true});const release=require('../../shared/process-lock')(file+'.owner');if(!release)throw Error('Study content is being saved; retry shortly');try{const merged={...(read(file,null)||{}),...value};write(file,merged);return merged;}finally{release();}}
function state(){return read(path.join(root(),'progress.json'),{version:1,pages:{},chapters:{},exercises:{},bookmarks:{},notes:{}});}
function validateLocation(value){const book=require('./book-courses').list().find(b=>b.id===value.bookId);if(!book||!Number.isInteger(value.page)||value.page<1||value.page>book.pageCount)throw Error('Invalid book page');return book;}
function update(value){
    const current=state();if(!['bookmark','note','read','review'].includes(value.kind))throw Error('Invalid study action');
    if(value.kind==='review'){const exercise=read(require('../../shared/content-library').config('local-practice/catalog.json'),{items:[]}).items.find(i=>i.id===id(value.id));if(!exercise)throw Error('Unknown exercise');current.exercises[value.id]={...(current.exercises[value.id]||{}),review:!!value.value};}
    else{const book=validateLocation(value),key=book.id+':'+value.page;
        if(value.kind==='bookmark'){if(value.value)current.bookmarks[key]={bookId:book.id,page:value.page};else delete current.bookmarks[key];}
        if(value.kind==='note'){if(typeof value.value!=='string'||value.value.length>20000)throw Error('Note exceeds limit');if(value.value)current.notes[key]=value.value;else delete current.notes[key];}
        if(value.kind==='read'){const chapter=book.chapters.find(c=>c.id===value.chapterId);if(!chapter)throw Error('Unknown chapter');current.chapters[book.id+':'+chapter.id]={read:!!value.value,updatedAt:Date.now()};}
    }write(path.join(root(),'progress.json'),current);return current;
}
async function modelJSON(system,value,images=[]){
    const config=read(path.join(require('electron').app.getPath('userData'),'translation-provider.json'),{});
    if(!config.encryptedKey)throw Error('Configure the translation service first');
    const key=require('electron').safeStorage.decryptString(Buffer.from(config.encryptedKey,'base64'));
    return limit(async()=>{const data=await require('../../shared/study-model-request').request(config.baseUrl.replace(/\/$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},signal:AbortSignal.timeout(150000),body:JSON.stringify({model:config.model,temperature:0,response_format:{type:'json_object'},max_tokens:14000,messages:[{role:'system',content:system},{role:'user',content:images.length?[{type:'text',text:JSON.stringify(value)},...images.map(url=>({type:'image_url',image_url:{url}}))]:JSON.stringify(value)}]})});return JSON.parse(String(data.choices?.[0]?.message?.content||'').replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));});
}
function source(id){const doc=read(require('../../shared/content-library').config('local-practice/adapted.json'),{items:{}}),item=doc.items[id];if(item?.status!=='ready')throw Error('Exercise is not yet verified');if(saved(id)?.qualityIssue?.referenceHash===suiteHash(item))throw Error('Reference solution is being repaired after a failing stress case');return item;}
function sourceHash(item){return crypto.createHash('sha256').update(JSON.stringify([item.fingerprint,item.statement,item.input,item.output,item.constraints])).digest('hex');}
function suiteHash(item){return crypto.createHash('sha256').update(JSON.stringify([sourceHash(item),item.references,item.tests])).digest('hex');}
function singleFlight(key,work){if(!pending.has(key)){const task=work().finally(()=>pending.delete(key));pending.set(key,task);}return pending.get(key);}
async function ensureProblem(value){
    const key=id(value.id),item=source(key),hash=sourceHash(item),found=saved(key);if(found?.sourceHash===hash&&found.en&&found.vi&&found.hints&&(!(found.hintHash||found.suite?.referenceHash)||(found.hintHash||found.suite?.referenceHash)===suiteHash(item)))return found;
    return singleFlight(key,async()=>{
        const keep=[],protectedSource=Object.fromEntries(['title','statement','input','output','constraints'].map(name=>[name,item[name].replace(/\b\d+(?:\.\d+)?\b/g,v=>'SEMEKO_KEEP_'+(keep.push(v)-1)+'_END')]));
        const result=await modelJSON('Create a bilingual educational pack for this VERIFIED programming problem. Return JSON {en:{title,statement,input,output,constraints},vi:{title,statement,input,output,constraints},hints:{en:[hint1,hint2,approach],vi:[hint1,hint2,approach]},difficulty:"basic"|"intermediate"|"advanced",complexity:{en:string,vi:string}}. Preserve every SEMEKO_KEEP token exactly once in its corresponding EN field; do not replace it by a number or move tokens across fields. Preserve every formula, identifier, I/O rule, rounding and tie-break exactly. VI is the provided original, do not change its specifications. EN is a faithful translation. Hints reveal progressively: 1 tiny observation, 2 useful technique, 3 full algorithm without code. No solution code or test answers in hints 1/2. Use Markdown for readability; mathematical formulas must preserve notation.',{...protectedSource,reference:item.references[0]});
        for(const lang of ['vi','en']){for(const name of ['title','statement','input','output','constraints'])if(typeof result[lang]?.[name]!=='string'||!result[lang][name].trim())throw Error('Incomplete bilingual problem');if(!Array.isArray(result.hints?.[lang])||result.hints[lang].length!==3||result.hints[lang].some(h=>typeof h!=='string'||!h.trim()))throw Error('Incomplete hints');}
        for(const lang of ['en','vi']){if(typeof result.complexity?.[lang]!=='string')throw Error('Missing complexity explanation');if(result.hints[lang].slice(0,2).some(text=>/#include|\bint\s+main\s*\(|public\s+class/.test(text)))throw Error('An early hint exposed solution code');}
        for(const lang of ['en','vi'])for(const name of ['title','statement','input','output','constraints'])result[lang][name]=result[lang][name].replace(/SEMEKO_KEEP_(\d+)_END/g,(_,index)=>{if(keep[Number(index)]===undefined)throw Error('Unknown protected numeric token');return keep[Number(index)];});
        for(const lang of ['en','vi'])result.hints[lang]=result.hints[lang].map(text=>text.replace(/SEMEKO_KEEP_(\d+)_END/g,(_,index)=>keep[Number(index)]??''));
        const numerals=s=>(s.match(/\b\d+(?:\.\d+)?\b/g)||[]).sort().join('|');
        for(const name of ['statement','input','output','constraints'])if(numerals(item[name])!==numerals(result.en[name]))throw Error('English translation changed numeric specifications');
        result.vi={title:item.title,statement:item.statement,input:item.input,output:item.output,constraints:item.constraints};
        result.difficulty=['basic','intermediate','advanced'].includes(result.difficulty)?result.difficulty:'intermediate';
        return saveContent(key,{...(saved(key)||{}),...result,sourceHash:hash,hintHash:suiteHash(item),updatedAt:Date.now()});
    });
}
async function strengthen(value){
    const key=id(value.id),item=source(key),hash=sourceHash(item),referenceHash=suiteHash(item),existing=saved(key)||{};if(existing.suite?.sourceHash===hash&&existing.suite?.referenceHash===referenceHash&&existing.suite?.inputChecked===true)return existing.suite;
    return singleFlight('tests-'+key,async()=>{
        const generated=await modelJSON('Generate 24-40 valid additional stdin cases for this problem. Return JSON {inputs:[string,...],inputValidator:string,coverage:{en:string,vi:string}}. inputValidator is a complete deterministic C++17 stdin program checking the input grammar and ALL stated constraints, printing VALID or INVALID then exiting with code 0. Use standard library only, no OS/files/network. Include smallest/largest legal dimensions, overflow-sensitive values, duplicates, sorted/reverse and adversarial patterns when relevant, and at least 4 realistic stress cases. Stay strictly within constraints. Never return expected outputs. For no-input constant-output tasks, empty stdin is valid. Maximum 100000 characters per case.',{statement:item.statement,input:item.input,output:item.output,constraints:item.constraints,existingInputs:item.tests.map(t=>t.input)});
        if(!Array.isArray(generated.inputs)||generated.inputs.length<8||generated.inputs.length>64||generated.inputs.some(s=>typeof s!=='string'||s.length>100000))throw Error('Invalid additional cases');
        if(typeof generated.coverage?.en!=='string'||typeof generated.coverage?.vi!=='string')throw Error('Missing bilingual test coverage description');
        const compiler=path.join(__dirname,'../../../Sameko-GCC/bin/g++.exe');
        const validator=require('../../shared/practice-reference-validator'),sourceTests=item.tests.filter(t=>t.origin==='source');
        const validInputs=await validator.filterInputs(generated.inputValidator,[...generated.inputs,...item.tests.map(t=>t.input)],{compiler,sourceInputs:sourceTests.map(t=>t.input)});if(validInputs.length<8)throw Error('Fewer than 8 additional cases satisfy input constraints');
        let tests;try{tests=await validator.validate({references:item.references,testInputs:validInputs.slice(0,64)},{compiler,sourceTests});}
        catch(error){if(error.code==='REFERENCE_DISAGREEMENT'){
            const issue={referenceHash,input:error.input,error:error.message,at:Date.now()};saveContent(key,{qualityIssue:issue});
            const queue=path.join(process.env.LOCALAPPDATA||root(),'SemekoPracticeAI/reference-repair.json');const release=require('../../shared/process-lock')(queue+'.owner');if(release)try{const items=read(queue,{});items[key]=issue;write(queue,items);}finally{release();}
        }throw error;}
        const unique=[...new Map(tests.map(t=>[t.input,t])).values()];const suite={sourceHash:hash,referenceHash,tests:unique,coverage:generated.coverage,inputChecked:true,verifiedReferences:2,distinctInputs:unique.length,distinctOutputs:new Set(unique.map(t=>t.output)).size,maxInputBytes:Math.max(...unique.map(t=>Buffer.byteLength(t.input))),updatedAt:Date.now()};
        const latest=saved(key)||{};saveContent(key,{...latest,suite});return suite;
    });
}
async function theory(value){
    validateLocation(value);if(!['en','vi'].includes(value.language))throw Error('Invalid language');const key=id(value.bookId)+'-p'+value.page+'-'+value.language;
    const found=saved(key);if(found)return found;
    return singleFlight(key,async()=>{
        const data=await require('./book-courses').text(value.bookId,value.page),protectedValues=[];
        if(!data.text.trim())return saveContent(key,{text:'',scanned:true});
        const book=require('./book-courses').list().find(b=>b.id===value.bookId),native=/PHẠM/i.test(book.title)?'vi':'en';
        if(value.language===native)return saveContent(key,{text:data.text,language:native,bookId:book.id,page:value.page,original:true});
        const keep=text=>'SEMEKO_KEEP_'+(protectedValues.push(text)-1)+'_END';
        const codeSafe=data.text.replace(/^.*(?:#include|std::|\b(?:cout|cin|printf|scanf|return)\b|;\s*$).*$/gm,keep);
        const protectedText=codeSafe.replace(/SEMEKO_KEEP_\d+_END|`[^`]*`|"[^"\n]*"|'[^'\n]*'|\b\d+(?:[.,]\d+)*\b/g,text=>text.startsWith('SEMEKO_KEEP_')?text:keep(text));
        const chunks=[];let part='';for(const word of protectedText.split(/(\s+)/)){if(part.length+word.length>10000&&part){chunks.push(part);part='';}part+=word;}if(part)chunks.push(part);
        const translated=await require('./statement-translation').translate(chunks,undefined,false,value.language);
        const text=translated.join('').replace(/SEMEKO_KEEP_(\d+)_END/g,(_,index)=>protectedValues[Number(index)]??'');return saveContent(key,{text,language:value.language,bookId:value.bookId,page:value.page,updatedAt:Date.now()});
    });
}
async function ensureMeta(value){
    const book=require('./book-courses').list().find(b=>b.id===value.bookId);if(!book)throw Error('Unknown book');const key='meta-'+book.id,found=saved(key);if(found?.sha256===book.sha256)return found;
    return singleFlight(key,async()=>{const result={sha256:book.sha256,en:{},vi:{}},titles=book.chapters.map(c=>c.title),keep=[];const texts=titles.map(s=>s.replace(/\d+/g,v=>'SEMEKO_KEEP_'+(keep.push(v)-1)+'_END'));
        for(const lang of ['en','vi']){const translated=await require('./statement-translation').translate(texts,undefined,false,lang);book.chapters.forEach((c,i)=>{result[lang][c.id]=translated[i].replace(/SEMEKO_KEEP_(\d+)_END/g,(_,n)=>keep[Number(n)]);});}return saveContent(key,result);
    });
}
async function sectionMeta(value){
    const book=require('./book-courses').list().find(b=>b.id===value.bookId),chapter=book?.chapters.find(c=>c.id===value.chapterId);if(!chapter)throw Error('Unknown chapter');const key='sections-'+book.id+'-'+chapter.id,found=saved(key);if(found?.sha256===book.sha256)return found;
    return singleFlight(key,async()=>{const values=[],texts=chapter.sections.map(c=>c.title.replace(/\d+/g,v=>'SEMEKO_KEEP_'+(values.push(v)-1)+'_END')),result={sha256:book.sha256,en:[],vi:[]};
        if(texts.length)for(const lang of ['en','vi'])result[lang]=(await require('./statement-translation').translate(texts,undefined,false,lang)).map(t=>t.replace(/SEMEKO_KEEP_(\d+)_END/g,(_,n)=>values[Number(n)]));return saveContent(key,result);
    });
}
function search(value){
    const book=require('./book-courses').list().find(b=>b.id===value.bookId);if(!book)throw Error('Unknown book');const query=String(value.query||'').trim().slice(0,200).toLocaleLowerCase();if(query.length<2)return[];
    const pages=JSON.parse(require('zlib').gunzipSync(fs.readFileSync(require('../../shared/content-library').config('local-practice/source-pages.json.gz'))))[book.id]?.pages||[];
    const results=[];for(let i=0;i<pages.length&&results.length<100;i++){let text=pages[i];for(const lang of ['vi','en'])text+='\n'+(saved(book.id+'-p'+(i+1)+'-'+lang)?.text||'');const index=text.toLocaleLowerCase().indexOf(query);if(index>=0)results.push({page:i+1,snippet:text.slice(Math.max(0,index-60),index+150)});}return results;
}
async function searchBoth(value){
    const direct=search(value),book=require('./book-courses').list().find(b=>b.id===value.bookId),query=String(value.query||'').trim().slice(0,200);if(!book||query.length<2)return direct;
    const native=/PHẠM/i.test(book.title)?'vi':'en',vietnamese=/[ăâđêôơưĂÂĐÊÔƠƯ\u1ea0-\u1ef9]/.test(query);
    if(native==='en'&&!vietnamese||native==='vi'&&vietnamese)return direct;
    const key=book.id+'-query-'+crypto.createHash('sha256').update(query).digest('hex').slice(0,16);let translated=saved(key)?.query;
    try{if(!translated){translated=(await require('./statement-translation').translate([query],undefined,false,native))[0];saveContent(key,{query:translated});}const other=search({...value,query:translated});return [...new Map([...direct,...other].map(r=>[r.page,r])).values()].slice(0,100);}catch(e){if(direct.length)return direct;throw e;}
}
let sourcePages;
function unmapped(book,chapter,found){
    if(!sourcePages)sourcePages=JSON.parse(require('zlib').gunzipSync(fs.readFileSync(require('../../shared/content-library').config('local-practice/source-pages.json.gz'))));
    const pages=sourcePages[book.id]?.pages||[],numbers=new Set(found.map(i=>i.title.match(/^Bài\s+\**(\d+(?:\.\d+)?)/)?.[1]));let active=false;const result=[],seen=new Set();
    const vietnamese=/PHẠM/i.test(book.title),chapterNumber=chapter.title.match(/^(?:Chapter\s*)?(\d+)\b/i)?.[1];
    for(let page=chapter.firstPage;page<=chapter.lastPage;page++)for(const line of (pages[page-1]||'').split('\n')){
        if(/^\s*(?:BÀI TẬP|(?:Programming |Self-Review )?Exercises)\s*$/i.test(line)){active=true;continue;}
        if(!active||/[.\u2026]{4,}/.test(line))continue;
        const match=/^\s*\**(?:Bài\s+)?(\d+(?:\.\d+)?)[.:]?\s+(.{5,})$/.exec(line);if(!match||(!vietnamese&&(!match[1].includes('.')||chapterNumber&&match[1].split('.')[0]!==chapterNumber))||vietnamese&&!/^\s*(?:Bài\s+\d+|\d+\.\s)/.test(line)||!/\p{L}/u.test(match[2])||/^(?:#|int\b|char\b|float\b|double\b|return\b|if\b|std::)/.test(match[2]))continue;
        if(!numbers.has(match[1])&&!seen.has(match[1])){seen.add(match[1]);result.push({number:match[1],title:match[2].trim(),page});}
    }return result;
}
function audit(){
    const candidates=read(require('../../shared/content-library').config('local-practice/catalog.json'),{items:[]}).items,items=read(require('../../shared/content-library').config('local-practice/adapted.json'),{items:{}}).items;
    return require('./book-courses').list().map(book=>({id:book.id,title:book.title,pageCount:book.pageCount,chapters:book.chapters.map(ch=>{const found=candidates.filter(i=>i.source.id===book.id&&i.source.firstPage>=ch.firstPage&&i.source.firstPage<=ch.lastPage);const blocked=new Map(found.filter(i=>items[i.id]?.status==='ready').map(i=>[i.id,saved(i.id)?.qualityIssue]).filter(([key,value])=>value?.referenceHash===suiteHash(items[key])));return{...ch,candidates:found.length,unmapped:unmapped(book,ch,found),readyIds:found.filter(i=>items[i.id]?.status==='ready'&&!blocked.has(i.id)).map(i=>i.id),ready:found.filter(i=>items[i.id]?.status==='ready'&&!blocked.has(i.id)).length,excluded:found.filter(i=>items[i.id]?.status==='excluded').length,failed:found.filter(i=>items[i.id]?.status==='failed'||blocked.has(i.id)).map(i=>({id:i.id,title:i.title,error:blocked.get(i.id)?.error||items[i.id].error})),pending:found.filter(i=>!items[i.id]).length,duplicateTitles:found.map(i=>i.title).filter((t,i,a)=>a.indexOf(t)!==i)};})}));
}
function progress(){
    const keys=new Set(Object.keys(globalContent()));try{for(const name of fs.readdirSync(path.join(root(),'content')))if(name.endsWith('.json'))keys.add(name.slice(0,-5));}catch(e){if(e.code!=='ENOENT')throw e;}
    const candidates=read(require('../../shared/content-library').config('local-practice/catalog.json'),{items:[]}).items,ready=read(require('../../shared/content-library').config('local-practice/adapted.json'),{items:{}}).items;
    return require('./book-courses').list().map(book=>{let enPages=0,viPages=0,bilingual=0,hints=0,strongTests=0;for(const key of keys){if(key.startsWith(book.id+'-p')){const m=/-p(\d+)-(en|vi)$/.exec(key);if(m&&Number(m[1])<=book.pageCount){if(m[2]==='en')enPages++;else viPages++;}}}
        for(const item of candidates.filter(i=>i.source.id===book.id)){const value=saved(item.id),source=ready[item.id];if(source?.status!=='ready')continue;const hash=sourceHash(source),references=suiteHash(source);if(value?.en&&value?.vi&&value.sourceHash===hash)bilingual++;if(value?.hints?.en?.length===3&&value?.hints?.vi?.length===3&&value.sourceHash===hash)hints++;if(value?.suite?.inputChecked&&value.suite.referenceHash===references)strongTests++;}return{id:book.id,enPages,viPages,totalPages:book.pageCount,bilingual,hints,strongTests};});
}
module.exports={state,update,saved,saveContent,ensureProblem,strengthen,theory,ensureMeta,sectionMeta,search,searchBoth,audit,progress,sourceHash,suiteHash,modelJSON};
