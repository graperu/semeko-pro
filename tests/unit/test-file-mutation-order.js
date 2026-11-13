'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),Module=require('module');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-file-order-')),handlers={},load=Module._load;
let hold=null,entered=null;
Module._load=function(name,...args){
 if(name==='electron')return{ipcMain:{handle:(key,fn)=>handlers[key]=fn},dialog:{},shell:{}};
 if(name==='../shared/fs-atomic')return{writeFileAtomic:async(file,content)=>{if(entered)entered();if(hold)await hold;await fs.promises.writeFile(file,content,'utf8');}};
 if(name==='./history-handlers')return{moveFileHistory:async()=>{}};
 return load.call(this,name,...args);
};
require('../../app/ipc/file-handlers').registerHandlers();
function gate(){let release,ready;hold=new Promise(r=>release=r);const started=new Promise(r=>ready=r);entered=ready;return{release:()=>{hold=null;entered=null;release();},started};}
(async()=>{
 const file=path.join(root,'before.cpp'),after=path.join(root,'after.cpp');fs.writeFileSync(file,'original');
 let g=gate(),save=handlers['save-file'](null,{path:file,content:'newest'});await g.started;
 let done=false;const rename=handlers['rename-file'](null,{oldPath:file,newPath:after}).then(r=>{done=true;return r;});
 await new Promise(r=>setTimeout(r,20));assert(!done);g.release();assert((await save).success);assert((await rename).success);assert(!fs.existsSync(file));assert.strictEqual(fs.readFileSync(after,'utf8'),'newest');
 g=gate();save=handlers['save-file'](null,{path:after,content:'last save'});await g.started;const deletion=handlers['delete-file'](null,after);g.release();await save;await deletion;assert(!fs.existsSync(after),'Save completion must not recreate a deleted file');
 const other=path.join(root,'versions.cpp');g=gate();const first=handlers['save-file'](null,{path:other,content:'old save'});await g.started;const second=handlers['save-file'](null,{path:other,content:'later save'});g.release();await Promise.all([first,second]);assert.strictEqual(fs.readFileSync(other,'utf8'),'later save');
 await assert.rejects(handlers['rename-file'](null,{oldPath:path.join(root,'missing.cpp'),newPath:after}));assert((await handlers['save-file'](null,{path:other,content:'after error'})).success);
 const dir=path.join(root,'folder'),inside=path.join(dir,'A.cpp');fs.mkdirSync(dir);fs.writeFileSync(inside,'before');g=gate();const nested=handlers['save-file'](null,{path:inside,content:'pending'});await g.started;const removeFolder=handlers['delete-folder'](null,dir);g.release();await nested;await removeFolder;assert(!fs.existsSync(dir),'In-flight save must not recreate a removed folder');
 console.log('PASS ordered real-disk saves/rename/delete: in-flight save cannot recreate old path; newer save wins; failed operations do not poison queue');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>Module._load=load);
