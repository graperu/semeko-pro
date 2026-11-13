'use strict';
const http=require('http'),crypto=require('crypto'),path=require('path'),fs=require('fs');
const {shell,app,safeStorage}=require('electron');
const {writeFileAtomicSync}=require('../shared/fs-atomic');
const pending=new Map();
const starts=new Map(),LIFETIME=7*86400000;
function registryFile(){return path.join(app.getPath('userData'),'platform-browser-pairings.json');}
function records(){try{const data=JSON.parse(fs.readFileSync(registryFile(),'utf8'));return Array.isArray(data)?data:[];}catch(_){return[];}}
function saveRecord(id,provider,entry){
 if(!safeStorage?.isEncryptionAvailable()||safeStorage.getSelectedStorageBackend?.()==='basic_text')return;
 const data=records().filter(r=>r.id!==String(id)||r.provider!==provider);
 data.push({id:String(id),provider,port:entry.server.address().port,expires:entry.expires,token:safeStorage.encryptString(entry.token).toString('base64')});
 fs.mkdirSync(path.dirname(registryFile()),{recursive:true});writeFileAtomicSync(registryFile(),JSON.stringify(data));
}
function forgetRecord(id,provider){const data=records(),next=data.filter(r=>r.id!==String(id)||(provider&&r.provider!==provider));if(data.length!==next.length)writeFileAtomicSync(registryFile(),JSON.stringify(next));}
function validCookies(value,host){
 if(!Array.isArray(value)||value.length>100)throw Error('Invalid cookies');
 return value.map(c=>{
  if(!c||c.domain?.replace(/^\./,'')!==host||typeof c.name!=='string'||!c.name||typeof c.value!=='string'||c.value.length>16384||c.partitionKey)throw Error('Invalid platform cookie');
  const cookie={url:'https://'+host+(c.path?.startsWith('/')?c.path:'/'),name:c.name,value:c.value,path:c.path||'/',secure:!!c.secure,httpOnly:!!c.httpOnly};
  if(!c.hostOnly)cookie.domain=c.domain;
  if(!c.session&&Number.isFinite(c.expirationDate))cookie.expirationDate=c.expirationDate;
  if(['no_restriction','lax','strict','unspecified'].includes(c.sameSite))cookie.sameSite=c.sameSite;
  return cookie;
 });
}
async function start(id,provider,accept,options={}){
 if(!['codeforces','leetcode'].includes(provider))throw Error('Invalid platform');
 const key=id+':'+provider;
 if(starts.has(key))return starts.get(key);
 const work=create(id,provider,accept,options).finally(()=>starts.delete(key));starts.set(key,work);return work;
}
async function create(id,provider,accept,options={}){
 const key=id+':'+provider,existing=pending.get(key);if(existing){if(connected(id,provider))return{opened:false,connected:true,browser:'default',bridge:true};await shell.openExternal(existing.url);return{opened:true,browser:'default',bridge:true};}
 const token=options.restore?.token||crypto.randomBytes(32).toString('hex'),host=provider==='codeforces'?'codeforces.com':'leetcode.com';let busy=false,used=false,timer;
 const entry={connected:false,queue:[],waiting:new Map(),lastSeen:0,token,expires:options.restore?.expires||Date.now()+LIFETIME};
 let extensionPath=path.join(app.getAppPath(),'app','browser-extension');
 if(app.isPackaged){const source=extensionPath;extensionPath=path.join(app.getPath('userData'),'browser-extension');fs.mkdirSync(extensionPath,{recursive:true});for(const name of ['manifest.json','background.js','connect.js','page-actions.js'])fs.writeFileSync(path.join(extensionPath,name),fs.readFileSync(path.join(source,name)));}
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  const port=server.address()?.port;if(req.headers.host!=='127.0.0.1:'+port){res.writeHead(403).end();return;}
  if(req.method==='GET'&&req.url==='/bridge-version'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({protocol:3}));return;}
  if(req.method==='GET'&&req.url==='/semeko-connect'){
   const escape=s=>s.replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
   res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
   res.end('<!doctype html><meta charset="utf-8"><title>Kết nối Semeko</title><style>body{font:16px system-ui;max-width:720px;margin:60px auto;background:#1b1e20;color:#eee;line-height:1.7}button,a{padding:12px;color:#a9e522}code{overflow-wrap:anywhere}</style><h1>Kết nối '+provider+' với Semeko</h1><p>Kết nối tab nền tảng đang đăng nhập với Semeko. Không xuất cookie hoặc mật khẩu.</p><p>Cài Semeko Session Bridge một lần: vào <b>chrome://extensions</b>, bật Chế độ dành cho nhà phát triển → Tải tiện ích đã giải nén → chọn:</p><code>'+escape(extensionPath)+'</code><p>Sau khi cài, tải lại trang này. Bấm kết nối rồi đăng nhập trên trang nền tảng; tiện ích sẽ xác nhận tài khoản ngay trên tab đang dùng và đưa bạn về app.</p><button id="semeko-pair">Kết nối hồ sơ này với Semeko</button><p id="semeko-status">Chưa kết nối tiện ích.</p><a target="_blank" rel="noreferrer" href="https://'+host+(provider==='codeforces'?'/enter':'/accounts/login/')+'">Mở '+provider+' để đăng nhập</a>');return;
  }
  if(req.method!=='POST'||!['/session','/commands','/disconnect'].includes(req.url)||!/^chrome-extension:\/\/[a-p]{32}$/.test(req.headers.origin||'')||req.headers.authorization!=='Bearer '+token||used){res.writeHead(403).end();return;}
  if(options.browserCommands&&req.headers['x-semeko-bridge']!=='3'){res.writeHead(426).end('{}');return;}
  if(req.url==='/disconnect'){res.end('{}');suspend(id,provider);return;}
  if(req.url==='/commands'){
   if(!options.browserCommands){res.writeHead(403).end();return;}
   if(!entry.connected){res.writeHead(409).end('{}');return;}
   try{let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>2097152)throw Error('Too large');}const value=JSON.parse(body);entry.lastSeen=Date.now();
    if(value.id&&entry.waiting.has(value.id)){const job=entry.waiting.get(value.id);entry.waiting.delete(value.id);clearTimeout(job.timer);if(value.error)job.reject(Error(String(value.error).slice(0,250)));else job.resolve(value.result);}
    const command=entry.queue.shift()||null;if(command&&entry.waiting.has(command.id))entry.waiting.get(command.id).delivered=true;
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({command}));
   }catch(_){res.writeHead(400).end('{}');}return;
  }
  if(busy){res.writeHead(409).end();return;}
  busy=true;try{
   let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>65536)throw Error('Body too large');}
   const payload=JSON.parse(body),cookies=options.browserCommands?[]:validCookies(payload.cookies,host);
   if(!options.browserCommands&&!cookies.length){res.writeHead(202).end('{}');return;}
   if(entry.connected&&entry.handle&&payload.identity?.handle!==entry.handle){res.writeHead(409).end('{}');return;}
   let accepted;try{accepted=await accept(cookies,{identity:payload.identity,userAgent:typeof payload.userAgent==='string'&&payload.userAgent.length<512&&!/[\r\n]/.test(payload.userAgent)?payload.userAgent:null});}catch(_){res.writeHead(502).end('{}');return;}
   res.setHeader('Content-Type','application/json');res.writeHead(accepted?200:202).end(JSON.stringify({connected:!!accepted}));
   if(accepted){if(options.browserCommands){entry.connected=true;entry.handle=payload.identity?.handle;entry.lastSeen=Date.now();clearTimeout(entry.timer);entry.timer=setTimeout(()=>stop(id,provider),Math.max(1,entry.expires-Date.now()));entry.timer.unref();try{saveRecord(id,provider,entry);}catch(_){} }else{used=true;stop(id,provider);}}
  }catch(_){res.writeHead(400).end('{}');}finally{busy=false;}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(options.restore?.port||0,'127.0.0.1',resolve);});
 const url='http://127.0.0.1:'+server.address().port+'/semeko-connect#'+provider+':'+token;
 timer=setTimeout(()=>stop(id,provider),options.restore?Math.max(1,entry.expires-Date.now()):600000);timer.unref();Object.assign(entry,{server,url,timer});pending.set(key,entry);
 if(!options.restore)try{await shell.openExternal(url);}catch(e){stop(id,provider);throw e;}
 return{opened:true,browser:'default',bridge:true};
}
function command(id,provider,payload){const entry=pending.get(id+':'+provider);if(!entry?.connected){const e=Error('Chưa kết nối trình duyệt. Bấm đăng nhập để kết nối lại Semeko.');e.posted=false;return Promise.reject(e);}return new Promise((resolve,reject)=>{const key=crypto.randomUUID(),job={resolve,reject,delivered:false};job.timer=setTimeout(()=>{entry.waiting.delete(key);entry.queue=entry.queue.filter(c=>c.id!==key);const e=Error('Trình duyệt chưa phản hồi. Kiểm tra trang nền tảng; app không tự gửi lại bài.');if(!job.delivered)e.posted=false;reject(e);},65000);entry.waiting.set(key,job);entry.queue.push({id:key,...payload});});}
function stop(id,provider,options={}){for(const[key,value]of pending)if(key.startsWith(String(id)+':')&&(!provider||key===id+':'+provider)){clearTimeout(value.timer);for(const job of value.waiting.values()){clearTimeout(job.timer);const e=Error('Kết nối trình duyệt đã đóng');if(!job.delivered)e.posted=false;job.reject(e);}value.server.close();pending.delete(key);}if(!options.preserve)forgetRecord(id,provider);}
function suspend(id,provider){const entry=pending.get(id+':'+provider);if(!entry)return;entry.connected=false;entry.lastSeen=0;entry.queue=[];for(const job of entry.waiting.values()){clearTimeout(job.timer);const e=Error('Tab nền tảng đã đóng. Mở lại trang nền tảng để kết nối lại.');if(!job.delivered)e.posted=false;job.reject(e);}entry.waiting.clear();}
function connected(id,provider){const entry=pending.get(id+':'+provider);return !!entry?.connected&&Date.now()-entry.lastSeen<90000;}
async function restore(acceptFor){
 if(!safeStorage?.isEncryptionAvailable()||safeStorage.getSelectedStorageBackend?.()==='basic_text')return;
 for(const record of records())try{
  if(!/^\d+$/.test(record.id)||!['codeforces','leetcode'].includes(record.provider)||!Number.isInteger(record.port)||record.port<1024||record.port>65535||record.expires<=Date.now()||record.expires>Date.now()+LIFETIME)continue;
  const token=safeStorage.decryptString(Buffer.from(record.token,'base64'));if(!/^[a-f0-9]{64}$/.test(token))continue;
  await start(record.id,record.provider,acceptFor(record.id,record.provider),{browserCommands:true,restore:{...record,token}});
 }catch(_){} // Port occupied, damaged DPAPI entry, or provider removed: reconnect explicitly.
}
module.exports={start,stop,validCookies,command,connected,restore};
