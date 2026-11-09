'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),{_electron}=require('playwright-core');const ROOT=path.resolve(__dirname,'../..');let app;
(async()=>{const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'semeko-hr-cpp-'))],env,cwd:ROOT});let page;for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}await page.waitForFunction(()=>window.App?.ready);await page.evaluate(()=>ensureMonaco());
    const first=await page.evaluate(()=>electronAPI.ojListProblems({provider:'hackerrank',track:'cpp',page:0}));assert(first.ok,JSON.stringify(first));const second=await page.evaluate(()=>electronAPI.ojListProblems({provider:'hackerrank',track:'cpp',page:1}));assert(second.ok);assert.strictEqual(first.data.total,44);assert.strictEqual(new Set([...first.data.items,...second.data.items].map(i=>i.id)).size,44);
    const solutions={
        'cpp-input-and-output':'int a,b,c;cin>>a>>b>>c;cout<<a+b+c;',
        'c-tutorial-conditional-if-else':'int n;cin>>n;string a[]={"","one","two","three","four","five","six","seven","eight","nine"};if(n>=1&&n<=9)cout<<a[n];else cout<<"Greater than 9";',
        'arrays-introduction':'int n;cin>>n;vector<int>a(n);for(auto&x:a)cin>>x;reverse(a.begin(),a.end());for(int x:a)cout<<x<<" ";',
        'c-tutorial-strings':'string a,b;cin>>a>>b;cout<<a.size()<<" "<<b.size()<<"\\n"<<a+b<<"\\n";swap(a[0],b[0]);cout<<a<<" "<<b;',
        'c-tutorial-for-loop':'int a,b;cin>>a>>b;string s[]={"","one","two","three","four","five","six","seven","eight","nine"};for(int n=a;n<=b;n++){if(n>=1&&n<=9)cout<<s[n];else cout<<(n%2?"odd":"even");cout<<"\\n";}'
    };let checks=0;
    for(const [id,body]of Object.entries(solutions)){
        const detail=await page.evaluate(id=>electronAPI.ojProblemDetail({provider:'hackerrank',id}),id);assert(detail.ok,id+' '+JSON.stringify(detail));
        const tests=await page.evaluate(d=>ProblemBrowser.sampleTests(d),detail.data);assert(tests.length>0,id+' missing samples');
        const content='#include <bits/stdc++.h>\nusing namespace std;int main(){'+body+'}\n';
        const build=await page.evaluate(d=>electronAPI.compile(d),{fileName:'main.cpp',content,flags:'-std=c++17 -O0',untitledId:'hr-cpp-'+id});assert(build.success,JSON.stringify(build));
        for(const test of tests){const r=await page.evaluate(d=>electronAPI.runTest(d),{exePath:build.outputPath,input:test.input,expectedOutput:test.output,timeLimit:5000});assert.strictEqual(r.status,'AC',id+' '+JSON.stringify(r));checks++;}
    }
    await page.locator('#btn-problem-browser').click();await page.locator('#oj-provider').selectOption('hackerrank');await page.locator('#oj-track').selectOption('cpp');await page.locator('#oj-search').fill('cpp-input-and-output');await page.locator('#oj-search-submit').click();await page.locator('.oj-result').first().click();await page.waitForFunction(()=>!document.getElementById('oj-start').disabled);assert.strictEqual(await page.locator('#oj-language').inputValue(),'cpp');await page.locator('#oj-start').click();assert(await page.evaluate(()=>hasFixedProblemTests()&&ccProblem.tests.length>0));
    console.log('PASS live HackerRank C++ catalog: 44 unique challenges, 5 C++ programs / '+checks+' sample checks, category UI, default C++ and fixed test import');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>await app?.close());
