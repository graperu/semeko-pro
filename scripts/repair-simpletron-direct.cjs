'use strict';
const assert=require('assert/strict'),path=require('path'),fs=require('fs');
const service=require('../app/services/competitive/authored-course');
const validator=require('../app/shared/practice-reference-validator');
async function main(){
 const task=service.tasks().find(t=>t.bookIndex===1&&t.firstPage===359),saved=service.read(task.id);
 if(saved.status==='ready'&&saved.validation?.author==='direct-source-review'){console.log('Already repaired; record preserved');return;}
 const value=structuredClone(saved.draft||saved);
 // This unit ends before the function-pointer exercises and the next numbered task.
 value.lessons=value.lessons.slice(0,2);
 value.sourceExercises=value.sourceExercises.filter(e=>e.number==='7.28');
 value.contextCoverage=[];
 let code=value.lessons[1].example.code;
 code=code.replace('while (running && *ic < 100) {','int steps = 0;\n    while (running) {\n        if (*ic < 0 || *ic >= 100) { std::cout << "*** Invalid instruction address ***\\n"; break; }\n        if (++steps > 10000) { std::cout << "*** Step limit exceeded ***\\n"; break; }');
 code=code.replace('std::cin >> memory[*opnd];','int word;\n                if (!(std::cin >> word) || word < -9999 || word > 9999) {\n                    std::cout << "*** Invalid input word ***\\n"; running = false;\n                } else { memory[*opnd] = word; }');
 code=code.replace('                *acc -= memory[*opnd];','                *acc -= memory[*opnd];\n                if (*acc < -9999 || *acc > 9999) { std::cout << "*** Accumulator overflow ***\\n"; running = false; }');
 code=code.replace('                *acc *= memory[*opnd];','                *acc *= memory[*opnd];\n                if (*acc < -9999 || *acc > 9999) { std::cout << "*** Accumulator overflow ***\\n"; running = false; }');
 // Valid instructions always have a nonnegative operand; reject negative words before decoding.
 code=code.replace('        *opCode = *ir / 100;','        if (*ir < 0) { std::cout << "*** Invalid operation code ***\\n"; break; }\n        *opCode = *ir / 100;');
 code=code.replace(/\bexecute\b/g,'simulate');
 value.lessons[1].example.code=code;
 value.lessons[1].sections.push({title:{vi:'Phạm vi ví dụ chạy và giới hạn an toàn',en:'Runnable example scope and safety limits'},body:{vi:'Ví dụ chạy dùng chế độ nạp theo luồng: nhập các từ rồi -99999, sau đó là dữ liệu cho READ. Để test tự động không bị lẫn lời nhắc, ví dụ không in banner và dấu hỏi như giao diện tương tác mà bài gốc yêu cầu. Phần bài tập vẫn yêu cầu đầy đủ giao diện đó. Mọi phép cộng, trừ và nhân đều kiểm tra giới hạn từ máy; READ kiểm tra dữ liệu và EOF. Giới hạn 10000 bước là cơ chế bảo vệ bổ sung cho ví dụ trong IDE, không phải quy định của ngôn ngữ SML.',en:'The runnable example loads words from a stream until -99999, followed by data consumed by READ. It omits the interactive banner and question prompts so automated output remains deterministic; the source exercise still requires that interface. Addition, subtraction and multiplication check word bounds, while READ checks the input range and EOF. The 10000-step limit is an additional IDE safeguard, not a rule of SML.'}});
 const compiler=path.resolve('Sameko-GCC/bin/g++.exe');
 const run=async(input,expected)=>{const r=await validator.runExample(code,input,{compiler});assert.ok(r.output.includes(expected),expected);assert.ok(r.output.includes('MEMORY:'));return r.output;};
 const cases=[
 ['1009 1010 2009 3110 4107 1109 4300 1110 4300 0 0 -99999 80 45','OUTPUT: 80'],
 ['1009 1010 2009 3110 4107 1109 4300 1110 4300 0 0 -99999 45 80','OUTPUT: 80'],
 ['2004 3205 4300 0 10 0 -99999','Attempt to divide by zero'],
 ['2004 3005 4300 0 9999 1 -99999','Accumulator overflow'],
 ['2004 3105 4300 0 -9999 1 -99999','Accumulator overflow'],
 ['2004 3305 4300 0 9999 2 -99999','Accumulator overflow'],
 ['-1001 -99999','Invalid operation code'],
 ['9900 -99999','Invalid operation code'],
 ['1002 4300 0 -99999 10000','Invalid input word'],
 ['1002 4300 0 -99999','Invalid input word'],
 ['4000 -99999','Step limit exceeded'],
 ['2005 4203 9900 1105 4300 0 -99999','OUTPUT: 0'],
 ['2005 2106 1106 4300 0 -17 0 -99999','OUTPUT: -17'],
 ['2005 3206 1105 4300 0 -9 2 -99999','accumulator          -0004']
 ];
 for(const c of cases)await run(...c);
 for(const l of value.lessons){const r=await validator.runExample(l.example.code,l.example.input,{compiler});assert.equal(r.output.replace(/\r\n/g,'\n'),l.example.output);}
 value.status='ready';delete value.error;delete value.draft;
 value.validation={...(value.validation||{}),author:'direct-source-review',compiled:true,figuresVersion:1,reviewedAt:new Date().toISOString(),regressionCases:cases.length};
 service.validate(value);const coverage=service.normalizeCoverage(task,value.coverage);Object.assign(value,coverage);
 service.publish(task,value);
 fs.writeFileSync(path.resolve('plans/artifacts/simpletron-direct-check.json'),JSON.stringify({id:task.id,cases:cases.length,lessons:value.lessons.length,reviewedAt:value.validation.reviewedAt},null,2));
 console.log('PASS: Simpletron source review, two bilingual lessons, 14 regression cases and both displayed examples');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
