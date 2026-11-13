'use strict';
// Background data publishers must never truncate a JSON catalog that the app
// is reading. Windows scanners may briefly deny rename: retry, never fall back
// to an in-place write.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
module.exports=(file,value)=>{
    fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.'+process.pid+'.'+crypto.randomBytes(5).toString('hex')+'.tmp';
    fs.writeFileSync(temp,JSON.stringify(value),'utf8');const start=Date.now(),wait=new Int32Array(new SharedArrayBuffer(4));
    try{for(;;){try{fs.renameSync(temp,file);return;}catch(e){if(!['EPERM','EBUSY','EACCES'].includes(e.code)||Date.now()-start>5000)throw e;Atomics.wait(wait,0,0,25);}}}
    catch(e){try{fs.unlinkSync(temp);}catch{}throw e;}
};
