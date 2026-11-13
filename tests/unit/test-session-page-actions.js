'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const script=fs.readFileSync('app/browser-extension/page-actions.js','utf8');
let posts=0,current='OtherUser',mode='ok';
const context={URL,AbortSignal,location:{origin:'https://leetcode.com',hostname:'leetcode.com'},document:{cookie:'csrftoken=test-csrf'},fetch:async(url,options)=>{
 if(url==='/graphql/'){
  if(mode==='preflight-network')throw Error('Preflight network failure');
  return{ok:true,json:async()=>({data:{userStatus:{isSignedIn:true,username:current}}})};
 }
 posts++;assert.strictEqual(options.headers['x-csrftoken'],'test-csrf');
 if(mode==='network')throw Error('Connection lost during POST');
 if(mode==='http')return{ok:false,status:503};
 return{ok:true,json:async()=>{if(mode==='invalid-json')throw Error('Invalid JSON');return{submission_id:123};}};
}};
vm.runInNewContext(script,context);
(async()=>{
 const payload={operation:'submit',url:'https://leetcode.com/problems/two-sum/submit/',expectedHandle:'ExpectedUser',options:{method:'POST',body:'{}'}};
 let result=await context.SemekoPageActions.request(payload);assert.strictEqual(result.posted,false);assert(result.error.includes('thay đổi'));assert.strictEqual(posts,0);
 current='ExpectedUser';result=await context.SemekoPageActions.request(payload);assert.strictEqual(result.posted,true);assert.strictEqual(result.data.submission_id,123);assert.strictEqual(posts,1);
 result=await context.SemekoPageActions.request({...payload,url:'https://evil.test/submit'});assert.strictEqual(result.posted,false);assert.strictEqual(posts,1);
 mode='preflight-network';result=await context.SemekoPageActions.request(payload);assert.strictEqual(result.posted,false);assert.strictEqual(posts,1);
 for(const failure of ['network','http','invalid-json']){mode=failure;result=await context.SemekoPageActions.request(payload);assert.strictEqual(result.posted,true);assert(result.error);}
 assert.strictEqual(posts,4);mode='ok';
 const generic=await context.SemekoPageActions.request({...payload,operation:undefined});assert.strictEqual(generic.submission_id,123);assert.strictEqual(generic.posted,undefined);
 // CF form mock: verify target/account/compiler before any POST; keep form source frozen.
 let cfPosts=0,cfMode='ok',problemIndex='A';
 const language={value:'',options:[{value:'54',textContent:'GNU G++17'},{value:'73',textContent:'GNU G++20'},{value:'9',textContent:'C# 8 Mono'}]},source={value:'',dispatchEvent(){}};
 const form={action:'https://codeforces.com/problemset/submit',querySelector:selector=>selector.includes('submittedProblemIndex')?{value:problemIndex}:selector.includes('contestId')?{value:'4'}:{name:'submit',value:'Submit'}};language.form=form;
 context.location={origin:'https://codeforces.com',hostname:'codeforces.com',pathname:'/problemset/submit/4/A',href:'https://codeforces.com/problemset/submit/4/A'};
 context.document={querySelector:selector=>selector.startsWith('#header')?{href:'https://codeforces.com/profile/'+current}:selector.startsWith('select')?language:selector.startsWith('textarea')?source:null};context.window={};context.Event=class{};context.URLSearchParams=URLSearchParams;context.FormData=class{*[Symbol.iterator](){yield['csrf_token','test-only'];}};
 context.DOMParser=class{parseFromString(){return{querySelectorAll:()=>[{dataset:{submissionId:'124'},querySelectorAll:()=>[{getAttribute:()=>'/problemset/problem/4/A'}]}]};}};
 context.fetch=async(url,options)=>{cfPosts++;assert.strictEqual(url,form.action);assert.strictEqual(options.body.get('source'),'int main(){}');if(cfMode==='network')throw Error('Uncertain POST');if(cfMode==='http')return{ok:false,status:403};return{ok:true,text:async()=>'<mock>'};};
 const cf={contestId:4,index:'A',expectedHandle:'ExpectedUser',extension:'cpp',code:'int main(){}',baseline:100};
 current='OtherUser';result=await context.SemekoPageActions.submit(cf);assert.strictEqual(result.posted,false);assert(result.error.includes('thay đổi'));assert.strictEqual(cfPosts,0);
 current='ExpectedUser';problemIndex='B';result=await context.SemekoPageActions.submit(cf);assert.strictEqual(result.posted,false);assert.strictEqual(cfPosts,0);
 problemIndex='A';context.location.pathname='/problemset/submit/5/A';result=await context.SemekoPageActions.submit(cf);assert.strictEqual(result.posted,false);assert.strictEqual(cfPosts,0);context.location.pathname='/problemset/submit/4/A';
 result=await context.SemekoPageActions.submit(cf);assert.strictEqual(result.posted,true);assert.strictEqual(result.ids[0],'124');assert.strictEqual(language.value,'73');
 result=await context.SemekoPageActions.submit({...cf,extension:'cs'});assert.strictEqual(result.posted,true);assert.strictEqual(language.value,'9');
 for(const failure of ['network','http']){cfMode=failure;result=await context.SemekoPageActions.submit(cf);assert.strictEqual(result.posted,true);assert(result.error);}
 assert.strictEqual(cfPosts,4);
 console.log('PASS CF/LC preflight vs attempted-POST certainty, account/target checks, compiler preference/fallback, CSRF, response IDs, network/HTTP/JSON failure and unchanged generic requests (simulated platform pages)');
})().catch(e=>{console.error(e);process.exitCode=1;});
