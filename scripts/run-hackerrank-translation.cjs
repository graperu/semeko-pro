'use strict';
// Reuses the encrypted translation configuration and the existing queue owner lock.
const {app}=require('electron'),path=require('path');
const work=path.join(process.env.LOCALAPPDATA,'SemekoPracticeAI','bulk-translation-session');require('fs').mkdirSync(work,{recursive:true});
// Chromium's encrypted key is profile-bound. Share only its encrypted OS key,
// not browser cookies or login databases, with this isolated cache profile.
try{const state=JSON.parse(require('fs').readFileSync(path.join(process.env.APPDATA,'sameko-dev-cpp','Local State'),'utf8'));if(state.os_crypt)require('fs').writeFileSync(path.join(work,'Local State'),JSON.stringify({os_crypt:state.os_crypt}));}catch{}
app.setPath('userData',path.join(process.env.APPDATA,'sameko-dev-cpp'));app.setPath('sessionData',work);app.commandLine.appendSwitch('disk-cache-dir',path.join(work,'cache'));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 require('../app/ipc/translation-handlers')();
 const bulk=require('../app/services/competitive/bulk-translation');
 const result=await bulk.start({hackerRank:true,concurrency:3});console.log(JSON.stringify({status:result.status,pid:process.pid,total:result.total}));
 const timer=setInterval(()=>{const info=bulk.info();console.log(JSON.stringify({status:info.status,hackerrank:info.platforms.hackerrank,error:info.error||''}));if(['complete','paused'].includes(info.status)){clearInterval(timer);app.quit();}},10000);
}).catch(e=>{console.error(e.message);app.exit(1);});
app.on('window-all-closed',()=>{});
