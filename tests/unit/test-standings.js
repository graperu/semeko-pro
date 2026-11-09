'use strict';
const assert=require('assert');let calls=0;
global.fetch=async url=>{calls++;assert.strictEqual(url,'https://codeforces.com/api/contest.standings?contestId=566');return{ok:true,text:async()=>JSON.stringify({status:'OK',result:{contest:{id:566,name:'Test'},problems:[{index:'A'}],rows:Array.from({length:125},(_,i)=>({rank:i+1,party:{members:[{handle:'User'+i}]},points:i,penalty:0,problemResults:[{points:i}] }))}})};};
const standings=require('../../app/services/competitive/standings');
(async()=>{
    await assert.rejects(()=>standings({contestId:'566&handles=evil'}));
    const first=await standings({contestId:566,handle:'USER100'});assert.strictEqual(first.total,125);assert.strictEqual(first.rows.length,50);assert.strictEqual(first.myRow.rank,101);
    const page=await standings({contestId:566,page:2});assert.strictEqual(page.rows.length,25);assert.strictEqual(page.rows[0].rank,101);
    const filtered=await standings({contestId:566,handle:'user100',onlyHandle:true});assert.strictEqual(filtered.total,1);assert.strictEqual(filtered.rows[0].rank,101);assert.strictEqual(calls,1);
    console.log('PASS official URL, ID validation, pagination, case-insensitive handle, rank preservation and cache');
})().catch(e=>{console.error(e);process.exitCode=1;});
