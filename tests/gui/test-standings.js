'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),{_electron}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../..');let app;
(async()=>{
    const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
    app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'semeko-standings-'))],env,cwd:ROOT});
    let page;for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}
    await page.waitForFunction(()=>window.App?.ready);
    await app.evaluate(()=>{process.mainModule.require('./app/services/competitive/problem-browser').list=async()=>({items:[{provider:'codeforces',id:'566-A',contestId:566,index:'A',number:'566A',title:'Test problem',difficulty:'Unrated',tags:[]}],total:1,pageSize:30});});
    await page.evaluate(()=>{document.getElementById('oj-provider').value='codeforces';ProblemBrowser.open();});
    await page.locator('.oj-problem-rank').click();
    await page.waitForFunction(()=>document.querySelectorAll('#cf-standings td').length>0,{},{timeout:30000});
    assert.strictEqual(await page.locator('#cf-standings th').count(),11);assert.strictEqual(await page.locator('#cf-standings tr').count(),51);
    await page.getByRole('button',{name:'Sau',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#cf-standings [role=status]').textContent.includes('Trang 2/'));
    assert.strictEqual(await page.locator('#cf-standings tr').nth(1).locator('td').first().textContent(),'51');
    const handle=await page.locator('#cf-standings tr').nth(1).locator('td').nth(1).textContent();
    await page.getByRole('textbox',{name:'Username',exact:true}).fill(handle.split(',')[0]);await page.locator('#cf-standings input[type=checkbox]').check();await page.getByRole('button',{name:'Cập nhật',exact:true}).click();
    await page.waitForFunction(()=>document.querySelectorAll('#cf-standings tr').length===2);
    fs.mkdirSync(path.join(ROOT,'plans/artifacts/gui'),{recursive:true});await page.screenshot({path:path.join(ROOT,'plans/artifacts/gui/codeforces-standings.png')});
    console.log('PASS live Electron standings A-G, 50-row pagination, official rank and username filter');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await app?.close();});
