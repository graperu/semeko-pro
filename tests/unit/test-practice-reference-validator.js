'use strict';
const assert=require('node:assert/strict'),path=require('path');
const validator=require('../../app/shared/practice-reference-validator');
const compiler=path.resolve(__dirname,'../../Sameko-GCC/bin/g++.exe');
const fast='#include <iostream>\nint main(){long long n;std::cin>>n;std::cout<<n*(n+1)/2<<"\\n";}';
const slow='#include <iostream>\nint main(){long long n,s=0;std::cin>>n;for(int i=1;i<=n;i++)s+=i;std::cout<<s;}';
const problem={references:[fast,slow],testInputs:[0,1,2,3,4,5,10,100].map(n=>n+'\n')};
(async()=>{
 const tests=await validator.validate(problem,{compiler,sourceTests:[{input:'3\n',output:'6\n'}]});assert.equal(tests.length,9);assert.equal(tests[8].output.trim(),'5050');assert.equal(tests[0].origin,'source');
 await assert.rejects(validator.validate(problem,{compiler,sourceTests:[{input:'3\n',output:'99\n'}]}),/ví dụ gốc/);
 await assert.rejects(validator.validate({...problem,references:[fast,'#include <iostream>\nint main(){std::cout<<-1;}']},{compiler}),/không khớp/);
 await assert.rejects(validator.validate({...problem,references:[fast,'#include <cstdlib>\nint main(){system("anything");}']},{compiler}),/stdin/);
 const empty={references:['#include <iostream>\nint main(){}','#include <iostream>\nint main(){return 0;}'],testInputs:Array(8).fill('')};assert.ok((await validator.validate(empty,{compiler})).every(t=>t.output===''));
 const checker='#include <iostream>\nint main(){int n;if(std::cin>>n && n>=0 && n<=100)std::cout<<"VALID";else std::cout<<"INVALID";}';
 assert.deepEqual(await validator.filterInputs(checker,['-1\n','5\n','101\n'],{compiler,sourceInputs:['3\n']}),['5\n']);
 await assert.rejects(validator.filterInputs(checker,['5\n'],{compiler,sourceInputs:['-1\n']}),/rejected an existing/);
 console.log('PASS: real GCC agreement, original-sample mismatch rejection, divergent solver rejection, unsafe API rejection, explicit empty-output cases');
})().catch(e=>{console.error(e);process.exitCode=1;});
