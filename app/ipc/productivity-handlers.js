'use strict';
const {ipcMain,BrowserWindow}=require('electron'),service=require('../services/productivity'),tools=require('../services/runtime-installer');
module.exports=function(){
    ipcMain.on('productivity-snapshot-sync',(event,data)=>{try{service.snapshot(data);event.returnValue=true;}catch(e){event.returnValue=false;}});
    const handlers={
        'productivity-export':(e,value)=>service.exportDialog(BrowserWindow.fromWebContents(e.sender),value),
        'productivity-preview':e=>service.previewDialog(BrowserWindow.fromWebContents(e.sender)),
        'productivity-consume':(_,ticket)=>service.consume(ticket),
        'productivity-snapshot':(_,value)=>service.snapshot(value),
        'productivity-recovery':()=>service.recovery(),
        'runtime-center-status':()=>tools.status(),
        'runtime-center-install':(e,ext)=>tools.install(ext,data=>{if(!e.sender.isDestroyed())e.sender.send('runtime-center-event',data);}),
        'runtime-center-smoke':(_,ext)=>tools.smoke(ext)
        ,'productivity-live-check':async(_,data)=>{
            if(!data||!['py','java','cs'].includes(data.extension)||typeof data.content!=='string'||data.content.length>2*1024*1024||!String(data.id).match(/^[a-zA-Z0-9_-]{1,100}$/))throw Error('Dữ liệu kiểm tra code không hợp lệ.');
            const r=await require('../services/languages/runtime').build({fileName:data.extension==='java'?'Main.java':'source.'+data.extension,content:data.content,untitledId:'live-'+data.id});
            const text=String(r.error||'').replace(/\r\n?/g,'\n'),diagnostics=[];
            for(const line of text.split('\n')){const java=line.match(/^(.+\.java):(\d+):\s*(error|warning):\s*(.+)/),cs=line.match(/^\s*(.+\.cs)\((\d+),(\d+)\):\s*(error|warning)\s+([A-Z]+\d+):\s*(.+?)(?:\s+\[.+\])?$/);if(java)diagnostics.push({line:+java[2],column:1,severity:java[3],message:java[4]});if(cs)diagnostics.push({line:+cs[2],column:+cs[3],severity:cs[4],message:cs[5]+': '+cs[6]});}
            const loc=[...text.matchAll(/File "([^\n]+\.py)", line (\d+)/g)].pop(),error=text.match(/^(\w*Error|\w*Exception):\s*(.+)$/m);if(loc&&error)diagnostics.push({line:+loc[2],column:1,severity:'error',message:error[0]});
            return{success:r.success,diagnostics:diagnostics.filter((d,i,a)=>a.findIndex(x=>x.line===d.line&&x.message===d.message)===i),error:!r.success&&!diagnostics.length?text:''};
        }
    };
    for(const [name,fn]of Object.entries(handlers))ipcMain.handle(name,async(...args)=>{try{return{ok:true,data:await fn(...args)};}catch(e){return{ok:false,error:e.message};}});
};
