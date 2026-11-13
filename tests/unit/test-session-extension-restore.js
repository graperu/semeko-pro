'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const pair={key:'http://127.0.0.1:12345:leetcode',origin:'http://127.0.0.1:12345',provider:'leetcode',host:'leetcode.com',token:'a'.repeat(64),expires:Date.now()+86400000,pairedExpires:Date.now()+86400000,platformTab:9,tabId:null,connected:true};
let saved={pairs:[pair]},opened=0,posts=0,first=true,queuedAction='identity';const timers=[],calls=[];
const chrome={storage:{local:{setAccessLevel:async()=>{},get:async()=>saved,set:async value=>{saved=JSON.parse(JSON.stringify(value));}}},runtime:{onMessage:{addListener(){}},onStartup:{addListener(){}}},tabs:{query:async()=>[{id:9,url:'https://leetcode.com/',status:'complete'}],get:async()=>({id:9,url:'https://leetcode.com/',status:'complete'}),create:async()=>{opened++;throw Error('Must not open a tab');},update:async()=>{},onRemoved:{addListener(){}},onUpdated:{addListener(){}},sendMessage:async()=>{}},alarms:{create:async()=>{},clear(){},onAlarm:{addListener(){}}},scripting:{executeScript:async()=>[{result:{handle:'LCUser'}}]}};
vm.runInNewContext(fs.readFileSync('app/browser-extension/background.js','utf8'),{chrome,importScripts(){},SemekoPageActions:{identity(){},request(){},submit(){}},Map,Date,URL,AbortSignal,setTimeout:fn=>timers.push(fn),fetch:async(url,options)=>{
 calls.push(url);if(url.endsWith('/bridge-version'))return{ok:true,json:async()=>({protocol:3})};
 assert.strictEqual(options.headers['X-Semeko-Bridge'],'3');
 if(url.endsWith('/session')){assert.strictEqual(JSON.parse(options.body).identity.handle,'LCUser');return{status:200};}
 if(first){first=false;return{status:409};}
 const body=JSON.parse(options.body);assert(!body.cookies);
 if(body.id){posts++;assert.strictEqual(body.id,'only-once');assert.strictEqual(body.result.handle,'LCUser');}
 const command=queuedAction?{id:'only-once',action:queuedAction}:null;queuedAction=null;
 return{status:200,ok:true,json:async()=>({command})};
}});
const settle=()=>new Promise(r=>setImmediate(r));
(async()=>{
 await settle();assert.strictEqual(saved.pairs[0].connected,false,'App restart requires a fresh page identity handshake');
 await timers.shift()();assert(saved.pairs[0].connected);assert(saved.pairs[0].completed?.id==='only-once','Completed result survives worker suspension');
 await timers.shift()();assert.strictEqual(posts,1);assert.strictEqual(saved.pairs[0].completed,null);assert.strictEqual(opened,0);assert(calls.some(c=>c.endsWith('/session')));
 console.log('PASS persisted extension pairing reconnects after app restart without opening browser, revalidates identity and persists completed RPC result (simulated Chrome APIs)');
})().catch(e=>{console.error(e);process.exitCode=1;});
