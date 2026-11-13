'use strict';
const providers=['leetcode','codeforces','hackerrank'];
const tracks=['cpp','algorithms','data-structures','mathematics','python','java'];
async function index(job,browser){
 const order=[...new Set([...(job.priorityProviders||[]),...providers])];
 const provider=order.find(p=>providers.includes(p)&&(!job.targetProviders?.length||job.targetProviders.includes(p))&&!job.providers[p]?.complete);
 if(!provider)return null;
 const previous=job.providers[provider]||{};
 const track=provider==='hackerrank'?tracks.find(t=>!previous.tracks?.[t]?.complete):null;
 if(provider==='hackerrank'&&!track)return {provider,items:[],state:{...previous,complete:true}};
 const cursor=(track?previous.tracks?.[track]:previous)||{page:0};
 const result=await browser.list({provider,page:cursor.page||0,...(track?{track}:{})});
 if(result.truncated)throw Error('HackerRank catalog is incomplete for '+track+'; remaining items were not marked translated');
 const page=(cursor.page||0)+1,state={page,complete:page*(result.pageSize||30)>=result.total,total:result.total};
 if(!track)return {provider,items:result.items,state};
 const indexedTracks={...(previous.tracks||{}),[track]:state};
 return {provider,items:result.items,state:{tracks:indexedTracks,complete:tracks.every(t=>indexedTracks[t]?.complete),total:Object.values(indexedTracks).reduce((n,t)=>n+t.total,0)}};
}
module.exports={providers,tracks,index};
