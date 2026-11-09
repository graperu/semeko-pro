'use strict';
// Local semantic checks for explicitly supported public problem specifications.
// These do not contain or claim to replace the platforms' private test data.
module.exports=function checkProblem(url,input,actual){
 let u;try{u=new URL(url);}catch{return null;}
 if(u.protocol!=='https:'||u.hostname!=='codeforces.com'||!/^\/(?:problemset\/problem\/977\/C|contest\/977\/problem\/C)\/?$/i.test(u.pathname))return null;
 const tokens=String(input).trim().split(/\s+/);if(tokens.some(t=>!/^\d+$/.test(t)))return null;
 const [n,k,...a]=tokens.map(Number);if(!Number.isInteger(n)||n<1||n>200000||a.length!==n||k<0||k>n||a.some(x=>!Number.isInteger(x)||x<1||x>1e9))return null;
 const text=String(actual).trim();if(!/^-?\d+$/.test(text))return false;const x=Number(text);
 if(x===-1){const sorted=[...a].sort((a,b)=>a-b);return k===0?sorted[0]===1:k<n&&sorted[k-1]===sorted[k];}
 return Number.isInteger(x)&&x>=1&&x<=1e9&&a.filter(v=>v<=x).length===k;
};
