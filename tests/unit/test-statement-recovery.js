'use strict';
const assert=require('assert'),Module=require('module'),os=require('os'),fs=require('fs'),path=require('path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-source-recovery-'));let loads=0;
const original=Module._load;
Module._load=function(name,...args){if(name==='electron')return{app:{getPath:()=>root}};if(name==='./codeforces-statement')return{loadStatement:async()=>++loads===1?'':'<div class="problem-statement">Recovered source</div>'};return original.call(this,name,...args);};
const browser=require('../../app/services/competitive/problem-browser');
global.fetch=async url=>url.includes('/api/')?{ok:true,text:async()=>JSON.stringify({status:'OK',result:{problems:[{contestId:1,index:'A',name:'Source recovery'}]}})}:{ok:false};
(async()=>{assert.strictEqual((await browser.detail('codeforces','1-A')).html,'');assert((await browser.detail('codeforces','1-A')).html.includes('Recovered source'));await browser.detail('codeforces','1-A');assert.strictEqual(loads,2);console.log('PASS failed source is fetched again immediately; recovered source is cached');})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{Module._load=original;});
