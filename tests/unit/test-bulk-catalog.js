'use strict';
const assert=require('assert/strict'),{index,tracks}=require('../../app/services/competitive/bulk-catalog');
(async()=>{
 const job={items:[],providers:{leetcode:{complete:true},codeforces:{complete:true}},targetProviders:['hackerrank'],priorityProviders:['hackerrank']},seen=[];
 const browser={list:async({provider,track,page})=>{seen.push([provider,track,page]);return{items:[{id:track+'-'+page}],total:31,pageSize:30};}};
 for(let i=0;i<tracks.length*2;i++){const r=await index(job,browser);assert.equal(r.provider,'hackerrank');job.providers[r.provider]=r.state;}
 assert.ok(job.providers.hackerrank.complete);assert.equal(job.providers.hackerrank.total,tracks.length*31);assert.equal(seen.length,12);assert.equal(await index(job,browser),null);
 for(const track of tracks)assert.deepEqual(seen.filter(r=>r[1]===track).map(r=>r[2]),[0,1]);
 job.providers.hackerrank={};await assert.rejects(()=>index(job,{list:async()=>({truncated:true,items:[],total:2000})}),/incomplete/);
 console.log('PASS HackerRank: six tracks, pagination, resumable track cursors, scope and incomplete-source rejection');
})().catch(e=>{console.error(e);process.exitCode=1;});
