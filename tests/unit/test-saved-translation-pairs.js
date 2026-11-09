const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),Module=require('module');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-pair-')),dir=path.join(root,'translated-articles/codeforces');fs.mkdirSync(dir,{recursive:true});
const source='<div class="problem-statement"><p>Find the maximum sum.</p></div>',hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function save(id,original,extra={}){fs.writeFileSync(path.join(dir,id+'.json'),JSON.stringify({detail:{provider:'codeforces',id,html:original,title:'Old title'},original,translated:'<p>Bản dịch tương ứng.</p>',sourceHash:hash(original),translatedFromHash:hash(original),...extra}));}
save('1-A',source);save('1-B',source,{translatedFromHash:hash('different source')});save('1-C','<p>Найдите максимальную сумму элементов массива.</p>');save('1-D',source,{detail:{provider:'leetcode',id:'1-D'}});
let loads=0;const load=Module._load;Module._load=function(name,...args){if(name==='electron')return{app:{getPath:()=>root}};if(name==='./codeforces-statement')return{loadStatement:async()=>{loads++;return source;}};return load.call(this,name,...args);};
global.fetch=async()=>({ok:true,text:async()=>JSON.stringify({status:'OK',result:{problems:['A','B','C','D'].map(index=>({contestId:1,index,name:'English '+index}))}})});
const service=require('../../app/services/competitive/problem-browser');
(async()=>{const good=await service.detail('codeforces','1-A');assert.strictEqual(good.html,source);assert(good.savedVietnamese);assert.strictEqual(good.title,'Old title');
for(const id of ['1-B','1-C','1-D']){const result=await service.detail('codeforces',id);assert.strictEqual(result.savedVietnamese,undefined);assert.strictEqual(result.html,source);}
assert.strictEqual(loads,3);console.log('PASS English/Vietnamese source hash, exact problem identity, wrong-pair rejection and Russian-source invalidation');})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{Module._load=load;});
