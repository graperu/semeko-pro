'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),{_electron}=require('playwright-core');const ROOT=path.resolve(__dirname,'../..');let app;
(async()=>{const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'semeko-tab-clipping-'))],env,cwd:ROOT});let page;for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}await page.waitForFunction(()=>window.App?.ready);await page.evaluate(()=>ensureMonaco());
    await page.evaluate(()=>{for(let i=0;i<3;i++){newFile('cpp');App.tabs.find(t=>t.id===getPreferredTabId()).name='codeforces_2278_long_problem_title_'+i+'.cpp';}renderTabs();});
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('index.html')).setSize(1580,900));
    await page.evaluate(()=>UILanguage.apply('vi'));await page.waitForTimeout(200);
    assert.strictEqual(await page.locator('#btn-learning,#learning-center').count(),0);
    const compact=await page.evaluate(()=>({tabs:document.querySelector('.tabs-wrap').getBoundingClientRect().width,actions:['btn-problem-browser','btn-practice-library','btn-account'].map(id=>{const b=document.getElementById(id);return{id,width:b.getBoundingClientRect().width,title:b.title,label:b.textContent.trim()};})}));
    assert(compact.tabs>500,JSON.stringify(compact));for(const b of compact.actions){assert(b.width<=32,JSON.stringify(b));assert(b.title&&b.label);}
    fs.mkdirSync(path.join(ROOT,'plans/artifacts/gui'),{recursive:true});await page.screenshot({path:path.join(ROOT,'plans/artifacts/gui/compact-header.png')});
    for(const width of [145,210,310]){
        await page.evaluate(width=>{const wrap=document.querySelector('.tabs-wrap');wrap.style.flex='0 0 '+width+'px';wrap.style.width=width+'px';},width);await page.waitForTimeout(150);
        const bounds=await page.evaluate(()=>{const c=document.getElementById('tabs-container'),t=c.querySelector('.tab.active'),name=t.querySelector('.tab-name'),b=document.getElementById('btn-new-tab'),r=c.getBoundingClientRect(),n=name.getBoundingClientRect();return{strip:r.width,nameLeft:n.left,stripLeft:r.left,nameRight:n.right,stripRight:r.right,plusLeft:b.getBoundingClientRect().left,title:name.title,text:name.textContent,ellipsis:getComputedStyle(name).textOverflow};});
        assert(bounds.strip>0);assert(bounds.nameLeft>=bounds.stripLeft-1,JSON.stringify(bounds));assert(bounds.nameRight<=bounds.plusLeft+1,JSON.stringify(bounds));assert.strictEqual(bounds.ellipsis,'ellipsis');assert.strictEqual(bounds.title,bounds.text);
    }
    fs.mkdirSync(path.join(ROOT,'plans/artifacts/gui'),{recursive:true});await page.screenshot({path:path.join(ROOT,'plans/artifacts/gui/tab-title-clipping.png')});console.log('PASS long active tab keeps its beginning at three narrow widths, trailing ellipsis, full tooltip and separate plus button');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>await app?.close());
