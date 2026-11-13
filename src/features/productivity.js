'use strict';
window.Productivity=(()=>{
    let dialog,body,status,section='recovery',recoveryDoc=null,debounce,maxWait,snapshotFlight=Promise.resolve(),restoring=false,exam=null,examTimer,lastSnapshot='',liveTimer,liveBusy=false,lastSaveError='';
    const checks=new Map(),tr=s=>window.UILanguage?UILanguage.translate(s):s,active=()=>App.tabs.find(t=>t.id===getPreferredTabId()),$=id=>document.getElementById(id);
    function node(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
    function button(text,fn){const b=node('button',text,'action-btn');b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){status.textContent=e.message;showToast(e.message,'error');}finally{b.disabled=false;}};return b;}
    async function call(promise){const r=await promise;if(!r?.ok)throw Error(r?.error||'Thao tác chưa thành công');return r.data;}
    function tabs(){
        const tab=active();if(tab){saveTestStateToTab(tab);persistCurrentTabIO();}
        return App.tabs.map(t=>({id:t.id,name:t.name,path:t.path||null,content:tabSourceText(t),original:t.original||'',modified:!!t.modified,pinned:!!t.pinned,practiceTimeMs:CodingWorkspace.practiceMs(t),testState:t.testState?JSON.parse(JSON.stringify(t.testState)):null,io:App.ioByTab[t.id]||null,libraryKey:t.libraryKey}));
    }
    function drafts(){return PracticeLibrary.drafts?.()||[];}
    function payload(){const entries=PracticeLibrary.entries();for(const draft of drafts()){const item=entries.find(e=>e.id===draft.id);if(item){item.notes=draft.notes;item.tags=draft.tags.split(',').map(t=>t.trim()).filter(Boolean);}}return{format:'semeko-workspace',version:1,created:new Date().toISOString(),tabs:tabs(),entries,settings:App.settings,exam};}
    async function checkpoint(clean=false){
        if(restoring)return;clearTimeout(debounce);clearTimeout(maxWait);debounce=maxWait=null;
        await PracticeLibrary.flushDrafts();
        const value={...payload(),timestamp:Date.now(),clean,activeTabId:getPreferredTabId()};
        // Avoid rewriting the same large source snapshot on every timer tick.
        const fingerprint=JSON.stringify({...value,timestamp:0,created:'',tabs:value.tabs.map(t=>({...t,practiceTimeMs:Math.floor(t.practiceTimeMs/15000)*15000}))});if(fingerprint===lastSnapshot&&!clean)return;
        snapshotFlight=snapshotFlight.catch(()=>{}).then(async()=>{await call(electronAPI.productivitySnapshot(value));lastSnapshot=fingerprint;lastSaveError='';const el=$('recovery-save-status');if(el)el.textContent='Đã lưu bản phục hồi · '+new Date(value.timestamp).toLocaleTimeString('vi-VN');});
        try{await snapshotFlight;}catch(e){if(lastSaveError!==e.message){lastSaveError=e.message;showToast('Không lưu được bản phục hồi: '+e.message,'error');}throw e;}
    }
    function schedule(){if(restoring||!dialog)return;clearTimeout(debounce);debounce=setTimeout(()=>void checkpoint().catch(()=>{}),1000);if(!maxWait)maxWait=setTimeout(()=>void checkpoint().catch(()=>{}),5000);scheduleLive();}
    async function restore(value,includeSettings=false,importing=false){
        if(!value||!Array.isArray(value.tabs))throw Error('Không có dữ liệu để phục hồi.');
        restoring=true;try{
            if(value.entries?.length)await (importing?PracticeLibrary.mergeImported(value.entries):PracticeLibrary.mergeRecovered(value.entries));
            for(const data of value.tabs){
                if(typeof data.content!=='string'||typeof data.name!=='string')continue;
                const existing=!importing&&App.tabs.find(t=>t.recoverySource===data.id&&t.name===data.name&&tabSourceText(t)===data.content);
                if(existing)continue;
                const tab={id:createRestoredTabId(),name:data.name,path:null,recoverySource:importing?undefined:data.id,untitledHistoryKey:createUntitledHistoryKey(),content:data.content,original:'',modified:true,pinned:!!data.pinned,practiceTimeMs:Math.max(0,Number(data.practiceTimeMs)||0),testState:data.testState?JSON.parse(JSON.stringify(data.testState)):null};
                App.tabs.push(tab);if(data.io)App.ioByTab[tab.id]=data.io;
            }
            App.tabs.sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned));const last=App.tabs[App.tabs.length-1];if(last)setActive(last.id);updateUI();
            if(includeSettings&&value.settings){for(const [key,items]of Object.entries(value.settings))if(App.settings[key]&&items&&typeof items==='object')Object.assign(App.settings[key],items);applySettings();saveSettings();}
            if(value.exam&&!exam){exam={...value.exam,phase:value.exam.phase==='running'?'paused':value.exam.phase};await saveExam();}
            scheduleSessionSave();
        }finally{restoring=false;}await checkpoint();
        showToast('Đã khôi phục thành bản sao; tệp gốc được giữ nguyên.','success');
    }
    function renderRecovery(){
        body.append(node('h3','Tự lưu và phục hồi'),node('p','Bản phục hồi giữ code, test, dữ liệu đầu vào, ghi chú đang nhập và bài đang mở. Lưu sau khi ngừng gõ khoảng 1 giây; gõ liên tục được chốt mỗi 5 giây.'));
        const saved=node('p','Chưa có bản lưu mới trong phiên này.');saved.id='recovery-save-status';saved.setAttribute('role','status');body.append(saved,button('Lưu bản phục hồi ngay',()=>checkpoint()));
        if(recoveryDoc?.tabs?.length){body.append(node('p','Bản gần nhất: '+new Date(recoveryDoc.timestamp).toLocaleString('vi-VN')+' · '+recoveryDoc.tabs.length+' tab'),button('Khôi phục bản gần nhất',async()=>{await restore(recoveryDoc);dialog.close();}));}
        const live=node('label',null,'productivity-inline');const check=node('input');check.type='checkbox';check.checked=!!App.settings.editor.liveCheck;check.onchange=()=>{App.settings.editor.liveCheck=check.checked;saveSettings();configureLive();scheduleLiveCheck();};live.append(check,node('span','Gạch chân lỗi và gợi ý ngay lúc gõ'));body.append(node('h3','Gợi ý lỗi'),live,node('p','C/C++ dùng kiểm tra hiện có; Python, Java, C# kiểm tra sau khi dừng gõ. Đề xuất sửa nhanh chỉ hiện khi xác định được cách sửa an toàn; mọi thay đổi có thể Undo.'));
    }
    async function renderTools(){
        body.append(node('p','Đang kiểm tra công cụ…'));const result=await call(electronAPI.runtimeCenterStatus());if(section!=='tools')return;body.replaceChildren(node('h3','Cài và kiểm tra ngôn ngữ'),node('p','Cài công cụ còn thiếu qua Windows Package Manager. Thao tác Cài chấp nhận giấy phép gói của nhà cung cấp; Windows có thể hiện yêu cầu quyền quản trị.'));
        for(const [ext,name]of [['cpp','GCC · C/C++'],['py','Python'],['java','Java JDK'],['cs','C# · .NET SDK']]){
            const info=result[ext],card=node('section',null,'productivity-card');card.dataset.runtime=ext;card.append(node('h4',name),node('p',info.installed?'Đã tìm thấy · '+(info.version||''):'Chưa tìm thấy công cụ hoạt động'),node('small',info.command||''));
            const controls=node('div',null,'productivity-actions'),install=button('Cài công cụ',async()=>{const r=await call(electronAPI.runtimeCenterInstall(ext));status.textContent=r.alreadyInstalled?'Công cụ đã có sẵn.':r.busy?'Một gói khác đang cài. Chờ hoàn tất rồi thử lại.':'Đang cài, xem tiến độ bên dưới.';});install.dataset.install=ext;install.disabled=info.installed||result.jobs.some(j=>j.phase==='installing');
            const smoke=button('Chạy thử Hello World',async()=>{status.textContent='Đang biên dịch và chạy thử '+name+'…';const r=await call(electronAPI.runtimeCenterSmoke(ext));status.textContent=name+': thành công · '+r.output;});smoke.dataset.smoke=ext;smoke.disabled=!info.installed;controls.append(install,smoke);card.append(controls);body.append(card);
        }
        const log=node('pre',result.jobs.map(j=>j.log).join('\n'));log.id='runtime-install-log';log.setAttribute('role','status');body.append(log,button('Kiểm tra lại công cụ',render));
    }
    async function exportBackup(){await checkpoint();status.textContent='Đang tạo gói…';const r=await call(electronAPI.productivityExport(payload()));status.textContent=r.canceled?'Đã hủy xuất.':'Đã xuất '+r.tabs+' tab · '+r.entries+' bài · '+(r.bytes/1048576).toFixed(2)+' MiB';}
    async function previewBackup(){
        const r=await call(electronAPI.productivityPreview());if(r.canceled)return;
        const preview=node('section',null,'productivity-card');preview.id='backup-preview';preview.append(node('h4','Xem trước gói sao lưu'),node('p',r.tabs+' tab · '+r.entries+' bài trong kho · '+(r.created||'')),node('p','Nhập thêm bản sao; không thay thế tệp hay bài hiện có.'));
        const label=node('label',null,'productivity-inline'),settings=node('input');settings.type='checkbox';settings.id='backup-import-settings';label.append(settings,node('span','Nhập cả cài đặt giao diện/soạn thảo'));preview.append(label,button('Nhập bản sao',async()=>{const value=await call(electronAPI.productivityConsume(r.ticket));await restore(value,settings.checked,true);preview.remove();status.textContent='Đã nhập xong. Kiểm tra các tab mới và Kho bài.';}),button('Hủy',()=>preview.remove()));body.querySelector('#backup-preview')?.remove();body.append(preview);
    }
    function renderBackup(){body.append(node('h3','Sao lưu và chuyển máy'),node('p','Gói nén gồm lời giải của các tab đang mở, test, bài đã lưu, ghi chú, chủ đề, tiến độ và cài đặt cơ bản. Không xuất phiên đăng nhập, mật khẩu, khóa API của Semeko hoặc đường dẫn công cụ. Mã nguồn trong thư mục bài đã lưu được giữ nguyên.'),button('Xuất gói sao lưu',exportBackup),button('Chọn gói để nhập',previewBackup));}
    async function saveExam(){const r=await electronAPI.stateWrite('practice-exam',{exam});if(r?.success===false)throw Error(r.error);schedule();}
    function remaining(){return exam?Math.max(0,exam.durationMs-(exam.elapsedMs||0)-(exam.phase==='running'?Math.max(0,Date.now()-exam.startedAt):0)):0;}
    function summary(){if(!exam)return[];const entries=PracticeLibrary.entries();return exam.items.map(item=>{const entry=entries.find(e=>e.id===item.id||item.problem?.url&&e.problem?.url===item.problem.url);const tab=App.tabs.find(t=>t.testState?.problem?.url&&t.testState.problem.url===item.problem?.url);const results=tab?.testState?.results||entry?.results||[];return{name:item.name,solved:entry?.status==='solved'||results.length>0&&results.every(r=>r.status==='AC')&&results.length===(item.problem?.tests?.length||0),results};});}
    async function finishExam(){if(!exam)return;exam.elapsedMs=exam.durationMs-remaining();exam.phase='finished';exam.finishedAt=Date.now();exam.summary=summary();await saveExam();showToast('Đã kết thúc lượt luyện thi. Xem tổng kết trong Công cụ & dữ liệu.','success');if(dialog.open&&section==='exam')render();}
    function renderExam(){
        body.append(node('h3','Luyện thi'),node('p','Luyện trên máy với bộ đề bạn chọn từ Kho bài. Kết quả ở đây là test mẫu, độc lập với thứ hạng chính thức.'));
        if(exam&&exam.phase!=='finished'){
            const clock=node('strong',null,'exam-clock');clock.id='exam-countdown';body.append(clock,node('p',exam.phase==='running'?'Đang luyện thi':'Đã tạm dừng'));
            body.append(button(exam.phase==='running'?'Tạm dừng':'Tiếp tục',async()=>{if(exam.phase==='running'){exam.elapsedMs=exam.durationMs-remaining();exam.phase='paused';}else{exam.startedAt=Date.now();exam.phase='running';}await saveExam();render();}),button('Kết thúc và tổng kết',finishExam));
            for(const item of exam.items)body.append(button(item.name,async()=>{dialog.close();await PracticeLibrary.openEntry(item);}));updateClock();return;
        }
        if(exam?.phase==='finished'){body.append(node('h4','Tổng kết lượt gần nhất'),node('p','Đã luyện '+Math.round((exam.elapsedMs||0)/60000)+' phút · '+(exam.summary||[]).filter(i=>i.solved).length+'/'+exam.items.length+' bài đạt test mẫu'));for(const item of exam.summary||[])body.append(node('p',(item.solved?'✓ ':'Cần ôn · ')+item.name));}
        const minutes=node('input');minutes.type='number';minutes.min='1';minutes.max='360';minutes.value='60';minutes.id='exam-minutes';minutes.setAttribute('aria-label','Thời gian luyện thi (phút)');body.append(node('label','Thời gian (phút)'),minutes);
        const picker=node('div',null,'exam-picker');const entries=PracticeLibrary.entries().filter(e=>e.kind!=='folder'&&e.problem?.tests?.length);for(const entry of entries){const label=node('label',null,'productivity-inline'),check=node('input');check.type='checkbox';check.value=entry.id;check.dataset.examEntry='';label.append(check,node('span',entry.name));picker.append(label);}body.append(picker);
        if(!entries.length)body.append(node('p','Lưu bài có test mẫu vào Kho bài trước khi tạo lượt thi.'));
        const start=button('Bắt đầu luyện thi',async()=>{const duration=Number(minutes.value),ids=[...picker.querySelectorAll('input:checked')].map(i=>i.value);if(!Number.isInteger(duration)||duration<1||duration>360||!ids.length||ids.length>100)throw Error('Chọn từ 1–100 bài và thời gian 1–360 phút.');exam={id:crypto.randomUUID(),phase:'running',durationMs:duration*60000,elapsedMs:0,startedAt:Date.now(),items:entries.filter(e=>ids.includes(e.id)).map(e=>JSON.parse(JSON.stringify(e)))};await saveExam();render();});start.id='exam-start';body.append(start);
    }
    function updateClock(){if(!exam)return;const left=remaining(),text=String(Math.floor(left/60000)).padStart(2,'0')+':'+String(Math.floor(left/1000)%60).padStart(2,'0');if($('exam-countdown'))$('exam-countdown').textContent=text;const badge=$('exam-badge');if(badge){badge.hidden=exam.phase==='finished';badge.textContent=(exam.phase==='paused'?'Ⅱ ':'')+text;}if(exam.phase==='running'&&left===0)void finishExam().catch(e=>showToast(e.message,'error'));}
    async function render(){body.replaceChildren();status.textContent='';for(const tab of dialog.querySelectorAll('[data-section]')){tab.classList.toggle('active',tab.dataset.section===section);tab.setAttribute('aria-selected',String(tab.dataset.section===section));}if(section==='tools')await renderTools();else if(section==='backup')renderBackup();else if(section==='exam')renderExam();else renderRecovery();UILanguage?.apply();}
    async function open(next='recovery'){section=next;await render();if(!dialog.open)dialog.showModal();}
    function safeFix(model,marker){
        const at=Math.max(1,Math.min(marker.startLineNumber,model.getLineCount())),message=marker.message||'',ext=model.getLanguageId();
        if(ext==='python'&&/expected ':'/.test(message)){const line=model.getLineContent(at);if(/^\s*(?:async\s+)?(?:def|class|if|elif|else|for|while|try|except|finally|with)\b/.test(line)&&!line.trimEnd().endsWith(':')&&!line.includes('#'))return{line:at,column:line.length+1,text:':',title:'Thêm dấu hai chấm (:)' };}
        if(/expected.*[;]|';'.*expected|CS1002|; expected/.test(message)&&['cpp','c','java','csharp'].includes(ext)){
            const candidates=ext==='csharp'?[at]:[at-1,at];for(const lineNumber of candidates){if(lineNumber<1)continue;const text=model.getLineContent(lineNumber),trim=text.trimEnd();if(!trim||/[;{}:]$/.test(trim)||/^\s*(#|\/\/|if\b|for\b|while\b|class\b|else\b|return\b)/.test(trim)||text.includes('//'))continue;if(/[)\]"'\w]$/.test(trim))return{line:lineNumber,column:trim.length+1,text:';',title:'Thêm dấu chấm phẩy (;)' };}
        }return null;
    }
    function attachMonaco(){if(!window.monaco?.languages||attachMonaco.done)return;attachMonaco.done=true;
        monaco.editor.onDidChangeModelLanguage(event=>{const tab=App.tabs.find(t=>t.model===event.model);if(tab)checks.delete(tab.id);scheduleLive();});
        for(const language of ['cpp','c','python','java','csharp'])monaco.languages.registerCodeActionProvider(language,{providedCodeActionKinds:['quickfix'],provideCodeActions(model,range,context){const actions=[];for(const marker of context.markers){const fix=safeFix(model,marker);if(fix)actions.push({title:fix.title,kind:'quickfix',diagnostics:[marker],isPreferred:true,edit:{edits:[{resource:model.uri,textEdit:{range:new monaco.Range(fix.line,fix.column,fix.line,fix.column),text:fix.text},versionId:model.getVersionId()}]}});}return{actions,dispose(){}};}});
        monaco.editor.onDidChangeMarkers(uris=>{if(attachMonaco.annotating)return;attachMonaco.annotating=true;try{for(const uri of uris){const model=monaco.editor.getModel(uri);if(!model)continue;const markers=monaco.editor.getModelMarkers({resource:uri}).filter(m=>['live-check','language-server','productivity-live'].includes(m.owner));for(const owner of new Set(markers.map(m=>m.owner))){const group=markers.filter(m=>m.owner===owner);if(group.every(m=>m.message.includes('\nGợi ý: ')))continue;const items=group.map(m=>({...m,message:m.message.includes('\nGợi ý: ')?m.message:m.message+'\nGợi ý: '+CodingWorkspace.explain(m.message)}));monaco.editor.setModelMarkers(model,owner,items);}}}finally{attachMonaco.annotating=false;}});
    }
    function configureLive(){clearTimeout(liveTimer);checks.clear();if(!App.settings.editor.liveCheck&&window.monaco)for(const model of monaco.editor.getModels())monaco.editor.setModelMarkers(model,'productivity-live',[]);else scheduleLive();}
    function scheduleLive(){clearTimeout(liveTimer);if(!App.settings.editor.liveCheck)return;liveTimer=setTimeout(()=>void liveCheck(),1200);}
    async function liveCheck(){
        const tab=active(),model=tab?.model,extension=tab&&fileExtension(tab.name);if(!model||model.isDisposed()||!['py','java','cs'].includes(extension)||!App.settings.editor.liveCheck||isBuilding||App.isRunning)return;
        if(liveBusy){scheduleLive();return;}const version=model.getVersionId(),text=model.getValue();if(checks.get(tab.id)===version)return;liveBusy=true;
        try{const r=await call(electronAPI.liveLanguageCheck({extension,content:text,id:tab.id}));if(model.isDisposed()||!App.tabs.includes(tab)||model.getVersionId()!==version||!App.settings.editor.liveCheck)return;checks.set(tab.id,version);monaco.editor.setModelMarkers(model,'productivity-live',r.diagnostics.map(d=>({severity:d.severity==='warning'?monaco.MarkerSeverity.Warning:monaco.MarkerSeverity.Error,startLineNumber:d.line,endLineNumber:d.line,startColumn:d.column||1,endColumn:Math.max(2,(d.column||1)+1),message:d.message+'\nGợi ý: '+CodingWorkspace.explain(d.message),source:'Semeko'})));if(getPreferredTabId()===tab.id&&!hasBuildProblems){App.problemsTabId=tab.id;App.problems=r.diagnostics.map(d=>({file:tab.path||tab.name,line:d.line,col:d.column,type:d.severity,message:d.message}));renderProblems();}if(r.error)setStatus('Chưa kiểm tra được cú pháp: '+r.error.split('\n')[0],'warning');}catch(e){setStatus('Kiểm tra lỗi: '+e.message,'warning');}finally{liveBusy=false;}
    }
    async function init(){
        dialog=node('dialog',null,'practice-library productivity-dialog');dialog.id='productivity-center';dialog.setAttribute('aria-label','Công cụ và dữ liệu');const header=node('header');header.append(node('h2','Công cụ & dữ liệu'),button('Đóng',()=>dialog.close()));const nav=node('nav',null,'productivity-nav');for(const [id,label]of [['recovery','Tự lưu & gợi ý'],['tools','Công cụ ngôn ngữ'],['exam','Luyện thi'],['backup','Sao lưu']]){const b=button(label,()=>{section=id;return render();});b.dataset.section=id;b.setAttribute('role','tab');nav.append(b);}body=node('div',null,'productivity-body');status=node('p');status.setAttribute('role','status');dialog.append(header,nav,body,status);document.body.append(dialog);
        const menu=node('button','Công cụ & dữ liệu','dropdown-item');menu.type='button';menu.dataset.productivityMenu='';menu.onclick=()=>{closeMenus();void open();};$('menu-view').append(menu);
        const settings=node('div',null,'setting-row'),label=node('label','Tự lưu, phục hồi, công cụ ngôn ngữ và sao lưu'),b=button('Mở công cụ & dữ liệu',()=>{closeSettings();return open();});settings.append(label,b);$('panel-editor').append(settings);
        const examBadge=button('',()=>open('exam'));examBadge.id='exam-badge';examBadge.hidden=true;examBadge.title='Mở lượt luyện thi';$('status-bar').append(examBadge);
        document.addEventListener('input',e=>{if(e.target.closest('#input-area,#expected-area,#practice-library'))schedule();});electronAPI.onRuntimeCenterEvent(job=>{if($('runtime-install-log'))$('runtime-install-log').textContent=job.log;status.textContent=job.phase==='complete'?'Cài công cụ thành công.':job.phase==='error'?'Cài đặt gặp lỗi. Xem chi tiết bên dưới.':'Đang cài '+job.packageId;if(job.phase==='complete')configureLive();if(['complete','error','restart'].includes(job.phase)&&section==='tools'&&dialog.open)void render().catch(e=>status.textContent=e.message);});
        const attachTimer=setInterval(()=>{if(window.monaco){attachMonaco();clearInterval(attachTimer);}},500);
        try{recoveryDoc=await call(electronAPI.productivityRecovery());if(recoveryDoc?.tabs?.length&&!recoveryDoc.clean){const banner=node('div',null,'productivity-recovery-banner');banner.id='recovery-banner';banner.append(node('span','Có bản phục hồi từ phiên trước chưa kết thúc bình thường.'),button('Xem bản phục hồi',()=>{banner.remove();return open('recovery');}),button('Đóng',()=>banner.remove()));document.body.append(banner);}}catch(e){console.warn(e.message);}
        const saved=await electronAPI.stateRead('practice-exam');if(saved?.exam&&Array.isArray(saved.exam.items)&&Number.isFinite(saved.exam.durationMs)&&Number.isFinite(saved.exam.startedAt)&&['running','paused','finished'].includes(saved.exam.phase)){exam=saved.exam;updateClock();}examTimer=setInterval(updateClock,1000);
        // A clean exit marks its snapshot. Abrupt process termination leaves clean=false.
        window.addEventListener('beforeunload',()=>{PracticeLibrary.flushDraftsSync();const data={...payload(),timestamp:Date.now(),clean:true};electronAPI.productivitySnapshotSync(data);});
        setInterval(()=>{if(App.tabs.length)void checkpoint().catch(()=>{});},15000);
    }
    document.addEventListener('DOMContentLoaded',()=>{void init().catch(e=>console.error('Productivity init:',e));});
    return{open,schedule,checkpoint,restore,payload,liveCheck,configureLive,safeFix,finishExam,remaining,exam:()=>exam};
})();
