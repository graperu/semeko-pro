'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { _electron } = require('playwright-core');
const { fixtures } = require('../fixtures/advanced-corpus');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'plans/artifacts/testing/advanced-ui');
const results = [], errors = [];
let app;
(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
    app = await _electron.launch({ executablePath: require('electron'), args: [ROOT,
        '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'semeko-advanced-ui-'))], cwd: ROOT, env });
    let page;
    for (let i=0;i<300;i++) {
        page=app.windows().find(p=>p.url().includes('index.html'));
        if(page)break;
        await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert(page, 'Main window');
    page.on('pageerror', error => errors.push(error.message));
    await page.waitForFunction(()=>window.App?.ready);
    await page.evaluate(()=>ensureMonaco());
    for(const [name,fixture]of Object.entries(fixtures))for(const [ext,code]of Object.entries(fixture.sources)){
        const tests=[fixture.cases[0],fixture.cases[1],fixture.cases[fixture.cases.length-1]].map(t=>({input:t.input,output:t.expected}));
        const result=await page.evaluate(async ({name,ext,code,tests})=>{
            await handleProblemReceived({name:'Local regression '+name,tests,timeLimit:15000},{newTab:true,starter:code,extension:ext});
            await runAllTests();
            return {name,ext,statuses:batchTestResults.map(r=>r.status),summary:document.querySelector('.test-results-summary')?.textContent,source:tabSourceText(App.tabs.find(t=>t.id===getPreferredTabId()))};
        },{name,ext,code,tests});
        results.push(result);
        assert.deepStrictEqual(result.statuses,['AC','AC','AC'],name+' '+ext+': '+JSON.stringify(result));
        assert(result.source.includes(ext==='java'?'public class':ext==='py'?'import':'main')||ext==='cs','Editor source unexpectedly changed');
        console.log('PASS editor -> Run All Tests -> 3 AC: '+name+' '+ext);
        if(ext==='cpp'||ext==='py')await page.screenshot({path:path.join(OUT,name+'-'+ext+'.png')});
    }
    assert.deepStrictEqual(errors,[],'Uncaught renderer errors');
    console.log('PASS '+results.length+' advanced GUI programs / '+results.reduce((n,r)=>n+r.statuses.length,0)+' visible AC results');
})().catch(error=>{errors.push(error.stack);console.error(error);process.exitCode=1;}).finally(async()=>{
    fs.mkdirSync(OUT,{recursive:true});
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({results,errors},null,2));
    if(app)await app.close();
});
