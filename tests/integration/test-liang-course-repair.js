'use strict';
const assert=require('assert/strict'),path=require('path'),s=require('../../app/services/competitive/authored-course'),validator=require('../../app/shared/practice-reference-validator');
const compiler=path.resolve(__dirname,'../../Sameko-GCC/bin/g++.exe');let checks=0;
async function run(code,input){checks++;return(await validator.runExample(code,input,{compiler})).output.replace(/\r\n/g,'\n');}
function codeAt(page,lesson){return s.read('local-f74b777a02e4362c174ab2d6-course-'+page).lessons[lesson].example.code;}
(async()=>{
 for(const p of [476,492,508,544,560,564,580,612]){const r=s.read('local-f74b777a02e4362c174ab2d6-course-'+p);assert.equal(r.status,'ready');s.validate(r);for(const l of r.lessons){assert.equal(await run(l.example.code,l.example.input),l.example.output);for(const f of l.figures||[])require('../../app/services/competitive/course-figures').asset(f.assetId);}assert.equal(new Set(r.sourceExercises.map(e=>e.number)).size,r.sourceExercises.length);}
 const stack=codeAt(492,1).replace(/int main\(\)/,'int original_main()')+'\nint main(){ImprovedStack<int> a;a.push(3);ImprovedStack<int>b;b=a;b=b;a.pop();std::cout<<b.peek()<<" "<<b.getSize()<<"\\n";try{a.pop();}catch(const std::out_of_range&){std::cout<<"empty rejected\\n";}}';
 assert.equal(await run(stack,''),'3 1\nempty rejected\n');
 const bound=codeAt(492,0).replace(/int main\(\)/,'int original_main()')+'\nint main(){BoundedStack<int,1>s;std::cout<<s.push(1)<<" "<<s.push(2)<<" "<<s.pop()<<"\\n";try{s.pop();}catch(const std::out_of_range&){std::cout<<"empty rejected\\n";}}';
 assert.equal(await run(bound,''),'1 0 1\nempty rejected\n');
 const extraction=codeAt(564,0).replace(/int main\(\)/,'int original_main()')+'\nint main(){Rational r(3,4);if(!(std::cin>>r))std::cout<<"rejected ";std::cout<<r<<"\\n";}';
 assert.equal(await run(extraction,'1 0'),'rejected 3/4\n');assert.equal(await run(extraction,'7 x'),'rejected 3/4\n');assert.equal(await run(extraction,'7 8'),'7/8\n');
 const append=codeAt(508,0).replace(/int main\(\)/,'int original_main()')+'\nint main(){std::vector<int>v{1,2};addVector(v,v);for(int n:v)std::cout<<n<<" ";std::cout<<"\\n";}';assert.equal(await run(append,''),'1 2 1 2 \n');
 for(const [input,out]of [['4 2 -','2\n'],['4 0 /','Invalid expression\n'],['','Invalid expression\n'],['1 2','Invalid expression\n'],['3x','Invalid expression\n'],['1000000 1000000 *','Invalid expression\n']])assert.equal(await run(codeAt(508,1),input),out);
 const book=s.list().find(b=>b.id==='local-f74b777a02e4362c174ab2d6');assert.equal(book.chapters.reduce((n,c)=>n+c.failed,0),0);assert.equal(book.chapters.reduce((n,c)=>n+c.readyPages+c.excluded.reduce((a,r)=>a+r.lastPage-r.firstPage+1,0),0),714);
 console.log('PASS Liang: 714/714 source pages, eight reviewed units, '+checks+' compiled example and boundary checks');
})().catch(e=>{console.error(e);process.exitCode=1;});
