'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const {app}=require('electron'),{capture}=require('./languages/process-tools'),runtime=require('./languages/runtime'),detector=require('./compiler/detector');
const packages=Object.freeze({py:'Python.Python.3.14',java:'Microsoft.OpenJDK.21',cs:'Microsoft.DotNet.SDK.10',cpp:'BrechtSanders.WinLibs.POSIX.UCRT'}),jobs=new Map();let installFlight;
const argsFor=ext=>{if(!packages[ext])throw Error('Ngôn ngữ không hợp lệ.');return['install','--id',packages[ext],'--exact','--source','winget','--silent','--accept-package-agreements','--accept-source-agreements','--disable-interactivity'];};
async function status(){const managed=await runtime.checkTools({}),command=detector.getDetectedCompiler()||detector.detectCompiler(),gcc=await capture(command||'g++',['--version'],{timeout:15000});return{py:{...managed.python,installed:!!managed.python?.available},java:{...managed.javac,installed:!!managed.javac?.available&&!!managed.java?.available},cs:{...managed.dotnet,installed:!!managed.dotnet?.available},cpp:{installed:gcc.success,command,version:gcc.output.trim().split('\n')[0],error:gcc.error},platform:process.platform,jobs:[...jobs.values()].map(j=>({...j}))};}
function walk(root,name,depth=4){try{for(const entry of fs.readdirSync(root,{withFileTypes:true})){if(entry.isSymbolicLink())continue;const target=path.join(root,entry.name);if(entry.isFile()&&entry.name.toLowerCase()===name)return target;if(entry.isDirectory()&&depth>0){const found=walk(target,name,depth-1);if(found)return found;}}}catch{}return null;}
async function refreshPaths(ext){
    const local=process.env.LOCALAPPDATA||'',program=process.env.ProgramFiles||'C:\\Program Files',tools={};
    if(ext==='py')tools.python=walk(path.join(local,'Programs','Python'),'python.exe',2);
    if(ext==='java'){tools.javac=walk(path.join(program,'Microsoft'),'javac.exe',3);if(tools.javac)tools.java=path.join(path.dirname(tools.javac),'java.exe');}
    if(ext==='cs')tools.dotnet=[path.join(program,'dotnet','dotnet.exe'),path.join(local,'Microsoft','dotnet','dotnet.exe')].find(fs.existsSync);
    if(ext==='cpp'){const compiler=walk(path.join(local,'Microsoft','WinGet','Packages'),'g++.exe',4)||path.join(local,'Microsoft','WinGet','Links','g++.exe');if(fs.existsSync(compiler)){const keys=Object.keys(process.env).filter(k=>k.toUpperCase()==='PATH');process.env[keys[0]||'Path']=path.dirname(compiler)+path.delimiter+(process.env[keys[0]]||'');detector.detectCompiler();}}
    const valid={};for(const [key,command]of Object.entries(tools))if(command){const result=await capture(command,[key==='java'||key==='javac'?'-version':'--version'],{timeout:20000});if(result.success)valid[key]=command;}
    if(Object.keys(valid).length){const file=path.join(app.getPath('userData'),'language-tools','runtimes.json');fs.mkdirSync(path.dirname(file),{recursive:true});let previous={};try{previous=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}require('../shared/fs-atomic').writeFileAtomicSync(file,JSON.stringify({...previous,...valid}),'utf8');}
}
async function installImpl(ext,publish=()=>{}){
    if(!packages[ext])throw Error('Ngôn ngữ không hợp lệ.');if(process.platform!=='win32')throw Error('Cài tự động hiện hỗ trợ Windows.');
    const current=await status();if(current[ext].installed)return{alreadyInstalled:true};
    const running=[...jobs.values()].find(j=>j.phase==='installing');if(running)return{ticket:running.ticket,busy:true};
    const winget=await capture('winget.exe',['--version'],{timeout:15000});if(!winget.success)throw Error('Thiếu Windows App Installer (winget). Cài App Installer rồi thử lại.');
    const ticket=require('crypto').randomUUID(),job={ticket,extension:ext,packageId:packages[ext],phase:'installing',log:'Đang cài '+packages[ext]};jobs.set(ticket,job);publish({...job});
    let child;try{child=spawn('winget.exe',argsFor(ext),{windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']});}catch(e){job.phase='error';job.log=e.message;publish({...job});return{ticket};}
    const timer=setTimeout(()=>{job.log+='\nĐã hết thời gian theo dõi (15 phút). Kiểm tra trình cài đặt trước khi thử lại.';child.kill();},15*60*1000);
    for(const stream of [child.stdout,child.stderr]){stream.setEncoding('utf8');stream.on('data',text=>{job.log=(job.log+text.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g,'')).slice(-16000);publish({...job});});}
    let finished=false;const finish=async(code,error)=>{if(finished)return;finished=true;clearTimeout(timer);try{if(!error&&code===0){await refreshPaths(ext);const latest=await status();job.phase=latest[ext].installed?'complete':'restart';job.log+='\n'+(job.phase==='complete'?'Đã tìm thấy công cụ. Có thể chạy thử.':'Cài xong. Mở lại Semeko nếu chưa nhận đường dẫn mới.');}else{job.phase='error';job.log+='\n'+(error||'winget kết thúc với mã '+code);}}catch(e){job.phase='error';job.log+='\n'+e.message;}publish({...job});};child.on('error',e=>void finish(-1,e.message));child.on('close',code=>void finish(code));return{ticket};
}
function install(ext,publish=()=>{}){if(!packages[ext])return Promise.reject(Error('Ngôn ngữ không hợp lệ.'));if(installFlight)return installFlight.then(r=>({...r,busy:true}));installFlight=installImpl(ext,publish).finally(()=>{installFlight=null;});return installFlight;}
async function smoke(ext){
    if(!packages[ext])throw Error('Ngôn ngữ không hợp lệ.');const root=fs.mkdtempSync(path.join(app.getPath('temp'),'semeko-tool-check-')),output=path.join(root,'hello'+(process.platform==='win32'?'.exe':''));
    let result,command,args;
    if(ext==='cpp'){const file=path.join(root,'hello.cpp');fs.writeFileSync(file,'#include <iostream>\nint main(){std::cout<<"SEMEKO_TOOL_OK";}');command=detector.getDetectedCompiler()||detector.detectCompiler()||'g++';result=await capture(command,[file,'-o',output],{env:detector.getCompilerEnv(),timeout:60000});if(!result.success)throw Error(result.error);command=output;args=[];}
    else{const code={py:'print("SEMEKO_TOOL_OK")',java:'public class Main { public static void main(String[] a){System.out.print("SEMEKO_TOOL_OK");}}',cs:'class Program { static void Main(){System.Console.Write("SEMEKO_TOOL_OK");}}'}[ext];const file=path.join(root,ext==='java'?'Main.java':'main.'+ext);fs.writeFileSync(file,code);const built=await runtime.build({filePath:file,fileName:path.basename(file),content:code});if(!built.success)throw Error(built.error);const run=runtime.resolveRun(built.outputPath);command=run.command;args=run.args;}
    const run=await capture(command,args,{cwd:root,env:detector.getCompilerEnv(),timeout:30000});if(!run.success||!run.output.includes('SEMEKO_TOOL_OK'))throw Error(run.error||run.output||'Chạy thử chưa thành công.');return{success:true,output:run.output.trim()};
}
module.exports={packages,argsFor,status,install,smoke,refreshPaths};
