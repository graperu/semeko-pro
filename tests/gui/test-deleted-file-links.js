'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),{_electron}=require('playwright-core');
const root=path.resolve(__dirname,'../..'),folder=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-file-links-')),file=path.join(folder,'F.cpp'),keep=path.join(folder,'Keep.cpp');let app;
(async()=>{
 fs.writeFileSync(file,'int main(){}');fs.writeFileSync(keep,'int main(){}');
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 app=await _electron.launch({executablePath:require('electron'),args:[root,'--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'semeko-file-links-ui-'))],env,cwd:root});
 let page;for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}await page.waitForFunction(()=>window.App?.ready);
 await page.evaluate(async({folder,file,keep})=>{FileExplorer.currentFolder=folder;FileExplorer.recentFiles=[file,keep];FileExplorer.pinnedItems=[file];await FileExplorer.refreshTree();},{folder,file,keep});
 assert((await page.evaluate(()=>FileExplorer.renderRecentSection())).includes('F.cpp'));
 fs.unlinkSync(file);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.waitForFunction(()=>!FileExplorer.recentFiles.some(p=>p.endsWith('F.cpp')));
 assert.strictEqual(await page.evaluate(()=>FileExplorer.pinnedItems.length),0);
 assert((await page.evaluate(()=>FileExplorer.renderRecentSection())).includes('Keep.cpp'));
 await page.evaluate(async keep=>{await FileExplorer.deleteFile(keep);},keep);
 assert.strictEqual(fs.existsSync(keep),false);assert.strictEqual(await page.evaluate(()=>FileExplorer.recentFiles.length),0);
 console.log('PASS real Electron/file IPC: external deletion prunes Recent/pins on focus; in-app deletion prunes immediately; existing file preserved until explicit test deletion');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(app)await app.close();});
