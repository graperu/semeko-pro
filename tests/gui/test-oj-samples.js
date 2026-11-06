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
   setTabText(App.tabs.find(t=>t.id===getPreferredTabId()),ext==='cpp'?'class Solution{public:vector<int> twoSum(vector<int>& a,int b){return {};}};':'class Solution:\n    def twoSum(self,nums,target):\n        return []\n');
   await runAllTests();
   return {tests,pass,fail:batchTestResults.map(r=>r.status),input:document.getElementById('input-area').value,expected:document.getElementById('expected-area').value};
  },ext);
  assert.strictEqual(result.tests.length,3);assert.deepStrictEqual(result.pass,['AC','AC','AC']);assert.deepStrictEqual(result.fail,['WA','WA','WA']);assert(result.input&&result.expected);
  console.log('PASS LeetCode '+ext+': 3 auto-filled samples, Run gives 3 AC, wrong solution gives 3 WA');
 }
 const cf=await page.evaluate(()=>ProblemBrowser.sampleTests({provider:'codeforces',html:'<div class="sample-test"><div class="input"><pre>4<br>2</pre></div><div class="output"><pre>YES</pre></div></div>'}));
 assert.deepStrictEqual(cf,[{input:'4\n2\n',output:'YES\n'}]);console.log('PASS Codeforces sample extraction');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(app)await app.close();});
