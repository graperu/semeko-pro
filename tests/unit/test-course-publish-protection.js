'use strict';
const assert=require('assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-course-protect-'));process.env.SEMEKO_AUTHORED_COURSE_DIR=dir;
const service=require('../../app/services/competitive/authored-course'),task=service.tasks()[0];
try{
 const good={status:'ready',lessons:[],validation:{author:'direct-source-review'}};
 assert.equal(service.publish(task,good),true);
 const before=fs.readFileSync(path.join(dir,task.id+'.json'),'utf8');
 assert.equal(service.publish(task,{status:'failed',error:'late HTTP 429'}),false);
 assert.equal(service.publish(task,{status:'ready',lessons:[],validation:{sourceReviewed:true}}),false);
 assert.equal(fs.readFileSync(path.join(dir,task.id+'.json'),'utf8'),before);
 assert.equal(service.publish(task,{...good,reason:'new direct review'}),true);
 assert.equal(service.read(task.id).reason,'new direct review');
 assert.equal(service.publish({...task,sourceHash:'changed-source'},{status:'failed',error:'new source requires review'}),true);
 console.log('PASS: late failure and automatic output cannot replace a directly reviewed course; changed source can be re-evaluated');
}finally{for(const name of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,name));fs.rmdirSync(dir);}
