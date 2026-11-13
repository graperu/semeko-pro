'use strict';
const {app,BrowserWindow,session}=require('electron'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {writeFileAtomicSync}=require('../shared/fs-atomic');
const chrome=require('./platform-chrome');
const sessionBridge=require('./platform-session-bridge');
const jobs=new Map(),loginWindows=new Map(),submissionWindows=new Set();
const file=()=>path.join(app.getPath('userData'),'official-submissions.json');
function read(){try{return JSON.parse(fs.readFileSync(file(),'utf8'));}catch(e){if(e.code==='ENOENT')return{connections:{},history:[]};throw e;}}
function save(data){fs.mkdirSync(path.dirname(file()),{recursive:true});writeFileAtomicSync(file(),JSON.stringify(data));}
function owner(){const id=require('./accounts').info().github?.id;if(!id)throw Error('Đăng nhập GitHub trong Semeko trước.');return String(id);}
function provider(value){if(!['codeforces','leetcode'].includes(value))throw Error('Nền tảng không hợp lệ');return value;}
function partition(id,p){return 'persist:semeko-'+id+'-'+p;}
function webSession(id,p){return session.fromPartition(partition(id,p));}
function info(id){if(!id)return{};const data=read();return{connections:Object.fromEntries(Object.entries(data.connections[String(id)]||{}).map(([p,c])=>[p,{...c,connected:c.transport==='bridge'?sessionBridge.connected(id,p):true}])),history:data.history.filter(j=>j.owner===String(id)&&!j.hiddenFromHistory).slice(-30).reverse()};}
function dismissHistory(ticket){
 const id=owner(),data=read();
 if(ticket!==undefined&&(typeof ticket!=='string'||!ticket||ticket.length>160))throw Error('Mã lịch sử không hợp lệ');
 const active=new Set(['preparing','submitting','judging','pending']);let removed=0;
 for(const job of data.history){if(job.owner!==id||job.hiddenFromHistory||(ticket!==undefined&&job.ticket!==ticket))continue;
  if(active.has(jobs.get(job.ticket)?.phase||job.phase)){if(ticket!==undefined)throw Error('Bài đang gửi hoặc đang chấm; chờ kết quả trước khi xóa.');continue;}
  job.hiddenFromHistory=true;removed++;
 }
 if(removed)save(data);
 return {removed};
}
function notify(job){if(String(require('./accounts').info().github?.id)!==String(job.owner))return;for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed()&&w.webContents.getURL().includes('index.html'))w.webContents.send('official-submission-event',job);}
function checkpoint(job){const data=read();if(data.history.some(j=>j.ticket===job.ticket&&j.hiddenFromHistory))job.hiddenFromHistory=true;data.history=data.history.filter(j=>j.ticket!==job.ticket);data.history.push(job);data.history=data.history.slice(-200);save(data);notify(job);return job;}
async function request(id,p,url,options={},operation){
 const u=new URL(url),host=p==='codeforces'?'codeforces.com':'leetcode.com';if(u.protocol!=='https:'||u.hostname!==host)throw Error('Sai địa chỉ nền tảng');
 if(read().connections[id]?.[p]?.transport==='bridge'){const r=await sessionBridge.command(id,p,{action:'request',payload:{url,options,operation,expectedHandle:read().connections[id]?.[p]?.handle}});if(operation==='submit'){if(r?.error){const e=Error(r.error);e.posted=r.posted;throw e;}return r?.data;}return r;}
 if(read().connections[id]?.[p]?.transport==='chrome')return chrome.request(id,p,url,options);
 const s=webSession(id,p),headers={Accept:'application/json',...options.headers};
 if(p==='leetcode'&&options.method==='POST'){
  const cookies=await s.cookies.get({url:'https://leetcode.com',name:'csrftoken'});if(cookies[0])headers['x-csrftoken']=cookies[0].value;
  headers.Referer='https://leetcode.com/';
 }
 const response=await s.fetch(url,{...options,headers,redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('Nền tảng trả HTTP '+response.status);return response.json();
}
async function leetcodeIdentity(id,transport){const send=transport==='chrome'?chrome.request:request;const r=await send(id,'leetcode','https://leetcode.com/graphql/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'query SemekoSession { userStatus { isSignedIn username } }'})});const u=r.data?.userStatus;return u?.isSignedIn&&/^[A-Za-z0-9_.-]{1,40}$/.test(u.username||'')?u.username:null;}
const cfIdentityScript=`(()=>{const link=document.querySelector('#header a[href^="/profile/"]');const logout=[...document.querySelectorAll('#header a')].some(a=>/logout/i.test(a.href));if(!logout||!link)return null;const handle=decodeURIComponent(new URL(link.href).pathname.split('/').pop());return /^[A-Za-z0-9_.-]{1,40}$/.test(handle)?handle:null;})()`;
async function identity(id,p,window){if(window?.transport==='bridge')return(await sessionBridge.command(id,p,{action:'identity'}))?.handle;
 if(p==='leetcode')return leetcodeIdentity(id,window?.transport);if(!window||window.isDestroyed()||new URL(window.webContents.getURL()).hostname!=='codeforces.com')return null;return window.webContents.executeJavaScript(cfIdentityScript);}
async function login(p){
 p=provider(p);await require('./accounts').ensureSession?.();const id=owner(),key=id+':'+p;if(loginWindows.has(key)){loginWindows.get(key).focus();return{opened:true};}
 if(!['electron','chrome'].includes(process.env.SEMEKO_OFFICIAL_BROWSER))return browserLogin(id,p);
 const url=p==='codeforces'?'https://codeforces.com/enter':'https://leetcode.com/accounts/login/';
 const win=process.env.SEMEKO_OFFICIAL_BROWSER==='electron'?new BrowserWindow({width:1100,height:820,title:'Semeko — Đăng nhập '+p,autoHideMenuBar:true,webPreferences:{partition:partition(id,p),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true}}):await chrome.open(id,p,url);loginWindows.set(key,win);
 const allowed=value=>{try{const u=new URL(value);return u.protocol==='https:'&&['codeforces.com','leetcode.com','accounts.google.com','github.com'].some(h=>u.hostname===h||u.hostname.endsWith('.'+h));}catch{return false;}};
 win.webContents.on('will-navigate',(e,url)=>{if(!allowed(url))e.preventDefault();});win.webContents.on('will-redirect',(e,url)=>{if(!allowed(url))e.preventDefault();});win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 let busy=false,lastStatus='',started=Date.now();const status=text=>{if(text!==lastStatus){lastStatus=text;notify({owner:id,provider:p,phase:'login-status',message:text});}};const timer=setInterval(async()=>{if(busy||win.isDestroyed())return;busy=true;try{if(owner()!==id){win.close();return;}const handle=await identity(id,p,win);if(handle){const data=read();data.connections[id]??={};data.connections[id][p]={handle,verifiedAt:new Date().toISOString(),transport:win.transport||'electron'};save(data);notify({owner:id,provider:p,phase:'signed-in',handle});clearInterval(timer);if(loginWindows.get(key)===win)loginWindows.delete(key);submissionWindows.add(win);for(const main of BrowserWindow.getAllWindows())if(!main.isDestroyed()&&main.webContents.getURL().includes('index.html')){if(main.isMinimized?.())main.restore();main.show?.();main.moveTop?.();main.focus?.();main.flashFrame?.(true);}}else if(Date.now()-started>10000)status('Đang chờ đăng nhập '+p+' trong Chrome. Hoàn tất bước xác minh nếu có.');}catch(_){status('Chưa xác minh được phiên '+p+'. Giữ trang nền tảng mở và hoàn tất đăng nhập trong Chrome.');}finally{busy=false;}},2500);
 win.on('closed',()=>{clearInterval(timer);submissionWindows.delete(win);if(loginWindows.get(key)===win)loginWindows.delete(key);});
 if(!win.transport)await win.loadURL(url);return{opened:true,browser:win.transport||'electron'};
}
function browserAccept(id,p,restoring=false){return async (_cookies,metadata)=>{
  await require('./accounts').ensureSession?.();
  if(owner()!==id)throw Error('Account changed');
  const handle=metadata?.identity?.handle;
  if(!/^[A-Za-z0-9_.-]{1,40}$/.test(handle||''))return false;
  const data=read();if(restoring&&data.connections[id]?.[p]?.handle!==handle)return false;data.connections[id]??={};data.connections[id][p]={handle,verifiedAt:new Date().toISOString(),transport:'bridge'};save(data);
  notify({owner:id,provider:p,phase:'signed-in',handle});
  if(!restoring)for(const main of BrowserWindow.getAllWindows())if(!main.isDestroyed()&&main.webContents.getURL().includes('index.html')){if(main.isMinimized?.())main.restore();main.show?.();main.moveTop?.();main.focus?.();main.flashFrame?.(true);}
  return true;
 };}
async function browserLogin(id,p){return sessionBridge.start(id,p,browserAccept(id,p),{browserCommands:true});}
let restoredBridge;function restoreBridge(){return restoredBridge??=(sessionBridge.restore?.((id,p)=>browserAccept(id,p,true))||Promise.resolve());}
async function bridgeWindow(id,p,url){return{transport:'bridge',isDestroyed:()=>false,on(){},close(){},webContents:{getURL:()=>url,on(){},setWindowOpenHandler(){}}};}
function target(url){const value=require('./accounts').submissionURL(url);if(value.provider==='codeforces'){const m=/\/submit\/(\d+)\/([A-Za-z]\d*)$/.exec(value.url);return{...value,contestId:Number(m[1]),index:m[2].toUpperCase()};}return{...value,slug:new URL(value.url).pathname.split('/')[2]};}
async function submit(value){
 value={...value,extension:['cc','cxx'].includes(String(value.extension).toLowerCase())?'cpp':String(value.extension||'').toLowerCase()};
 await require('./accounts').ensureSession?.();
 const id=owner(),p=target(value.url);value={...value,url:p.provider==='codeforces'?'https://codeforces.com/problemset/problem/'+p.contestId+'/'+p.index:'https://leetcode.com/problems/'+p.slug+'/'};const connection=read().connections[id]?.[p.provider];if(!connection)throw Error('Đăng nhập '+p.provider+' trong mục Tài khoản trước.');
 if(connection.transport==='bridge'&&!sessionBridge.connected(id,p.provider))throw Error('Kết nối Chrome đã ngắt. Bấm Kết nối lại trong Tài khoản trước khi nộp; chưa gửi bài.');
 if(value.expectedOwner!==undefined&&String(value.expectedOwner)!==id||value.expectedHandle!==undefined&&value.expectedHandle!==connection.handle)throw Error('Tài khoản đã thay đổi sau khi xác nhận. Kiểm tra lại trước khi nộp.');
 if(typeof value.code!=='string'||!value.code.trim()||Buffer.byteLength(value.code)>1000000)throw Error('Lời giải trống hoặc quá lớn');
 if(!['cpp','c','py','java','cs'].includes(value.extension))throw Error('Chọn ngôn ngữ lời giải hợp lệ');
 const hash=crypto.createHash('sha256').update(value.code).digest('hex');
 if(read().history.some(j=>j.owner===id&&j.provider===p.provider&&j.problemURL===value.url&&j.sourceHash===hash&&['preparing','submitting','unknown'].includes(j.phase)))throw Error('Bài này có lần gửi chưa rõ kết quả. Kiểm tra lịch sử nộp trên nền tảng trước; app không tự gửi trùng.');
 if([...jobs.values()].some(j=>j.owner===id&&j.provider===p.provider&&!['finished','error','unknown','stopped'].includes(j.phase)))throw Error('Đang có một bài nộp trên nền tảng này.');
 const job={ticket:crypto.randomUUID(),owner:id,provider:p.provider,problemURL:value.url,extension:value.extension,handle:connection.handle,phase:'preparing',createdAt:Date.now(),sourceHash:hash};jobs.set(job.ticket,job);checkpoint(job);
 // Authorization is the dedicated Submit action, never Run. Freeze this source
 // snapshot, send once only, and never retry POST after an uncertain response.
 (async()=>{let posted=false;try{
  if(p.provider==='leetcode'){
   const handle=await leetcodeIdentity(id);if(handle!==connection.handle)throw Error('Phiên LeetCode đã hết hạn hoặc đổi tài khoản. Hãy đăng nhập lại.');
   const q=await request(id,'leetcode','https://leetcode.com/graphql/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'query SemekoSubmitQuestion($slug:String!){question(titleSlug:$slug){questionId}}',variables:{slug:p.slug}})});
   if(!/^\d+$/.test(String(q.data?.question?.questionId)))throw Error('Không lấy được mã bài LeetCode');
   if(owner()!==id||job.phase==='stopped')throw Error('Lần nộp đã dừng trước khi gửi');
   posted=true;job.phase='submitting';checkpoint(job);
   const r=await request(id,'leetcode','https://leetcode.com/problems/'+p.slug+'/submit/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lang:{cpp:'cpp',c:'c',py:'python3',java:'java',cs:'csharp'}[value.extension],question_id:q.data.question.questionId,typed_code:value.code})},'submit');
   if(!/^\d+$/.test(String(r.submission_id)))throw Error(r.error||'Máy chủ chưa trả mã bài nộp');job.submissionId=String(r.submission_id);
  }else{
   const win=connection.transport==='bridge'?await bridgeWindow(id,'codeforces',p.url):connection.transport==='chrome'?await chrome.open(id,'codeforces',p.url):new BrowserWindow({show:true,width:1100,height:820,title:'Semeko — Nộp bài Codeforces',autoHideMenuBar:true,webPreferences:{partition:partition(id,'codeforces'),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true}});
   submissionWindows.add(win);win.on('closed',()=>submissionWindows.delete(win));
   win.webContents.setWindowOpenHandler(()=>({action:'deny'}));for(const event of ['will-navigate','will-redirect'])win.webContents.on(event,(e,url)=>{try{const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='codeforces.com')e.preventDefault();}catch{e.preventDefault();}});
   if(!win.transport)await win.loadURL(p.url);const handle=await identity(id,'codeforces',win);if(handle!==connection.handle)throw Error('Phiên Codeforces đã hết hạn hoặc đổi tài khoản. Hãy đăng nhập lại.');
   const before=await request(id,'codeforces','https://codeforces.com/api/user.status?handle='+encodeURIComponent(handle)+'&from=1&count=10');if(before.status!=='OK')throw Error('Không đọc được lịch sử bài nộp');const baseline=Math.max(0,...before.result.map(s=>s.id));
   const script='('+async function(payload){
    const language=document.querySelector('select[name="programTypeId"]'),source=document.querySelector('textarea[name="source"]'),form=language?.form;
    if(!language||!source||!form)return{error:'Không tìm thấy form nộp bài. Hoàn tất xác minh trên trang chính thức rồi thử lại.'};
    if(new URL(form.action,location.href).origin!=='https://codeforces.com')return{error:'Form nộp bài không thuộc Codeforces'};
    const patterns={cpp:/GNU G\+\+20|GNU G\+\+17/,c:/GNU GCC.*11|GNU GCC/,py:/Python 3|PyPy 3/,java:/Java 21|Java 17|Java 11|Java 8/,cs:/C# 13|C# 12|C# 10/};
    const option=[...language.options].find(o=>patterns[payload.extension].test(o.textContent));if(!option)return{error:'Không tìm thấy trình biên dịch tương ứng trên Codeforces'};
    language.value=option.value;source.value=payload.code;source.dispatchEvent(new Event('input',{bubbles:true}));
    if(window.ace){const editor=document.querySelector('.ace_editor');if(editor)window.ace.edit(editor).setValue(payload.code,-1);}
    const submit=form.querySelector('input[type="submit"],button[type="submit"]');if(!submit)return{error:'Không tìm thấy nút nộp bài chính thức'};
    const data=new URLSearchParams(new FormData(form));if(submit.name)data.set(submit.name,submit.value);data.set('source',payload.code);data.set('programTypeId',option.value);
    const response=await fetch(form.action,{method:'POST',body:data,credentials:'same-origin'});const html=await response.text();if(!response.ok)return{posted:true,error:'Codeforces HTTP '+response.status};
    const doc=new DOMParser().parseFromString(html,'text/html');const rows=[...doc.querySelectorAll('tr[data-submission-id]')].filter(r=>Number(r.dataset.submissionId)>payload.baseline&&[...r.querySelectorAll('a')].some(a=>new RegExp('/(?:problemset/problem/'+payload.contestId+'/|contest/'+payload.contestId+'/problem/)'+payload.index+'/?$','i').test(new URL(a.getAttribute('href'),location.href).pathname)));
    return{posted:true,ids:rows.map(r=>r.dataset.submissionId)};
   }.toString()+')('+JSON.stringify({code:value.code,extension:value.extension,baseline,contestId:p.contestId,index:p.index})+')';
   if(owner()!==id||job.phase==='stopped')throw Error('Lần nộp đã dừng trước khi gửi');
   posted=true;job.phase='submitting';checkpoint(job);const result=win.transport==='bridge'?await sessionBridge.command(id,'codeforces',{action:'cf-submit',payload:{code:value.code,extension:value.extension,baseline,contestId:p.contestId,index:p.index,expectedHandle:connection.handle}}):await win.webContents.executeJavaScript(script);
   if(result.error){if(!result.posted)posted=false;throw Error(result.error);}if(result.ids?.length!==1)throw Error('Chưa xác định được chính xác mã bài nộp. Kiểm tra My Submissions trên Codeforces; app không tự nộp lại.');job.submissionId=String(result.ids[0]);
  }
  job.phase='judging';checkpoint(job);await watch(job,p);
 }catch(e){if(job.phase==='stopped')return;if(e.posted===false)posted=false;job.phase=posted&&!job.submissionId?'unknown':'error';job.error=e.message;checkpoint(job);}})();
 return{ticket:job.ticket};
}
async function watch(job,p){
 for(let i=0;i<75;i++){
  if(job.phase==='stopped')return;await new Promise(r=>setTimeout(r,4000));if(job.phase==='stopped')return;
  try{
   if(owner()!==job.owner){job.phase='stopped';checkpoint(job);return;}
   if(p.provider==='leetcode'){
    const r=await request(job.owner,'leetcode','https://leetcode.com/submissions/detail/'+job.submissionId+'/check/');
    if(r.state==='SUCCESS'){job.phase='finished';job.verdict=r.status_msg||'Unknown';job.accepted=r.status_code===10;job.passed=r.total_correct??null;job.total=r.total_testcases??null;job.runtime=r.status_runtime??null;job.memory=r.status_memory??null;job.detail={input:String(r.last_testcase||'').slice(0,16000),actual:String(r.code_output||'').slice(0,16000),expected:String(r.expected_output||'').slice(0,16000),error:String(r.full_compile_error||r.compile_error||r.runtime_error||'').slice(0,16000)};checkpoint(job);return;}
   }else{
    const r=await request(job.owner,'codeforces','https://codeforces.com/api/user.status?handle='+encodeURIComponent(job.handle)+'&from=1&count=100');if(r.status!=='OK')throw Error('Không đọc được kết quả Codeforces');const s=r.result.find(s=>String(s.id)===job.submissionId);
    if(s?.verdict&&s.verdict!=='TESTING'){job.phase='finished';job.verdict=s.verdict;job.accepted=s.verdict==='OK';job.passed=s.passedTestCount??null;job.failedTest=/^(WRONG_ANSWER|TIME_LIMIT_EXCEEDED|MEMORY_LIMIT_EXCEEDED|RUNTIME_ERROR|IDLENESS_LIMIT_EXCEEDED|PRESENTATION_ERROR)$/.test(s.verdict)&&s.passedTestCount!=null?s.passedTestCount+1:null;job.runtime=s.timeConsumedMillis;job.memory=s.memoryConsumedBytes;if(typeof s.points==='number')job.score=s.points;checkpoint(job);return;}
    if(s){job.passed=s.passedTestCount;checkpoint(job);}
   }
  }catch(e){job.pollError=e.message;checkpoint(job);}
 }
 job.phase='pending';job.error='Máy chủ chưa trả kết quả cuối cùng. Mở bài nộp chính thức để xem tiếp.';checkpoint(job);
}
function stop(ticket){const id=owner(),job=jobs.get(ticket);if(!job||job.owner!==id)throw Error('Không tìm thấy bài nộp');job.phase='stopped';return checkpoint(job);}
function refresh(ticket){const id=owner(),saved=read().history.find(j=>j.ticket===ticket&&j.owner===id);if(!saved?.submissionId)throw Error('Chưa có mã bài nộp chính thức để theo dõi');const active=jobs.get(ticket);if(active?.phase==='judging')return active;const job={...saved,phase:'judging'};delete job.error;delete job.pollError;jobs.set(ticket,job);checkpoint(job);watch(job,target(job.problemURL)).catch(e=>{job.phase='error';job.error=e.message;checkpoint(job);});return job;}
async function openResult(ticket){const id=owner(),job=read().history.find(j=>j.ticket===ticket&&j.owner===id);if(!/^\d+$/.test(String(job?.submissionId)))throw Error('Chưa có mã bài nộp');const p=target(job.problemURL),url=p.provider==='leetcode'?'https://leetcode.com/submissions/detail/'+job.submissionId+'/':'https://codeforces.com/contest/'+p.contestId+'/submission/'+job.submissionId;if(read().connections[id]?.[p.provider]?.transport==='bridge'){await sessionBridge.command(id,p.provider,{action:'navigate',payload:{url}});return{opened:true};}const usingChrome=read().connections[id]?.[p.provider]?.transport==='chrome';const win=usingChrome?await chrome.open(id,p.provider,url):new BrowserWindow({width:1100,height:820,title:'Semeko — Kết quả chính thức',autoHideMenuBar:true,webPreferences:{partition:partition(id,p.provider),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true}});submissionWindows.add(win);win.on('closed',()=>submissionWindows.delete(win));win.webContents.setWindowOpenHandler(()=>({action:'deny'}));for(const event of ['will-navigate','will-redirect'])win.webContents.on(event,(e,value)=>{try{const u=new URL(value);if(u.protocol!=='https:'||u.hostname!==new URL(url).hostname)e.preventDefault();}catch{e.preventDefault();}});if(!usingChrome)await win.loadURL(url);return{opened:true};}
function logout(p){p=provider(p);const id=owner();return (read().connections[id]?.[p]?.transport==='bridge'?Promise.resolve(sessionBridge.stop(id,p)):read().connections[id]?.[p]?.transport==='chrome'?chrome.logout(id,p):webSession(id,p).clearStorageData()).then(()=>{loginWindows.get(id+':'+p)?.close();const d=read();if(d.connections[id])delete d.connections[id][p];save(d);return info(id);});}
function closeForOwner(id){sessionBridge.stop(id);for(const [key,win]of loginWindows)if(key.startsWith(String(id)+':'))win.close();for(const win of submissionWindows)win.close();for(const job of jobs.values())if(job.owner===String(id)&&!['finished','error','unknown','stopped'].includes(job.phase)){job.phase='stopped';checkpoint(job);}}
module.exports={restoreBridge,info,login,submit,stop,refresh,openResult,logout,target,closeForOwner,dismissHistory};
