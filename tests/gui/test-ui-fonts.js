'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const {_electron}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../..');let app;
(async()=>{const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'semeko-font-'))],env});
try{let page;for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}await page.waitForFunction(()=>window.App?.ready);
await page.evaluate(async()=>{App.settings.appearance.language='vi';UILanguage.apply();await WorkspaceSupport.openLanguage('py');await ensureMonaco();await document.fonts.load('700 12px "Nunito UI"',UILanguage.translate('COLLECTIONS'));await document.fonts.ready;});
await page.waitForTimeout(120);
const text=await page.evaluate(()=>{const node=[...document.querySelectorAll('.explorer-sidebar .cat-section-title')].find(n=>n.textContent.includes(UILanguage.translate('COLLECTIONS')));if(!node)throw Error('Vietnamese Explorer heading missing');node.dataset.fontProbe='true';return node.textContent;});
const session=await page.context().newCDPSession(page);await session.send('DOM.enable');await session.send('CSS.enable');const {root}=await session.send('DOM.getDocument');const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector:'[data-font-probe]'});const {fonts}=await session.send('CSS.getPlatformFontsForNode',{nodeId});assert(fonts.some(f=>f.glyphCount>0));assert(fonts.filter(f=>f.glyphCount>0).every(f=>f.familyName.startsWith('Nunito')),JSON.stringify(fonts));console.log('PASS Vietnamese Explorer glyphs use bundled Nunito without fallback:',JSON.stringify(fonts.map(f=>({family:f.familyName,glyphs:f.glyphCount}))));await session.detach();
const code=await page.locator('.monaco-editor .view-lines').first().evaluate(n=>getComputedStyle(n).fontFamily);assert(!code.includes('Nunito UI'),'Code font must remain separate');
fs.mkdirSync(path.join(ROOT,'plans/artifacts/gui'),{recursive:true});
for(const factor of [1,1.25]){await app.evaluate(({BrowserWindow},factor)=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('index.html')).webContents.setZoomFactor(factor),factor);await page.waitForTimeout(150);const clipped=await page.locator('.explorer-sidebar .cat-section-title').evaluateAll(ns=>ns.filter(n=>n.getClientRects().length&&n.scrollHeight>n.clientHeight+1).map(n=>n.textContent));assert.deepStrictEqual(clipped,[]);await page.screenshot({path:path.join(ROOT,'plans/artifacts/gui/explorer-font-'+factor+'.png')});}
console.log('PASS Explorer headings at both UI scales; editor font preserved');
}finally{if(app)await app.close();}})().catch(e=>{console.error(e);process.exitCode=1});
