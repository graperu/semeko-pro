'use strict';
// Each function is serialized by chrome.scripting.executeScript. Keep it self-contained.
globalThis.SemekoPageActions={
submit:async function(payload){
 let posted=false;
 try{
  if(location.origin!=='https://codeforces.com')throw Error('Trang hiện tại không thuộc Codeforces.');
  if(!Number.isInteger(payload.contestId)||payload.contestId<1||!/^[A-Z]\d*$/.test(payload.index||''))throw Error('Mã bài Codeforces không hợp lệ.');
  const expected='/problemset/submit/'+payload.contestId+'/'+payload.index;
  const contest='/contest/'+payload.contestId+'/submit/'+payload.index;
  if(![expected,contest].includes(location.pathname.replace(/\/$/,'')))throw Error('Trang nộp không khớp bài đang mở trong Semeko.');
  const profile=document.querySelector('#header a[href^="/profile/"]');
  const handle=profile?decodeURIComponent(new URL(profile.href).pathname.split('/').pop()):null;
  if(!payload.expectedHandle||handle!==payload.expectedHandle)throw Error('Tài khoản đã thay đổi. Kết nối lại trước khi nộp.');
  const language=document.querySelector('select[name="programTypeId"]'),source=document.querySelector('textarea[name="source"]'),form=language?.form;
  if(!language||!source||!form)throw Error('Không tìm thấy form nộp bài. Hoàn tất xác minh trên trang chính thức rồi thử lại.');
  const action=new URL(form.action,location.href);
  if(action.origin!=='https://codeforces.com')throw Error('Form nộp bài không thuộc Codeforces.');
  const indexInput=form.querySelector('[name="submittedProblemIndex"]'),contestInput=form.querySelector('[name="contestId"]');
  if(indexInput?.value&&indexInput.value.toUpperCase()!==payload.index)throw Error('Mã bài trong form không khớp bài đang nộp.');
  if(contestInput?.value&&Number(contestInput.value)!==payload.contestId)throw Error('Mã kỳ thi trong form không khớp bài đang nộp.');
  const patterns={cpp:[/GNU G\+\+23/,/GNU G\+\+20/,/GNU G\+\+17/,/GNU G\+\+/],c:[/GNU GCC/],py:[/Python 3/,/PyPy 3/],java:[/Java 25/,/Java 21/,/Java 17/,/Java 11/,/Java 8/],cs:[/C# 13/,/C# 12/,/C# 10/,/C#/]};
  const options=[...language.options].filter(o=>!o.disabled);
  const option=patterns[payload.extension]?.map(pattern=>options.find(o=>pattern.test(o.textContent))).find(Boolean);
  if(!option)throw Error('Không tìm thấy trình biên dịch tương ứng trên Codeforces.');
  language.value=option.value;source.value=payload.code;source.dispatchEvent(new Event('input',{bubbles:true}));
  if(window.ace){const editor=document.querySelector('.ace_editor');if(editor)window.ace.edit(editor).setValue(payload.code,-1);}
  const submit=form.querySelector('input[type="submit"],button[type="submit"]');
  if(!submit)throw Error('Không tìm thấy nút nộp bài chính thức.');
  const data=new URLSearchParams(new FormData(form));
  if(submit.name)data.set(submit.name,submit.value);
  data.set('source',payload.code);data.set('programTypeId',option.value);
  posted=true;
  const response=await fetch(action.href,{method:'POST',body:data,credentials:'same-origin',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Codeforces HTTP '+response.status);
  const html=await response.text(),doc=new DOMParser().parseFromString(html,'text/html');
  const rows=[...doc.querySelectorAll('tr[data-submission-id]')].filter(r=>Number(r.dataset.submissionId)>payload.baseline&&[...r.querySelectorAll('a')].some(a=>new RegExp('/(?:problemset/problem/'+payload.contestId+'/|contest/'+payload.contestId+'/problem/)'+payload.index+'/?$','i').test(new URL(a.getAttribute('href'),location.href).pathname)));
  return{posted:true,ids:rows.map(r=>r.dataset.submissionId)};
 }catch(e){return{posted,error:String(e.message||e).slice(0,250)};}
},
identity:async function(provider){
 if(provider==='codeforces'){
  const link=document.querySelector('#header a[href^="/profile/"]');
  const logout=[...document.querySelectorAll('#header a')].some(a=>/logout/i.test(a.href));
  return{handle:logout&&link?decodeURIComponent(new URL(link.href).pathname.split('/').pop()):null};
 }
 const r=await fetch('/graphql/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'query { userStatus { isSignedIn username } }'}),credentials:'same-origin',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('LeetCode HTTP '+r.status);
 const u=(await r.json()).data?.userStatus;
 return{handle:u?.isSignedIn?u.username:null};
},
request:async function(payload){
 const isSubmission=payload.operation==='submit';
 let posted=false;
 try{
  const url=new URL(payload.url);
  if(url.origin!==location.origin)throw Error('Invalid platform origin');
  const options=payload.options||{},headers={...options.headers};
  if(isSubmission&&(location.origin!=='https://leetcode.com'||options.method!=='POST'||!/^\/problems\/[a-z0-9-]+\/submit\/$/.test(url.pathname)))throw Error('Invalid LeetCode submission target');
  if(options.method==='POST'&&/^\/problems\/[^/]+\/submit\/$/.test(url.pathname)){
   const check=await fetch('/graphql/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'query { userStatus { isSignedIn username } }'}),credentials:'same-origin',signal:AbortSignal.timeout(15000)});
   if(!check.ok)throw Error('LeetCode HTTP '+check.status);
   const user=(await check.json()).data?.userStatus;
   if(!payload.expectedHandle||!user?.isSignedIn||user.username!==payload.expectedHandle)throw Error('Tài khoản LeetCode đã thay đổi. Kết nối lại trước khi nộp.');
  }
  if(options.method==='POST'&&location.hostname==='leetcode.com'){
   const token=document.cookie.split('; ').find(c=>c.startsWith('csrftoken='));
   if(token)headers['x-csrftoken']=decodeURIComponent(token.slice(10));
  }
  posted=isSubmission;
  const r=await fetch(url.href,{method:options.method||'GET',headers,body:options.body,credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error('Platform HTTP '+r.status);
  const data=await r.json();
  return isSubmission?{posted:true,data}:data;
 }catch(e){if(isSubmission)return{posted,error:String(e.message||e).slice(0,250)};throw e;}
}
};
