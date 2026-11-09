'use strict';
const {app,BrowserWindow,session}=require('electron'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {writeFileAtomicSync}=require('../shared/fs-atomic');
const jobs=new Map(),loginWindows=new Map(),submissionWindows=new Set();
const file=()=>path.join(app.getPath('userData'),'official-submissions.json');
function read(){try{return JSON.parse(fs.readFileSync(file(),'utf8'));}catch(e){if(e.code==='ENOENT')return{connections:{},history:[]};throw e;}}
function save(data){fs.mkdirSync(path.dirname(file()),{recursive:true});writeFileAtomicSync(file(),JSON.stringify(data));}
function owner(){const id=require('./accounts').info().github?.id;if(!id)throw Error('Đăng nhập GitHub trong Semeko trước.');return String(id);}
function provider(value){if(!['codeforces','leetcode'].includes(value))throw Error('Nền tảng không hợp lệ');return value;}
function partition(id,p){return 'persist:semeko-'+id+'-'+p;}
function webSession(id,p){return session.fromPartition(partition(id,p));}
function info(id){if(!id)return{};const data=read();return{connections:data.connections[String(id)]||{},history:data.history.filter(j=>j.owner===String(id)).slice(-30).reverse()};}
function notify(job){if(String(require('./accounts').info().github?.id)!==String(job.owner))return;for(const w of BrowserWindow.getAllWindows())if(!w.isDestroyed()&&w.webContents.getURL().includes('index.html'))w.webContents.send('official-submission-event',job);}
function checkpoint(job){const data=read();data.history=data.history.filter(j=>j.ticket!==job.ticket);data.history.push(job);data.history=data.history.slice(-200);save(data);notify(job);return job;}
async function request(id,p,url,options={}){
 const u=new URL(url),host=p==='codeforces'?'codeforces.com':'leetcode.com';if(u.protocol!=='https:'||u.hostname!==host)throw Error('Sai địa chỉ nền tảng');
 const s=webSession(id,p),headers={Accept:'application/json',...options.headers};
 if(p==='leetcode'&&options.method==='POST'){
  const cookies=await s.cookies.get({url:'https://leetcode.com',name:'csrftoken'});if(cookies[0])headers['x-csrftoken']=cookies[0].value;
  headers.Referer='https://leetcode.com/';
 }
 const response=await s.fetch(url,{...options,headers,redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('Nền tảng trả HTTP '+response.status);return response.json();
}
async function leetcodeIdentity(id){const r=await request(id,'leetcode','https://leetcode.com/graphql/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'query SemekoSession { userStatus { isSignedIn username } }'})});const u=r.data?.userStatus;return u?.isSignedIn&&/^[A-Za-z0-9_.-]{1,40}$/.test(u.username||'')?u.username:null;}
const cfIdentityScript=`(()=>{const link=document.querySelector('#header a[href^="/profile/"]');const logout=[...document.querySelectorAll('#header a')].some(a=>/logout/i.test(a.href));if(!logout||!link)return null;const handle=decodeURIComponent(new URL(link.href).pathname.split('/').pop());return /^[A-Za-z0-9_.-]{1,40}$/.test(handle)?handle:null;})()`;
async function identity(id,p,window){if(p==='leetcode')return leetcodeIdentity(id);if(!window||window.isDestroyed()||new URL(window.webContents.getURL()).hostname!=='codeforces.com')return null;return window.webContents.executeJavaScript(cfIdentityScript);}
async function login(p){
 p=provider(p);const id=owner(),key=id+':'+p;if(loginWindows.has(key)){loginWindows.get(key).focus();return{opened:true};}
 const win=new BrowserWindow({width:1100,height:820,title:'Semeko — Đăng nhập '+p,autoHideMenuBar:true,webPreferences:{partition:partition(id,p),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true}});loginWindows.set(key,win);
 const allowed=value=>{try{const u=new URL(value);return u.protocol==='https:'&&['codeforces.com','leetcode.com','accounts.google.com','github.com'].some(h=>u.hostname===h||u.hostname.endsWith('.'+h));}catch{return false;}};
 win.webContents.on('will-navigate',(e,url)=>{if(!allowed(url))e.preventDefault();});win.webContents.on('will-redirect',(e,url)=>{if(!allowed(url))e.preventDefault();});win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 let busy=false;const timer=setInterval(async()=>{if(busy||win.isDestroyed())return;busy=true;try{if(owner()!==id){win.close();return;}const handle=await identity(id,p,win);if(handle){const data=read();data.connections[id]??={};data.connections[id][p]={handle,verifiedAt:new Date().toISOString()};save(data);notify({owner:id,provider:p,phase:'signed-in',handle});clearInterval(timer);}}catch(_){}finally{busy=false;}},2500);
 win.on('closed',()=>{clearInterval(timer);loginWindows.delete(key);});
 await win.loadURL(p==='codeforces'?'https://codeforces.com/enter':'https://leetcode.com/accounts/login/');return{opened:true};
}
function target(url){const value=require('./accounts').submissionURL(url);if(value.provider==='codeforces'){const m=/\/submit\/(\d+)\/([A-Za-z]\d*)$/.exec(value.url);return{...value,contestId:Number(m[1]),index:m[2].toUpperCase()};}return{...value,slug:new URL(value.url).pathname.split('/')[2]};}
async function submit(value){
 const id=owner(),p=target(value.url),connection=read().connections[id]?.[p.provider];if(!connection)throw Error('Đăng nhập '+p.provider+' trong mục Tài khoản trước.');
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
   posted=true;job.phase='submitting';checkpoint(job);
   const r=await request(id,'leetcode','https://leetcode.com/problems/'+p.slug+'/submit/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lang:{cpp:'cpp',c:'c',py:'python3',java:'java',cs:'csharp'}[value.extension],question_id:q.data.question.questionId,typed_code:value.code})});
   if(!/^\d+$/.test(String(r.submission_id)))throw Error(r.error||'Máy chủ chưa trả mã bài nộp');job.submissionId=String(r.submission_id);
  }else{
   const win=new BrowserWindow({show:true,width:1100,height:820,title:'Semeko — Nộp bài Codeforces',autoHideMenuBar:true,webPreferences:{partition:partition(id,'codeforces'),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true}});
   submissionWindows.add(win);win.on('closed',()=>submissionWindows.delete(win));
   win.webContents.setWindowOpenHandler(()=>({action:'deny'}));for(const event of ['will-navigate','will-redirect'])win.webContents.on(event,(e,url)=>{try{const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='codeforces.com')e.preventDefault();}catch{e.preventDefault();}});
   await win.loadURL(p.url);const handle=await identity(id,'codeforces',win);if(handle!==connection.handle)throw Error('Phiên Codeforces đã hết hạn hoặc đổi tài khoản. Hãy đăng nhập lại.');
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
   posted=true;job.phase='submitting';checkpoint(job);const result=await win.webContents.executeJavaScript(script);
   if(result.error){if(!result.posted)posted=false;throw Error(result.error);}if(result.ids?.length!==1)throw Error('Chưa xác định được chính xác mã bài nộp. Kiểm tra My Submissions trên Codeforces; app không tự nộp lại.');job.submissionId=String(result.ids[0]);
  }
  job.phase='judging';checkpoint(job);await watch(job,p);
 }catch(e){job.phase=posted&&!job.submissionId?'unknown':'error';job.error=e.message;checkpoint(job);}})();
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
    if(s?.verdict&&s.verdict!=='TESTING'){job.phase='finished';job.verdict=s.verdict;job.accepted=s.verdict==='OK';job.passed=s.passedTestCount??null;job.failedTest=job.accepted?null:s.passedTestCount==null?null:s.passedTestCount+1;job.runtime=s.timeConsumedMillis;job.memory=s.memoryConsumedBytes;checkpoint(job);return;}
    if(s){job.passed=s.passedTestCount;checkpoint(job);}
   }
  }catch(e){job.pollError=e.message;checkpoint(job);}
 }
 job.phase='pending';job.error='Máy chủ chưa trả kết quả cuối cùng. Mở bài nộp chính thức để xem tiếp.';checkpoint(job);
}
function stop(ticket){const id=owner(),job=jobs.get(ticket);if(!job||job.owner!==id)throw Error('Không tìm thấy bài nộp');job.phase='stopped';return checkpoint(job);}
function refresh(ticket){const id=owner(),saved=read().history.find(j=>j.ticket===ticket&&j.owner===id);if(!saved?.submissionId)throw Error('Chưa có mã bài nộp chính thức để theo dõi');const active=jobs.get(ticket);if(active?.phase==='judging')return active;const job={...saved,phase:'judging'};delete job.error;delete job.pollError;jobs.set(ticket,job);checkpoint(job);watch(job,target(job.problemURL)).catch(e=>{job.phase='error';job.error=e.message;checkpoint(job);});return job;}
function logout(p){p=provider(p);const id=owner();return webSession(id,p).clearStorageData().then(()=>{loginWindows.get(id+':'+p)?.close();const d=read();if(d.connections[id])delete d.connections[id][p];save(d);return info(id);});}
function closeForOwner(id){for(const [key,win]of loginWindows)if(key.startsWith(String(id)+':'))win.close();for(const win of submissionWindows)win.close();for(const job of jobs.values())if(job.owner===String(id)&&!['finished','error','unknown','stopped'].includes(job.phase)){job.phase='stopped';checkpoint(job);}}
module.exports={info,login,submit,stop,refresh,logout,target,closeForOwner};
