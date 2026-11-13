'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib');
const {app,dialog}=require('electron');
const {writeFileAtomicSync}=require('../shared/fs-atomic');
const LIMIT=100*1024*1024,imports=new Map();
const SOURCE=/\.(?:c|cpp|cc|cxx|h|hpp|py|java|cs|csproj|sln|txt|md|inp|out|json|xml|toml)$/i;
function relativeName(value){if(typeof value!=='string'||value.length>500||/^[\\/]|^[a-z]:|\0|:|[<>"|?*]/i.test(value))throw Error('Tên tệp trong gói không hợp lệ.');const name=value.replace(/\\/g,'/');if(name.split('/').some(part=>!part||part==='.'||part==='..')||!SOURCE.test(name)&&path.posix.basename(name)!=='.sameko')throw Error('Đường dẫn tệp trong gói không hợp lệ.');return name;}
const file=name=>path.join(app.getPath('userData'),'state',name+'.json');
function read(name){try{return JSON.parse(fs.readFileSync(file(name),'utf8'));}catch{return null;}}
function clean(value){
    if(Array.isArray(value))return value.map(clean);
    if(value&&typeof value==='object'){const out={};for(const [key,item]of Object.entries(value))if(!['__proto__','prototype','constructor'].includes(key))out[key]=clean(item);return out;}return value;
}
function safeSettings(input={}){
    const allowed={editor:['fontSize','fontFamily','tabSize','wordWrap','minimap','autoSave','autoSaveDelay','liveCheck','liveCheckDelay','formatOnSave','scrollBeyondLastLine'],appearance:['theme','language','performanceMode','cursorTrail','uiScale'],execution:['timeLimit','clearTerminal','realtimeOutput','autoSendInput'],terminal:['colorScheme'],panels:['showIO','showTerm','showProblems']},out={};
    for(const [section,keys]of Object.entries(allowed)){out[section]={};for(const key of keys){const value=input[section]?.[key];if(['boolean','number'].includes(typeof value)||(typeof value==='string'&&value.length<=300))out[section][key]=value;}}return out;
}
function validate(payload){
    if(!payload||payload.format!=='semeko-workspace'||payload.version!==1||!Array.isArray(payload.tabs)||!Array.isArray(payload.entries)||payload.tabs.length>300||payload.entries.length>20000)throw Error('Gói sao lưu không hợp lệ hoặc vượt giới hạn.');
    const result=clean(payload);for(const tab of result.tabs)if(!tab||typeof tab.name!=='string'||typeof tab.content!=='string'||tab.content.length>10*1024*1024)throw Error('Dữ liệu tab trong gói không hợp lệ.');
    for(const entry of result.entries)if(!entry||typeof entry.id!=='string'||typeof entry.name!=='string'||typeof entry.code!=='string'||!Array.isArray(entry.results)||!['working','practiced','review','solved'].includes(entry.status))throw Error('Dữ liệu kho bài không hợp lệ.');
    for(const entry of result.entries){delete entry.materialized;if(entry.files){if(!Array.isArray(entry.files)||entry.files.length>3000)throw Error('Quá nhiều tệp trong thư mục sao lưu.');const names=new Set();for(const item of entry.files){item.relative=relativeName(item.relative);if(typeof item.content!=='string'||item.content.length>10*1024*1024||names.has(item.relative.toLowerCase()))throw Error('Tệp trong thư mục sao lưu không hợp lệ.');names.add(item.relative.toLowerCase());}}}
    if(result.exam){const exam=result.exam;if(!Array.isArray(exam.items)||exam.items.length>100||!Number.isFinite(exam.durationMs)||exam.durationMs<60000||exam.durationMs>21600000)throw Error('Dữ liệu lượt thi không hợp lệ.');exam.items=exam.items.map(item=>({...item,path:null,kind:undefined,folderPath:undefined,openFiles:undefined}));}
    result.settings=safeSettings(result.settings);return result;
}
function encode(payload){const value=validate(payload),data=Buffer.from(JSON.stringify(value));if(data.length>60*1024*1024)throw Error('Dữ liệu vượt 60 MiB. Hãy chia thành nhiều lần sao lưu.');return zlib.gzipSync(Buffer.from(JSON.stringify({sha256:crypto.createHash('sha256').update(data).digest('hex'),data:data.toString('base64')})));}
function decode(bytes){if(bytes.length>LIMIT)throw Error('Tệp quá lớn.');const envelope=JSON.parse(zlib.gunzipSync(bytes,{maxOutputLength:LIMIT}).toString('utf8'));if(typeof envelope.data!=='string')throw Error('Gói sao lưu hỏng.');const data=Buffer.from(envelope.data,'base64');if(data.length>LIMIT||crypto.createHash('sha256').update(data).digest('hex')!==envelope.sha256)throw Error('Kiểm tra toàn vẹn thất bại.');return validate(JSON.parse(data.toString('utf8')));}
async function exportDialog(window,payload){
    payload=validate(payload);
    for(const entry of payload.entries.filter(e=>e.kind==='folder'&&e.folderPath)){
        const root=fs.realpathSync(entry.folderPath),files=[];let bytes=0;const skip=new Set(['.git','node_modules','.venv','venv','bin','obj','.sameko-tools','__pycache__','dist','build','target']);
        const walk=(dir,depth=0)=>{if(depth>25)throw Error('Thư mục quá sâu để sao lưu.');for(const item of fs.readdirSync(dir,{withFileTypes:true})){if(item.isSymbolicLink())continue;const full=path.join(dir,item.name);if(item.isDirectory()){if(!skip.has(item.name))walk(full,depth+1);}else if(item.isFile()&&(SOURCE.test(item.name)||item.name==='.sameko')){const size=fs.statSync(full).size;bytes+=size;if(size>10*1024*1024||bytes>60*1024*1024||files.length>=3000)throw Error('Thư mục quá lớn. Chia thành nhiều gói sao lưu.');files.push({relative:path.relative(root,full).replace(/\\/g,'/'),content:fs.readFileSync(full,'utf8')});}}};walk(root);entry.files=files;
    }
    const bytes=encode(payload),result=await dialog.showSaveDialog(window,{title:'Xuất sao lưu Semeko',defaultPath:'Semeko-'+new Date().toISOString().slice(0,10)+'.semeko-backup',filters:[{name:'Semeko Backup',extensions:['semeko-backup']}]});
    if(result.canceled)return{canceled:true};writeFileAtomicSync(result.filePath,bytes);return{path:result.filePath,bytes:bytes.length,tabs:payload.tabs.length,entries:payload.entries.length};
}
async function previewDialog(window){
    const result=await dialog.showOpenDialog(window,{title:'Nhập sao lưu Semeko',properties:['openFile'],filters:[{name:'Semeko Backup',extensions:['semeko-backup']}]});if(result.canceled||!result.filePaths?.[0])return{canceled:true};
    const target=result.filePaths[0];if(fs.statSync(target).size>LIMIT)throw Error('Tệp quá lớn.');const data=decode(fs.readFileSync(target)),ticket=crypto.randomBytes(24).toString('hex');
    for(const [id,item]of imports)if(Date.now()>item.expires)imports.delete(id);if(imports.size>=5)imports.delete(imports.keys().next().value);imports.set(ticket,{data,expires:Date.now()+600000});return{ticket,tabs:data.tabs.length,entries:data.entries.length,created:data.created,hasSettings:!!data.settings};
}
function consume(ticket){
    const item=imports.get(ticket);if(!item||item.expires<Date.now())throw Error('Bản xem trước hết hạn. Chọn lại gói sao lưu.');
    const data=item.data;
    for(const entry of data.entries.filter(e=>e.kind==='folder'&&e.files?.length)){
        const root=path.join(app.getPath('userData'),'imported-workspaces',crypto.randomUUID());fs.mkdirSync(root,{recursive:true});
        for(const file of entry.files){const name=relativeName(file.relative),target=path.resolve(root,...name.split('/'));if(!target.startsWith(root+path.sep))throw Error('Tệp vượt ngoài thư mục nhập.');fs.mkdirSync(path.dirname(target),{recursive:true});let content=file.content;
            if(path.basename(name)==='.sameko'){try{const meta=JSON.parse(content);const scrub=value=>{if(typeof value==='string'&&/^(?:[a-z]:|[\\/])/i.test(value))return '';if(Array.isArray(value))return value.map(scrub);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['__proto__','constructor','prototype'].includes(key)).map(([key,v])=>[key,scrub(v)]));return value;};content=JSON.stringify(scrub(meta));}catch{continue;}}
            fs.writeFileSync(target,content,{flag:'wx'});}
        entry.folderPath=root;entry.activePath=null;entry.openFiles=entry.files.filter(f=>/\.(c|cpp|py|java|cs)$/i.test(f.relative)).slice(0,20).map(f=>({path:path.join(root,...f.relative.split('/'))}));entry.materialized=true;delete entry.files;
    }
    imports.delete(ticket);return data;
}
function snapshot(data){
    if(!data||!Array.isArray(data.tabs)||data.tabs.length>300)throw Error('Bản phục hồi không hợp lệ.');const json=JSON.stringify(clean(data));if(Buffer.byteLength(json)>LIMIT)throw Error('Bản phục hồi vượt 100 MiB.');
    const root=path.join(app.getPath('userData'),'recovery');fs.mkdirSync(root,{recursive:true});const target=path.join(root,'latest.json');
    let old=null;try{old=JSON.parse(fs.readFileSync(target,'utf8'));}catch{}
    if(old&&Date.now()-(old.timestamp||0)>30000)writeFileAtomicSync(path.join(root,'previous.json'),JSON.stringify(old),'utf8');
    writeFileAtomicSync(target,json,'utf8');return{savedAt:Date.now()};
}
function recovery(){for(const name of ['latest.json','previous.json'])try{const target=path.join(app.getPath('userData'),'recovery',name);if(fs.statSync(target).size>LIMIT)continue;const value=JSON.parse(fs.readFileSync(target,'utf8'));if(Array.isArray(value.tabs)&&value.tabs.every(tab=>tab&&typeof tab.name==='string'&&typeof tab.content==='string'))return value;}catch{}return null;}
module.exports={encode,decode,validate,safeSettings,exportDialog,previewDialog,consume,snapshot,recovery};
