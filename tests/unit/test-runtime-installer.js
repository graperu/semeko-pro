'use strict';
const assert=require('assert'),Module=require('module'),{EventEmitter}=require('events'),{PassThrough}=require('stream'),fs=require('fs'),path=require('path'),os=require('os');const root=fs.mkdtempSync(path.join(os.tmpdir(),'semeko-installer-unit-')),original=Module._load;let spawned,child,installed=false,events=[];
Module._load=function(name,parent,...rest){if(name==='electron')return{app:{getPath:()=>root}};if(parent?.filename.endsWith('runtime-installer.js')){
 if(name==='child_process')return{spawn:(command,args,options)=>{spawned={command,args,options};child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{};return child;}};
 if(name==='./languages/process-tools')return{capture:async()=>({success:true,output:'verified tool',error:''})};
 if(name==='./languages/runtime')return{checkTools:async()=>({python:{available:installed},java:{available:true},javac:{available:true},dotnet:{available:true}})};
 if(name==='./compiler/detector')return{getDetectedCompiler:()=>'/gcc/g++',detectCompiler:()=>'/gcc/g++'};
 }return original.call(this,name,parent,...rest);};
const service=require('../../app/services/runtime-installer');Module._load=original;
(async()=>{assert.throws(()=>service.argsFor('cpp;echo evil'));assert.deepStrictEqual(service.argsFor('py').slice(0,5),['install','--id','Python.Python.3.14','--exact','--source']);if(process.platform==='win32'){
 const r=await service.install('py',e=>events.push(e));assert(r.ticket);assert.strictEqual(spawned.command,'winget.exe');assert.strictEqual(spawned.options.shell,false);assert(spawned.options.windowsHide);assert(spawned.args.includes('--disable-interactivity'));assert.strictEqual((await service.install('cs')).alreadyInstalled,true);child.stdout.write('Downloading 50%');installed=true;child.emit('close',0);for(let i=0;i<200&&!events.some(e=>e.phase==='complete');i++)await new Promise(r=>setTimeout(r,10));assert(events.some(e=>e.log.includes('Downloading')));assert(events.some(e=>e.phase==='complete'));}
 console.log('PASS allowlisted package IDs, no shell interpolation, hidden install, progress/completion events, installed-tool no-op (installer simulated)');})().catch(e=>{console.error(e);process.exitCode=1;});
