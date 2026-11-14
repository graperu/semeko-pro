'use strict';
window.ContentUpdatesUI=(()=>{
 let dialog,body,message,badge,poll,notice,noticeType,noticeKey='',hiddenPhase='',lastIds=[],selection=new Set();
 const announced=new Set(),en=()=>document.documentElement.lang?.startsWith('en'),T=(vi,english)=>en()?english:vi;
 const n=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
 const size=bytes=>(bytes/1024/1024).toFixed(1)+' MiB';
 const call=async(action,value)=>{const r=await electronAPI.contentUpdates(action,value);if(!r.ok)throw Error(r.error);return r.data;};
 function hideNotice(){hiddenPhase=noticeType;notice?.hidePopover?.();if(notice)notice.hidden=true;}
 function showNotice(type,title,detail,key){
  if(hiddenPhase===type&&type==='downloading')return;
  if(!notice){notice=n('aside');notice.id='content-update-notice';notice.popover='manual';notice.dataset.i18nPreserve='';document.body.append(notice);}
  if(type!==noticeType||key!==noticeKey){noticeType=type;noticeKey=key;hiddenPhase='';notice.replaceChildren();notice.dataset.phase=type;
   const heading=n('strong'),description=n('p'),progress=n('progress');heading.dataset.noticeTitle='';description.dataset.noticeDetail='';progress.dataset.noticeProgress='';progress.hidden=type!=='downloading';progress.max=100;notice.append(heading,description,progress);
   const actions=n('div'),view=n('button',type==='available'?T('Xem cập nhật','View updates'):type==='downloading'?T('Xem tiến độ','View progress'):T('Quản lý tài liệu','Manage content'));
   view.type='button';view.dataset.noticeOpen='';view.onclick=()=>{hideNotice();if(type==='available')for(const id of lastIds)selection.add(id);open().catch(e=>showNotice('error',T('Không mở được tài liệu','Could not open content'),e.message,'open-error'));};actions.append(view);
   if(type==='error'&&lastIds.length){const retry=n('button',T('Thử lại','Retry'));retry.type='button';retry.dataset.noticeRetry='';retry.onclick=()=>startInstall(lastIds);actions.append(retry);}
   const close=n('button',type==='available'?T('Để sau','Later'):T('Ẩn','Hide'));close.type='button';close.dataset.noticeDismiss='';close.onclick=hideNotice;actions.append(close);notice.append(actions);
  }
  const host=dialog?.open?dialog:document.body;if(notice.parentNode!==host){notice.hidePopover();host.append(notice);}
  notice.querySelector('[data-notice-title]').textContent=title;notice.querySelector('[data-notice-detail]').textContent=detail;
  notice.setAttribute('role',type==='error'?'alert':'status');notice.setAttribute('aria-live',type==='error'?'assertive':'polite');notice.hidden=false;if(!notice.matches(':popover-open'))notice.showPopover();
 }
 function notify(data){
  const updates=data.packs.filter(p=>p.updateAvailable||p.downloadAvailable),count=updates.length;if(badge){badge.hidden=!count;badge.textContent=T('Tài liệu mới','New documents')+' ('+count+')';badge.title=T('Có gói tài liệu để tải hoặc cập nhật. Bấm để xem.','Content packs are available to download or update. Click to review.');}
  if(!count){if(noticeType==='available')hideNotice();return;}
  const key=updates.map(p=>p.id+':'+p.version).sort().join('|');let seen=announced.has(key);try{seen||=localStorage.getItem('semeko-content-announced')===key;}catch{}
  if(!seen){announced.add(key);try{localStorage.setItem('semeko-content-announced',key);}catch{}lastIds=updates.map(p=>p.id);showNotice('available',T('Có tài liệu mới','New content available'),count+T(' gói có thể tải hoặc cập nhật: ',' packs available to download or update: ')+updates.map(p=>p.title).join(', ')+T('. Bạn có thể chọn gói cần dùng hoặc để sau.','. Choose the packs you need or continue working and return later.'),key);}
 }
 function render(data){
  notify(data);const downloading=data.phase==='downloading';
  message.textContent=downloading?T('Đang tải ','Downloading ')+data.completed+'/'+data.total+' · '+size(data.bytes)+' / '+size(data.totalBytes):data.restartRequired?T('Đã lưu bản mới. Lưu công việc rồi mở lại ứng dụng để dùng tài liệu mới.','Saved. Save your work and reopen the app to use the new content.'):data.error||T('Chọn gói muốn tải. Gói phụ thuộc được tải cùng; code, ghi chú và tiến độ được giữ nguyên.','Choose packs to download. Required packs are included; code, notes and progress are preserved.');
  if(downloading){showNotice('downloading',T('Đang cập nhật tài liệu','Updating content'),message.textContent,'download');const p=notice?.querySelector('[data-notice-progress]');if(p){p.value=data.total?100*data.completed/data.total:0;p.setAttribute('aria-label',T('Tiến độ tải tài liệu','Content download progress'));}return;}
  body.replaceChildren();for(const p of data.packs){const row=n('label'),check=n('input');row.className='content-pack-row';check.type='checkbox';check.checked=selection.has(p.id);check.onchange=()=>check.checked?selection.add(p.id):selection.delete(p.id);const text=n('span'),title=n('strong',p.title),detail=n('small',p.files+T(' tệp · ',' files · ')+size(p.bytes)+' · '+(p.installedVersion?(p.updateAvailable?T('Có bản mới','Update available'):T('Đã tải','Installed')):T('Chưa tải','Not downloaded')));text.append(title,detail);row.append(check,text);body.append(row);}if(!data.packs.length)body.append(n('p',T('Chưa có danh mục gói tài liệu. Bấm Kiểm tra để kết nối kho phát hành.','No content catalog loaded. Check the release feed to see available packs.')));
 }
 async function startInstall(ids){
  if(!ids.length){message.textContent=T('Chọn ít nhất một gói tài liệu.','Choose at least one content pack.');return;}
  const download=dialog.querySelector('[data-content-download]'),check=dialog.querySelector('[data-content-check]');if(download.disabled)return;
  lastIds=[...ids];hiddenPhase='';download.disabled=true;check.disabled=true;showNotice('downloading',T('Đang cập nhật tài liệu','Updating content'),T('Đang kiểm tra và chuẩn bị tải. Bạn có thể tiếp tục làm bài.','Checking files and preparing the download. You can keep working.'),'download');
  poll=setInterval(()=>call('info').then(render).catch(()=>{}),600);
  try{const data=await call('install',ids);render(data);showNotice('installed',T('Đã cập nhật tài liệu','Content updated'),T('Đã tải và kiểm tra thành công. Lưu công việc rồi mở lại app để dùng bản mới; code và tiến độ vẫn được giữ nguyên.','Download verified. Save your work and reopen the app to use the new content; your code and progress are preserved.'),'installed');}
  catch(e){message.textContent=e.message;showNotice('error',T('Chưa cập nhật được tài liệu','Content update failed'),e.message+T(' Bản tài liệu cũ vẫn được giữ nguyên.',' Your previous content is preserved.'),'download-error');}
  finally{clearInterval(poll);download.disabled=false;check.disabled=false;}
 }
 async function open(){
  if(!dialog){dialog=n('dialog');dialog.id='content-updates';dialog.dataset.i18nPreserve='';const header=n('header');header.append(n('h2',T('Tài liệu ngoại tuyến','Offline content')));const close=n('button','×');close.setAttribute('aria-label',T('Đóng','Close'));close.onclick=()=>dialog.close();header.append(close);message=n('p');message.setAttribute('role','status');body=n('section');
   const actions=n('footer'),check=n('button',T('Kiểm tra cập nhật','Check for updates')),download=n('button',T('Tải / Cập nhật gói đã chọn','Download / update selected'));check.dataset.contentCheck='';download.dataset.contentDownload='';
   check.onclick=async()=>{check.disabled=true;try{render(await call('check'));}catch(e){message.textContent=e.message;showNotice('error',T('Không kiểm tra được cập nhật','Could not check for updates'),e.message,'check-error');}finally{check.disabled=false;}};
   download.onclick=()=>startInstall([...selection]);actions.append(check,download);dialog.append(header,message,body,actions);document.body.append(dialog);dialog.addEventListener('close',()=>{if(notice?.parentNode===dialog){notice.hidePopover();document.body.append(notice);if(!notice.hidden)notice.showPopover();}});
  }
  render(await call('info'));if(!dialog.open){dialog.showModal();if(notice&&!notice.hidden){notice.hidePopover();dialog.append(notice);notice.showPopover();}}
 }
 document.addEventListener('DOMContentLoaded',()=>{
  if(!window.electronAPI?.contentUpdates)return;
  const panel=document.getElementById('panel-about'),section=n('section');section.className='content-update-settings';section.append(n('h3',T('Gói tài liệu','Content packs')));const manage=n('button',T('Quản lý và cập nhật tài liệu','Manage and update content'));manage.className='action-btn';manage.onclick=()=>open().catch(e=>showToast(e.message,'error'));section.append(manage);panel?.append(section);
  badge=n('button');badge.id='content-update-badge';badge.className='action-btn';badge.hidden=true;badge.onclick=()=>open().catch(e=>showToast(e.message,'error'));const toolbar=document.getElementById('btn-book-courses');toolbar?.after(badge);if(!toolbar)section.append(badge);
  const check=()=>call('check').then(notify).catch(()=>{});electronAPI.getCurrentVersion?.().then(()=>{if(!location.search.includes('content-test'))setTimeout(check,15000);});setInterval(check,4*60*60*1000);
 });
 async function maintenance(){
  await open();const data=await call('storage');message.textContent=T('Dung lượng tài liệu tải về: ','Downloaded content storage: ')+size(data.bytes);body.replaceChildren();
  for(const pack of data.packs){const row=n('div');row.className='content-pack-row';row.append(n('span',pack.id+' · '+size(pack.bytes)));const remove=n('button',T('Gỡ gói','Remove pack'));remove.onclick=async()=>{if(!confirm(T('Gỡ gói '+pack.id+'? Bài làm và tiến độ vẫn giữ nguyên. Mở lại app sau khi gỡ.','Remove '+pack.id+'? Code and progress are preserved. Reopen the app afterwards.')))return;try{await call('remove',pack.id);await maintenance();}catch(e){message.textContent=e.message;}};row.append(remove);body.append(row);}
  const clean=n('button',T('Dọn dữ liệu cũ không còn dùng','Clean unused old content'));clean.onclick=async()=>{try{const result=await call('clean');message.textContent=T('Đã dọn ','Cleaned ')+result.removed+T(' tệp. Giữ bản đang dùng và bản phục hồi.',' files. Current and recovery content preserved.');}catch(e){message.textContent=e.message;}};body.append(clean);
  if(electronAPI.releaseBackup){const result=await electronAPI.releaseBackup('list');if(result.ok){body.append(n('h3',T('Sao lưu trước cập nhật','Pre-update backups')));for(const item of result.data.slice(0,10)){const button=n('button',item.name+' · '+size(item.bytes));button.onclick=async()=>{if(!confirm(T('Phục hồi bản này ở lần mở app tiếp theo? Một bản sao hiện tại sẽ được giữ lại.','Restore this backup on next launch? A current snapshot is preserved.')))return;const r=await electronAPI.releaseBackup('stageRestore',item.name);message.textContent=r.ok?T('Đã chuẩn bị phục hồi. Lưu công việc rồi mở lại app.','Restore prepared. Save work and reopen the app.'):r.error;};body.append(button);}}}
 }
 document.addEventListener('DOMContentLoaded',()=>{const panel=document.querySelector('.content-update-settings');if(panel){const b=n('button',T('Dung lượng & phục hồi','Storage & recovery'));b.className='action-btn';b.onclick=()=>maintenance().catch(e=>showToast(e.message,'error'));panel.append(b);}});
 return{open,maintenance};
})();
