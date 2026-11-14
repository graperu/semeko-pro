'use strict';
// Save reviewed source pairs through the same sanitizer used by the app.
const {app,BrowserWindow}=require('electron'),fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),home=path.join(process.env.APPDATA,'sameko-dev-cpp');
const ids=process.argv.slice(2);
if(!ids.length||ids.some(id=>!/^[a-z0-9-]+$/.test(id)))throw Error('Provide reviewed challenge IDs');
app.setPath('userData',home);
app.setPath('sessionData',fs.mkdtempSync(path.join(os.tmpdir(),'semeko-reviewed-hr-')));
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,webPreferences:{preload:path.join(root,'preload.js'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
 await win.loadFile(path.join(root,'src/translation-worker.html'));
 for(const id of ids){
  const source=JSON.parse(fs.readFileSync(path.join(root,'plans/artifacts/hr-'+id+'-direct.json'),'utf8'));
  if(source.id!==id)throw Error('Reviewed source identity mismatch');
  const pair=await win.webContents.executeJavaScript('('+async function(source){
   const original=await ProblemBrowser.safeStatement(source.original,'hackerrank'),translated=await ProblemBrowser.safeStatement(source.translated,'hackerrank');
   const parse=s=>new DOMParser().parseFromString(s,'text/html'),a=parse(original),b=parse(translated);
   for(const selector of ['pre','code','img','.katex']){
    const values=dom=>[...dom.querySelectorAll(selector)].map(n=>selector==='img'?n.getAttribute('src'):n.textContent);
    if(JSON.stringify(values(a))!==JSON.stringify(values(b)))throw Error('Protected content changed: '+selector);
   }
   if(StatementTranslation.auditArticle(original,translated))throw Error('Untranslated prose remains');
   return{original,translated};
  }.toString()+')('+JSON.stringify(source)+')');
  const raw=JSON.parse(fs.readFileSync(path.join(root,'plans/artifacts/hr-'+id+'-source.json'),'utf8')),snippets={};
  for(const [lang,choices]of Object.entries({cpp:['cpp14','cpp'],c:['c'],py:['python3','python'],java:['java8','java'],cs:['csharp']})){
   const prefix=choices.find(k=>raw[k+'_template']);
   if(prefix)snippets[lang]=[raw[prefix+'_template_head'],raw[prefix+'_template'],raw[prefix+'_template_tail']].filter(Boolean).join('\n');
  }
  const sourceHash=crypto.createHash('sha256').update(pair.original).digest('hex');
  const record={detail:{provider:'hackerrank',id,title:source.title,url:'https://www.hackerrank.com/challenges/'+id+'/problem',html:pair.original,snippets,mode:'stdin',note:'Official statement and samples; reviewed Vietnamese translation.'},...pair,sourceHash,translatedFromHash:sourceHash,review:{author:'direct-source-review',at:new Date().toISOString()}};
  const dir=path.join(home,'translated-articles/hackerrank');fs.mkdirSync(dir,{recursive:true});
  require('../app/shared/atomic-json-publish')(path.join(dir,id+'.json'),record);
  console.log('PASS saved reviewed EN/VI: '+id+'; protected code, math, images and samples unchanged');
 }
 win.destroy();app.quit();
}).catch(e=>{console.error(e.message);app.exit(1);});
