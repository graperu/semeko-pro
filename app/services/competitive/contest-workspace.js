'use strict';
const {app}=require('electron'),fs=require('fs'),path=require('path');
const {writeFileAtomicSync}=require('../../shared/fs-atomic');
module.exports=({contestId,index,extension,starter})=>{
 if(!Number.isInteger(contestId)||contestId<=0||!/^[A-Z][0-9]*$/.test(index||''))throw Error('Invalid Codeforces contest or problem');
 if(!['cpp','c','py','java','cs'].includes(extension)||typeof starter!=='string'||starter.length>2000000)throw Error('Invalid contest solution');
 const folder=path.join(app.getPath('userData'),'Workspaces','Contests','Codeforces',String(contestId));
 const metaPath=path.join(folder,'.sameko');let meta;
 try{meta=JSON.parse(fs.readFileSync(metaPath,'utf8'));if(meta.type!=='contest'||meta.contestId!==contestId||!Array.isArray(meta.problems))throw Error('Invalid contest metadata');}
 catch(e){if(e.code!=='ENOENT')throw Error('Existing contest metadata could not be read; files were left unchanged');meta={type:'contest',platform:'Codeforces',contestId,name:'Codeforces '+contestId,date:new Date().toISOString().slice(0,10),problems:[]};}
 fs.mkdirSync(folder,{recursive:true});const fileName=index+'.'+extension,entry=path.join(folder,fileName);
 if(extension==='java')starter=starter.replace(/public class (?:Main|Solution)\b/,'public class '+index);
 let created=true;try{fs.writeFileSync(entry,starter,{encoding:'utf8',flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;created=false;}
 let problem=meta.problems.find(p=>p.id===index);
 if(!problem){problem={id:index,status:'todo',timeSpentMs:0,activeApproach:null,approaches:[]};meta.problems.push(problem);}
 problem.fileName=fileName;problem.files={...problem.files,[extension]:fileName};
 writeFileAtomicSync(metaPath,JSON.stringify(meta,null,2),'utf8');
 return{folder,entry,fileName,created};
};
