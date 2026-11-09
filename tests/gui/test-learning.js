'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),{_electron}=require('playwright-core');
const curriculum=require('../../src/features/learning/curriculum');const ROOT=path.resolve(__dirname,'../..');let app,page;const profile=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-learning-'));let checks=0;
async function launch(){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+profile],cwd:ROOT,env});for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}await page.waitForFunction(()=>window.App?.ready);await page.evaluate(()=>ensureMonaco());}
(async()=>{
    await launch();
    for(const ext of ['cpp','py'])for(const topic of curriculum.topics){
        const b=await page.evaluate(({ext,topic})=>electronAPI.compile({fileName:'main.'+ext,content:topic[ext],flags:'-std=c++17 -O0',untitledId:'learning-'+ext+'-'+topic.id}),{ext,topic});assert(b.success,JSON.stringify(b));
        for(const [input,expectedOutput]of topic.tests){const r=await page.evaluate(d=>electronAPI.runTest(d),{exePath:b.outputPath,input,expectedOutput,timeLimit:5000});assert.strictEqual(r.status,'AC',ext+' '+topic.id+' '+JSON.stringify(r));checks++;}
    }
    await page.locator('#btn-learning').click();assert.strictEqual(await page.locator('.learning-lesson').count(),8);
    assert(!(await page.locator('#learning-center').textContent()).includes('[object Object]'));
    await page.getByRole('combobox',{name:'Ngôn ngữ học'}).selectOption('py');await page.getByRole('button',{name:'Đánh dấu đã đọc',exact:true}).click();
    await page.getByRole('button',{name:'Mở bài tập có test',exact:true}).click();
    assert(await page.evaluate(()=>hasFixedProblemTests()&&ccProblem.tests.length===3));assert(await page.locator('#input-area').evaluate(e=>e.readOnly));
    await page.evaluate(async()=>{await runAllTests();});
    assert(!(await page.evaluate(()=>electronAPI.stateRead('learning-progress'))).progress['py:io'].solved);
    await page.evaluate(code=>setTabText(App.tabs.find(t=>t.id===getPreferredTabId()),code),curriculum.topics[0].py);
    await page.evaluate(async()=>{await runAllTests();});
    const saved=await page.evaluate(()=>electronAPI.stateRead('learning-progress'));assert(saved.progress['py:io'].solved);assert(!saved.progress['cpp:io']);
    await page.locator('#btn-learning').click();assert((await page.locator('#learning-center [role=status]').textContent()).includes('1/8 bài tập'));
    await page.getByRole('combobox',{name:'Nội dung học'}).selectOption('resources');assert.strictEqual(await page.getByRole('button',{name:'Mở tài liệu chính thức'}).count(),2);
    await page.getByRole('combobox',{name:'Nội dung học'}).selectOption('lessons');
    fs.mkdirSync(path.join(ROOT,'plans/artifacts/gui'),{recursive:true});await page.screenshot({path:path.join(ROOT,'plans/artifacts/gui/learning-center.png')});
    await app.close();app=null;page=null;await launch();await page.locator('#btn-learning').click();await page.getByRole('combobox',{name:'Ngôn ngữ học'}).selectOption('py');assert((await page.locator('#learning-center [role=status]').textContent()).includes('1/8 bài tập'));
    console.log(`PASS ${checks} real C++/Python sample checks, lesson navigation, fixed tests, wrong/correct exercise, separate language progress, resources and restart persistence`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await app?.close();});
