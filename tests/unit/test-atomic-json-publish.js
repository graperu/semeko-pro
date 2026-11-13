'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),os=require('os');
const publish=require('../../app/shared/atomic-json-publish'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-publish-')),file=path.join(dir,'catalog.json');
fs.writeFileSync(file,JSON.stringify({before:true}));const original=fs.renameSync,clock=Date.now;let attempts=0;
try{
 fs.renameSync=(from,to)=>{attempts++;if(attempts<3){assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),{before:true});const e=Error('Scanner lock');e.code='EPERM';throw e;}return original(from,to);};
 publish(file,{after:true});assert.equal(attempts,3);assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),{after:true});
 let time=0;Date.now=()=>time+=3000;fs.renameSync=()=>{const e=Error('locked');e.code='EPERM';throw e;};assert.throws(()=>publish(file,{partial:true}),/locked/);assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),{after:true});assert.deepEqual(fs.readdirSync(dir),['catalog.json']);
 console.log('PASS: transient Windows rename retry, intact old JSON during lock, permanent failure preserves data and removes own temp');
}finally{fs.renameSync=original;Date.now=clock;}
