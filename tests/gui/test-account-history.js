'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {_electron}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../..');
(async()=>{
    const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
    const profile=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-local-practice-'));
    const app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+profile],cwd:ROOT,env});
    try{
        let page;
        for(let i=0;i<600;i++){page=app.windows().find(w=>w.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}
        assert.ok(page);await page.waitForFunction(()=>window.App?.ready);
        await app.evaluate(()=>{
            const fs=process.mainModule.require('fs'),path=process.mainModule.require('path'),electron=process.mainModule.require('electron');
            const official=process.mainModule.require('./app/services/official-submissions');
            const accounts=process.mainModule.require('./app/services/accounts');
            const file=path.join(electron.app.getPath('userData'),'official-submissions.json');
            globalThis.historyFile=file;
            fs.writeFileSync(file,JSON.stringify({connections:{},history:[{owner:'7',ticket:'old-error',provider:'codeforces',phase:'error',error:'HTTP 400',problemURL:'https://codeforces.com/problemset/problem/2284/A1?locale=en'},{owner:'7',ticket:'uncertain',provider:'leetcode',phase:'unknown',sourceHash:'keep-duplicate-guard',problemURL:'https://leetcode.com/problems/two-sum/'},{owner:'7',ticket:'live',provider:'codeforces',phase:'judging',problemURL:'https://codeforces.com/problemset/problem/4/A'},{owner:'8',ticket:'other-owner',phase:'error'}]}));
            accounts.info=()=>({configured:true,github:{id:7,login:'demo'},links:{},official:official.info('7')});
        });
        await page.locator('#btn-account').click();
        const history=page.locator('.account-history');
        assert.equal(await history.evaluate(e=>e.open),false);
        await history.locator('summary').click();
        assert.equal(await page.locator('.account-history-row').count(),3);
        assert.ok(await page.locator('[data-ticket="live"] [data-action="delete-history"]').isDisabled());
        assert.ok((await page.locator('[data-ticket="old-error"] strong').textContent()).includes('2284A1'));
        await page.locator('[data-ticket="old-error"] [data-action="delete-history"]').click();
        await page.waitForFunction(()=>document.querySelectorAll('.account-history-row').length===2);
        assert.equal(await history.evaluate(e=>e.open),true);
        await page.locator('[data-action="clear-history"]').click();
        await page.waitForFunction(()=>document.querySelectorAll('.account-history-row').length===1);
        const saved=await app.evaluate(()=>JSON.parse(process.mainModule.require('fs').readFileSync(globalThis.historyFile,'utf8')));
        assert.ok(saved.history.find(j=>j.ticket==='uncertain').hiddenFromHistory);
        assert.equal(saved.history.find(j=>j.ticket==='uncertain').sourceHash,'keep-duplicate-guard');
        assert.ok(!saved.history.find(j=>j.ticket==='live').hiddenFromHistory);
        assert.ok(!saved.history.find(j=>j.ticket==='other-owner').hiddenFromHistory);
        await page.locator('.account-history summary').click();
        await page.screenshot({path:path.join(ROOT,'plans/artifacts/gui/account-history-compact.png')});
        console.log('PASS: collapsed compact history, individual delete, clear terminal history, active and other-owner preserved, duplicate guard retained');
    }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
