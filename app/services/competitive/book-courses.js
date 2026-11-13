'use strict';
const path=require('path'),fs=require('fs'),crypto=require('crypto');
const catalog=require('../../shared/content-library').json('book-courses/catalog.json');
const documents=new Map();
function book(id){const b=catalog.courses.find(b=>b.id===id);if(!b)throw Error('Không tìm thấy khóa học');return b;}
exports.list=()=>catalog.courses;
exports.chapter=(id,chapterId)=>{
    const b=book(id),chapter=b.chapters.find(c=>c.id===chapterId);if(!chapter)throw Error('Không tìm thấy chương');
    const study=require('./book-study');
    const exercises=require('./local-practice').list().filter(i=>i.courseId===id&&i.chapterId===chapterId).map(i=>{const pack=study.saved(i.id);return {...i,difficulty:pack?.difficulty||'unclassified',titles:{en:pack?.en?.title,vi:pack?.vi?.title}};});
    return {...chapter,courseId:id,courseTitle:b.title,exercises};
};
async function document(b){
    if(!documents.has(b.id)){
        const pending=(async()=>{const raw=fs.readFileSync(require('../../shared/content-library').config('book-courses/'+b.id+'.pdf'));
            if(crypto.createHash('sha256').update(raw).digest('hex')!==b.sha256)throw Error('Bản sách gốc không còn khớp kiểm tra toàn vẹn');
            const pdf=await import('pdfjs-dist/legacy/build/pdf.mjs'),assets=path.dirname(require.resolve('pdfjs-dist/package.json'));
            const assetDir=name=>path.join(assets,name).replace(/\\/g,'/')+'/';
            return pdf.getDocument({data:new Uint8Array(raw),isEvalSupported:false,disableFontFace:true,standardFontDataUrl:assetDir('standard_fonts'),cMapUrl:assetDir('cmaps'),cMapPacked:true,wasmUrl:assetDir('wasm')}).promise;
        })();documents.set(b.id,pending);pending.catch(()=>documents.delete(b.id));
    }return documents.get(b.id);
}
exports.renderDirect=async(id,number)=>{
    const b=book(id);if(!Number.isInteger(number)||number<1||number>b.pageCount)throw Error('Số trang không hợp lệ');
    const doc=await document(b),page=await doc.getPage(number);
    const {createCanvas}=require('@napi-rs/canvas');const viewport=page.getViewport({scale:Math.min(2,1800/page.getViewport({scale:1}).width)});
    const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    const content=await page.getTextContent();let text='';for(const token of content.items)text+=(token.str||'')+(token.hasEOL?'\n':' ');
    return {page:number,pageCount:b.pageCount,image:canvas.toDataURL('image/jpeg',90),text};
};
let renderWorker,rendererReady,requestNumber=0;const rendering=new Map();
function resetRenderer(message){const old=renderWorker;renderWorker=null;for(const job of rendering.values()){clearTimeout(job.timer);job.reject(Error(message));}rendering.clear();old?.kill();}
exports.page=async(id,number)=>{
    const b=book(id);if(!Number.isInteger(number)||number<1||number>b.pageCount)throw Error('Invalid page');
    const electron=require('electron');if(!electron.utilityProcess)return exports.renderDirect(id,number);
    if(!renderWorker){const child=electron.utilityProcess.fork(path.join(__dirname,'book-page-worker.cjs'),[],{serviceName:'Semeko book rendering',env:{...process.env,SEMEKO_CONTENT_HOME:require('../../shared/content-library').root(),SEMEKO_CONTENT_INDEX:require('../../shared/content-library').snapshotFile()}});renderWorker=child;rendererReady=new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('exit',()=>reject(Error('Book renderer could not start')));});
        child.on('message',message=>{const job=rendering.get(message.ticket);if(!job)return;clearTimeout(job.timer);rendering.delete(message.ticket);message.error?job.reject(Error(message.error)):job.resolve(message.data);});
        child.on('exit',()=>{if(renderWorker===child)resetRenderer('Book renderer stopped. Retry the page.');});
        electron.app.once('before-quit',()=>{if(renderWorker===child)resetRenderer('Application closing');});
    }
    await rendererReady;
    return new Promise((resolve,reject)=>{const ticket=++requestNumber,timer=setTimeout(()=>resetRenderer('Book page rendering timed out. Retry the page.'),30000);rendering.set(ticket,{resolve,reject,timer});renderWorker.postMessage({ticket,id,page:number});});
};
exports.text=async(id,number)=>{
    const b=book(id);if(!Number.isInteger(number)||number<1||number>b.pageCount)throw Error('Invalid page');const doc=await document(b),page=await doc.getPage(number),content=await page.getTextContent();let text='';for(const token of content.items)text+=(token.str||'')+(token.hasEOL?'\n':' ');return{text,page:number,pageCount:b.pageCount};
};
