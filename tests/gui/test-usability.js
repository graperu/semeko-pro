'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),{_electron}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../..');let app;
(async()=>{
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'semeko-usability-'))],cwd:ROOT,env});
 let page;for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}await page.waitForFunction(()=>window.App?.ready);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await app.evaluate(()=>{process.mainModule.require('./app/services/competitive/problem-browser').list=async()=>({items:[],total:0,pageSize:30});});
 await page.evaluate(async()=>{for(const tab of [...App.tabs])await closeTab(tab.id,{quiet:true});App.settings.appearance.language='vi';UILanguage.apply();updateUI();});
 assert(await page.locator('#welcome').isVisible());assert((await page.locator('#welcome-practice').textContent()).includes('Luyện tập'));
 const out=path.join(ROOT,'plans/artifacts/gui');fs.mkdirSync(out,{recursive:true});
 for(const [width,height,zoom]of [[1280,800,1],[760,520,1],[950,650,1.25]]){
  await app.evaluate(({BrowserWindow},{width,height,zoom})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('index.html'));w.setMinimumSize(700,500);w.setContentSize(width,height);w.webContents.setZoomFactor(zoom);},{width,height,zoom});
  for(const id of ['welcome-new','welcome-open','welcome-open-folder','welcome-practice']){
   const button=page.locator('#'+id);await button.scrollIntoViewIfNeeded();assert(await button.isVisible());const b=await button.boundingBox(),view=await page.evaluate(()=>({w:innerWidth,h:innerHeight}));assert(b.width>=140&&b.height>=44);assert(b.x>=0&&b.x+b.width<=view.w+1);assert(b.y>=0&&b.y+b.height<=view.h+1);
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(out,'usability-welcome-'+width+'-'+zoom+'.png')});
 }
 await page.locator('#welcome-practice').click();assert(await page.locator('#oj-browser').isVisible());await page.locator('#oj-close').click();
 await page.locator('#welcome-new').focus();await page.keyboard.press('Tab');assert.strictEqual(await page.evaluate(()=>document.activeElement.id),'welcome-open');
 await page.keyboard.press('Tab');assert.strictEqual(await page.evaluate(()=>document.activeElement.id),'welcome-open-folder');await page.keyboard.press('Tab');assert.strictEqual(await page.evaluate(()=>document.activeElement.id),'welcome-practice');
 await page.locator('#welcome-new').click();await page.waitForFunction(()=>App.tabs.length>0);assert(await page.locator('#editor-section').isVisible());assert(await page.locator('#welcome').isHidden());
 await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('index.html'));w.webContents.setZoomFactor(1);w.setContentSize(760,520);});
 await page.waitForFunction(()=>innerWidth===760&&innerHeight===520);
 for(const [action,dialog]of [['accounts','semeko-accounts'],['practicearchive','practice-library'],['browseproblems','oj-browser']]){
  await page.locator('#btn-hamburger').click();await page.locator('.menu-btn[data-menu="view"]').click();
  const menu=page.locator('#menu-view');assert(await menu.isVisible());const bounds=await menu.boundingBox();assert(bounds.x>=0&&bounds.y>=30&&bounds.x+bounds.width<=760&&bounds.y+bounds.height<=521,JSON.stringify(bounds));
  const control=page.locator('#menu-view [data-action="'+action+'"]');await control.focus();await page.keyboard.press('Enter');await page.waitForFunction(id=>document.getElementById(id).open,dialog);
  if(dialog==='oj-browser'){
   const summary=page.locator('#oj-more-actions > summary');await summary.focus();await page.keyboard.press('Enter');assert(await page.locator('#btn-submit-official').isVisible());
   await page.keyboard.press('Escape');assert(await page.locator('#oj-browser').isVisible());assert.strictEqual(await page.locator('#oj-more-actions').evaluate(el=>el.open),false);
   await summary.click();await page.locator('#oj-problem-title').click();assert.strictEqual(await page.locator('#oj-more-actions').evaluate(el=>el.open),false);
  }
  await page.locator('#'+dialog+(dialog==='oj-browser'?' #oj-close':' [data-close]')).click();
 }
 assert.deepStrictEqual(errors,[]);console.log('PASS compact welcome actions, direct Practice/New File, keyboard order, Vietnamese and 3 viewport/zoom layouts; no renderer errors');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(app)await app.close();});
