'use strict';
const fs=require('fs'),path=require('path');
module.exports=file=>{
 fs.mkdirSync(path.dirname(file),{recursive:true});
 for(let attempt=0;attempt<2;attempt++){
  try{const fd=fs.openSync(file,'wx');try{fs.writeFileSync(fd,String(process.pid));}finally{fs.closeSync(fd);}
   const release=()=>{process.removeListener('exit',release);try{if(fs.readFileSync(file,'utf8')===String(process.pid))fs.unlinkSync(file);}catch{}};
   process.once('exit',release);return release;
  }catch(e){if(e.code!=='EEXIST')throw e;
   let pid;try{pid=Number(fs.readFileSync(file,'utf8'));}catch{return null;}
   if(!Number.isInteger(pid)||pid<=0)return null;
   try{process.kill(pid,0);return null;}catch(error){if(error.code!=='ESRCH')return null;}
   try{fs.unlinkSync(file);}catch{return null;}
  }
 }return null;
};
