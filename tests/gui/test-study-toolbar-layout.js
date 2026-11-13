'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),os=require('os'),{_electron}=require('playwright-core');
const root=path.resolve(__dirname,'../..');let app;
(async()=>{
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 app=await _electron.launch({executablePath:require('electron'),args:[root,'--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'semeko-study-layout-'))],env,cwd:root});
 let page;for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}await page.waitForFunction(()=>window.App?.ready);
 await page.evaluate(()=>{
  const d=document.getElementById('oj-browser');d.showModal();
  const host=document.getElementById('oj-statement');host.dataset.provider='28tech';host.replaceChildren();
  for(let i=0;i<20;i++){const p=document.createElement('p');p.textContent=i===0?'In ra một số nguyên duy nhất là tổng các số chẵn trong mảng. Nếu mảng không có số chẵn nào thì in 0.':'Dòng nội dung để kiểm tra cuộn và tránh thanh công cụ che đề bài. '+i;host.append(p);}
  BookStudyUI.problem({adapted:true,id:'layout-fixture',language:'vi'},null,()=>{});
 });
 for(const [width,height]of [[1200,800],[800,600],[600,520]]){
  await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('index.html')).setSize(...size),[width,height]);
  await page.waitForTimeout(100);
  const result=await page.locator('#oj-statement').evaluate(host=>{
   host.scrollTop=0;const bar=host.querySelector('.book-study-problem-tools'),p=host.querySelector('p');
   const before=bar.getBoundingClientRect(),text=p.getBoundingClientRect();
   const noOverflow=bar.scrollWidth<=bar.clientWidth+1;
   host.scrollTop=80;const after=bar.getBoundingClientRect();
   return {noOverflow,noOverlap:before.bottom<=text.top+1,moves:before.top-after.top>60,buttons:[...bar.querySelectorAll('button')].every(b=>b.scrollHeight<=b.clientHeight+2)};
  });
  assert.deepEqual(result,{noOverflow:true,noOverlap:true,moves:true,buttons:true},JSON.stringify({width,result}));
 }
 await page.locator('#oj-statement').evaluate(h=>h.scrollTop=0);
 fs.mkdirSync(path.join(root,'plans/artifacts/gui'),{recursive:true});await page.screenshot({path:path.join(root,'plans/artifacts/gui/study-toolbar-layout.png')});
 console.log('PASS study toolbar: no text overlap, scrolls with content, wraps at 1200/800/600 widths and no clipped button labels');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await app?.close();});
