'use strict';
const cache=new Map();
module.exports=async function standings(options={}){
    const id=Number(options.contestId);
    if(!Number.isSafeInteger(id)||id<1||id>99999)throw Error('Invalid public Codeforces contest ID');
    let data=cache.get(id);
    if(!data||Date.now()-data.time>30000){
        const response=await fetch(`https://codeforces.com/api/contest.standings?contestId=${id}`,{redirect:'error',signal:AbortSignal.timeout(20000)});
        if(!response.ok)throw Error(`Codeforces HTTP ${response.status}`);
        const raw=await response.text();if(raw.length>40000000)throw Error('Standings response is too large');
        const value=JSON.parse(raw);
        if(value.status!=='OK'||!Array.isArray(value.result?.rows)||!Array.isArray(value.result?.problems))throw Error(value.comment||'Standings unavailable');
        data={time:Date.now(),value:value.result};if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(id,data);
    }
    const handle=String(options.handle||'').trim().toLowerCase();
    const all=data.value.rows;
    const matches=row=>row.party?.members?.some(m=>m.handle.toLowerCase()===handle);
    const rows=options.onlyHandle&&handle?all.filter(matches):all;
    const page=Math.max(0,Math.floor(Number(options.page)||0));
    return {contest:data.value.contest,problems:data.value.problems,rows:rows.slice(page*50,page*50+50),total:rows.length,page,updatedAt:data.time,myRow:handle?all.find(matches)||null:null};
};
