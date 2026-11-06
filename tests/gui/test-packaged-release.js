'use strict';
const {_electron}=require('playwright-core'),fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert');
const binary=process.argv[2]||path.join(process.env.LOCALAPPDATA,'SemekoBuild/release/win-unpacked/Semeko Pro.exe');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-packaged-'));
(async()=>{const env={...process.env,PATH:path.join(process.env.SystemRoot,'System32')};for(const key of ['ELECTRON_RUN_AS_NODE','JAVA_HOME','DOTNET_ROOT','PYTHONHOME','PYTHONPATH'])delete env[key];
const app=await _electron.launch({executablePath:binary,args:['--user-data-dir='+profile],env,timeout:60000});
try{let page;for(let i=0;i<600;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}assert(page,'main window');await page.waitForFunction(()=>window.App?.ready);await page.evaluate(()=>ensureMonaco());
const tools=await app.evaluate(()=>{const r=process.mainModule.require('./services/languages/runtime');return Object.fromEntries(['python','java','javac','dotnet'].map(k=>[k,r.tool(k)]));});for(const [key,file]of Object.entries(tools)){assert(file.includes('language-runtimes'),key+': '+file);console.log('PASS bundled '+key+': '+file);}
for(const ext of ['cpp','c','py','java','cs']){
const built=await page.evaluate(async({ext,profile})=>{closeSettings();newFile(ext,helloWorldTemplate(ext));const tab=App.tabs.find(t=>t.id===getPreferredTabId());tab.path=profile+'/'+(ext==='java'?'Main.java':'hello.'+ext);tab.name=tab.path.split('/').pop();await buildRun();return {built:!!tab.exePath,status:document.getElementById('status-text')?.textContent};},{ext,profile:profile.replace(/\\/g,'/')});assert(built.built,ext+' failed '+JSON.stringify(built));await page.waitForFunction(()=>!App.isRunning,null,{timeout:30000});const output=await page.evaluate(()=>App.outputByTab[getPreferredTabId()]?.text);assert(String(output).includes('Hello, world!'),ext+': '+output);console.log('PASS packaged '+ext+': real build/run without system language runtimes');}
await page.screenshot({path:path.resolve('plans/artifacts/gui/packaged-hello-world.png')});
console.log('PASS packaged release smoke');
}finally{await app.close();}})().catch(e=>{console.error(e);process.exitCode=1});
