'use strict';
// Waiting callers hold no permit. Releasing transfers the permit directly to
// the next caller, including when the previous request failed.
module.exports=limit=>{
 let active=0;const waiting=[];
 return async work=>{
  if(active>=limit)await new Promise(resolve=>waiting.push(resolve));else active++;
  try{return await work();}finally{const next=waiting.shift();if(next)next();else active--;}
 };
};
