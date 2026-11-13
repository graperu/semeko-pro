'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),{_electron}=require('playwright-core');const ROOT=path.resolve(__dirname,'../..');let app;const errors=[];
(async()=>{const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'semeko-productivity-live-'))],env,cwd:ROOT});let page;for(let i=0;i<300;i++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}await page.waitForFunction(()=>window.App?.ready&&window.Productivity);await page.evaluate(()=>ensureMonaco());page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(()=>{App.settings.editor.liveCheck=true;Productivity.configureLive();});
 for(const [extension,invalid,valid]of [
  ['py','def f()\n    pass\n','def f():\n    pass\n'],
  ['java','public class Main {public static void main(String[] a){System.out.println(1)}}','public class Main {public static void main(String[] a){System.out.println(1);}}'],
  ['cs','class Program {static void Main(){System.Console.WriteLine(1)}}','class Program {static void Main(){System.Console.WriteLine(1);}}']]){
  await page.evaluate(({extension,invalid})=>{newFile(extension,invalid);getActiveEditor().getModel().setValue(invalid+'\n');},{extension,invalid});
  await page.waitForFunction(()=>monaco.editor.getModelMarkers({owner:'productivity-live',resource:getActiveEditor().getModel().uri}).some(m=>m.message.includes('Gợi ý:')),null,{timeout:60000});assert((await page.locator('#problems-list').textContent()).length>0);const source=await page.evaluate(()=>getActiveEditor().getModel().getValue());assert.strictEqual(source,invalid+'\n','Checking must not edit code');
  await page.evaluate(valid=>getActiveEditor().getModel().setValue(valid),valid);await page.waitForFunction(()=>monaco.editor.getModelMarkers({owner:'productivity-live',resource:getActiveEditor().getModel().uri}).length===0,null,{timeout:60000});console.log('PASS automatic debounced '+extension+' native diagnostics/hint and clearing after edit without saving source');
 }
 await page.evaluate(()=>{App.settings.editor.liveCheck=false;applySettings();});assert.strictEqual(await page.evaluate(()=>monaco.editor.getModelMarkers({owner:'productivity-live'}).length),0);assert.deepStrictEqual(errors,[]);console.log('PASS disable clears markers; no renderer errors');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(app)await app.close();});
