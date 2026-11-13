'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const {compareOutputs}=require('./judge');
const {StringDecoder}=require('string_decoder');
function checkSource(code){
    if(typeof code!=='string'||code.length>80000||!/(?:int|auto)\s+main\s*\(/.test(code))throw Error('Lời giải tham chiếu không hợp lệ');
    const operations=code.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,' ').replace(/(?:\.|->)\s*remove\s*(?=\()/g,'.container_remove');
    if(/\b(?:system|popen|fork|exec\w*|CreateProcess\w*|ShellExecute\w*|socket|freopen|fopen|remove|rename|filesystem|fstream|ifstream|ofstream|asm|__asm|dlopen|LoadLibrary\w*)\b|#\s*(?:pragma|import|include_next)/i.test(operations))throw Error('Lời giải chỉ được đọc stdin và ghi stdout');
    const allowed=new Set(['bits/stdc++.h','iostream','vector','string','algorithm','numeric','cmath','iomanip','limits','map','set','unordered_map','unordered_set','queue','stack','deque','array','tuple','utility','functional','cctype','cstring','cstdio','cstdlib','climits','cassert','sstream','bitset','complex','cstdint','iterator','initializer_list','type_traits','memory','optional','list','regex','cinttypes','stdexcept','exception','new','typeinfo','typeindex','variant','any','string_view','cstddef','cfloat','valarray','locale','stdio.h','stdlib.h','string.h','math.h','ctype.h','limits.h','float.h','stdint.h','stdbool.h','stddef.h']);
    for(const header of ['forward_list','thread','chrono','atomic','mutex','condition_variable','future'])allowed.add(header);
    for(const m of code.matchAll(/#\s*include\s*[<"]([^>"\n]+)[>"]/g))if(!allowed.has(m[1]))throw Error('Thư viện không được phép: '+m[1]);
}
function execute(command,args,{cwd,input='',timeout=5000,env=process.env}={}){
    return new Promise((resolve,reject)=>{
        const child=spawn(command,args,{cwd,env,windowsHide:true,shell:false,stdio:['pipe','pipe','pipe']});let out='',err='',failure;const decoder=new StringDecoder('utf8');
        const stop=()=>{if(process.platform==='win32')spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else child.kill('SIGKILL');};
        const timer=setTimeout(()=>{failure=Error('Chạy quá thời gian');stop();},timeout);
        child.stdout.on('data',b=>{out+=decoder.write(b);if(out.length>500000&&!failure){failure=Error('Đầu ra quá lớn');stop();}});
        child.stderr.on('data',b=>{if(err.length<20000)err+=b.toString();});
        child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',code=>{clearTimeout(timer);out+=decoder.end();if(failure)return reject(failure);if(code!==0)return reject(Error(('Exit '+code+': '+err).slice(0,3000)));resolve(out);});
        child.stdin.on('error',()=>{});child.stdin.end(input);
    });
}
exports.validate=async(problem,{compiler,sourceTests=[]}={})=>{
    if(!Array.isArray(problem.references)||problem.references.length!==2||!Array.isArray(problem.testInputs)||problem.testInputs.length<8||problem.testInputs.length>64)throw Error('Cần hai lời giải và 8–64 ca kiểm thử');
    problem.references.forEach(checkSource);
    const inputs=[...sourceTests.map(t=>t.input),...problem.testInputs];
    if(inputs.some(t=>typeof t!=='string'||t.length>100000))throw Error('Dữ liệu test không hợp lệ');
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-reference-')),executables=[];
    const env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH};
    try{
        for(let i=0;i<2;i++){const source=path.join(dir,'reference-'+i+'.cpp'),exe=path.join(dir,'reference-'+i+(process.platform==='win32'?'.exe':''));fs.writeFileSync(source,problem.references[i]);await execute(compiler,['-std=c++17','-O0',source,'-o',exe],{cwd:dir,timeout:45000,env});executables.push(exe);}
        const tests=[];
        for(let i=0;i<inputs.length;i++){
            const input=inputs[i],a=await execute(executables[0],[],{cwd:dir,input,timeout:4000,env}),b=await execute(executables[1],[],{cwd:dir,input,timeout:4000,env});
            if(!compareOutputs(a,b).matched){const error=Error('Hai lời giải không khớp ở test '+(i+1));error.code='REFERENCE_DISAGREEMENT';error.input=input;throw error;}
            if(i<sourceTests.length&&!compareOutputs(a,sourceTests[i].output).matched){const error=Error('Không khớp ví dụ gốc '+(i+1));error.code='SOURCE_OUTPUT_MISMATCH';error.input=input;error.expected=sourceTests[i].output;error.actual=a;throw error;}
            tests.push({input,output:a,origin:i<sourceTests.length?'source':'generated-verified'});
        }
        return tests;
    }finally{
        // Only files generated in this exact mkdtemp directory; no recursive cleanup.
        for(const file of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,file));fs.rmdirSync(dir);
    }
};
exports.filterInputs=async(code,inputs,{compiler,sourceInputs=[]}={})=>{
    checkSource(code);const dir=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-input-check-')),file=path.join(dir,'check.cpp'),exe=path.join(dir,'check.exe'),env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH};
    try{fs.writeFileSync(file,code);await execute(compiler,['-std=c++17','-O0',file,'-o',exe],{cwd:dir,timeout:45000,env});
        const valid=async input=>(await execute(exe,[],{cwd:dir,input,timeout:3000,env})).trim()==='VALID';
        for(const input of sourceInputs)if(!await valid(input))throw Error('Input checker rejected an existing source case');
        const accepted=[];for(const input of inputs)if(await valid(input))accepted.push(input);return accepted;
    }finally{for(const file of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,file));fs.rmdirSync(dir);}
};
exports.runExample=async(code,input,{compiler}={})=>{
    checkSource(code);if(typeof input!=='string'||input.length>100000)throw Error('Invalid example input');
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-course-example-')),source=path.join(dir,'main.cpp'),exe=path.join(dir,'main.exe'),env={...process.env,PATH:path.dirname(compiler)+path.delimiter+process.env.PATH};
    try{fs.writeFileSync(source,code);await execute(compiler,['-std=c++17','-O0',source,'-o',exe],{cwd:dir,timeout:45000,env});const start=Date.now(),output=await execute(exe,[],{cwd:dir,input,timeout:3000,env});return{output,runMs:Date.now()-start};}
    finally{for(const name of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,name));fs.rmdirSync(dir);}
};
