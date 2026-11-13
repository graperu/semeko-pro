'use strict';
// Reviews only records that passed direct source review; does not manufacture completion.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const service=require('../../app/services/competitive/authored-course'),validator=require('../../app/shared/practice-reference-validator');
(async()=>{let units=0,examples=0;const failed=[],remaining=[];for(const task of service.tasks()){
 const r=service.read(task.id);if(!r||!['ready','reference-only'].includes(r.status)||r.sourceHash!==task.sourceHash){remaining.push(task.id);continue;}
 if(r.validation?.author!=='direct-source-review'||r.status!=='ready')continue;
 try{service.validate(r);service.normalizeCoverage(task,r.coverage);for(const l of r.lessons){const run=await validator.runExample(l.example.code,l.example.input,{compiler:path.resolve('Sameko-GCC/bin/g++.exe')});assert.equal(run.output.replace(/\r\n/g,'\n'),l.example.output.replace(/\r\n/g,'\n'));for(const f of l.figures||[])require('../../app/services/competitive/course-figures').asset(f.assetId);examples++;}units++;}catch(e){failed.push({id:task.id,error:e.message});}
 }
 const report={at:new Date().toISOString(),units,examples,failed,remaining};fs.mkdirSync('plans/artifacts',{recursive:true});fs.writeFileSync('plans/artifacts/reviewed-course-validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify({units,examples,failures:failed.length,remaining:remaining.length}));assert.equal(failed.length,0,JSON.stringify(failed));if(process.argv.includes('--require-complete'))assert.equal(remaining.length,0,'Unfinished source units remain');
})().catch(e=>{console.error(e);process.exitCode=1;});
