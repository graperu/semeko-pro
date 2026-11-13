'use strict';
importScripts('page-actions.js');
const pairs=new Map();
const trusted=chrome.storage.local.setAccessLevel?.({accessLevel:'TRUSTED_CONTEXTS'})||Promise.resolve();
const loaded=trusted.then(()=>chrome.storage.local.get('pairs')).then(data=>{for(const pair of data.pairs||[])if(pair.expires>Date.now())pairs.set(pair.key,{...pair,busy:false});});
function save(){return chrome.storage.local.set({pairs:[...pairs.values()].map(({busy,...pair})=>pair)});}
function tell(pair,text,connected=false){return pair.tabId?chrome.tabs.sendMessage(pair.tabId,{type:'semeko-status',text,connected}).catch(()=>{}):Promise.resolve();}
async function closePairingTab(pair){
 if(!pair.tabId)return;
 const tabId=pair.tabId;
 try{
  const tab=await chrome.tabs.get(tabId);
  const expected=pair.origin+'/semeko-connect#'+pair.provider+':'+pair.token;
  if(tab.url===expected)await chrome.tabs.remove(tabId);
 }catch(_){}
 pair.tabId=null;
 await save();
}
async function platformTab(pair,url,allowCreate=false){
 const expected='https://'+pair.host;if(new URL(url).origin!==expected)throw Error('Invalid platform URL');
 let tab;try{if(pair.platformTab)tab=await chrome.tabs.get(pair.platformTab);}catch(_){}
 if(!tab||!tab.url?.startsWith(expected+'/')){const tabs=await chrome.tabs.query({url:expected+'/*'});tab=tabs[0];if(!tab){if(!allowCreate){pair.connected=false;pair.dormant=true;await save();throw Error('Platform tab closed');}tab=await chrome.tabs.create({url});}pair.platformTab=tab.id;}
 if(url!==expected+'/'&&tab.url!==url)await chrome.tabs.update(tab.id,{url});
 for(let i=0;i<50;i++){tab=await chrome.tabs.get(tab.id);if(tab.status==='complete'&&tab.url?.startsWith(expected+'/'))return tab.id;await new Promise(r=>setTimeout(r,200));}throw Error('Platform page is still loading');
}
async function pageAction(pair,action,payload){
 const expected='https://'+pair.host;
 if(action==='navigate'&&new URL(payload.url).origin!==expected)throw Error('Invalid platform URL');
 if(action==='cf-submit'&&pair.provider!=='codeforces')throw Error('Invalid platform action');
 const url=action==='cf-submit'?'https://codeforces.com/problemset/submit/'+payload.contestId+'/'+payload.index:expected+'/';
 let tabId;try{tabId=await platformTab(pair,url);}catch(e){if(action==='cf-submit'||payload.operation==='submit')return{posted:false,error:String(e.message).slice(0,200)};throw e;}
 if(action==='navigate'){await chrome.tabs.update(tabId,{url:payload.url,active:true});return{opened:true};}
 const fn=action==='identity'?SemekoPageActions.identity:action==='request'?SemekoPageActions.request:action==='cf-submit'?SemekoPageActions.submit:null;
 if(!fn)throw Error('Unsupported action');
 try{const values=await chrome.scripting.executeScript({target:{tabId},world:'MAIN',func:fn,args:[action==='identity'?pair.provider:payload]});return values[0]?.result;}catch(e){if(action==='cf-submit'||payload.operation==='submit')return{posted:true,error:String(e.message).slice(0,200)};throw e;}
}
async function tick(pair){
 if(pair.busy||pairs.get(pair.key)!==pair)return;if(Date.now()>pair.expires){pairs.delete(pair.key);await save();return;}
 pair.busy=true;try{
  const auth={'Content-Type':'application/json',Authorization:'Bearer '+pair.token,'X-Semeko-Bridge':'3'};
  if(pair.dormant){const tabs=await chrome.tabs.query({url:'https://'+pair.host+'/*'});if(!tabs.length)return;pair.platformTab=tabs[0].id;pair.dormant=false;pair.connected=false;await save();}
  if(!pair.connected){
   const version=await fetch(pair.origin+'/bridge-version',{signal:AbortSignal.timeout(5000)});
   if(!version.ok||(await version.json()).protocol!==3){await tell(pair,'Semeko và tiện ích đang khác phiên bản. Lưu code, mở lại Semeko và tải lại tiện ích rồi kết nối lại.');return;}
   const identity=await pageAction(pair,'identity',{});
   if(!identity?.handle){await tell(pair,'Đang chờ đăng nhập trên '+pair.provider+'. Hoàn tất xác minh trong tab nền tảng.');return;}
   const r=await fetch(pair.origin+'/session',{method:'POST',headers:auth,body:JSON.stringify({identity}),signal:AbortSignal.timeout(20000)});
   if(r.status===403){pairs.delete(pair.key);await save();await tell(pair,'Kết nối đã hết hạn. Bấm đăng nhập lại trong Semeko.');return;}
   if(r.status!==200)throw Error('Session not accepted');
   pair.connected=true;pair.expires=pair.pairedExpires||Date.now()+7*86400000;pair.pairedExpires=pair.expires;await save();await tell(pair,'Đã đăng nhập '+identity.handle+'. Semeko đã nhận tài khoản.',true);
  }
  const r=await fetch(pair.origin+'/commands',{method:'POST',headers:auth,body:JSON.stringify(pair.completed||{}),signal:AbortSignal.timeout(15000)});
  if(r.status===403){pairs.delete(pair.key);await save();return;}if(r.status===409){pair.connected=false;await save();return;}if(!r.ok)throw Error('Connection unavailable');
  pair.completed=null;const {command}=await r.json();await save();
  await closePairingTab(pair);
  if(command){try{const result=await pageAction(pair,command.action,command.payload||{});pair.completed={id:command.id,result};}catch(e){pair.completed={id:command.id,error:String(e.message).slice(0,200)};}await save();}
 }catch(e){const reason=/permission|Cannot access|extensions gallery|scripting/i.test(String(e.message))?'Tiện ích chưa được cấp quyền trang nền tảng. Vào chrome://extensions, tải lại Semeko Session Bridge và chấp nhận quyền được yêu cầu.':'Chưa liên lạc được app hoặc trang nền tảng. Giữ Semeko và tab nền tảng mở.';await tell(pair,reason);}finally{pair.busy=false;if(pairs.has(pair.key))setTimeout(()=>tick(pair),pair.completed?50:1500);}
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(!['pair','resume'].includes(message.type))return;
 try{const url=new URL(message.url);if(sender.tab?.url!==url.href||url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.pathname!=='/semeko-connect'||!/^#(codeforces|leetcode):[a-f0-9]{64}$/.test(url.hash))throw Error('Invalid pairing');
  const [provider,token]=url.hash.slice(1).split(':'),key=url.origin+':'+provider;
  const pair={key,origin:url.origin,token,provider,tabId:sender.tab.id,host:provider==='codeforces'?'codeforces.com':'leetcode.com',expires:Date.now()+600000};
  loaded.then(async()=>{
   const previous=pairs.get(key);
   if(message.type==='resume'&&(!previous||previous.token!==token||!previous.pairedExpires||previous.pairedExpires<Date.now())){reply({known:false});return;}
   if(previous?.token===token){pair.expires=previous.expires;pair.pairedExpires=previous.pairedExpires;pair.platformTab=previous.platformTab;}
   pairs.set(key,pair);await save();await chrome.alarms.create('semeko-retry',{periodInMinutes:0.5});await platformTab(pair,'https://'+pair.host+'/',true);reply({known:true,connected:false});await tick(pair);
  }).catch(()=>reply({error:true}));return true;
 }catch(_){reply({error:true});}
});
chrome.tabs.onRemoved.addListener(tabId=>{loaded.then(async()=>{for(const pair of pairs.values())if(pair.platformTab===tabId||(!pair.connected&&pair.tabId===tabId)){
 const remaining=pair.platformTab===tabId?await chrome.tabs.query({url:'https://'+pair.host+'/*'}):[];
 if(remaining.length){pair.platformTab=remaining[0].id;continue;}
 if(pair.connected||pair.pairedExpires){pair.connected=false;pair.dormant=true;pair.platformTab=null;}else pairs.delete(pair.key);
 fetch(pair.origin+'/disconnect',{method:'POST',headers:{Authorization:'Bearer '+pair.token,'X-Semeko-Bridge':'3'},signal:AbortSignal.timeout(2000)}).catch(()=>{});
}await save();if(!pairs.size)chrome.alarms.clear('semeko-retry');});});
chrome.tabs.onUpdated.addListener((tabId,change,tab)=>{if(change.status==='complete')loaded.then(()=>{for(const pair of pairs.values())if(pair.platformTab===tabId||pair.dormant&&tab?.url?.startsWith('https://'+pair.host+'/'))tick(pair);});});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='semeko-retry')loaded.then(async()=>{for(const pair of pairs.values())tick(pair);await save();if(!pairs.size)chrome.alarms.clear('semeko-retry');});});
chrome.runtime.onStartup.addListener(()=>{loaded.then(async()=>{if(pairs.size){await chrome.alarms.create('semeko-retry',{periodInMinutes:0.5});for(const pair of pairs.values())tick(pair);}});});
loaded.then(()=>{for(const pair of pairs.values())tick(pair);});
