'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),Module=require('module');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-catalog-')),load=Module._load;
Module._load=function(name,...args){if(name==='electron')return{app:{getPath:()=>root}};return load.call(this,name,...args);};
const target=require.resolve('../../app/services/competitive/problem-browser');let requests=0;
global.fetch=async url=>{requests++;return{ok:true,text:async()=>JSON.stringify({status:'OK',result:url.includes('contest.list')?[{id:1,name:'Round 1'}]:{problems:[{contestId:1,index:'A',name:'Cached task',tags:[]}]}})};};
(async()=>{
 const options={provider:'codeforces',view:'contests'};await require(target).list(options);assert.strictEqual(requests,2);
 const dir=path.join(root,'problem-catalog-cache');assert.strictEqual(fs.readdirSync(dir).length,2);
 for(const file of fs.readdirSync(dir)){const p=path.join(dir,file),d=JSON.parse(fs.readFileSync(p));d.time=1;fs.writeFileSync(p,JSON.stringify(d));}
 delete require.cache[target];global.fetch=async()=>{requests++;throw Error('Offline');};
 const result=await require(target).list(options);assert.strictEqual(result.items[0].title,'Cached task');assert.strictEqual(result.groups[0].name,'Round 1');
 const savedDir=path.join(root,'translated-articles/codeforces');fs.mkdirSync(savedDir,{recursive:true});fs.writeFileSync(path.join(savedDir,'2-A.json'),JSON.stringify({detail:{provider:'codeforces',id:'2-A',title:'Saved task'},original:'<p>Saved question</p>',translated:'<p>Saved translation</p>'}));
 delete require.cache[target];const before=requests;const detail=await require(target).detail('codeforces','2-A');assert(detail.html.includes('Saved question'));assert.strictEqual(requests,before);
 console.log('PASS disk catalog survives restart/offline, stale lists return while refreshing, saved article makes zero network calls');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{Module._load=load;});
