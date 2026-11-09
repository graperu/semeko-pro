'use strict';
const catalog=require('../../config/28tech-catalog.json');
for(const item of catalog.items){
    item.title=require('../../shared/learning-title')(item.name);
    const generic=/^(?:bai|bài)\s*0*(\d+)$/i.exec(item.title);
    if(generic)item.title=`${item.root} · Bài ${Number(generic[1])} — ${/slide/i.test(item.group)?'Bài giảng':'Tài liệu học'}`;
}
const cache=new Map();
exports.list=()=>catalog;
exports.describe=async id=>{
    const item=catalog.items.find(i=>i.id===id);if(!item||item.ext!=='pdf')throw Error('Select PDF');
    const fs=require('fs'),file=await materialFile(id),pdf=await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task=pdf.getDocument({data:new Uint8Array(fs.readFileSync(file)),isEvalSupported:false,disableFontFace:true});
    try{const doc=await task.promise,page=await doc.getPage(1),text=await page.getTextContent();let lines=[],line='';for(const t of text.items){line+=t.str||'';if(t.hasEOL){if(line.trim())lines.push(line.trim());line='';}}if(line.trim())lines.push(line.trim());
        const meaningful=lines.map(require('../../shared/pdf-text')).filter(s=>!/^\d+\s*\/\s*\d+$/.test(s)&&!/^https?:/i.test(s)&&!/^28\s*tech$/i.test(s));
        return{title:item.title,pages:doc.numPages,summary:meaningful.slice(0,6).join(' · ').slice(0,550),scanned:meaningful.length===0};
    }finally{await task.destroy();}
};
exports.source=async id=>{
    const item=catalog.items.find(i=>i.id===id);if(!item)throw Error('Unknown library source');
    if(!['cpp','c','java','py','h','md','txt','html','json','csv'].includes(item.ext))throw Error('Use document viewer for this file');
    if(cache.has(id))return cache.get(id);
    const url=`https://raw.githubusercontent.com/${catalog.repository}/${catalog.commit}/`+item.path.split('/').map(encodeURIComponent).join('/');
    const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error('GitHub HTTP '+response.status);
    const code=await response.text();if(code.length>2000000)throw Error('Source file too large');
    const blob=require('crypto').createHash('sha1').update(Buffer.concat([Buffer.from('blob '+Buffer.byteLength(code)+'\0'),Buffer.from(code)])).digest('hex');
    if(blob!==(item.sha||id))throw Error('Source integrity check failed');
    const value={...item,code,url:`https://github.com/${catalog.repository}/blob/${catalog.commit}/`+item.path.split('/').map(encodeURIComponent).join('/')};
    if(cache.size>=30)cache.delete(cache.keys().next().value);cache.set(id,value);return value;
};
async function materialFile(id){
    const item=catalog.items.find(i=>i.id===id);if(!item||item.ext!=='pdf')throw Error('Select a PDF document');
    const {app,BrowserWindow}=require('electron'),fs=require('fs'),path=require('path'),crypto=require('crypto');
    const dir=path.join(app.getPath('userData'),'learning-materials'),file=path.join(dir,item.sha+'.pdf');
    const hash=buffer=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+buffer.length+'\0'),buffer])).digest('hex');
    let valid=false;try{valid=hash(fs.readFileSync(file))===item.sha;}catch{}
    if(!valid){
        const url=`https://raw.githubusercontent.com/${catalog.repository}/${catalog.commit}/`+item.path.split('/').map(encodeURIComponent).join('/');
        const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('GitHub HTTP '+response.status);
        const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>100*1024*1024)throw Error('Document exceeds size limit');chunks.push(chunk);}
        const buffer=Buffer.concat(chunks);if(hash(buffer)!==item.sha||buffer.subarray(0,5).toString()!=='%PDF-')throw Error('PDF integrity check failed');
        fs.mkdirSync(dir,{recursive:true});require('../../shared/fs-atomic').writeFileAtomicSync(file,buffer);
    }
    return file;
}
exports.openMaterial=async id=>{
    const item=catalog.items.find(i=>i.id===id),file=await materialFile(id);const {BrowserWindow}=require('electron');
    const window=new BrowserWindow({width:1050,height:850,title:item.name,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,plugins:true}});
    window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',e=>e.preventDefault());await window.loadFile(file);return{opened:true,name:item.name};
};
exports.problem=async id=>{
    const item=catalog.items.find(i=>i.id===id);if(!item||item.ext!=='pdf')throw Error('Select an exercise document');
    const {app}=require('electron'),fs=require('fs'),path=require('path');
    const dir=path.join(app.getPath('userData'),'learning-exercises'),saved=path.join(dir,id+'.json');
    try{const value=JSON.parse(fs.readFileSync(saved,'utf8'));if(value.version===6&&value.sha===item.sha)return{...value.detail,title:require('../../shared/learning-title')(item.name),tags:[item.group.split('/').slice(-1)[0].replace(/28\s*tech/gi,'').trim()]};}catch{}
    const file=await materialFile(id),pdf=await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task=pdf.getDocument({data:new Uint8Array(fs.readFileSync(file)),isEvalSupported:false,disableFontFace:true});const doc=await task.promise;
    let pages=[],scannedPages=[];
    try{if(doc.numPages>100)throw Error('Tài liệu dài hơn 100 trang; chọn PDF bài tập riêng thay vì sách/slide tổng hợp.');
        for(let p=1;p<=doc.numPages;p++){const page=await doc.getPage(p),content=await page.getTextContent();let lines=[],line='';for(const token of content.items){if(typeof token.str!=='string')continue;line+=token.str;if(token.hasEOL){lines.push(line);line='';}}if(line)lines.push(line);const text=lines.filter(l=>!/^\s*\d+\s*\/\s*\d+\s*$/.test(l)).join('\n');pages.push(text);
            if(!text.trim()){const {createCanvas}=require('@napi-rs/canvas'),viewport=page.getViewport({scale:Math.min(1.5,1400/page.getViewport({scale:1}).width)}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;scannedPages.push({page:p,image:canvas.toDataURL('image/jpeg',85)});}
        }
    }finally{await task.destroy();}
    let detail;
    if(scannedPages.length){
        detail={provider:'28tech',id:item.id,title:item.title,url:`https://github.com/${catalog.repository}/blob/${catalog.commit}/`+item.path.split('/').map(encodeURIComponent).join('/'),html:pages.map((text,i)=>{const scan=scannedPages.find(s=>s.page===i+1);return '<section><h3>Trang '+(i+1)+'</h3>'+(scan?'<img alt="Trang đề gốc '+(i+1)+'" src="'+scan.image+'">':'<pre>'+text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</pre>')+'</section>';}).join(''),tests:[],mode:'reading',note:'Đề ảnh gốc hiển thị trong app. Chưa tách bài/test bằng OCR; không chấm tự động để tránh sai dữ liệu.'};
    }else detail=require('./pdf-exercise').build(item,pages,catalog);
    fs.mkdirSync(dir,{recursive:true});require('../../shared/fs-atomic').writeFileAtomicSync(saved,JSON.stringify({version:6,sha:item.sha,detail}),'utf8');return detail;
};
