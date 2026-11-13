'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {_electron}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../..');
const exerciseTitle=require('../../app/services/competitive/local-practice').list().find(i=>i.id==='local-eb6634c0e7416a4c2a212c4f-0').title;
(async()=>{
    const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
    const profile=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-local-practice-'));
    const app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+profile],cwd:ROOT,env});
    try{
        let page;
        for(let i=0;i<600;i++){page=app.windows().find(w=>w.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}
        assert.ok(page);await page.waitForFunction(()=>window.App?.ready);
        await page.evaluate(()=>ProblemBrowser.open());
        await page.locator('#oj-provider').selectOption('28tech');
        await page.locator('#oj-search').fill(exerciseTitle);
        await page.locator('#oj-search-form').evaluate(f=>f.requestSubmit());
        const result=page.locator('.oj-result').filter({has:page.locator('strong',{hasText:exerciseTitle})}).first();
        await result.waitFor({state:'visible',timeout:30000});await result.click();
        await page.waitForFunction(()=>document.getElementById('oj-statement').textContent.includes('299151'));
        assert.ok(!(await page.locator('#oj-start').isDisabled()));
        assert.ok(await page.locator('#oj-open-official').isHidden());
        assert.equal(await page.locator('#oj-statement .sample-test .input pre').first().textContent(),'773\n');
        assert.equal((await page.locator('#oj-statement .sample-test .output pre').first().textContent()).replace(/\r\n/g,'\n'),'299151\n');
        await page.locator('#oj-statement .sample-test .input .sample-copy').first().click();
        assert.equal((await app.evaluate(()=>process.mainModule.require('electron').clipboard.readText())).replace(/\r\n/g,'\n'),'773\n');
        const listing=await page.evaluate(()=>electronAPI.ojListProblems({provider:'28tech',page:0}));
        assert.equal(listing.data.pageSize,10);assert.equal(listing.data.groups.length,10);
        assert.deepEqual(listing.data.groups.map(g=>Number(/BUOI\s*(\d+)/i.exec(g.name)[1])),[1,2,3,4,5,6,7,8,9,10]);
        assert.equal(await page.locator('#oj-statement button.oj-result').count(),0,'Direct individual exercise, no file selection');
        const target=path.join(ROOT,'plans/artifacts/gui/local-practice.png');fs.mkdirSync(path.dirname(target),{recursive:true});await page.screenshot({path:target});
        console.log('PASS: offline individual exercise preview, original sample, start enabled, no document collection');
    }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
