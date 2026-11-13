'use strict';
const assert=require('assert/strict'),validator=require('../../app/shared/practice-reference-validator'),path=require('path');
(async()=>{const compiler=path.resolve('Sameko-GCC/bin/g++.exe');
 const run=await validator.runExample('#include <iostream>\n#include <list>\n#include <forward_list>\nint main(){std::list<int> xs{1,2,1};xs.remove(1);std::forward_list<int> ys{3,4,3};ys.remove(3);std::cout<<xs.front()<<" "<<ys.front()<<"\\n";}','',{compiler});assert.equal(run.output.trim(),'2 4');
 for(const code of ['#include <cstdio>\nint main(){remove("file");}','#include <cstdio>\nint main(){std::remove("file");}','#include <cstdio>\nint main(){auto f=&remove;f("file");}'])await assert.rejects(()=>validator.runExample(code,'',{compiler}),/stdin/);
 console.log('PASS list/forward_list member remove allowed; filesystem remove calls and aliases remain blocked');
})().catch(e=>{console.error(e);process.exitCode=1;});
