'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os');
const {_electron}=require('playwright-core');
const ROOT=path.resolve(__dirname,'../..');let app;
(async()=>{
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 app=await _electron.launch({executablePath:require('electron'),args:[ROOT,'--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'semeko-samples-'))],env});
 let page;for(let n=0;n<300;n++){page=app.windows().find(p=>p.url().includes('index.html'));if(page)break;await new Promise(r=>setTimeout(r,100));}
 await page.waitForFunction(()=>window.App?.ready);await page.evaluate(()=>ensureMonaco());
 for(const ext of ['cpp','py']){
  const result=await page.evaluate(async ext=>{
   const response=await window.electronAPI.ojProblemDetail({provider:'leetcode',id:'two-sum'});if(!response.ok)throw Error(response.error);
   const d=response.data,tests=ProblemBrowser.sampleTests(d);
   const content=ext==='cpp'?'class Solution {public: vector<int> twoSum(vector<int>& nums,int target){for(int i=0;i<nums.size();i++)for(int j=i+1;j<nums.size();j++)if(nums[i]+nums[j]==target)return {i,j};return {};}};':'class Solution:\n    def twoSum(self, nums, target):\n        for i in range(len(nums)):\n            for j in range(i+1,len(nums)):\n                if nums[i]+nums[j]==target: return [i,j]\n';
   await handleProblemReceived({name:'Two Sum',tests,sourcePlatform:'leetcode',solutionMode:'function',functionMetadata:d.metadata},{newTab:true,starter:content,extension:ext});
   await buildRun();
   const pass=batchTestResults.map(r=>r.status);
   if(ext==='py') {
    const tab=App.tabs.find(t=>t.id===getPreferredTabId());
    setTabText(tab,content.replace('        for i in range(len(nums)):', '        import time\n        time.sleep(0.6)\n        for i in range(len(nums)):'));
    let sawRunning=false,sawWaiting=false;
    const observe=setInterval(()=>{
     sawRunning ||= !!document.querySelector('.test-result-item.status-running');
     sawWaiting ||= !!document.querySelector('.test-result-item.status-pending');
    },20);
    try {await runAllTests();}finally{clearInterval(observe);}
    if(!sawRunning||!sawWaiting)throw Error('Missing visible live running/waiting states');
    if(!document.querySelector('.test-results-summary.all-passed'))throw Error('Missing success summary');
   }
   const fixedBefore=JSON.stringify(ccProblem.tests);
   await deleteAllTestCases(); await deleteTestCaseByIndex(0); await deleteTestCase(); addTestCase();
   if(JSON.stringify(ccProblem.tests)!==fixedBefore)throw Error('Official tests were changed');
   if(!document.getElementById('input-area').readOnly||!document.getElementById('expected-area').readOnly)throw Error('Official fields editable');
   if(document.querySelector('.test-delete-btn')||document.getElementById('btn-list-add-test'))throw Error('Mutation controls remain');
   const checkpoint=JSON.parse(JSON.stringify(ccProblem));checkpoint.tests=[];
   protectProblemTests(checkpoint);if(checkpoint.tests.length!==3)throw Error('Official snapshot not restored');
   setTabText(App.tabs.find(t=>t.id===getPreferredTabId()),ext==='cpp'?'class Solution{public:vector<int> twoSum(vector<int>& a,int b){return {};}};':'class Solution:\n    def twoSum(self,nums,target):\n        return []\n');
   await runAllTests();
   if(!document.querySelector('.test-results-summary.has-failed'))throw Error('Missing failure summary');
   return {tests,pass,fail:batchTestResults.map(r=>r.status),input:document.getElementById('input-area').value,expected:document.getElementById('expected-area').value};
  },ext);
  assert.strictEqual(result.tests.length,3);assert.deepStrictEqual(result.pass,['AC','AC','AC']);assert.deepStrictEqual(result.fail,['WA','WA','WA']);assert(result.input&&result.expected);
  const artifact=path.join(ROOT,'plans/artifacts/gui');fs.mkdirSync(artifact,{recursive:true});await page.screenshot({path:path.join(artifact,'test-colors-'+ext+'.png')});
  console.log('PASS LeetCode '+ext+': locked read-only samples, deletion blocked, snapshot restored, 3 AC / 3 WA');
 }
 const cf=await page.evaluate(()=>ProblemBrowser.sampleTests({provider:'codeforces',html:'<div class="sample-test"><div class="input"><pre>4<br>2</pre></div><div class="output"><pre>YES</pre></div></div>'}));
 assert.deepStrictEqual(cf,[{input:'4\n2\n',output:'YES\n'}]);console.log('PASS Codeforces sample extraction');
 const locks=await page.evaluate(async()=>{
  for(const sourcePlatform of ['codeforces','hackerrank']){
   const problem={sourcePlatform,tests:[{input:'1\n',output:'2\n'}]};
   protectProblemTests(problem);if(!Object.isFrozen(problem.tests)||!Object.isFrozen(problem.tests[0]))throw Error('Platform sample not protected');
  }
  newFile('py');
  if(document.getElementById('input-area').readOnly)throw Error('Manual tab remains locked');
  addTestCase();if(ccProblem.tests.length!==1)throw Error('Manual test creation broken');
  return true;
 });assert(locks);console.log('PASS Codeforces/HackerRank locks and manual-tab editability');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(app)await app.close();});
