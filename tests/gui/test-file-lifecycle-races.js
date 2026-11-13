'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),{_electron}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-file-lifecycle-'));
const folder=path.join(profile,'work'),a=path.join(folder,'A.cpp'),b=path.join(folder,'B.cpp');let app;
(async()=>{
 fs.mkdirSync(folder);fs.writeFileSync(a,'int main(){}\n');fs.writeFileSync(b,'// on disk\n');
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+profile],env,cwd:ROOT});let page;
 for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}
 await page.waitForFunction(()=>window.App?.ready);await page.evaluate(()=>ensureMonaco());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async({folder,a})=>{FileExplorer.currentFolder=folder;await openFileFromPath(a);App.editor.getModel().setValue('// draft must survive deletion\n');await FileExplorer.deleteFile(a);},{folder,a});
 let state=await page.evaluate(()=>{const t=App.tabs.find(t=>t.id===App.activeTabId);return{path:t.path,content:t.content,modified:t.modified,history:!!t.untitledHistoryKey,name:t.name};});
 assert.strictEqual(state.path,null);assert.strictEqual(state.content,'// draft must survive deletion\n');assert(state.modified&&state.history);assert(state.name.includes('(deleted)'));assert.strictEqual(fs.existsSync(a),false);
 await app.evaluate(()=>{const {ipcMain}=process.mainModule.require('electron');ipcMain.removeHandler('save-file-dialog');ipcMain.handle('save-file-dialog',(_e,value)=>{globalThis.lastSaveDialog=value;return{success:false,canceled:true};});});
 await page.evaluate(()=>save());assert((await app.evaluate(()=>globalThis.lastSaveDialog)).defaultPath.includes('(deleted)'));assert.strictEqual(fs.existsSync(a),false,'Saving deleted buffer must offer Save As rather than resurrect old path');
 await page.evaluate(async b=>{await openFileFromPath(b);},b);
 await app.evaluate(()=>{const {ipcMain}=process.mainModule.require('electron');ipcMain.removeHandler('reload-file');ipcMain.handle('reload-file',()=>new Promise(resolve=>{globalThis.finishReload=resolve;}));});
 await page.evaluate(b=>handleExternalFileChange(b),b);await page.locator('.reload-btn-yes').click();await page.evaluate(()=>App.editor.getModel().setValue('// typed during reload\n'));
 await app.evaluate(()=>globalThis.finishReload({success:true,content:'// replacement from disk\n'}));await page.waitForFunction(()=>!document.querySelector('.reload-btn-yes').disabled);
 assert.strictEqual(await page.evaluate(()=>App.editor.getValue()),'// typed during reload\n');assert(await page.locator('.reload-notification').isVisible());
 await page.locator('.reload-btn-no').click();fs.unlinkSync(b);await page.evaluate(()=>FileExplorer.refreshTree());
 assert.strictEqual(await page.evaluate(()=>App.tabs.find(t=>t.id===App.activeTabId).path),null,'External deletion detaches the open buffer too');
 const late=path.join(folder,'Late.cpp');fs.writeFileSync(late,'// original\n');
 await page.evaluate(async file=>{await openFileFromPath(file);App.editor.getModel().setValue('// pending save\n');},late);
 await app.evaluate(()=>{const {ipcMain}=process.mainModule.require('electron');ipcMain.removeHandler('save-file');ipcMain.handle('save-file',()=>new Promise(resolve=>{globalThis.finishDelayedSave=resolve;}));});
 await page.evaluate(()=>{window.qaDelayedSave=save();});await app.evaluate(async()=>{for(let i=0;i<100&&!globalThis.finishDelayedSave;i++)await new Promise(r=>setTimeout(r,10));if(!globalThis.finishDelayedSave)throw Error('Save not started');});
 fs.unlinkSync(late);await page.evaluate(file=>onFileDeleted(file),late);await app.evaluate(()=>globalThis.finishDelayedSave({success:true}));await page.evaluate(()=>window.qaDelayedSave);
 assert(await page.evaluate(()=>{const tab=App.tabs.find(t=>t.id===App.activeTabId);return tab.path===null&&tab.modified&&tabSourceText(tab)==='// pending save\n';}),'Late save completion must not mark deleted draft clean');
 await app.evaluate(()=>{const {ipcMain}=process.mainModule.require('electron');ipcMain.removeHandler('save-file-dialog');ipcMain.handle('save-file-dialog',()=>new Promise(resolve=>{globalThis.finishDelayedSaveAs=resolve;}));});
 const closing=await page.evaluate(()=>{const id=App.activeTabId;window.qaDelayedSaveAs=saveAs(id);return id;});await app.evaluate(async()=>{for(let i=0;i<100&&!globalThis.finishDelayedSaveAs;i++)await new Promise(r=>setTimeout(r,10));if(!globalThis.finishDelayedSaveAs)throw Error('Save As not started');});
 await page.evaluate(id=>closeTab(id,{quiet:true}),closing);await app.evaluate(({file})=>globalThis.finishDelayedSaveAs({success:true,path:file}),{file:path.join(folder,'Closed.cpp')});await page.evaluate(()=>window.qaDelayedSaveAs);assert.strictEqual(await page.evaluate(id=>App.tabs.some(t=>t.id===id),closing),false);
 const raced=await page.evaluate(async()=>{
  const original=FileExplorer.loadDirectory,meta=FileExplorer.saveContestMeta;let finish,writes=0;
  FileExplorer.loadDirectory=async dir=>dir==='C:/race-old'?await new Promise(r=>finish=r):[{name:'Current.cpp',path:'C:/race-current/Current.cpp',isDirectory:false}];
  FileExplorer.saveContestMeta=async()=>writes++;
  try{
   FileExplorer.currentFolder='C:/race-old';const old=FileExplorer.refreshTree();
   FileExplorer.currentFolder='C:/race-current';await FileExplorer.refreshTree();const stale=[{name:'A.cpp',isDirectory:false},{name:'B.cpp',isDirectory:false}];stale._hasSameko=true;finish(stale);await old;
   return{folder:FileExplorer.currentFolder,names:FileExplorer.tree.map(f=>f.name),writes,mode:FileExplorer.displayMode,plain:FileExplorer.resolveDisplayMode('C:/plain',stale.map(x=>({...x})))};
  }finally{FileExplorer.loadDirectory=original;FileExplorer.saveContestMeta=meta;}
 });
 assert.deepStrictEqual(raced,{folder:'C:/race-current',names:['Current.cpp'],writes:0,mode:'normal',plain:'normal'});
 const recovered=await page.evaluate(()=>{const state=FileExplorer._stateDoc.state;try{FileExplorer._stateDoc.state={width:'invalid',currentFolder:[],expandedFolders:{bad:1},expandedFiles:null,recentFiles:[null,123,'C:/valid.cpp'],pinnedItems:'bad'};FileExplorer.loadState();return{width:FileExplorer.width,folder:FileExplorer.currentFolder,recent:FileExplorer.recentFiles,pins:FileExplorer.pinnedItems,expanded:FileExplorer.expandedFolders.size};}finally{FileExplorer._stateDoc.state=state;FileExplorer.loadState();}});
 assert.deepStrictEqual(recovered,{width:200,folder:null,recent:['C:/valid.cpp'],pins:[],expanded:0});assert.deepStrictEqual(errors,[]);
 console.log('PASS real Electron editor: deleted buffers keep drafts/Save As; reload cannot overwrite concurrent typing; stale folder read cannot replace new tree or write contest metadata; plain folders stay normal');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(app)await app.close();});
