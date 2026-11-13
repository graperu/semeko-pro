'use strict';
const assert=require('assert'),http=require('http'),Module=require('module'),fs=require('fs'),path=require('path'),os=require('os');const root=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-pairing-')); let opened,openCount=0,accepted=0;const original=Module._load;
Module._load=function(name,...args){if(name==='electron')return{app:{getAppPath:()=>process.cwd(),getPath:()=>root},safeStorage:{isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from([...s].reverse().join('')),decryptString:b=>[...b.toString()].reverse().join('')},shell:{openExternal:async url=>{opened=url;openCount++;}}};return original.call(this,name,...args);};
const bridge=require('../../app/services/platform-session-bridge');Module._load=original;
function post(url,token,cookies,origin='chrome-extension://'+'a'.repeat(32),route='/session'){
 return new Promise((resolve,reject)=>{const u=new URL(url);const req=http.request({hostname:u.hostname,port:u.port,path:route,method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token,'Content-Type':'application/json','X-Semeko-Bridge':'3'}},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,body}));});req.on('error',reject);req.end(JSON.stringify(Array.isArray(cookies)?{cookies}:cookies));});
}
(async()=>{
 const result=await bridge.start('7','leetcode',async cookies=>{accepted++;assert.strictEqual(cookies[0].httpOnly,true);assert.strictEqual(cookies[0].value,'session-test-only');return true;});assert(result.bridge);
 const url=new URL(opened),token=url.hash.split(':')[1];
 assert.strictEqual((await post(opened,'bad',[])).status,403);
 assert.strictEqual((await post(opened,token,[],'https://evil.test')).status,403);
 assert.strictEqual((await post(opened,token,[{domain:'.google.com',name:'bad',value:'x'}])).status,400);
 assert.strictEqual(accepted,0);
 const cookie={domain:'.leetcode.com',name:'LEETCODE_SESSION',value:'session-test-only',path:'/',secure:true,httpOnly:true,hostOnly:false,session:true,sameSite:'lax'};
 assert.strictEqual((await post(opened,token,[cookie])).status,200);assert.strictEqual(accepted,1);
 await assert.rejects(post(opened,token,[cookie]));
 assert.throws(()=>bridge.validCookies([{...cookie,partitionKey:{topLevelSite:'x'}}],'leetcode.com'));
 assert.throws(()=>bridge.validCookies(Array(101).fill(cookie),'leetcode.com'));
 await bridge.start('8','codeforces',async(cookies,metadata)=>{assert.strictEqual(cookies.length,0);return metadata.identity?.handle==='CFUser';},{browserCommands:true});
 assert.strictEqual(bridge.connected('8','codeforces'),false);
 const current=opened,key=new URL(current).hash.split(':')[1];
 assert.strictEqual((await post(current,key,{identity:{handle:null}})).status,202);
 assert.strictEqual((await post(current,key,{identity:{handle:'CFUser'}})).status,200);
 assert.strictEqual(bridge.connected('8','codeforces'),true);const openings=openCount;const existing=await bridge.start('8','codeforces',async()=>{throw Error('Must reuse connection');},{browserCommands:true});assert(existing.connected);assert.strictEqual(openCount,openings,'Healthy connection must not reopen pairing page');
 const work=bridge.command('8','codeforces',{action:'identity'});
 const command=JSON.parse((await post(current,key,{},undefined,'/commands')).body).command;
 assert.strictEqual(command.action,'identity');
 assert.strictEqual(JSON.parse((await post(current,key,{},undefined,'/commands')).body).command,null,'Command must be delivered once only');
 await post(current,key,{id:command.id,result:{handle:'CFUser'}},undefined,'/commands');assert.strictEqual((await work).handle,'CFUser');assert.strictEqual((await post(current,key,{identity:{handle:'OtherUser'}})).status,409,'Bound account must not silently change');await post(current,key,{},undefined,'/disconnect');assert.strictEqual(bridge.connected('8','codeforces'),false);assert(fs.readFileSync(path.join(root,'platform-browser-pairings.json'),'utf8').includes('codeforces'),'Closing tab preserves encrypted pairing');assert.strictEqual((await post(current,key,{identity:{handle:'CFUser'}})).status,200);const stored=fs.readFileSync(path.join(root,'platform-browser-pairings.json'),'utf8');assert(!stored.includes(key));bridge.stop('8',null,{preserve:true});await new Promise(r=>setImmediate(r));const opensBeforeRestore=openCount;await bridge.restore((id,provider)=>async(_cookies,metadata)=>{assert.strictEqual(id,'8');assert.strictEqual(provider,'codeforces');return metadata.identity?.handle==='CFUser';});assert.strictEqual(openCount,opensBeforeRestore,'Restore must never open a browser');assert.strictEqual((await post(current,key,{},undefined,'/commands')).status,409,'Restored server needs fresh identity');assert.strictEqual((await post(current,key,{identity:{handle:'CFUser'}})).status,200);assert(bridge.connected('8','codeforces'));bridge.stop('8');assert.strictEqual(bridge.connected('8','codeforces'),false);
 console.log('PASS loopback pairing token, extension-origin restriction, foreign-domain rejection, cookie validation, one-use session transfer and server shutdown (mock platform identity)');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{bridge.stop('7');bridge.stop('8');});
