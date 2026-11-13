'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),Module=require('module');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-chrome-login-')),load=Module._load,realInterval=setInterval,realClear=clearInterval,previous=process.env.SEMEKO_OFFICIAL_BROWSER;
delete process.env.SEMEKO_OFFICIAL_BROWSER;
let tick,focused=0,bridged=0,opened=[],events=[],closed=false,account=7;
const window={transport:'chrome',isDestroyed:()=>closed,focus(){},close(){closed=true;},on(){},webContents:{getURL:()=> 'https://codeforces.com/',on(){},setWindowOpenHandler(){},executeJavaScript:async()=> 'CFUser'}};
const chrome={open:async(id,p,url)=>{opened.push({id,p,url});return window;},request:async()=>({data:{userStatus:{isSignedIn:true,username:'LCUser'}}})};
class BrowserWindow{constructor(){throw Error('Default login must not open an embedded window');}static getAllWindows(){return[{isDestroyed:()=>false,show(){},focus(){focused++;},webContents:{getURL:()=> 'app://app/src/index.html',send:(channel,event)=>events.push(event)}}];}}
Module._load=function(name,...args){if(name==='electron')return{app:{getPath:()=>root},BrowserWindow};if(name==='./platform-chrome')return chrome;if(name==='./accounts')return{ensureSession:async()=>{},info:()=>({github:{id:account}})};if(name==='./platform-session-bridge')return{connected:()=>true,async start(id,p,accept,options){assert.strictEqual(id,'7');assert.strictEqual(p,'codeforces');assert(options.browserCommands);bridged++;assert(await accept([],{identity:{handle:'CFBrowser'}}));return{opened:true,bridge:true};},stop(){}};return load.call(this,name,...args);};
global.setInterval=fn=>{tick=fn;return 99;};global.clearInterval=()=>{};
const service=require('../../app/services/official-submissions');
(async()=>{
 const initial=await service.login('codeforces');assert(initial.bridge);assert.strictEqual(bridged,1);assert.strictEqual(opened.length,0);assert.strictEqual(service.info(7).connections.codeforces.transport,'bridge');assert.strictEqual(service.info(7).connections.codeforces.handle,'CFBrowser');assert.strictEqual(focused,1);process.env.SEMEKO_OFFICIAL_BROWSER='chrome';
 await service.login('codeforces');assert.strictEqual(opened[0].url,'https://codeforces.com/enter');await tick();assert.strictEqual(service.info(7).connections.codeforces.transport,'chrome');assert.strictEqual(service.info(7).connections.codeforces.handle,'CFUser');assert.strictEqual(focused,2);assert(events.some(e=>e.phase==='signed-in'));
 await service.login('leetcode');await tick();assert.strictEqual(service.info(7).connections.leetcode.handle,'LCUser');assert.strictEqual(focused,3);
 assert(!JSON.stringify(service.info(7)).includes('cookie'));console.log('PASS default current-browser bridge routing; opt-in isolated Chrome verifies CF/LC identity and focuses app (simulated providers)');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{Module._load=load;global.setInterval=realInterval;global.clearInterval=realClear;if(previous===undefined)delete process.env.SEMEKO_OFFICIAL_BROWSER;else process.env.SEMEKO_OFFICIAL_BROWSER=previous;});
